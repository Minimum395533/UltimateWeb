import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { decompressFrames, parseGIF } from 'gifuct-js';
import type { ParsedFrame } from 'gifuct-js';
import {
  createEmptyHurtbox,
  createMovementFrame,
  createSilhouettePoint,
  cloneMovementFrame,
  replaceMovementFrame,
} from '../../dev/frameDataModel';
import { isAnimatedWebp } from '../../dev/webpAnimation';
import {
  createMovementDraft,
  deleteMovementDraft,
  deleteMovementReference,
  getMovementReference,
  listMovementDrafts,
  updateMovementDraft,
  uploadMovementReference,
} from '../../dev/frameDataClient';
import { DEFAULT_REFERENCE_ALIGNMENT, MOVEMENT_STATES } from '../../types/frameData';
import type {
  MovementFrame,
  MovementFrameDraft,
  MovementHurtbox,
  ReferenceAlignment,
  MovementSilhouette,
  MovementState,
  SilhouettePoint,
} from '../../types/frameData';
import './FrameDataEditor.css';

const VIEW = { width: 480, height: 320 };
const FRAME_LIMIT = 2000;
const HURTBOX_LIMIT = 64;
const SILHOUETTE_LIMIT = 512;
const COORDINATE_LIMIT = 500;
const NEW_REFERENCE_ALIGNMENT: ReferenceAlignment = {
  ...DEFAULT_REFERENCE_ALIGNMENT,
  locked: false,
};

type SaveState = 'saved' | 'dirty' | 'saving' | 'error';

const unitToX = (x: number) => (x + 24) * 10;
const unitToY = (y: number) => (28 - y) * 10;
const stateLabel = (state: MovementState) => (
  MOVEMENT_STATES.find((item) => item.id === state)?.label ?? state
);
const safeNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, parsed)) : fallback;
};
const formatCoordinate = (value: number) => String(value);
const isGif = (mediaType: string, fileName: string) => (
  mediaType.toLowerCase().includes('gif') || fileName.toLowerCase().endsWith('.gif')
);
const isWebp = (mediaType: string, fileName: string) => (
  mediaType.toLowerCase().includes('webp') || fileName.toLowerCase().endsWith('.webp')
);

type AnimatedReference = {
  format: 'GIF';
  frames: ParsedFrame[];
  width: number;
  height: number;
} | {
  format: 'WEBP';
  decoder: ImageDecoder;
  frameCount: number;
};

function pointString(point: SilhouettePoint) {
  return `${unitToX(point.x)},${unitToY(point.y)}`;
}

function NumberField({
  value,
  label,
  axisLabel,
  step = 0.1,
  onChange,
  className = '',
}: {
  value: number;
  label: string;
  axisLabel?: string;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <label className={`fd-number-field${axisLabel ? ' has-axis-label' : ''}`}>
      {axisLabel && <span className="fd-axis-label">{axisLabel}</span>}
      <input
        aria-label={label}
        className={`fd-number-input ${className}`}
        type="number"
        step={step}
        min={-COORDINATE_LIMIT}
        max={COORDINATE_LIMIT}
        value={formatCoordinate(value)}
        onChange={(event) => onChange(safeNumber(event.currentTarget.value, value))}
      />
    </label>
  );
}

const FrameDataEditor = () => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<MovementFrameDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MovementFrameDraft | null>(null);
  const [selectedState, setSelectedState] = useState<MovementState>('idle');
  const [activeFrameId, setActiveFrameId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState('All edits saved');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [addingPoint, setAddingPoint] = useState(false);
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | null>(null);
  const [referenceOpacity, setReferenceOpacity] = useState(0.45);
  const [animatedReference, setAnimatedReference] = useState<AnimatedReference | null>(null);
  const [animationFrameIndex, setAnimationFrameIndex] = useState(0);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [webpFrameDuration, setWebpFrameDuration] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showSilhouette, setShowSilhouette] = useState(true);
  const [showHurtboxes, setShowHurtboxes] = useState(true);
  const [viewZoom, setViewZoom] = useState(1);
  const [viewPan, setViewPan] = useState({ x: 0, y: 0 });
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const revision = useRef(0);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingPoint = useRef<string | null>(null);
  const webpDecoderRef = useRef<ImageDecoder | null>(null);
  const webpDecodeRequestRef = useRef(0);
  const draggingEndpoint = useRef<{ hurtboxId: string; endpoint: 'start' | 'end' } | null>(null);
  const draggingReference = useRef<{
    clientX: number;
    clientY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const suppressCanvasClick = useRef(false);
  const referenceUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeFrame = useMemo(
    () => draft?.frames.find((frame) => frame.id === activeFrameId) ?? draft?.frames[0] ?? null,
    [draft, activeFrameId],
  );
  const activeAsset = useMemo(
    () => draft?.assets.find((asset) => asset.id === draft.referenceAssetId) ?? null,
    [draft],
  );
  const referenceAlignment = draft?.referenceAlignment ?? DEFAULT_REFERENCE_ALIGNMENT;
  const referenceImageBox = {
    x: 240 + referenceAlignment.offsetX * 10 - 70 * referenceAlignment.scale,
    y: 280 + referenceAlignment.offsetY * -10 - 120 * referenceAlignment.scale,
    width: 140 * referenceAlignment.scale,
    height: 240 * referenceAlignment.scale,
  };
  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextDrafts = await listMovementDrafts();
      setDrafts(nextDrafts);
      const selected = nextDrafts[0] ?? null;
      setSelectedDraftId(selected?.id ?? null);
      setDraft(selected ? structuredClone(selected) : null);
      setActiveFrameId(selected?.frames[0]?.id ?? null);
      if (selected) setSelectedState(selected.motionState);
      setSaveState('saved');
      setSaveMessage('All edits saved');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load movement drafts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const markDirty = () => {
    revision.current += 1;
    setSaveState('dirty');
    setSaveMessage('Unsaved edits');
  };

  const updateDraftLocal = (updater: (current: MovementFrameDraft) => MovementFrameDraft) => {
    setDraft((current) => {
      if (!current) return current;
      return updater(current);
    });
    markDirty();
  };

  const updateReferenceAlignment = (patch: Partial<ReferenceAlignment>) => {
    updateDraftLocal((current) => ({
      ...current,
      referenceAlignment: {
        ...(current.referenceAlignment ?? DEFAULT_REFERENCE_ALIGNMENT),
        ...patch,
      },
    }));
  };

  const updateFrame = (frameId: string, updater: (frame: MovementFrame) => MovementFrame) => {
    updateDraftLocal((current) => {
      const found = current.frames.find((frame) => frame.id === frameId);
      if (!found) return current;
      return { ...current, frames: replaceMovementFrame(current.frames, updater(found)) };
    });
  };

  const changeName = (name: string) => {
    setDraft((current) => current ? { ...current, name } : current);
    markDirty();
  };

  const createDraft = async () => {
    if (saveState === 'dirty' || saveState === 'error') {
      const discard = window.confirm('Discard unsaved changes and create a new draft?');
      if (!discard) return;
    }
    setCreating(true);
    setError(null);
    try {
      const created = await createMovementDraft({
        motionState: selectedState,
        name: `${stateLabel(selectedState)} draft`,
      });
      setDrafts((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedDraftId(created.id);
      setDraft(structuredClone(created));
      setActiveFrameId(created.frames[0]?.id ?? null);
      setSelectedPointId(null);
      setSaveState('saved');
      setSaveMessage('Draft created');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Could not create this draft.');
    } finally {
      setCreating(false);
    }
  };

  const selectDraft = (next: MovementFrameDraft) => {
    if (next.id === selectedDraftId) return;
    if (saveState === 'dirty' || saveState === 'error') {
      const discard = window.confirm('Discard unsaved changes and open this draft?');
      if (!discard) return;
    }
    setDraft(structuredClone(next));
    setSelectedDraftId(next.id);
    setActiveFrameId(next.frames[0]?.id ?? null);
    setSelectedState(next.motionState);
    setSelectedPointId(null);
    setAddingPoint(false);
    setSaveState('saved');
    setSaveMessage('All edits saved');
    setError(null);
  };

  const saveDraft = useCallback(async () => {
    if (!draft || saveState === 'saving') return false;
    const capturedRevision = revision.current;
    const captured = structuredClone(draft);
    setSaveState('saving');
    setSaveMessage('Saving to dev database…');
    setError(null);
    try {
      const saved = await updateMovementDraft(captured.id, {
        name: captured.name,
        frames: captured.frames,
        referenceAssetId: captured.referenceAssetId,
        referenceAlignment: captured.referenceAlignment,
      });
      setDrafts((current) => current.map((item) => item.id === saved.id ? saved : item));
      if (revision.current === capturedRevision) {
        setDraft(structuredClone(saved));
        setSaveState('saved');
        setSaveMessage('Saved to dev database');
        return true;
      } else {
        setSaveState('dirty');
        setSaveMessage('Newer edits still need saving');
        return false;
      }
    } catch (saveError) {
      setSaveState('error');
      setSaveMessage('Save failed');
      setError(saveError instanceof Error ? saveError.message : 'Could not save this draft.');
      return false;
    }
  }, [draft, saveState]);

  const testDraftInTraining = async () => {
    if (!draft || saveState === 'saving') return;
    if (saveState !== 'saved' && !(await saveDraft())) return;
    navigate(`/training?previewDraft=${encodeURIComponent(draft.id)}`);
  };

  const removeDraft = async () => {
    if (!draft) return;
    if (!window.confirm(`Delete “${draft.name}” and its movement frame draft? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteMovementDraft(draft.id);
      const remaining = drafts.filter((item) => item.id !== draft.id);
      setDrafts(remaining);
      setSelectedDraftId(remaining[0]?.id ?? null);
      setDraft(remaining[0] ? structuredClone(remaining[0]) : null);
      setActiveFrameId(remaining[0]?.frames[0]?.id ?? null);
      setSaveState('saved');
      setSaveMessage('Draft deleted');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Could not delete this draft.');
    }
  };

  const addFrame = () => {
    if (!draft || draft.frames.length >= FRAME_LIMIT) return;
    const frame = createMovementFrame(draft.frames.length + 1);
    updateDraftLocal((current) => ({
      ...current,
      frames: [...current.frames, frame],
    }));
    setActiveFrameId(frame.id);
    setSelectedPointId(null);
  };

  const duplicateFrame = () => {
    if (!draft || !activeFrame || draft.frames.length >= FRAME_LIMIT) return;
    const frame = cloneMovementFrame(activeFrame, draft.frames.length + 1);
    updateDraftLocal((current) => ({ ...current, frames: [...current.frames, frame] }));
    setActiveFrameId(frame.id);
    setSelectedPointId(null);
  };

  const removeFrame = () => {
    if (!draft || !activeFrame || draft.frames.length <= 1) return;
    const nextFrames = draft.frames
      .filter((frame) => frame.id !== activeFrame.id)
      .map((frame, index) => ({ ...frame, frameNumber: index + 1 }));
    updateDraftLocal((current) => ({ ...current, frames: nextFrames }));
    const priorIndex = draft.frames.findIndex((frame) => frame.id === activeFrame.id);
    setActiveFrameId(nextFrames[Math.max(0, priorIndex - 1)]?.id ?? nextFrames[0]?.id ?? null);
    setSelectedPointId(null);
  };

  const navigateFrame = useCallback((direction: -1 | 1) => {
    if (!draft || !activeFrame) return;
    const currentIndex = draft.frames.findIndex((frame) => frame.id === activeFrame.id);
    const nextFrame = draft.frames[currentIndex + direction];
    if (!nextFrame) return;
    setActiveFrameId(nextFrame.id);
    setSelectedPointId(null);
    setSelectedEndpoint(null);
    setAddingPoint(false);
  }, [draft, activeFrame]);

  const addHurtbox = () => {
    if (!activeFrame || activeFrame.hurtboxes.length >= HURTBOX_LIMIT) return;
    const box = createEmptyHurtbox();
    updateFrame(activeFrame.id, (frame) => ({ ...frame, hurtboxes: [...frame.hurtboxes, box] }));
  };

  const updateHurtbox = (
    hurtboxId: string,
    updater: (hurtbox: MovementHurtbox) => MovementHurtbox,
  ) => {
    if (!activeFrame) return;
    updateFrame(activeFrame.id, (frame) => ({
      ...frame,
      hurtboxes: frame.hurtboxes.map((hurtbox) => hurtbox.id === hurtboxId ? updater(hurtbox) : hurtbox),
    }));
  };

  const removeHurtbox = (hurtboxId: string) => {
    if (!activeFrame) return;
    updateFrame(activeFrame.id, (frame) => ({
      ...frame,
      hurtboxes: frame.hurtboxes.filter((hurtbox) => hurtbox.id !== hurtboxId),
    }));
  };

  const updateSilhouette = (updater: (silhouette: MovementSilhouette) => MovementSilhouette) => {
    if (!activeFrame) return;
    updateFrame(activeFrame.id, (frame) => ({ ...frame, silhouette: updater(frame.silhouette) }));
  };

  const svgCoordinates = (event: {
    currentTarget: SVGSVGElement;
    clientX: number;
    clientY: number;
  }) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const viewX = ((event.clientX - bounds.left) / bounds.width) * VIEW.width;
    const viewY = ((event.clientY - bounds.top) / bounds.height) * VIEW.height;
    const localX = (viewX - VIEW.width / 2 - viewPan.x) / viewZoom + VIEW.width / 2;
    const localY = (viewY - VIEW.height / 2 - viewPan.y) / viewZoom + VIEW.height / 2;
    return {
      x: Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, Number((localX / 10 - 24).toFixed(1)))),
      y: Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, Number((28 - localY / 10).toFixed(1)))),
    };
  };

  const panViewport = (x: number, y: number) => {
    setViewPan((current) => ({
      x: Math.max(-240, Math.min(240, current.x + x)),
      y: Math.max(-160, Math.min(160, current.y + y)),
    }));
  };

  const handlePointPointerDown = (event: ReactPointerEvent<SVGCircleElement>, pointId: string) => {
    if (addingPoint) return;
    event.stopPropagation();
    event.preventDefault();
    if (!svgRef.current) return;
    draggingPoint.current = pointId;
    suppressCanvasClick.current = true;
    setSelectedPointId(pointId);
    svgRef.current.setPointerCapture(event.pointerId);
  };

  const handleEndpointPointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    hurtboxId: string,
    endpoint: 'start' | 'end',
  ) => {
    if (addingPoint) return;
    event.stopPropagation();
    event.preventDefault();
    if (!svgRef.current) return;
    draggingEndpoint.current = { hurtboxId, endpoint };
    suppressCanvasClick.current = true;
    setSelectedEndpoint(`${hurtboxId}:${endpoint}`);
    svgRef.current.setPointerCapture(event.pointerId);
  };

  const handleEndpointKeyDown = (
    event: ReactKeyboardEvent<SVGCircleElement>,
    hurtboxId: string,
    endpoint: 'start' | 'end',
  ) => {
    const movementByKey: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: 1 },
      ArrowDown: { x: 0, y: -1 },
    };
    const movement = movementByKey[event.key];
    if (!movement) return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 1 : 0.1;
    setSelectedEndpoint(`${hurtboxId}:${endpoint}`);
    updateHurtbox(hurtboxId, (hurtbox) => {
      const point = hurtbox[endpoint];
      return {
        ...hurtbox,
        [endpoint]: {
          ...point,
          x: Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, Number((point.x + movement.x * step).toFixed(1)))),
          y: Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, Number((point.y + movement.y * step).toFixed(1)))),
        },
      };
    });
  };

  const handleCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingReference.current && draft && !referenceAlignment.locked) {
      const drag = draggingReference.current;
      const bounds = event.currentTarget.getBoundingClientRect();
      const screenToView = VIEW.width / bounds.width;
      const deltaX = (event.clientX - drag.clientX) * screenToView / viewZoom / 10;
      const deltaY = (event.clientY - drag.clientY) * screenToView / viewZoom / 10;
      updateReferenceAlignment({
        offsetX: Math.max(-20, Math.min(20, Number((drag.offsetX + deltaX).toFixed(1)))),
        offsetY: Math.max(-20, Math.min(20, Number((drag.offsetY - deltaY).toFixed(1)))),
      });
      return;
    }
    if (!draggingPoint.current && !draggingEndpoint.current) return;
    const coordinates = svgCoordinates(event);
    if (draggingPoint.current) {
      const pointId = draggingPoint.current;
      updateSilhouette((silhouette) => ({
        ...silhouette,
        points: silhouette.points.map((point) => point.id === pointId ? { ...point, ...coordinates } : point),
      }));
    } else if (draggingEndpoint.current) {
      const { hurtboxId, endpoint } = draggingEndpoint.current;
      updateHurtbox(hurtboxId, (hurtbox) => ({
        ...hurtbox,
        [endpoint]: { ...hurtbox[endpoint], ...coordinates },
      }));
    }
  };

  const handleCanvasPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    draggingReference.current = null;
    draggingPoint.current = null;
    draggingEndpoint.current = null;
    if (event.type === 'pointercancel') {
      suppressCanvasClick.current = false;
    }
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  };

  const handleReferencePointerDown = (event: ReactPointerEvent<SVGElement>) => {
    if (!draft || referenceAlignment.locked) return;
    event.preventDefault();
    event.stopPropagation();
    draggingReference.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      offsetX: referenceAlignment.offsetX,
      offsetY: referenceAlignment.offsetY,
    };
    suppressCanvasClick.current = true;
    svgRef.current?.setPointerCapture(event.pointerId);
  };

  const handleCanvasClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (suppressCanvasClick.current) {
      suppressCanvasClick.current = false;
      return;
    }
    if (activeAsset && !referenceAlignment.locked) return;
    if (!addingPoint || !activeFrame || activeFrame.silhouette.points.length >= SILHOUETTE_LIMIT) return;
    const coordinates = svgCoordinates(event);
    const newPoint = createSilhouettePoint(coordinates.x, coordinates.y);
    updateSilhouette((silhouette) => ({
      ...silhouette,
      points: [...silhouette.points, newPoint],
    }));
    setSelectedPointId(newPoint.id);
  };

  const removeSilhouettePoint = (pointId: string) => {
    updateSilhouette((silhouette) => ({
      ...silhouette,
      points: silhouette.points.filter((point) => point.id !== pointId),
    }));
    if (selectedPointId === pointId) setSelectedPointId(null);
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file || !draft) return;
    setReferenceError(null);
    try {
      const asset = await uploadMovementReference(draft.id, file);
      updateDraftLocal((current) => ({
        ...current,
        assets: [asset, ...current.assets.filter((item) => item.id !== asset.id)],
        referenceAssetId: asset.id,
        referenceAlignment: { ...NEW_REFERENCE_ALIGNMENT },
      }));
      setAnimatedReference(null);
      setAnimationFrameIndex(0);
      setAnimationPlaying(false);
      setReferenceOpacity(0.45);
      setSaveMessage('Reference uploaded · save draft to attach');
    } catch (uploadError) {
      setReferenceError(uploadError instanceof Error ? uploadError.message : 'Reference upload failed.');
    }
  };

  const detachReference = async () => {
    if (!draft || !activeAsset) return;
    if (!window.confirm(`Remove “${activeAsset.fileName}” from this draft?`)) return;
    setReferenceError(null);
    try {
      await deleteMovementReference(draft.id, activeAsset.id);
      setDraft((current) => current ? {
        ...current,
        assets: current.assets.filter((asset) => asset.id !== activeAsset.id),
        referenceAssetId: null,
      } : current);
      markDirty();
      setAnimatedReference(null);
      setAnimationFrameIndex(0);
      setAnimationPlaying(false);
      setSaveMessage('Reference removed · save draft to persist');
    } catch (deleteError) {
      setReferenceError(deleteError instanceof Error ? deleteError.message : 'Could not remove this reference.');
    }
  };

  const referenceDraftId = draft?.id;
  const referenceAssetId = activeAsset?.id;
  const referenceMediaType = activeAsset?.mediaType;
  const referenceFileName = activeAsset?.fileName;

  useEffect(() => {
    let alive = true;
    let ownedUrl: string | null = null;
    setReferenceError(null);
    setReferenceUrl(null);
    setAnimatedReference(null);
    setAnimationFrameIndex(0);
    setAnimationPlaying(false);
    setWebpFrameDuration(100);
    if (!referenceDraftId || !referenceAssetId || !referenceMediaType || !referenceFileName) return undefined;
    getMovementReference(referenceDraftId, referenceAssetId)
      .then(async (blob) => {
        if (!alive) return;
        if (isGif(referenceMediaType, referenceFileName)) {
          const parsed = parseGIF(await blob.arrayBuffer());
          const frames = decompressFrames(parsed, true);
          if (!frames.length) throw new Error('This GIF contains no displayable frames.');
          if (!alive) return;
          setAnimatedReference({
            format: 'GIF',
            frames,
            width: parsed.lsd.width,
            height: parsed.lsd.height,
          });
          return;
        }
        if (isWebp(referenceMediaType, referenceFileName) && await isAnimatedWebp(blob)) {
          if (typeof ImageDecoder === 'undefined') {
            throw new Error('Animated WebP frame stepping requires a browser with WebCodecs ImageDecoder support.');
          }
          if (!await ImageDecoder.isTypeSupported('image/webp')) {
            throw new Error('This browser cannot decode animated WebP references.');
          }
          const decoder = new ImageDecoder({
            data: await blob.arrayBuffer(),
            type: 'image/webp',
            preferAnimation: true,
          });
          try {
            await decoder.tracks.ready;
            if (!alive) {
              decoder.close();
              return;
            }
            const track = decoder.tracks.selectedTrack;
            if (track?.animated && track.frameCount > 1) {
              webpDecoderRef.current = decoder;
              setAnimatedReference({
                format: 'WEBP',
                decoder,
                frameCount: track.frameCount,
              });
              return;
            }
            decoder.close();
          } catch (decodeError) {
            decoder.close();
            throw decodeError;
          }
        }
        ownedUrl = URL.createObjectURL(blob);
        referenceUrlRef.current = ownedUrl;
        setReferenceUrl(ownedUrl);
      })
      .catch((loadError: unknown) => {
        if (alive) setReferenceError(loadError instanceof Error ? loadError.message : 'Could not load reference image.');
      });
    return () => {
      alive = false;
      webpDecodeRequestRef.current += 1;
      if (webpDecoderRef.current) {
        webpDecoderRef.current.close();
        webpDecoderRef.current = null;
      }
      if (ownedUrl) URL.revokeObjectURL(ownedUrl);
      if (referenceUrlRef.current === ownedUrl) referenceUrlRef.current = null;
    };
  }, [referenceDraftId, referenceAssetId, referenceMediaType, referenceFileName]);

  useEffect(() => {
    if (animatedReference?.format !== 'GIF') return;
    const frame = animatedReference.frames[animationFrameIndex];
    if (!frame) return;
    const canvas = document.createElement('canvas');
    canvas.width = animatedReference.width;
    canvas.height = animatedReference.height;
    const context = canvas.getContext('2d');
    if (!context) return;
    let restoreFrame: ImageData | null = null;
    for (let index = 0; index <= animationFrameIndex; index += 1) {
      const previous = animatedReference.frames[index - 1];
      if (previous?.disposalType === 2) {
        context.clearRect(previous.dims.left, previous.dims.top, previous.dims.width, previous.dims.height);
      } else if (previous?.disposalType === 3 && restoreFrame) {
        context.putImageData(restoreFrame, 0, 0);
      }
      const current = animatedReference.frames[index];
      if (current.disposalType === 3) {
        restoreFrame = context.getImageData(0, 0, canvas.width, canvas.height);
      } else {
        restoreFrame = null;
      }
      const patch = new Uint8ClampedArray(current.patch.length);
      patch.set(current.patch);
      context.putImageData(
        new ImageData(patch, current.dims.width, current.dims.height),
        current.dims.left,
        current.dims.top,
      );
    }
    setReferenceUrl(canvas.toDataURL('image/png'));
  }, [animatedReference, animationFrameIndex]);

  useEffect(() => {
    if (animatedReference?.format !== 'WEBP') return undefined;
    let alive = true;
    const requestId = ++webpDecodeRequestRef.current;
    const { decoder } = animatedReference;
    void decoder.decode({
      frameIndex: animationFrameIndex,
      completeFramesOnly: true,
    }).then(({ image }) => {
      if (!alive || requestId !== webpDecodeRequestRef.current) {
        image.close();
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = image.displayWidth || image.codedWidth;
      canvas.height = image.displayHeight || image.codedHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        image.close();
        throw new Error('Could not create a canvas for the WebP frame.');
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const duration = Math.max(40, (image.duration ?? 100_000) / 1000);
      image.close();
      setWebpFrameDuration(duration);
      setReferenceUrl(canvas.toDataURL('image/png'));
    }).catch((decodeError: unknown) => {
      if (!alive) return;
      setAnimationPlaying(false);
      setReferenceError(
        decodeError instanceof Error ? decodeError.message : 'Could not decode this WebP frame.',
      );
    });
    return () => {
      alive = false;
    };
  }, [animatedReference, animationFrameIndex]);

  const animatedFrameCount = animatedReference?.format === 'GIF'
    ? animatedReference.frames.length
    : animatedReference?.frameCount ?? 0;
  const animatedFormat = animatedReference?.format ?? null;
  const animationDelay = animatedReference?.format === 'GIF'
    ? Math.max(40, (animatedReference.frames[animationFrameIndex]?.delay || 100) * 10)
    : webpFrameDuration;

  useEffect(() => {
    if (!animationPlaying || !animatedReference || animatedFrameCount < 2) return undefined;
    const timer = window.setTimeout(() => {
      setAnimationFrameIndex((index) => (index + 1) % animatedFrameCount);
    }, animationDelay);
    return () => window.clearTimeout(timer);
  }, [animationPlaying, animatedReference, animatedFrameCount, animationFrameIndex, animationDelay]);

  useEffect(() => () => {
    if (referenceUrlRef.current) URL.revokeObjectURL(referenceUrlRef.current);
  }, []);

  useEffect(() => {
    if (saveState !== 'dirty' && saveState !== 'saving' && saveState !== 'error') return undefined;
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
      if (
        destination.origin !== window.location.origin
        || destination.pathname === window.location.pathname
      ) return;
      if (!window.confirm('Leave the movement editor? Unsaved changes will be lost.')) {
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
  }, [saveState]);

  useEffect(() => {
    const handleKeyboardShortcuts = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (draft && saveState !== 'saved' && saveState !== 'saving' && draft.name.trim()) {
          void saveDraft();
        }
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName.toLowerCase();
        if (
          tagName === 'input'
          || tagName === 'textarea'
          || tagName === 'select'
          || target.isContentEditable
        ) return;
      }
      event.preventDefault();
      navigateFrame(event.key === 'ArrowLeft' ? -1 : 1);
    };
    window.addEventListener('keydown', handleKeyboardShortcuts);
    return () => window.removeEventListener('keydown', handleKeyboardShortcuts);
  }, [draft, saveState, saveDraft, navigateFrame]);

  const stepReferenceFrame = (direction: -1 | 1) => {
    if (animatedFrameCount < 1) return;
    setAnimationPlaying(false);
    setAnimationFrameIndex((index) => (
      (index + direction + animatedFrameCount) % animatedFrameCount
    ));
  };

  const saveStateClass = saveState === 'saved'
    ? 'is-saved'
    : saveState === 'dirty'
      ? 'is-dirty'
      : saveState === 'error' ? 'is-error' : '';

  return (
    <main className="fd-editor">
      <div className="fd-shell">
        <header className="fd-topline">
          <div className="fd-brand">
            <div className="fd-brand-mark" aria-hidden="true">CF</div>
            <div className="fd-brand-copy">
              <strong>SMASH LAB / MOVEMENT</strong>
              <span>CAPTAIN FALCON · AUTHORING CONSOLE</span>
            </div>
          </div>
          <div className="fd-build-tag"><i aria-hidden="true" /> DEV TOOL</div>
        </header>

        <section className="fd-heading">
          <div>
            <span className="fd-eyebrow">FRAME DATA WORKSHOP / 01</span>
            <h1>Movement editor</h1>
          </div>
          <p>Draw and inspect movement hurtboxes one frame at a time. The silhouette is a visual guide only; it never changes collision.</p>
        </section>

        <div className="fd-workspace">
          <aside className="fd-library fd-panel" aria-label="Movement draft library">
            <div className="fd-library-head">
              <div className="fd-library-head-row">
                <div>
                  <span className="fd-section-kicker">CAPTAIN FALCON</span>
                  <h2>Draft library</h2>
                </div>
                <span className="fd-count">{drafts.length}</span>
              </div>
            </div>
            <div className="fd-library-create">
              <label className="fd-label" htmlFor="fd-motion-state">Create for movement state</label>
              <select
                id="fd-motion-state"
                className="fd-select"
                value={selectedState}
                onChange={(event) => setSelectedState(event.currentTarget.value as MovementState)}
              >
                {MOVEMENT_STATES.map((state) => (
                  <option key={state.id} value={state.id}>{state.label}</option>
                ))}
              </select>
              <button className="fd-button fd-button-primary" type="button" onClick={() => void createDraft()} disabled={creating}>
                {creating ? 'Creating…' : '+ New movement draft'}
              </button>
            </div>
            {loading ? (
              <div className="fd-loading-list" aria-label="Loading drafts">
                <div className="fd-skeleton" />
                <div className="fd-skeleton" />
                <div className="fd-skeleton" />
              </div>
            ) : drafts.length ? (
              <div className="fd-draft-list">
                {drafts.map((item) => (
                  <button
                    className={`fd-draft-item${item.id === selectedDraftId ? ' is-active' : ''}`}
                    key={item.id}
                    type="button"
                    onClick={() => selectDraft(item)}
                    aria-current={item.id === selectedDraftId ? 'true' : undefined}
                  >
                    <strong>{item.name || 'Untitled movement'}</strong>
                    <span className="fd-draft-meta">
                      <span className="fd-draft-state">{stateLabel(item.motionState)}</span>
                      <span>{item.frames.length} FR</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="fd-empty-library">
                <strong>No movement drafts yet</strong>
              Choose a movement state above, then create its first draft.
              </div>
            )}
          </aside>

          <section className="fd-main" aria-label="Movement frame authoring">
            {error && (
              <div className="fd-alert" role="alert">
                <span>{error}</span>
                  {!drafts.length && (
                  <button type="button" onClick={() => void loadDrafts()}>Retry</button>
                )}
              </div>
            )}

            {!draft ? (
              <div className="fd-empty-editor fd-panel">
                <div className="fd-empty-editor-inner">
                  <div className="fd-empty-emblem" aria-hidden="true">01</div>
                  <h2>{loading ? 'Opening the frame library' : 'Choose a movement to begin'}</h2>
                  <p>{loading ? 'Reading Captain Falcon drafts from the development database.' : 'Create a draft for any movement state or load one from the library. Each motion stays an independent draft.'}</p>
                  {!loading && error && (
                    <button className="fd-button fd-no-drafts-retry" type="button" onClick={() => void loadDrafts()}>Retry loading drafts</button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <section className="fd-clip-header fd-panel">
                  <label className="fd-clip-name">
                    <span className="fd-label">Draft name <span aria-hidden="true">·</span> {stateLabel(draft.motionState)}</span>
                    <input
                      className="fd-text-input"
                      type="text"
                      value={draft.name}
                      required
                      maxLength={120}
                      onChange={(event) => changeName(event.currentTarget.value)}
                      aria-label="Draft name"
                    />
                  </label>
                  <div className="fd-clip-actions">
                    <button
                      className="fd-button fd-button-primary"
                      type="button"
                      onClick={() => void testDraftInTraining()}
                      disabled={saveState === 'saving' || !draft.name.trim()}
                    >
                      Test in training
                    </button>
                    <button
                      className="fd-button fd-button-gold"
                      type="button"
                      onClick={() => void saveDraft()}
                      disabled={saveState === 'saving' || saveState === 'saved' || !draft.name.trim()}
                    >
                      {saveState === 'saving' ? 'Saving…' : 'Save draft'}
                    </button>
                    <button className="fd-button fd-button-danger" type="button" onClick={() => void removeDraft()}>
                      Delete draft
                    </button>
                  </div>
                  <div className="fd-save-row">
                    <span className={`fd-save-state ${saveStateClass}`} role="status">{saveMessage}</span>
                    <span className="fd-save-meta">
                      <span className="fd-save-shortcut"><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>S</kbd> to save</span>
                      <span className="fd-save-state">Development draft</span>
                    </span>
                  </div>
                </section>

                <section className="fd-timeline fd-panel" aria-label="Frame timeline">
                  <div className="fd-section-head">
                    <div>
                      <span className="fd-section-kicker">MOTION CLIP</span>
                      <h2>Frame sequence <span className="fd-count">{draft.frames.length}</span></h2>
                    </div>
                    <div className="fd-frame-actions">
                      <div className="fd-frame-nav" role="group" aria-label="Frame navigation">
                        <button className="fd-button" type="button" onClick={() => navigateFrame(-1)} disabled={!activeFrame || draft.frames[0]?.id === activeFrame.id} aria-label="Previous frame">← Previous</button>
                        <button className="fd-button" type="button" onClick={() => navigateFrame(1)} disabled={!activeFrame || draft.frames[draft.frames.length - 1]?.id === activeFrame.id} aria-label="Next frame">Next →</button>
                      </div>
                      <button className="fd-button" type="button" onClick={addFrame} disabled={draft.frames.length >= FRAME_LIMIT}>+ Add frame</button>
                      <button className="fd-button" type="button" onClick={duplicateFrame} disabled={!activeFrame || draft.frames.length >= FRAME_LIMIT}>Duplicate</button>
                      <button className="fd-button fd-button-danger" type="button" onClick={removeFrame} disabled={draft.frames.length <= 1}>Remove</button>
                    </div>
                  </div>
                  <div className="fd-frame-scroller">
                    {draft.frames.map((frame) => (
                      <button
                        key={frame.id}
                        className={`fd-frame-chip${frame.id === activeFrame?.id ? ' is-active' : ''}`}
                        type="button"
                        onClick={() => {
                          setActiveFrameId(frame.id);
                          setSelectedPointId(null);
                          setAddingPoint(false);
                        }}
                        aria-pressed={frame.id === activeFrame?.id}
                        aria-label={`Select frame ${frame.frameNumber}`}
                      >
                        F{String(frame.frameNumber).padStart(2, '0')}
                        <small>{frame.hurtboxes.length} HB</small>
                      </button>
                    ))}
                  </div>
                </section>

                {activeFrame && (
                  <div className="fd-editor-layout">
                    <section className="fd-viewport-card fd-panel" aria-label={`Visual editor, frame ${activeFrame.frameNumber}`}>
                      <div className="fd-viewport-head">
                        <div className="fd-viewport-title">
                          <span className="fd-viewport-index">{String(activeFrame.frameNumber).padStart(2, '0')}</span>
                          <span>
                            <strong>Pose viewport</strong>
                            <small>1 GRID = 1 SMASH UNIT · XY PROJECTION</small>
                          </span>
                        </div>
                        <div className="fd-view-tools" role="group" aria-label="Viewport layers">
                          <button className="fd-tool-toggle" type="button" aria-pressed={showGrid} onClick={() => setShowGrid((value) => !value)}>Grid</button>
                          <button className="fd-tool-toggle" type="button" aria-pressed={showHurtboxes} onClick={() => setShowHurtboxes((value) => !value)}>Capsules</button>
                          <button className="fd-tool-toggle" type="button" aria-pressed={showSilhouette} onClick={() => setShowSilhouette((value) => !value)}>Silhouette</button>
                        </div>
                      </div>
                      <div className="fd-viewport-nav" role="group" aria-label="Grid zoom and pan">
                        <span className="fd-nav-label">GRID VIEW</span>
                        <button
                          className="fd-mini-button"
                          type="button"
                          aria-label="Zoom out"
                          onClick={() => setViewZoom((zoom) => Math.max(0.5, Number((zoom - 0.1).toFixed(1))))}
                          disabled={viewZoom <= 0.5}
                        >−</button>
                        <span className="fd-zoom-value">{viewZoom.toFixed(1)}×</span>
                        <button
                          className="fd-mini-button"
                          type="button"
                          aria-label="Zoom in"
                          onClick={() => setViewZoom((zoom) => Math.min(2.5, Number((zoom + 0.1).toFixed(1))))}
                          disabled={viewZoom >= 2.5}
                        >+</button>
                        <div className="fd-pan-pad" role="group" aria-label="Pan grid">
                          <button type="button" aria-label="Pan up" onClick={() => panViewport(0, 18)}>↑</button>
                          <button type="button" aria-label="Pan left" onClick={() => panViewport(18, 0)}>←</button>
                          <button type="button" aria-label="Center grid" onClick={() => setViewPan({ x: 0, y: 0 })}>Center</button>
                          <button type="button" aria-label="Pan right" onClick={() => panViewport(-18, 0)}>→</button>
                          <button type="button" aria-label="Pan down" onClick={() => panViewport(0, -18)}>↓</button>
                        </div>
                      </div>
                      <div className="fd-canvas-wrap">
                        <svg
                          ref={svgRef}
                          className={`fd-canvas${addingPoint ? ' is-adding' : ''}`}
                          viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
                          role="group"
                          aria-label="X and Y Smash unit grid with reference image, presentation silhouette and projected hurtbox capsules"
                          onPointerMove={handleCanvasPointerMove}
                          onPointerUp={handleCanvasPointerUp}
                          onPointerCancel={handleCanvasPointerUp}
                          onClick={handleCanvasClick}
                        >
                          <defs>
                            <pattern id="fd-unit-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#aab9c8" strokeWidth="0.55" opacity="0.55" />
                            </pattern>
                            <pattern id="fd-grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
                              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#72869a" strokeWidth="0.9" opacity="0.4" />
                            </pattern>
                            <clipPath id="fd-canvas-clip">
                              <rect width={VIEW.width} height={VIEW.height} />
                            </clipPath>
                          </defs>
                          <rect width={VIEW.width} height={VIEW.height} fill="#e7eef4" />
                          <g
                            clipPath="url(#fd-canvas-clip)"
                            transform={`translate(${VIEW.width / 2 + viewPan.x} ${VIEW.height / 2 + viewPan.y}) scale(${viewZoom}) translate(${-VIEW.width / 2} ${-VIEW.height / 2})`}
                          >
                          {referenceUrl && activeAsset && (
                            <image
                              className={`fd-reference-image${referenceAlignment.locked ? ' is-locked' : ' is-draggable'}`}
                              href={referenceUrl}
                              x={referenceImageBox.x}
                              y={referenceImageBox.y}
                              width={referenceImageBox.width}
                              height={referenceImageBox.height}
                              preserveAspectRatio="xMidYMid meet"
                              opacity={referenceOpacity}
                              aria-label={`Reference image ${activeAsset.fileName}`}
                              onPointerDown={handleReferencePointerDown}
                              onClick={(event) => {
                                suppressCanvasClick.current = false;
                                if (!addingPoint) event.stopPropagation();
                              }}
                            />
                          )}
                          {showGrid && (
                            <>
                              <rect width={VIEW.width} height={VIEW.height} fill="url(#fd-unit-grid)" />
                              <rect width={VIEW.width} height={VIEW.height} fill="url(#fd-grid-major)" />
                            </>
                          )}
                          <line x1="0" y1={unitToY(0)} x2={VIEW.width} y2={unitToY(0)} stroke="#62778c" strokeWidth="1.1" opacity=".82" />
                          <line x1={unitToX(0)} y1="0" x2={unitToX(0)} y2={VIEW.height} stroke="#62778c" strokeWidth="1.1" opacity=".82" />
                          <text x="8" y="14" fill="#63778b" fontSize="8" fontFamily="DM Mono, monospace">Y / UNITS</text>
                          <text x="445" y={unitToY(0) - 5} fill="#63778b" fontSize="8" fontFamily="DM Mono, monospace">X →</text>
                          <text x={unitToX(0) + 5} y={unitToY(0) + 12} fill="#63778b" fontSize="7" fontFamily="DM Mono, monospace">0,0</text>

                          {showSilhouette && activeFrame.silhouette.points.length > 1 && (
                            activeFrame.silhouette.closed ? (
                              <polygon
                                className="fd-silhouette-path"
                                points={activeFrame.silhouette.points.map(pointString).join(' ')}
                                fill={activeFrame.silhouette.color}
                                stroke={activeFrame.silhouette.color}
                              />
                            ) : (
                              <polyline
                                className="fd-silhouette-path"
                                points={activeFrame.silhouette.points.map(pointString).join(' ')}
                                fill="none"
                                stroke={activeFrame.silhouette.color}
                              />
                            )
                          )}

                          {showHurtboxes && activeFrame.hurtboxes.map((hurtbox, index) => {
                            const color = hurtbox.isVulnerable ? '#13a9c1' : '#d26b5e';
                            return (
                              <g className="fd-hurtbox-layer" key={hurtbox.id}>
                                <line
                                  className="fd-hurtbox-line"
                                  x1={unitToX(hurtbox.start.x)}
                                  y1={unitToY(hurtbox.start.y)}
                                  x2={unitToX(hurtbox.end.x)}
                                  y2={unitToY(hurtbox.end.y)}
                                  stroke={color}
                                  strokeWidth={Math.max(2, hurtbox.radius * 20)}
                                  opacity=".28"
                                />
                                <line
                                  className="fd-hurtbox-line"
                                  x1={unitToX(hurtbox.start.x)}
                                  y1={unitToY(hurtbox.start.y)}
                                  x2={unitToX(hurtbox.end.x)}
                                  y2={unitToY(hurtbox.end.y)}
                                  stroke={color}
                                  strokeWidth="1.5"
                                  opacity=".95"
                                />
                                {(['start', 'end'] as const).map((endpoint) => {
                                  const point = hurtbox[endpoint];
                                  const endpointKey = `${hurtbox.id}:${endpoint}`;
                                  const endpointLabel = endpoint === 'start' ? 'A' : 'B';
                                  return (
                                    <g className={`fd-hurtbox-endpoint${selectedEndpoint === endpointKey ? ' is-selected' : ''}`} key={endpoint}>
                                      <circle
                                        className="fd-hurtbox-hit-target"
                                        cx={unitToX(point.x)}
                                        cy={unitToY(point.y)}
                                        r="11"
                                        onPointerDown={(event) => handleEndpointPointerDown(event, hurtbox.id, endpoint)}
                                        onKeyDown={(event) => handleEndpointKeyDown(event, hurtbox.id, endpoint)}
                                        onClick={(event) => {
                                          suppressCanvasClick.current = false;
                                          if (!addingPoint) event.stopPropagation();
                                        }}
                                        onFocus={() => setSelectedEndpoint(endpointKey)}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={`Capsule ${index + 1} endpoint ${endpointLabel}, X ${formatCoordinate(point.x)}, Y ${formatCoordinate(point.y)}. Drag to reposition. Use arrow keys to move 0.1 units, or Shift plus an arrow key to move 1 unit.`}
                                      />
                                      <circle
                                        className="fd-hurtbox-handle"
                                        cx={unitToX(point.x)}
                                        cy={unitToY(point.y)}
                                        r={selectedEndpoint === endpointKey ? 5 : 3.8}
                                        fill={color}
                                      />
                                      <text x={unitToX(point.x) + 6} y={unitToY(point.y) - 5} fill={color} fontSize="7" fontFamily="DM Mono, monospace">{endpointLabel}</text>
                                    </g>
                                  );
                                })}
                                <text x={(unitToX(hurtbox.start.x) + unitToX(hurtbox.end.x)) / 2 + 6} y={(unitToY(hurtbox.start.y) + unitToY(hurtbox.end.y)) / 2 - 5} fill={color} fontSize="7" fontFamily="DM Mono, monospace">{`HB${index + 1}`}</text>
                              </g>
                            );
                          })}

                          {showSilhouette && activeFrame.silhouette.points.map((point, index) => (
                            <g key={point.id}>
                              <circle
                                className="fd-silhouette-point"
                                cx={unitToX(point.x)}
                                cy={unitToY(point.y)}
                                r={selectedPointId === point.id ? 4.3 : 3.2}
                                fill={activeFrame.silhouette.color}
                                onPointerDown={(event) => handlePointPointerDown(event, point.id)}
                                onClick={(event) => {
                                  suppressCanvasClick.current = false;
                                  if (!addingPoint) event.stopPropagation();
                                }}
                                onFocus={() => setSelectedPointId(point.id)}
                                tabIndex={0}
                                role="button"
                                aria-label={`Silhouette point ${index + 1}, X ${formatCoordinate(point.x)}, Y ${formatCoordinate(point.y)}`}
                              />
                              <text className="fd-point-index" x={unitToX(point.x) + 4} y={unitToY(point.y) - 4}>{index + 1}</text>
                            </g>
                          ))}
                          {addingPoint && (
                            <text x="240" y="18" textAnchor="middle" fill="#087e95" fontSize="8" fontFamily="DM Mono, monospace">CLICK TO ADD EACH POINT · CLICK MODE BUTTON TO FINISH</text>
                          )}
                          {referenceUrl && activeAsset && !referenceAlignment.locked && (
                            <rect
                              className="fd-reference-drag-surface"
                              x={referenceImageBox.x}
                              y={referenceImageBox.y}
                              width={referenceImageBox.width}
                              height={referenceImageBox.height}
                              fill="transparent"
                              pointerEvents="all"
                              aria-hidden="true"
                              onPointerDown={handleReferencePointerDown}
                            />
                          )}
                          </g>
                        </svg>
                      </div>
                      <div className="fd-canvas-note">
                        <span>Drag endpoint A/B to move X/Y · arrows move 0.1 u, Shift + arrow moves 1 u</span>
                        <strong>1 grid interval = 1 unit (u)</strong>
                      </div>
                      <div className="fd-reference-controls">
                        <div className="fd-reference-align-head">
                          <div>
                            <span className="fd-control-kicker">REFERENCE REGISTER</span>
                            <strong className={`fd-alignment-status${referenceAlignment.locked ? ' is-locked' : ' is-unlocked'}`} aria-live="polite">
                              <i aria-hidden="true" /> {!activeAsset
                                ? 'No reference attached'
                                : referenceAlignment.locked
                                  ? 'Position locked'
                                  : 'Position unlocked'}
                            </strong>
                            <p>
                              {!activeAsset
                                ? 'Upload a still image, GIF, or WebP to enable alignment and lock controls.'
                                : referenceAlignment.locked
                                  ? 'Reference is fixed. Unlock to realign.'
                                  : 'Drag the image to line it up. Lock before tracing so image movement cannot interfere with silhouette points or capsule endpoints.'}
                            </p>
                          </div>
                          <button
                            className={`fd-button fd-lock-button${referenceAlignment.locked ? ' is-locked' : ''}`}
                            type="button"
                            aria-label="Reference position lock"
                            aria-pressed={referenceAlignment.locked}
                            onClick={() => updateReferenceAlignment({ locked: !referenceAlignment.locked })}
                            disabled={!activeAsset}
                          >
                            {!activeAsset
                              ? 'Reference required'
                              : referenceAlignment.locked
                                ? 'Unlock position'
                                : 'Lock position'}
                          </button>
                        </div>
                        <label className="fd-control">
                          <span>Overlay opacity</span>
                          <span className="fd-range-row">
                            <input type="range" min="0" max="1" step="0.01" value={referenceOpacity} onChange={(event) => setReferenceOpacity(Number(event.currentTarget.value))} disabled={!activeAsset} />
                            <b className="fd-range-value">{Math.round(referenceOpacity * 100)}%</b>
                          </span>
                        </label>
                        <label className="fd-control">
                          <span>Reference scale</span>
                          <span className="fd-range-row fd-scale-row">
                            <input
                              aria-label="Reference scale"
                              type="range"
                              min="0.2"
                              max="3"
                              step="0.05"
                              value={referenceAlignment.scale}
                              onChange={(event) => updateReferenceAlignment({ scale: Number(event.currentTarget.value) })}
                              disabled={!activeAsset || referenceAlignment.locked}
                            />
                            <input
                              className="fd-number-input"
                              type="number"
                              min="0.2"
                              max="3"
                              step="0.05"
                              value={referenceAlignment.scale}
                              aria-label="Reference scale value"
                              onChange={(event) => {
                                const value = Number(event.currentTarget.value);
                                if (Number.isFinite(value)) {
                                  updateReferenceAlignment({ scale: Math.max(0.2, Math.min(3, value)) });
                                }
                              }}
                              disabled={!activeAsset || referenceAlignment.locked}
                            />
                          </span>
                        </label>
                        <div className="fd-offset-controls">
                          <div className="fd-offset-title">
                            <span>Position · Smash units</span>
                            <button
                              className="fd-reset-alignment"
                              type="button"
                              onClick={() => updateReferenceAlignment({ scale: 1, offsetX: 0, offsetY: 0 })}
                              disabled={!activeAsset || referenceAlignment.locked}
                            >
                              Reset alignment
                            </button>
                          </div>
                          {([
                            { axis: 'X', value: referenceAlignment.offsetX, fieldLabel: 'Reference horizontal offset' },
                            { axis: 'Y', value: referenceAlignment.offsetY, fieldLabel: 'Reference vertical offset' },
                          ] as const).map(({ axis, value, fieldLabel }) => (
                            <label className="fd-offset-row" key={axis}>
                              <span className="fd-offset-axis">{axis}</span>
                              <input
                                aria-label={`${fieldLabel} slider`}
                                type="range"
                                min="-20"
                                max="20"
                                step="0.5"
                                value={value}
                                onChange={(event) => updateReferenceAlignment({
                                  [axis === 'X' ? 'offsetX' : 'offsetY']: Number(event.currentTarget.value),
                                })}
                                disabled={!activeAsset || referenceAlignment.locked}
                              />
                              <input
                                className="fd-number-input"
                                type="number"
                                min="-20"
                                max="20"
                                step="0.1"
                                value={value}
                                aria-label={fieldLabel}
                                onChange={(event) => {
                                  const parsed = Number(event.currentTarget.value);
                                  if (Number.isFinite(parsed)) {
                                    updateReferenceAlignment({
                                      [axis === 'X' ? 'offsetX' : 'offsetY']: Math.max(-20, Math.min(20, parsed)),
                                    });
                                  }
                                }}
                                disabled={!activeAsset || referenceAlignment.locked}
                              />
                              <small>u</small>
                            </label>
                          ))}
                        </div>
                      </div>
                    </section>

                    <aside className="fd-inspector fd-panel" aria-label="Frame geometry controls">
                      <div className="fd-inspector-head">
                        <span className="fd-section-kicker">FRAME {String(activeFrame.frameNumber).padStart(2, '0')} · GEOMETRY</span>
                        <p>Coordinates and radius use Smash units (u). The viewport shows X/Y; edit Z precisely in the fields.</p>
                      </div>

                      <section className="fd-inspector-section">
                        <div className="fd-subsection-head">
                          <h3>Hurtbox capsules</h3>
                          <small>{activeFrame.hurtboxes.length} / {HURTBOX_LIMIT}</small>
                        </div>
                        <div className="fd-box-list">
                          {activeFrame.hurtboxes.map((hurtbox, index) => (
                            <div className={`fd-box-card${hurtbox.isVulnerable ? '' : ' is-invulnerable'}`} key={hurtbox.id}>
                              <div className="fd-box-card-head">
                                <span className="fd-box-name"><i className="fd-box-swatch" /> CAPSULE {String(index + 1).padStart(2, '0')}</span>
                                <button className="fd-mini-button is-danger" type="button" aria-label={`Remove capsule ${index + 1}`} onClick={() => removeHurtbox(hurtbox.id)}>Remove</button>
                              </div>
                              <div className="fd-box-body">
                                <div className="fd-point-row">
                                  <span className="fd-endpoint-label">A</span>
                                  {(['x', 'y', 'z'] as const).map((axis) => (
                                    <NumberField
                                      key={axis}
                                      label={`Capsule ${index + 1} endpoint A ${axis.toUpperCase()}`}
                                      axisLabel={axis.toUpperCase()}
                                      value={hurtbox.start[axis]}
                                      onChange={(value) => updateHurtbox(hurtbox.id, (current) => ({
                                        ...current, start: { ...current.start, [axis]: value },
                                      }))}
                                    />
                                  ))}
                                </div>
                                <div className="fd-point-row">
                                  <span className="fd-endpoint-label">B</span>
                                  {(['x', 'y', 'z'] as const).map((axis) => (
                                    <NumberField
                                      key={axis}
                                      label={`Capsule ${index + 1} endpoint B ${axis.toUpperCase()}`}
                                      axisLabel={axis.toUpperCase()}
                                      value={hurtbox.end[axis]}
                                      onChange={(value) => updateHurtbox(hurtbox.id, (current) => ({
                                        ...current, end: { ...current.end, [axis]: value },
                                      }))}
                                    />
                                  ))}
                                </div>
                                <div className="fd-radius-vulnerability">
                                  <label className="fd-inline-control">
                                    <span>Radius <small>(u)</small></span>
                                    <input
                                      className="fd-number-input"
                                      type="number"
                                      min="0.1"
                                      max="100"
                                      step="0.1"
                                      value={formatCoordinate(hurtbox.radius)}
                                      aria-label={`Capsule ${index + 1} radius`}
                                      onChange={(event) => {
                                        const value = Number(event.currentTarget.value);
                                        updateHurtbox(hurtbox.id, (current) => ({
                                          ...current,
                                          radius: Number.isFinite(value) ? Math.max(0.1, Math.min(100, value)) : current.radius,
                                        }));
                                      }}
                                    />
                                  </label>
                                  <label className="fd-vulnerability">
                                    Vulnerable
                                    <button
                                      type="button"
                                      className="fd-switch"
                                      role="switch"
                                      aria-checked={hurtbox.isVulnerable}
                                      aria-label={`Capsule ${index + 1} vulnerability`}
                                      onClick={() => updateHurtbox(hurtbox.id, (current) => ({ ...current, isVulnerable: !current.isVulnerable }))}
                                    />
                                  </label>
                                </div>
                              </div>
                            </div>
                          ))}
                          {!activeFrame.hurtboxes.length && (
                            <div className="fd-empty-boxes">No capsules on this frame. Add one to start mapping the hurtbox.</div>
                          )}
                          <button className="fd-button" type="button" onClick={addHurtbox} disabled={activeFrame.hurtboxes.length >= HURTBOX_LIMIT}>+ Add capsule hurtbox</button>
                        </div>
                      </section>

                      <section className="fd-inspector-section">
                        <div className="fd-subsection-head">
                          <h3>Presentation silhouette</h3>
                          <small>{activeFrame.silhouette.points.length} PTS</small>
                        </div>
                        <div className="fd-silhouette-tools">
                          <button
                            className={`fd-button${addingPoint ? ' fd-button-primary' : ''}`}
                            type="button"
                            aria-pressed={addingPoint}
                            aria-label={addingPoint ? 'Stop adding silhouette points' : 'Start adding silhouette points'}
                            title={addingPoint ? 'Point placement is on. Click the grid to add points, then select this button to finish.' : 'Turn on persistent point placement mode.'}
                            onClick={() => setAddingPoint((value) => !value)}
                            disabled={!addingPoint && activeFrame.silhouette.points.length >= SILHOUETTE_LIMIT}
                          >
                            {addingPoint ? 'Adding points · Done' : '+ Add points'}
                          </button>
                          <button className="fd-button" type="button" onClick={() => updateSilhouette((silhouette) => ({ ...silhouette, closed: !silhouette.closed }))} aria-pressed={activeFrame.silhouette.closed}>
                            {activeFrame.silhouette.closed ? 'Closed' : 'Open path'}
                          </button>
                          <label className="fd-color-field">
                            Color
                            <input type="color" aria-label="Silhouette color" value={activeFrame.silhouette.color} onChange={(event) => updateSilhouette((silhouette) => ({ ...silhouette, color: event.currentTarget.value }))} />
                          </label>
                        </div>
                        {activeFrame.silhouette.points.length ? (
                          <div className="fd-silhouette-points">
                            {activeFrame.silhouette.points.map((point, index) => (
                              <div className={`fd-sil-point-row${point.id === selectedPointId ? ' is-selected' : ''}`} key={point.id}>
                                <span className="fd-point-number">{String(index + 1).padStart(2, '0')}</span>
                                <NumberField label={`Silhouette point ${index + 1} X`} axisLabel="X" value={point.x} onChange={(x) => updateSilhouette((silhouette) => ({
                                  ...silhouette, points: silhouette.points.map((current) => current.id === point.id ? { ...current, x } : current),
                                }))} />
                                <NumberField label={`Silhouette point ${index + 1} Y`} axisLabel="Y" value={point.y} onChange={(y) => updateSilhouette((silhouette) => ({
                                  ...silhouette, points: silhouette.points.map((current) => current.id === point.id ? { ...current, y } : current),
                                }))} />
                                <button className="fd-mini-button is-danger" type="button" aria-label={`Remove silhouette point ${index + 1}`} onClick={() => removeSilhouettePoint(point.id)}>×</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="fd-empty-boxes">No silhouette points. Add points in the viewport or enter them here.</div>
                        )}
                        <p className="fd-silhouette-footnote">Visual outline only. It is separate from collision and does not affect gameplay.</p>
                      </section>

                      <section className="fd-media">
                        <div className="fd-media-title">
                          <div>
                            <span className="fd-section-kicker">VISUAL REFERENCE</span>
                            <h3>Still image / GIF / WebP</h3>
                            <p>Animated GIFs and WebPs can be paused and stepped frame by frame.</p>
                          </div>
                          {activeAsset && <span className="fd-asset-name" title={activeAsset.fileName}>{activeAsset.fileName}</span>}
                        </div>
                        <div className="fd-media-buttons">
                           <input ref={fileInputRef} className="fd-file-input" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif" onChange={(event) => void handleUpload(event)} />
                          <button className="fd-button" type="button" onClick={() => fileInputRef.current?.click()}>{activeAsset ? 'Replace reference' : 'Upload reference'}</button>
                          {activeAsset && <button className="fd-button fd-button-danger" type="button" onClick={() => void detachReference()}>Remove reference</button>}
                        </div>
                        {referenceError && <div className="fd-alert" role="alert" style={{ marginTop: 8 }}>{referenceError}</div>}
                        {animatedReference && animatedFrameCount > 0 && (
                          <div className="fd-gif-controls">
                            <span>{animatedFormat} FRAME {String(animationFrameIndex + 1).padStart(2, '0')} / {animatedFrameCount}</span>
                            <div className="fd-gif-buttons">
                              <button
                                className="fd-mini-button"
                                type="button"
                                onClick={() => stepReferenceFrame(-1)}
                                disabled={animatedFrameCount < 2}
                                aria-label="Previous animation frame"
                              >
                                Prev
                              </button>
                              <button
                                className="fd-mini-button"
                                type="button"
                                onClick={() => setAnimationPlaying((playing) => !playing)}
                                disabled={animatedFrameCount < 2}
                                aria-label={animationPlaying ? 'Pause animation' : 'Play animation'}
                              >
                                {animationPlaying ? 'Pause' : 'Play'}
                              </button>
                              <button
                                className="fd-mini-button"
                                type="button"
                                onClick={() => stepReferenceFrame(1)}
                                disabled={animatedFrameCount < 2}
                                aria-label="Next animation frame"
                              >
                                Next
                              </button>
                            </div>
                          </div>
                        )}
                      </section>
                    </aside>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default FrameDataEditor;
