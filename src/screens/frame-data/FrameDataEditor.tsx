import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ANIMATION_CATALOG, getCatalogEntry, getEffectiveFrameCount } from '../../data/falcon/animationCatalog';
import type { AnimationCatalogEntry } from '../../data/falcon/animationCatalog';
import { APPROVED_ANIMATIONS } from '../../data/falcon/approvedAnimations';
import { getTimingMarkers, seedAnimationFrames } from '../../data/falcon/seedAnimation';
import {
  commitHistory,
  copyFrames,
  copySelection,
  clipboardShapeCount,
  createHistory,
  deleteSelection,
  fillFrames,
  interpolateRange,
  listShapeRefs,
  pasteFrames,
  pasteShapes,
  pasteShapesIntoRange,
  pruneSelection,
  redoHistory,
  sealHistory,
  selectionBounds,
  translateSelection,
  undoHistory,
} from '../../dev/editorOps';
import type { EditorClipboard, History, ShapeRef } from '../../dev/editorOps';
import {
  MAX_GRABBOXES_PER_FRAME,
  MAX_HITBOXES_PER_FRAME,
  MAX_HURTBOXES_PER_FRAME,
  MAX_SILHOUETTE_POINTS,
  createGrabbox,
  createHitbox,
  createHurtbox,
  createSilhouettePoint,
  normalizeFrameCount,
  planFrameCountChange,
} from '../../dev/frameDataModel';
import type { FrameCountChange } from '../../dev/frameDataModel';
import {
  clearConfirmedFrameCount,
  confirmFrameCount,
  createAnimationDraft,
  deleteAnimationDraft,
  deleteReference,
  listAnimationDrafts,
  listConfirmedFrameCounts,
  updateAnimationDraft,
  uploadReference,
} from '../../dev/frameDataClient';
import { DEFAULT_REFERENCE_SETTINGS, MOVEMENT_STATES } from '../../types/frameData';
import type {
  AnimationDraft,
  AnimationFrame,
  ReferenceAssetMetadata,
  ReferenceSettings,
} from '../../types/frameData';
import { CatalogSidebar, STATUS_LABEL } from './CatalogSidebar';
import type { AnimationStatus } from './CatalogSidebar';
import { DefaultsPanel } from './DefaultsPanel';
import { loadEditorDefaults, saveEditorDefaults } from './editorSettings';
import type { EditorDefaults } from './editorSettings';
import { FrameCountPanel } from './FrameCountPanel';
import { DEFAULT_CAMERA, fitCamera } from './geometry';
import type { Camera } from './geometry';
import { Inspector } from './Inspector';
import { DEFAULT_LAYERS, editableKinds } from './layers';
import type { LayerId, LayerState } from './layers';
import { LayersPanel } from './LayersPanel';
import { ReferencePanel } from './ReferencePanel';
import { ShortcutSheet } from './ShortcutSheet';
import { Timeline } from './Timeline';
import type { FrameRange } from './Timeline';
import { useReferenceMedia } from './useReferenceMedia';
import { Viewport } from './Viewport';
import type { Tool } from './Viewport';
import './FrameDataEditor.css';

/** In-memory working copy of one animation. Each has its own undo history. */
interface AnimationDoc {
  animationId: string;
  draft: AnimationDraft | null;
  history: History<AnimationFrame[]>;
  /** The frames array last loaded or saved (identity comparison drives the unsaved state). */
  savedFrames: AnimationFrame[];
  referenceSettings: ReferenceSettings;
  savedReferenceSettings: ReferenceSettings;
  referenceAssetId: string | null;
  savedReferenceAssetId: string | null;
  assets: ReferenceAssetMetadata[];
  /** Frames past the locked count in the stored draft; kept until the user decides. */
  extraFrames: AnimationFrame[];
  /** Extra frames were discarded locally and the trim still needs saving. */
  pendingTrim: boolean;
  /** Short drafts are padded to the locked count on open. */
  paddedFrames: number;
}

type InspectorTab = 'inspect' | 'layers' | 'reference' | 'animation' | 'defaults';
type Notice = { tone: 'info' | 'error' | 'success'; text: string } | null;

const MOVEMENT_IDS = new Set<string>(MOVEMENT_STATES.map((state) => state.id));
const isTyping = (target: EventTarget | null) => target instanceof HTMLElement
  && (['input', 'textarea', 'select'].includes(target.tagName.toLowerCase()) || target.isContentEditable);

function isDirty(doc: AnimationDoc | undefined): boolean {
  if (!doc) return false;
  return doc.history.present !== doc.savedFrames
    || doc.pendingTrim
    || doc.referenceSettings !== doc.savedReferenceSettings
    || doc.referenceAssetId !== doc.savedReferenceAssetId;
}

function openDoc(entry: AnimationCatalogEntry, frameCount: number, draft: AnimationDraft | undefined): AnimationDoc {
  if (!draft) {
    const frames = seedAnimationFrames(entry, frameCount);
    return {
      animationId: entry.id,
      draft: null,
      history: createHistory(frames),
      savedFrames: frames,
      referenceSettings: DEFAULT_REFERENCE_SETTINGS,
      savedReferenceSettings: DEFAULT_REFERENCE_SETTINGS,
      referenceAssetId: null,
      savedReferenceAssetId: null,
      assets: [],
      extraFrames: [],
      pendingTrim: false,
      paddedFrames: 0,
    };
  }
  const normalized = normalizeFrameCount(draft.frames, frameCount);
  const frames = normalized.extra > 0 ? draft.frames.slice(0, frameCount) : normalized.frames;
  return {
    animationId: entry.id,
    draft,
    history: createHistory(frames),
    // Padded drafts count as unsaved so the padding gets stored; extra frames do not.
    savedFrames: normalized.padded > 0 ? draft.frames : frames,
    referenceSettings: draft.referenceSettings,
    savedReferenceSettings: draft.referenceSettings,
    referenceAssetId: draft.referenceAssetId,
    savedReferenceAssetId: draft.referenceAssetId,
    assets: draft.assets,
    extraFrames: normalized.extra > 0 ? draft.frames.slice(frameCount) : [],
    pendingTrim: false,
    paddedFrames: normalized.padded,
  };
}

export default function FrameDataEditor() {
  const navigate = useNavigate();
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AnimationDraft>>({});
  const [confirmedCounts, setConfirmedCounts] = useState<Record<string, number>>({});
  const [docs, setDocs] = useState<Record<string, AnimationDoc>>({});
  const [activeId, setActiveId] = useState<string>(() => {
    const requested = new URLSearchParams(window.location.search).get('animation');
    return requested && getCatalogEntry(requested) ? requested : ANIMATION_CATALOG[0].id;
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const [range, setRange] = useState<FrameRange | null>(null);
  const [selection, setSelection] = useState<ShapeRef[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [camera, setCamera] = useState<Camera>(DEFAULT_CAMERA);
  const [layers, setLayers] = useState<LayerState>(() => ({
    ...DEFAULT_LAYERS,
    onion: { ...DEFAULT_LAYERS.onion, visible: loadEditorDefaults().onionSkin },
  }));
  const [defaults, setDefaults] = useState<EditorDefaults>(loadEditorDefaults);
  const [clipboard, setClipboard] = useState<EditorClipboard | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(true);
  const [tab, setTab] = useState<InspectorTab>('inspect');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [busy, setBusy] = useState<null | 'save' | 'upload' | 'count' | 'discard'>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const frameMemory = useRef(new Map<string, number>());

  const entry = getCatalogEntry(activeId) ?? ANIMATION_CATALOG[0];
  const doc = docs[activeId];
  const frames = doc?.history.present ?? [];
  const frameCount = getEffectiveFrameCount(entry, confirmedCounts[activeId]);
  const frameIndex = Math.min(activeIndex, Math.max(0, frames.length - 1));
  const frame = frames[frameIndex];

  const say = useCallback((text: string, tone: 'info' | 'error' | 'success' = 'info') => setNotice({ text, tone }), []);
  useEffect(() => {
    if (!notice || notice.tone === 'error') return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Initial load: drafts and user-confirmed frame counts.
  useEffect(() => {
    let alive = true;
    Promise.all([listAnimationDrafts(), listConfirmedFrameCounts()])
      .then(([draftList, counts]) => {
        if (!alive) return;
        setDrafts(Object.fromEntries(draftList.map((item) => [item.animationId, item])));
        setConfirmedCounts(Object.fromEntries(counts.map((item) => [item.animationId, item.frameCount])));
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!alive) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load frame data.');
        setLoadState('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  // Open a working copy the first time an animation is selected.
  useEffect(() => {
    if (loadState !== 'ready' || docs[activeId]) return;
    const target = getCatalogEntry(activeId);
    if (!target) return;
    setDocs((current) => (current[activeId] ? current : {
      ...current,
      [activeId]: openDoc(target, getEffectiveFrameCount(target, confirmedCounts[activeId]), drafts[activeId]),
    }));
  }, [loadState, activeId, docs, drafts, confirmedCounts]);

  const updateDoc = useCallback((animationId: string, update: (doc: AnimationDoc) => AnimationDoc) => {
    setDocs((current) => {
      const existing = current[animationId];
      if (!existing) return current;
      const next = update(existing);
      return next === existing ? current : { ...current, [animationId]: next };
    });
  }, []);

  const commitFrames = useCallback((next: AnimationFrame[] | ((frames: AnimationFrame[]) => AnimationFrame[]), key: string | null = null) => {
    updateDoc(activeId, (current) => {
      const value = typeof next === 'function' ? next(current.history.present) : next;
      const history = commitHistory(current.history, value, key);
      return history === current.history ? current : { ...current, history };
    });
  }, [activeId, updateDoc]);

  const commitFrame = useCallback((nextFrame: AnimationFrame, key: string | null = null) => {
    commitFrames((current) => current.map((item, index) => (index === frameIndex ? nextFrame : item)), key);
  }, [commitFrames, frameIndex]);

  const sealActive = useCallback(() => {
    updateDoc(activeId, (current) => {
      const history = sealHistory(current.history);
      return history === current.history ? current : { ...current, history };
    });
  }, [activeId, updateDoc]);

  // One drag or one field edit = one undo step.
  useEffect(() => {
    window.addEventListener('pointerup', sealActive);
    window.addEventListener('focusout', sealActive);
    return () => {
      window.removeEventListener('pointerup', sealActive);
      window.removeEventListener('focusout', sealActive);
    };
  }, [sealActive]);

  // Keep the selection valid as frames change.
  useEffect(() => {
    if (!frame) return;
    setSelection((current) => {
      const pruned = pruneSelection(frame, current);
      return pruned.length === current.length ? current : pruned;
    });
  }, [frame]);

  const selectAnimation = (animationId: string) => {
    if (animationId === activeId) return;
    frameMemory.current.set(activeId, frameIndex);
    setPlaying(false);
    setSelection([]);
    setRange(null);
    setActiveIndex(frameMemory.current.get(animationId) ?? 0);
    setActiveId(animationId);
    const url = new URL(window.location.href);
    url.searchParams.set('animation', animationId);
    window.history.replaceState(window.history.state, '', url);
  };

  const seek = useCallback((index: number) => {
    setActiveIndex(Math.max(0, Math.min(frames.length - 1, index)));
  }, [frames.length]);

  // 60 fps playback.
  useEffect(() => {
    if (!playing || frames.length < 2) return undefined;
    let raf = 0;
    let last = performance.now();
    let accumulator = 0;
    const tick = (now: number) => {
      accumulator += ((now - last) / 1000) * 60 * defaults.playbackSpeed;
      last = now;
      const steps = Math.floor(accumulator);
      if (steps > 0) {
        accumulator -= steps;
        setActiveIndex((index) => {
          const next = index + steps;
          if (next < frames.length) return next;
          return loop ? next % frames.length : frames.length - 1;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, frames.length, loop, defaults.playbackSpeed]);

  useEffect(() => {
    if (playing && !loop && frameIndex >= frames.length - 1) setPlaying(false);
  }, [playing, loop, frameIndex, frames.length]);

  const updateDefaults = (next: EditorDefaults) => {
    setDefaults(next);
    saveEditorDefaults(next);
  };

  // ------------------------------------------------------------------ status
  const statuses = useMemo(() => {
    const result: Record<string, AnimationStatus> = {};
    for (const item of ANIMATION_CATALOG) {
      const approved = APPROVED_ANIMATIONS[item.id];
      const draft = docs[item.id]?.draft ?? drafts[item.id];
      if (isDirty(docs[item.id])) result[item.id] = 'unsaved';
      else if (approved && (!draft || draft.updatedAt <= approved.sourceDraftUpdatedAt)) result[item.id] = 'approved';
      else if (approved) result[item.id] = 'approved-changed';
      else if (draft) result[item.id] = 'saved';
      else result[item.id] = 'default';
    }
    return result;
  }, [docs, drafts]);
  const frameCounts = useMemo(() => Object.fromEntries(
    ANIMATION_CATALOG.map((item) => [item.id, getEffectiveFrameCount(item, confirmedCounts[item.id])]),
  ), [confirmedCounts]);
  const countConfirmed = useMemo(() => Object.fromEntries(
    ANIMATION_CATALOG.map((item) => [item.id, item.count.confirmed || confirmedCounts[item.id] !== undefined]),
  ), [confirmedCounts]);
  const anyDirty = Object.values(docs).some(isDirty);
  const status = statuses[activeId] ?? 'default';

  // Unsaved-changes guard for reloads and in-app links.
  useEffect(() => {
    if (!anyDirty) return undefined;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const guardInternalNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href]');
      if (!(link instanceof HTMLAnchorElement) || event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin || destination.pathname === window.location.pathname) return;
      if (!window.confirm('Leave the frame editor? Unsaved changes will be lost.')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    document.addEventListener('click', guardInternalNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      document.removeEventListener('click', guardInternalNavigation, true);
    };
  }, [anyDirty]);

  // -------------------------------------------------------------------- save
  const docsRef = useRef(docs);
  useEffect(() => {
    docsRef.current = docs;
  }, [docs]);

  const saveActive = useCallback(async (): Promise<AnimationDraft | null> => {
    const current = docsRef.current[activeId];
    if (!current) return null;
    if (current.extraFrames.length) {
      say(`Resolve the ${current.extraFrames.length} extra frames in the Animation tab before saving.`, 'error');
      setTab('animation');
      return null;
    }
    if (current.draft && !isDirty(current)) return current.draft;
    const savedFrames = current.history.present;
    const savedSettings = current.referenceSettings;
    const savedAssetId = current.referenceAssetId;
    setBusy('save');
    try {
      const saved = current.draft
        ? await updateAnimationDraft(current.draft.id, {
          name: current.draft.name,
          frames: savedFrames,
          referenceAssetId: savedAssetId,
          referenceSettings: savedSettings,
        })
        : await createAnimationDraft({
          animationId: activeId,
          name: getCatalogEntry(activeId)?.label ?? activeId,
          frames: savedFrames,
          referenceSettings: savedSettings,
        });
      updateDoc(activeId, (latest) => ({
        ...latest,
        draft: saved,
        assets: saved.assets,
        savedFrames,
        savedReferenceSettings: savedSettings,
        savedReferenceAssetId: savedAssetId,
        pendingTrim: false,
        paddedFrames: 0,
      }));
      setDrafts((all) => ({ ...all, [activeId]: saved }));
      say('Saved.', 'success');
      return saved;
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not save this animation.', 'error');
      return null;
    } finally {
      setBusy(null);
    }
  }, [activeId, say, updateDoc]);

  const testInTraining = async () => {
    const saved = await saveActive();
    if (saved) navigate(`/training?previewDraft=${encodeURIComponent(saved.id)}`);
  };

  const discardDraft = async () => {
    const current = docs[activeId];
    if (!current?.draft) return;
    if (!window.confirm(`Delete the saved draft for ${entry.label}, including its reference uploads? The animation goes back to the default shapes. This cannot be undone.`)) return;
    setBusy('discard');
    try {
      await deleteAnimationDraft(current.draft.id);
      setDrafts((all) => {
        const next = { ...all };
        delete next[activeId];
        return next;
      });
      setDocs((all) => ({ ...all, [activeId]: openDoc(entry, frameCount, undefined) }));
      setSelection([]);
      say('Draft deleted. Showing the default shapes.', 'success');
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not delete the draft.', 'error');
    } finally {
      setBusy(null);
    }
  };

  // -------------------------------------------------------------- frame count
  /**
   * Plans a count change for the active draft. Stored extra frames are reused
   * before any copies are added; removing frames always asks first.
   */
  const planCountChange = (count: number): FrameCountChange | null => {
    if (!doc) return null;
    const change = planFrameCountChange(doc.history.present, doc.extraFrames, count);
    if (change.dropped > 0) {
      const total = count + change.dropped;
      const stored = doc.extraFrames.length ? ' Frames past the locked count are deleted from the draft when you save.' : ' Undo can bring them back until you leave the editor.';
      if (!window.confirm(`Frames ${count + 1}–${total} (${change.dropped} frame${change.dropped === 1 ? '' : 's'}) will be removed from this animation.${stored} Continue?`)) return null;
    }
    return change;
  };

  const applyCountChange = (change: FrameCountChange) => {
    updateDoc(activeId, (latest) => ({
      ...latest,
      extraFrames: [],
      pendingTrim: latest.pendingTrim || latest.extraFrames.length > 0,
      history: commitHistory(latest.history, change.frames),
    }));
    const notes = [
      change.restored ? `restored ${change.restored} stored frame${change.restored === 1 ? '' : 's'}` : '',
      change.added ? `added ${change.added} cop${change.added === 1 ? 'y' : 'ies'} of the last frame` : '',
      change.dropped ? `removed ${change.dropped} frame${change.dropped === 1 ? '' : 's'}` : '',
    ].filter(Boolean);
    return notes.length ? ` (${notes.join(', ')})` : '';
  };

  const handleConfirmCount = async (count: number) => {
    const change = planCountChange(count);
    if (!change) return;
    setBusy('count');
    try {
      const confirmed = await confirmFrameCount(activeId, count);
      setConfirmedCounts((all) => ({ ...all, [activeId]: confirmed.frameCount }));
      const detail = applyCountChange(change);
      say(`${entry.label} is locked at ${count} frames${detail}.`, 'success');
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not confirm the frame count.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleClearCount = async () => {
    const change = planCountChange(entry.frameCount);
    if (!change) return;
    setBusy('count');
    try {
      await clearConfirmedFrameCount(activeId);
      setConfirmedCounts((all) => {
        const next = { ...all };
        delete next[activeId];
        return next;
      });
      const detail = applyCountChange(change);
      say(`Using the catalog count of ${entry.frameCount} frames${detail}.`);
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not clear the confirmed count.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const trimExtraFrames = () => {
    if (!doc?.extraFrames.length) return;
    if (!window.confirm(`Remove ${doc.extraFrames.length} frames past frame ${frameCount}? They are deleted from the draft when you save.`)) return;
    updateDoc(activeId, (latest) => ({ ...latest, extraFrames: [], pendingTrim: true }));
  };

  // ---------------------------------------------------------------- reference
  const activeAsset = doc?.assets.find((asset) => asset.id === doc.referenceAssetId) ?? null;
  const referenceSettings = doc?.referenceSettings ?? DEFAULT_REFERENCE_SETTINGS;
  const forcedReferenceFrame = referenceSettings.linkFrames ? frame?.referenceFrame ?? null : null;
  const media = useReferenceMedia(doc?.draft?.id ?? null, activeAsset, forcedReferenceFrame);

  const changeReference = useCallback((patch: Partial<ReferenceSettings>) => {
    updateDoc(activeId, (current) => ({ ...current, referenceSettings: { ...current.referenceSettings, ...patch } }));
  }, [activeId, updateDoc]);

  const handleUpload = async (file: File) => {
    const draft = await saveActive();
    if (!draft) return;
    setBusy('upload');
    try {
      const asset = await uploadReference(draft.id, file);
      updateDoc(activeId, (current) => {
        const settings = { ...current.referenceSettings, scale: 1, offsetX: 0, offsetY: 0, locked: false };
        const savedSettings = { ...current.savedReferenceSettings, scale: 1, offsetX: 0, offsetY: 0, locked: false };
        const settingsUnchanged = current.referenceSettings === current.savedReferenceSettings;
        return {
          ...current,
          assets: [...current.assets, asset],
          referenceAssetId: asset.id,
          savedReferenceAssetId: asset.id,
          referenceSettings: settingsUnchanged ? savedSettings : settings,
          savedReferenceSettings: savedSettings,
        };
      });
      setLayers((current) => ({ ...current, reference: { ...current.reference, visible: true } }));
      say(`${file.name} uploaded. Drag it into place, then lock it.`, 'success');
    } catch (error) {
      say(error instanceof Error ? error.message : 'Upload failed.', 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!doc?.draft) return;
    try {
      await deleteReference(doc.draft.id, assetId);
      updateDoc(activeId, (current) => ({
        ...current,
        assets: current.assets.filter((asset) => asset.id !== assetId),
        referenceAssetId: current.referenceAssetId === assetId ? null : current.referenceAssetId,
        savedReferenceAssetId: current.savedReferenceAssetId === assetId ? null : current.savedReferenceAssetId,
      }));
      say('Reference deleted.');
    } catch (error) {
      say(error instanceof Error ? error.message : 'Could not delete the reference.', 'error');
    }
  };

  const linkFrame = (referenceFrame: number | null) => {
    if (!frame) return;
    commitFrame({ ...frame, referenceFrame }, null);
  };

  const autoLink = (mode: 'one-to-one' | 'stretch') => {
    const count = media.frameCount;
    if (count < 2) return;
    commitFrames((current) => current.map((item, index) => ({
      ...item,
      referenceFrame: mode === 'one-to-one'
        ? Math.min(index, count - 1)
        : current.length === 1 ? 0 : Math.round((index * (count - 1)) / (current.length - 1)),
    })));
    changeReference({ linkFrames: true });
    say(mode === 'one-to-one' ? 'Linked editor frame N to reference frame N.' : `Spread ${count} reference frames across ${frames.length} editor frames.`);
  };

  // ------------------------------------------------------------------- shapes
  const addShape = (kind: 'hurtbox' | 'hitbox' | 'grabbox') => {
    if (!frame) return;
    const layerId: LayerId = kind === 'hurtbox' ? 'hurtboxes' : kind === 'hitbox' ? 'hitboxes' : 'grabboxes';
    if (layers[layerId].locked || !layers[layerId].visible) {
      setLayers((current) => ({ ...current, [layerId]: { visible: true, locked: false } }));
    }
    if (kind === 'hurtbox') {
      if (frame.hurtboxes.length >= MAX_HURTBOXES_PER_FRAME) return say(`Frames hold at most ${MAX_HURTBOXES_PER_FRAME} hurtboxes.`, 'error');
      const shape = createHurtbox(defaults.shapes.hurtboxRadius);
      commitFrame({ ...frame, hurtboxes: [...frame.hurtboxes, shape] });
      setSelection([{ kind, id: shape.id }]);
    } else if (kind === 'hitbox') {
      if (frame.hitboxes.length >= MAX_HITBOXES_PER_FRAME) return say(`Frames hold at most ${MAX_HITBOXES_PER_FRAME} hitboxes.`, 'error');
      const nextId = frame.hitboxes.reduce((max, item) => Math.max(max, item.hitboxId + 1), 0);
      const shape = createHitbox(defaults.shapes, Math.min(15, nextId));
      commitFrame({ ...frame, hitboxes: [...frame.hitboxes, shape] });
      setSelection([{ kind, id: shape.id }]);
    } else {
      if (frame.grabboxes.length >= MAX_GRABBOXES_PER_FRAME) return say(`Frames hold at most ${MAX_GRABBOXES_PER_FRAME} grab boxes.`, 'error');
      const nextId = frame.grabboxes.reduce((max, item) => Math.max(max, item.grabboxId + 1), 0);
      const shape = createGrabbox(defaults.shapes.grabboxRadius, Math.min(15, nextId));
      commitFrame({ ...frame, grabboxes: [...frame.grabboxes, shape] });
      setSelection([{ kind, id: shape.id }]);
    }
    setTab('inspect');
    return undefined;
  };

  const addPoint = (x: number, y: number) => {
    if (!frame) return;
    if (frame.silhouette.points.length >= MAX_SILHOUETTE_POINTS) {
      say(`Silhouettes hold at most ${MAX_SILHOUETTE_POINTS} points.`, 'error');
      return;
    }
    const point = createSilhouettePoint(x, y);
    commitFrame({ ...frame, silhouette: { ...frame.silhouette, points: [...frame.silhouette.points, point] } });
    setSelection([{ kind: 'point', id: point.id }]);
  };

  // ---------------------------------------------------------------- clipboard
  const copy = () => {
    if (!frame) return;
    if (selection.length) {
      const result = copySelection(frame, selection, activeId);
      if (result) {
        setClipboard(result);
        say(`Copied ${clipboardShapeCount(result)} shape${clipboardShapeCount(result) === 1 ? '' : 's'}.`);
      }
      return;
    }
    const from = range ? range.from : frameIndex;
    const to = range ? range.to : frameIndex;
    setClipboard(copyFrames(frames, from, to, activeId));
    say(from === to ? `Copied frame ${from + 1}.` : `Copied frames ${from + 1}–${to + 1}.`);
  };

  const paste = (intoRange = false) => {
    if (!clipboard || !frame) return;
    if (clipboard.type === 'shapes') {
      if (intoRange && range) {
        const result = pasteShapesIntoRange(frames, range.from, range.to, clipboard);
        commitFrames(result.frames);
        say(`Pasted into frames ${range.from + 1}–${range.to + 1}${result.dropped ? ` (${result.dropped} shapes skipped at the per-frame limit)` : ''}.`);
        return;
      }
      const result = pasteShapes(frame, clipboard);
      commitFrame(result.frame);
      setSelection(result.selection);
      if (result.dropped) say(`${result.dropped} shapes skipped at the per-frame limit.`, 'error');
      return;
    }
    if (range && clipboard.frames.length === 1) {
      commitFrames(fillFrames(frames, range.from, range.to, clipboard.frames[0]));
      say(`Filled frames ${range.from + 1}–${range.to + 1} with the copied frame.`);
      return;
    }
    const result = pasteFrames(frames, frameIndex, clipboard);
    commitFrames(result.frames);
    say(`Pasted ${result.pasted} frame${result.pasted === 1 ? '' : 's'} from frame ${frameIndex + 1}${result.skipped ? `; ${result.skipped} didn't fit (the frame count stays ${frames.length})` : ''}.`);
  };

  const duplicateSelection = () => {
    if (!frame || !selection.length) return;
    const copied = copySelection(frame, selection, activeId);
    if (!copied) return;
    const result = pasteShapes(frame, copied);
    commitFrame(translateSelection(result.frame, result.selection, 1, 0));
    setSelection(result.selection);
  };

  const interpolate = () => {
    if (!range || range.to - range.from < 2) {
      say('Shift-click the timeline to select a range at least three frames long, then interpolate.', 'error');
      return;
    }
    const result = interpolateRange(frames, range.from, range.to);
    commitFrames(result.frames);
    say(result.skipped.length
      ? `Interpolated frames ${range.from + 2}–${range.to}. Skipped ${result.skipped.join(', ')} (different shape counts on the end frames).`
      : `Interpolated frames ${range.from + 2}–${range.to}.`);
  };

  const resetFrame = () => {
    if (!frame) return;
    const seeded = seedAnimationFrames(entry, frames.length)[frameIndex];
    commitFrame({ ...seeded, id: frame.id, referenceFrame: frame.referenceFrame });
    setSelection([]);
    say(`Frame ${frameIndex + 1} reset to the default shapes. Undo to bring your version back.`);
  };

  const resetAnimation = () => {
    if (!window.confirm(`Replace every frame of ${entry.label} with the default shapes? Undo can bring your version back.`)) return;
    const seeded = seedAnimationFrames(entry, frames.length);
    commitFrames(seeded.map((item, index) => ({ ...item, id: frames[index]?.id ?? item.id, referenceFrame: frames[index]?.referenceFrame ?? null })));
    setSelection([]);
  };

  const undo = () => updateDoc(activeId, (current) => ({ ...current, history: undoHistory(current.history) }));
  const redo = () => updateDoc(activeId, (current) => ({ ...current, history: redoHistory(current.history) }));

  const fitView = () => {
    if (!frame) return;
    const bounds = selectionBounds(frame, listShapeRefs(frame));
    setCamera(bounds ? fitCamera(bounds) : DEFAULT_CAMERA);
  };

  const toggleLayer = (id: LayerId, field: 'visible' | 'locked') => {
    setLayers((current) => ({ ...current, [id]: { ...current[id], [field]: !current[id][field] } }));
  };

  // ---------------------------------------------------------------- keyboard
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (showShortcuts || event.isComposing) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (mod && key === 's') {
        event.preventDefault();
        void saveActive();
        return;
      }
      if (isTyping(event.target)) return;
      if (mod) {
        if (key === 'z' && !event.shiftKey) undo();
        else if ((key === 'z' && event.shiftKey) || key === 'y') redo();
        else if (key === 'c') copy();
        else if (key === 'v') paste(event.shiftKey);
        else if (key === 'd') duplicateSelection();
        else if (key === 'a' && frame) setSelection(listShapeRefs(frame, editableKinds(layers)));
        else return;
        event.preventDefault();
        return;
      }
      if (event.altKey) return;
      const nudge = defaults.nudgeStep * (event.shiftKey ? 10 : 1);
      const arrows: Record<string, [number, number]> = {
        arrowleft: [-nudge, 0], arrowright: [nudge, 0], arrowup: [0, nudge], arrowdown: [0, -nudge],
      };
      if (arrows[key]) {
        event.preventDefault();
        if (selection.length && frame) {
          commitFrame(translateSelection(frame, selection, arrows[key][0], arrows[key][1]));
        } else if (key === 'arrowleft' || key === 'arrowright') {
          seek(frameIndex + (key === 'arrowleft' ? -1 : 1));
        }
        return;
      }
      switch (event.key) {
        case ',': seek(frameIndex - 1); break;
        case '.': seek(frameIndex + 1); break;
        case 'Home': seek(0); break;
        case 'End': seek(frames.length - 1); break;
        case ' ': setPlaying((value) => !value); break;
        case 'Delete':
        case 'Backspace':
          if (!selection.length || !frame) return;
          commitFrame(deleteSelection(frame, selection));
          setSelection([]);
          break;
        case 'Escape': setSelection([]); setRange(null); setTool('select'); break;
        case '?': setShowShortcuts(true); break;
        default:
          switch (key) {
            case 'h': addShape('hurtbox'); break;
            case 'b': addShape('hitbox'); break;
            case 'g': addShape('grabbox'); break;
            case 'v': setTool('select'); break;
            case 'p': setTool('pen'); break;
            case 'i': interpolate(); break;
            case 'o': toggleLayer('onion', 'visible'); break;
            case 'f': fitView(); break;
            case '0': setCamera(DEFAULT_CAMERA); break;
            case 'l': changeReference({ locked: !referenceSettings.locked }); break;
            default: return;
          }
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  });

  // ------------------------------------------------------------------ render
  if (loadState === 'error') {
    return (
      <main className="fe-editor">
        <div className="fe-fatal" role="alert">
          <h1>Frame editor could not load</h1>
          <p>{loadError}</p>
          <button type="button" className="fe-button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </main>
    );
  }

  const timing = getTimingMarkers(entry, frames.length || frameCount);
  const ghostFrames = frame ? [
    ...(frameIndex > 0 ? [{ frame: frames[frameIndex - 1], tone: 'previous' as const }] : []),
    ...(frameIndex < frames.length - 1 ? [{ frame: frames[frameIndex + 1], tone: 'next' as const }] : []),
  ] : [];
  const canUndo = Boolean(doc?.history.past.length);
  const canRedo = Boolean(doc?.history.future.length);
  const isMovement = MOVEMENT_IDS.has(activeId);
  const approved = APPROVED_ANIMATIONS[activeId];

  return (
    <main className="fe-editor">
      <header className="fe-topbar">
        <div className="fe-brand">
          <div className="fe-brand-mark" aria-hidden="true">CF</div>
          <div>
            <strong>SMASH LAB / FRAME EDITOR</strong>
            <span>CAPTAIN FALCON · DEV TOOL</span>
          </div>
        </div>
        <div className="fe-title">
          <h1>{entry.label}</h1>
          <span className={`fe-status-pill is-${status}`}>{status === 'default' ? 'Default · not saved' : STATUS_LABEL[status]}</span>
          {doc && doc.paddedFrames > 0 && <span className="fe-status-pill is-unsaved">+{doc.paddedFrames} padded frames</span>}
        </div>
        <div className="fe-topbar-actions">
          <button type="button" className="fe-button is-ghost" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">Undo</button>
          <button type="button" className="fe-button is-ghost" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">Redo</button>
          {isMovement && (
            <button type="button" className="fe-button is-ghost" onClick={() => void testInTraining()} disabled={busy !== null || !doc} title="Saves, then plays this draft in training">
              Test in training
            </button>
          )}
          <button
            type="button"
            className="fe-button is-primary"
            onClick={() => void saveActive()}
            disabled={busy !== null || !doc || (Boolean(doc.draft) && !isDirty(doc))}
            title="Save (Ctrl+S)"
          >
            {busy === 'save' ? 'Saving…' : doc?.draft && !isDirty(doc) ? 'Saved' : 'Save'}
          </button>
          <button type="button" className="fe-icon-button" onClick={() => setShowShortcuts(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">?</button>
        </div>
      </header>

      {notice && (
        <div className={`fe-notice is-${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" className="fe-link-button" onClick={() => setNotice(null)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="fe-layout">
        <CatalogSidebar
          selectedId={activeId}
          statuses={statuses}
          frameCounts={frameCounts}
          countConfirmed={countConfirmed}
          onSelect={selectAnimation}
        />

        <section className="fe-stage" aria-label="Editor stage">
          <div className="fe-toolbar" role="toolbar" aria-label="Editing tools">
            <div className="fe-tool-group" role="radiogroup" aria-label="Tool">
              <button type="button" role="radio" aria-checked={tool === 'select'} className={`fe-tool${tool === 'select' ? ' is-active' : ''}`} onClick={() => setTool('select')} title="Select (V)">Select</button>
              <button type="button" role="radio" aria-checked={tool === 'pen'} className={`fe-tool${tool === 'pen' ? ' is-active' : ''}`} onClick={() => setTool('pen')} title="Silhouette pen (P)">Pen</button>
            </div>
            <div className="fe-tool-group">
              <button type="button" className="fe-tool is-hurt" onClick={() => addShape('hurtbox')} title="Add hurtbox (H)">+ Hurtbox</button>
              <button type="button" className="fe-tool is-hit" onClick={() => addShape('hitbox')} title="Add hitbox (B)">+ Hitbox</button>
              <button type="button" className="fe-tool is-grab" onClick={() => addShape('grabbox')} title="Add grab box (G)">+ Grab</button>
            </div>
            <div className="fe-tool-group">
              <button type="button" className="fe-tool" onClick={copy} title="Copy (Ctrl+C)">Copy</button>
              <button type="button" className="fe-tool" onClick={() => paste(false)} disabled={!clipboard} title="Paste (Ctrl+V)">Paste</button>
              <button type="button" className="fe-tool" onClick={() => paste(true)} disabled={clipboard?.type !== 'shapes' || !range} title="Paste shapes into every frame in the range (Ctrl+Shift+V)">Paste → range</button>
              <button type="button" className="fe-tool" onClick={interpolate} disabled={!range || range.to - range.from < 2} title="Interpolate the range (I)">Interpolate</button>
            </div>
            <div className="fe-tool-group">
              <button type="button" className={`fe-tool${layers.onion.visible ? ' is-active' : ''}`} onClick={() => toggleLayer('onion', 'visible')} aria-pressed={layers.onion.visible} title="Onion skin (O)">Onion</button>
              <button type="button" className={`fe-tool${defaults.snapEnabled ? ' is-active' : ''}`} onClick={() => updateDefaults({ ...defaults, snapEnabled: !defaults.snapEnabled })} aria-pressed={defaults.snapEnabled} title={`Snap drags to ${defaults.snapIncrement} u`}>Snap</button>
              <button type="button" className="fe-tool" onClick={fitView} title="Fit (F)">Fit</button>
              <button type="button" className="fe-tool" onClick={() => setCamera(DEFAULT_CAMERA)} title="Reset view (0)">1:1</button>
            </div>
            {clipboard && (
              <span className="fe-clipboard-tag" title="Clipboard contents">
                CLIP · {clipboard.type === 'shapes' ? `${clipboardShapeCount(clipboard)} shapes` : `${clipboard.frames.length} frame${clipboard.frames.length === 1 ? '' : 's'}`}
                {clipboard.sourceAnimationId !== activeId && ` from ${getCatalogEntry(clipboard.sourceAnimationId)?.label ?? clipboard.sourceAnimationId}`}
              </span>
            )}
          </div>

          {frame ? (
            <Viewport
              frame={frame}
              ghostFrames={ghostFrames}
              layers={layers}
              selection={selection}
              tool={tool}
              camera={camera}
              referenceUrl={activeAsset ? media.url : null}
              referenceSettings={referenceSettings}
              snapIncrement={defaults.snapEnabled ? defaults.snapIncrement : null}
              onCameraChange={setCamera}
              onSelectionChange={setSelection}
              onFrameChange={commitFrame}
              onGestureEnd={sealActive}
              onReferenceChange={changeReference}
              onAddPoint={addPoint}
            />
          ) : (
            <div className="fe-canvas-wrap is-loading">Loading {entry.label}…</div>
          )}

          {doc && (
            <Timeline
              frames={frames}
              activeIndex={frameIndex}
              range={range}
              timing={timing}
              playing={playing}
              loop={loop}
              speed={defaults.playbackSpeed}
              onSeek={seek}
              onRangeChange={setRange}
              onTogglePlay={() => setPlaying((value) => !value)}
              onLoopChange={setLoop}
              onSpeedChange={(playbackSpeed) => updateDefaults({ ...defaults, playbackSpeed })}
            />
          )}
        </section>

        <aside className="fe-side" aria-label="Properties">
          <div className="fe-tabs" role="tablist">
            {([
              ['inspect', 'Inspect'],
              ['animation', 'Animation'],
              ['reference', 'Reference'],
              ['layers', 'Layers'],
              ['defaults', 'Defaults'],
            ] as const).map(([id, label]) => (
              <button
                type="button"
                role="tab"
                key={id}
                aria-selected={tab === id}
                className={`fe-tab${tab === id ? ' is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
                {id === 'animation' && doc && (doc.extraFrames.length > 0 || !countConfirmed[activeId]) && <i className="fe-tab-dot" aria-label="needs attention" />}
              </button>
            ))}
          </div>
          <div className="fe-side-body">
            {tab === 'inspect' && frame && (
              <Inspector
                frame={frame}
                selection={selection}
                nudgeStep={defaults.nudgeStep}
                onFrameChange={commitFrame}
                onSelectionChange={setSelection}
              />
            )}
            {tab === 'animation' && doc && (
              <>
                <FrameCountPanel
                  entry={entry}
                  frameCount={frames.length}
                  confirmedCount={confirmedCounts[activeId] ?? null}
                  extraFrames={doc.extraFrames.length}
                  busy={busy !== null}
                  onConfirm={(count) => void handleConfirmCount(count)}
                  onClear={() => void handleClearCount()}
                  onTrimExtra={trimExtraFrames}
                />
                <section className="fe-panel">
                  <header className="fe-panel-head">
                    <div>
                      <span className="fe-kicker">SOURCES</span>
                      <h2>Wiki timing</h2>
                    </div>
                  </header>
                  {timing.length ? (
                    <dl className="fe-timing-list">
                      {timing.map((marker) => (
                        <div key={marker.label}>
                          <dt>{marker.label}</dt>
                          <dd>{marker.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : <p className="fe-help">No SmashWiki timing table for this animation.</p>}
                  {entry.note && <p className="fe-help">{entry.note}</p>}
                  <p className="fe-help">
                    Status: <strong>{status === 'default' ? 'default shapes, not saved' : STATUS_LABEL[status]}</strong>.
                    {approved ? ` Approved ${new Date(approved.approvedAt).toLocaleDateString()}.` : ' Approval happens in chat; approved animations are exported for gameplay.'}
                  </p>
                </section>
                <section className="fe-panel">
                  <header className="fe-panel-head">
                    <div>
                      <span className="fe-kicker">RESET</span>
                      <h2>Defaults</h2>
                    </div>
                  </header>
                  <div className="fe-inline-actions">
                    <button type="button" className="fe-button is-small" onClick={resetFrame}>Reset frame {frameIndex + 1}</button>
                    <button type="button" className="fe-button is-small" onClick={resetAnimation}>Reset whole animation</button>
                  </div>
                  <p className="fe-help">Both can be undone. Default shapes are approximate: hurtboxes follow a pose skeleton, hitbox numbers come from SmashWiki.</p>
                  {doc.draft && (
                    <button type="button" className="fe-link-button is-danger" disabled={busy !== null} onClick={() => void discardDraft()}>
                      Delete saved draft
                    </button>
                  )}
                </section>
              </>
            )}
            {tab === 'reference' && doc && frame && (
              <ReferencePanel
                assets={doc.assets}
                activeAssetId={doc.referenceAssetId}
                settings={referenceSettings}
                media={media}
                linkedFrame={frame.referenceFrame}
                frameNumber={frameIndex + 1}
                busy={busy !== null}
                onUpload={(file) => void handleUpload(file)}
                onSelectAsset={(referenceAssetId) => updateDoc(activeId, (current) => ({ ...current, referenceAssetId }))}
                onDeleteAsset={(assetId) => void handleDeleteAsset(assetId)}
                onSettingsChange={changeReference}
                onLinkFrame={linkFrame}
                onAutoLink={autoLink}
              />
            )}
            {tab === 'layers' && frame && (
              <LayersPanel
                layers={layers}
                referenceLocked={referenceSettings.locked}
                counts={{
                  hitboxes: frame.hitboxes.length,
                  grabboxes: frame.grabboxes.length,
                  hurtboxes: frame.hurtboxes.length,
                  silhouette: frame.silhouette.points.length,
                }}
                onToggle={toggleLayer}
                onReferenceLockChange={(locked) => changeReference({ locked })}
              />
            )}
            {tab === 'defaults' && <DefaultsPanel defaults={defaults} onChange={updateDefaults} />}
          </div>
        </aside>
      </div>
      {showShortcuts && <ShortcutSheet onClose={() => setShowShortcuts(false)} />}
    </main>
  );
}
