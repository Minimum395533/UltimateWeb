import type {
  AnimationFrame,
  FrameGrabbox,
  FrameHitbox,
  FrameHurtbox,
  FramePoint3,
  SilhouettePoint,
} from '../types/frameData.ts';
import {
  MAX_GRABBOXES_PER_FRAME,
  MAX_HITBOXES_PER_FRAME,
  MAX_HURTBOXES_PER_FRAME,
  MAX_SILHOUETTE_POINTS,
  cloneAnimationFrame,
  cloneShape,
  createEditorId,
} from './frameDataModel.ts';

/**
 * Pure editing operations for the frame editor: selection, group transforms,
 * clipboard, interpolation, and undo history. Kept free of React so they can
 * be unit tested.
 */

export type ShapeKind = 'hurtbox' | 'hitbox' | 'grabbox' | 'point';
export const SHAPE_KINDS: readonly ShapeKind[] = ['hurtbox', 'hitbox', 'grabbox', 'point'];

export interface ShapeRef {
  kind: ShapeKind;
  id: string;
}

export type Selection = readonly ShapeRef[];

export interface Point2 {
  x: number;
  y: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

type Capsule = FrameHurtbox | FrameHitbox | FrameGrabbox;

const round = (value: number) => Math.round(value * 100) / 100;

export const shapeKey = (ref: ShapeRef) => `${ref.kind}:${ref.id}`;

export function isSelected(selection: Selection, ref: ShapeRef): boolean {
  return selection.some((item) => item.kind === ref.kind && item.id === ref.id);
}

export function toggleSelection(selection: Selection, ref: ShapeRef): ShapeRef[] {
  return isSelected(selection, ref)
    ? selection.filter((item) => !(item.kind === ref.kind && item.id === ref.id))
    : [...selection, ref];
}

function capsuleList(frame: AnimationFrame, kind: Exclude<ShapeKind, 'point'>): Capsule[] {
  if (kind === 'hurtbox') return frame.hurtboxes;
  if (kind === 'hitbox') return frame.hitboxes;
  return frame.grabboxes;
}

export function listShapeRefs(frame: AnimationFrame, kinds: readonly ShapeKind[] = SHAPE_KINDS): ShapeRef[] {
  const refs: ShapeRef[] = [];
  for (const kind of kinds) {
    const items = kind === 'point' ? frame.silhouette.points : capsuleList(frame, kind);
    for (const item of items) refs.push({ kind, id: item.id });
  }
  return refs;
}

/** Drops references to shapes that no longer exist in the frame. */
export function pruneSelection(frame: AnimationFrame, selection: Selection): ShapeRef[] {
  const existing = new Set(listShapeRefs(frame).map(shapeKey));
  return selection.filter((ref) => existing.has(shapeKey(ref)));
}

function capsuleRect(capsule: Capsule): Rect {
  return {
    minX: Math.min(capsule.start.x, capsule.end.x) - capsule.radius,
    minY: Math.min(capsule.start.y, capsule.end.y) - capsule.radius,
    maxX: Math.max(capsule.start.x, capsule.end.x) + capsule.radius,
    maxY: Math.max(capsule.start.y, capsule.end.y) + capsule.radius,
  };
}

function findShape(frame: AnimationFrame, ref: ShapeRef): Capsule | SilhouettePoint | undefined {
  if (ref.kind === 'point') return frame.silhouette.points.find((point) => point.id === ref.id);
  return capsuleList(frame, ref.kind).find((capsule) => capsule.id === ref.id);
}

export function selectionBounds(frame: AnimationFrame, selection: Selection): Rect | null {
  let rect: Rect | null = null;
  for (const ref of selection) {
    const shape = findShape(frame, ref);
    if (!shape) continue;
    const box = ref.kind === 'point'
      ? { minX: (shape as SilhouettePoint).x, maxX: (shape as SilhouettePoint).x, minY: (shape as SilhouettePoint).y, maxY: (shape as SilhouettePoint).y }
      : capsuleRect(shape as Capsule);
    rect = rect
      ? {
        minX: Math.min(rect.minX, box.minX),
        minY: Math.min(rect.minY, box.minY),
        maxX: Math.max(rect.maxX, box.maxX),
        maxY: Math.max(rect.maxY, box.maxY),
      }
      : box;
  }
  return rect;
}

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

export function normalizeRect(a: Point2, b: Point2): Rect {
  return {
    minX: Math.min(a.x, b.x),
    minY: Math.min(a.y, b.y),
    maxX: Math.max(a.x, b.x),
    maxY: Math.max(a.y, b.y),
  };
}

/** Box (marquee) selection: capsules whose bounds touch the box, points inside it. */
export function shapesInRect(frame: AnimationFrame, rect: Rect, kinds: readonly ShapeKind[]): ShapeRef[] {
  const refs: ShapeRef[] = [];
  for (const kind of kinds) {
    if (kind === 'point') {
      for (const point of frame.silhouette.points) {
        if (point.x >= rect.minX && point.x <= rect.maxX && point.y >= rect.minY && point.y <= rect.maxY) {
          refs.push({ kind, id: point.id });
        }
      }
    } else {
      for (const capsule of capsuleList(frame, kind)) {
        if (rectsIntersect(capsuleRect(capsule), rect)) refs.push({ kind, id: capsule.id });
      }
    }
  }
  return refs;
}

function mapPoint3(point: FramePoint3, map: (point: Point2) => Point2): FramePoint3 {
  const next = map(point);
  return { ...point, x: round(next.x), y: round(next.y) };
}

/** Applies a 2D transform to every selected shape. Radii are multiplied by `radiusScale`. */
export function transformSelection(
  frame: AnimationFrame,
  selection: Selection,
  map: (point: Point2) => Point2,
  radiusScale = 1,
): AnimationFrame {
  const ids = (kind: ShapeKind) => new Set(selection.filter((ref) => ref.kind === kind).map((ref) => ref.id));
  const transformCapsule = <T extends Capsule>(capsule: T): T => ({
    ...capsule,
    start: mapPoint3(capsule.start, map),
    end: mapPoint3(capsule.end, map),
    radius: round(Math.max(0.1, Math.min(100, capsule.radius * radiusScale))),
  });
  const hurtIds = ids('hurtbox');
  const hitIds = ids('hitbox');
  const grabIds = ids('grabbox');
  const pointIds = ids('point');
  return {
    ...frame,
    hurtboxes: frame.hurtboxes.map((item) => (hurtIds.has(item.id) ? transformCapsule(item) : item)),
    hitboxes: frame.hitboxes.map((item) => (hitIds.has(item.id) ? transformCapsule(item) : item)),
    grabboxes: frame.grabboxes.map((item) => (grabIds.has(item.id) ? transformCapsule(item) : item)),
    silhouette: {
      ...frame.silhouette,
      points: frame.silhouette.points.map((point) => {
        if (!pointIds.has(point.id)) return point;
        const next = map(point);
        return { ...point, x: round(next.x), y: round(next.y) };
      }),
    },
  };
}

export function translateSelection(frame: AnimationFrame, selection: Selection, dx: number, dy: number): AnimationFrame {
  return transformSelection(frame, selection, ({ x, y }) => ({ x: x + dx, y: y + dy }));
}

/** Scales positions about `pivot` (default: selection center) and scales radii by the same factor. */
export function scaleSelection(
  frame: AnimationFrame,
  selection: Selection,
  factor: number,
  pivot?: Point2,
): AnimationFrame {
  const bounds = selectionBounds(frame, selection);
  if (!bounds) return frame;
  const center = pivot ?? { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  return transformSelection(
    frame,
    selection,
    ({ x, y }) => ({ x: center.x + (x - center.x) * factor, y: center.y + (y - center.y) * factor }),
    factor,
  );
}

/** Mirrors the selection horizontally about its center. */
export function flipSelection(frame: AnimationFrame, selection: Selection): AnimationFrame {
  const bounds = selectionBounds(frame, selection);
  if (!bounds) return frame;
  const centerX = (bounds.minX + bounds.maxX) / 2;
  return transformSelection(frame, selection, ({ x, y }) => ({ x: 2 * centerX - x, y }));
}

export function deleteSelection(frame: AnimationFrame, selection: Selection): AnimationFrame {
  const keys = new Set(selection.map(shapeKey));
  const keep = (kind: ShapeKind) => (item: { id: string }) => !keys.has(`${kind}:${item.id}`);
  return {
    ...frame,
    hurtboxes: frame.hurtboxes.filter(keep('hurtbox')),
    hitboxes: frame.hitboxes.filter(keep('hitbox')),
    grabboxes: frame.grabboxes.filter(keep('grabbox')),
    silhouette: { ...frame.silhouette, points: frame.silhouette.points.filter(keep('point')) },
  };
}

// ---------------------------------------------------------------------------
// Clipboard
// ---------------------------------------------------------------------------

export interface ShapeClipboard {
  type: 'shapes';
  sourceAnimationId: string;
  hurtboxes: FrameHurtbox[];
  hitboxes: FrameHitbox[];
  grabboxes: FrameGrabbox[];
  points: SilhouettePoint[];
}

export interface FrameClipboard {
  type: 'frames';
  sourceAnimationId: string;
  frames: AnimationFrame[];
}

export type EditorClipboard = ShapeClipboard | FrameClipboard;

export function copySelection(frame: AnimationFrame, selection: Selection, sourceAnimationId: string): ShapeClipboard | null {
  const keys = new Set(selection.map(shapeKey));
  const pick = <T extends { id: string }>(kind: ShapeKind, items: T[]) =>
    items.filter((item) => keys.has(`${kind}:${item.id}`)).map((item) => structuredClone(item));
  const clipboard: ShapeClipboard = {
    type: 'shapes',
    sourceAnimationId,
    hurtboxes: pick('hurtbox', frame.hurtboxes),
    hitboxes: pick('hitbox', frame.hitboxes),
    grabboxes: pick('grabbox', frame.grabboxes),
    points: pick('point', frame.silhouette.points),
  };
  const count = clipboard.hurtboxes.length + clipboard.hitboxes.length + clipboard.grabboxes.length + clipboard.points.length;
  return count ? clipboard : null;
}

export function clipboardShapeCount(clipboard: ShapeClipboard): number {
  return clipboard.hurtboxes.length + clipboard.hitboxes.length + clipboard.grabboxes.length + clipboard.points.length;
}

export interface PasteResult {
  frame: AnimationFrame;
  selection: ShapeRef[];
  /** Shapes dropped because the frame was at a per-frame limit. */
  dropped: number;
}

/** Pastes clipboard shapes into a frame with fresh ids, respecting per-frame limits. */
export function pasteShapes(frame: AnimationFrame, clipboard: ShapeClipboard): PasteResult {
  const selection: ShapeRef[] = [];
  let dropped = 0;
  const take = <T extends { id: string }>(kind: ShapeKind, existing: T[], incoming: T[], limit: number): T[] => {
    const room = Math.max(0, limit - existing.length);
    const added = incoming.slice(0, room).map(cloneShape);
    dropped += incoming.length - added.length;
    for (const item of added) selection.push({ kind, id: item.id });
    return [...existing, ...added];
  };
  return {
    frame: {
      ...frame,
      hurtboxes: take('hurtbox', frame.hurtboxes, clipboard.hurtboxes, MAX_HURTBOXES_PER_FRAME),
      hitboxes: take('hitbox', frame.hitboxes, clipboard.hitboxes, MAX_HITBOXES_PER_FRAME),
      grabboxes: take('grabbox', frame.grabboxes, clipboard.grabboxes, MAX_GRABBOXES_PER_FRAME),
      silhouette: {
        ...frame.silhouette,
        points: take('point', frame.silhouette.points, clipboard.points, MAX_SILHOUETTE_POINTS),
      },
    },
    selection,
    dropped,
  };
}

/** Pastes the clipboard shapes into every frame from `fromIndex` to `toIndex` (0-based, inclusive). */
export function pasteShapesIntoRange(
  frames: AnimationFrame[],
  fromIndex: number,
  toIndex: number,
  clipboard: ShapeClipboard,
): { frames: AnimationFrame[]; dropped: number } {
  const start = Math.max(0, Math.min(fromIndex, toIndex));
  const end = Math.min(frames.length - 1, Math.max(fromIndex, toIndex));
  let dropped = 0;
  const next = frames.map((frame, index) => {
    if (index < start || index > end) return frame;
    const result = pasteShapes(frame, clipboard);
    dropped += result.dropped;
    return result.frame;
  });
  return { frames: next, dropped };
}

export function copyFrames(
  frames: AnimationFrame[],
  fromIndex: number,
  toIndex: number,
  sourceAnimationId: string,
): FrameClipboard {
  const start = Math.max(0, Math.min(fromIndex, toIndex));
  const end = Math.min(frames.length - 1, Math.max(fromIndex, toIndex));
  return { type: 'frames', sourceAnimationId, frames: structuredClone(frames.slice(start, end + 1)) };
}

/**
 * Overwrites frames starting at `atIndex` with copied frames. The frame count
 * never changes: copies that would land past the last frame are not pasted.
 */
export function pasteFrames(
  frames: AnimationFrame[],
  atIndex: number,
  clipboard: FrameClipboard,
): { frames: AnimationFrame[]; pasted: number; skipped: number } {
  const next = [...frames];
  let pasted = 0;
  clipboard.frames.forEach((source, offset) => {
    const index = atIndex + offset;
    if (index < 0 || index >= next.length) return;
    next[index] = { ...cloneAnimationFrame(source, index + 1), id: next[index].id };
    pasted += 1;
  });
  return { frames: next, pasted, skipped: clipboard.frames.length - pasted };
}

/** Fills every frame in a range with copies of one frame (used for "paste frame across range"). */
export function fillFrames(
  frames: AnimationFrame[],
  fromIndex: number,
  toIndex: number,
  source: AnimationFrame,
): AnimationFrame[] {
  const start = Math.max(0, Math.min(fromIndex, toIndex));
  const end = Math.min(frames.length - 1, Math.max(fromIndex, toIndex));
  return frames.map((frame, index) => (
    index < start || index > end ? frame : { ...cloneAnimationFrame(source, index + 1), id: frame.id }
  ));
}

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

const lerp = (a: number, b: number, t: number) => round(a + (b - a) * t);
const lerpPoint3 = (a: FramePoint3, b: FramePoint3, t: number): FramePoint3 => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
  z: lerp(a.z, b.z, t),
});

function lerpCapsules<T extends Capsule>(from: T[], to: T[], t: number): T[] {
  return from.map((capsule, index) => {
    const target = to[index];
    return {
      ...structuredClone(capsule),
      id: createEditorId(),
      start: lerpPoint3(capsule.start, target.start, t),
      end: lerpPoint3(capsule.end, target.end, t),
      radius: lerp(capsule.radius, target.radius, t),
    };
  });
}

export interface InterpolationResult {
  frames: AnimationFrame[];
  /** Layers left untouched because the two key frames have different shape counts. */
  skipped: string[];
}

/**
 * Fills the frames strictly between two key frames by linearly interpolating
 * shape positions and radii. Shapes are matched by order within each layer;
 * a layer whose counts differ between the key frames is left as-is.
 */
export function interpolateRange(frames: AnimationFrame[], fromIndex: number, toIndex: number): InterpolationResult {
  const start = Math.min(fromIndex, toIndex);
  const end = Math.max(fromIndex, toIndex);
  const from = frames[start];
  const to = frames[end];
  if (!from || !to || end - start < 2) return { frames, skipped: [] };
  const skipped: string[] = [];
  const same = (label: string, a: unknown[], b: unknown[]) => {
    if (a.length === b.length) return true;
    skipped.push(label);
    return false;
  };
  const hurt = same('hurtboxes', from.hurtboxes, to.hurtboxes);
  const hit = same('hitboxes', from.hitboxes, to.hitboxes);
  const grab = same('grab boxes', from.grabboxes, to.grabboxes);
  const points = same('silhouette', from.silhouette.points, to.silhouette.points);
  const next = frames.map((frame, index) => {
    if (index <= start || index >= end) return frame;
    const t = (index - start) / (end - start);
    return {
      ...frame,
      hurtboxes: hurt ? lerpCapsules(from.hurtboxes, to.hurtboxes, t) : frame.hurtboxes,
      hitboxes: hit ? lerpCapsules(from.hitboxes, to.hitboxes, t) : frame.hitboxes,
      grabboxes: grab ? lerpCapsules(from.grabboxes, to.grabboxes, t) : frame.grabboxes,
      silhouette: points
        ? {
          ...frame.silhouette,
          color: from.silhouette.color,
          closed: from.silhouette.closed,
          points: from.silhouette.points.map((point, pointIndex) => ({
            id: createEditorId(),
            x: lerp(point.x, to.silhouette.points[pointIndex].x, t),
            y: lerp(point.y, to.silhouette.points[pointIndex].y, t),
          })),
        }
        : frame.silhouette,
    };
  });
  return { frames: next, skipped };
}

// ---------------------------------------------------------------------------
// Undo / redo
// ---------------------------------------------------------------------------

export const HISTORY_LIMIT = 200;

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
  /** Consecutive commits with the same key (e.g. one drag) merge into one undo step. */
  lastKey: string | null;
}

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [], lastKey: null };
}

export function commitHistory<T>(history: History<T>, next: T, key: string | null = null): History<T> {
  if (Object.is(next, history.present)) return history;
  if (key !== null && key === history.lastKey) {
    return { ...history, present: next, future: [] };
  }
  const past = [...history.past, history.present];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, present: next, future: [], lastKey: key };
}

/** Ends the current merge group so the next commit becomes its own undo step. */
export function sealHistory<T>(history: History<T>): History<T> {
  return history.lastKey === null ? history : { ...history, lastKey: null };
}

export function undoHistory<T>(history: History<T>): History<T> {
  if (!history.past.length) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    lastKey: null,
  };
}

export function redoHistory<T>(history: History<T>): History<T> {
  if (!history.future.length) return history;
  const [next, ...future] = history.future;
  return { past: [...history.past, history.present], present: next, future, lastKey: null };
}
