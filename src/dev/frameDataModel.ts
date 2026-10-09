import {
  DEFAULT_REFERENCE_SETTINGS,
  FRAME_DATA_SCHEMA_VERSION,
  HURTBOX_STATES,
} from '../types/frameData.ts';
import type {
  AnimationFrame,
  FrameGrabbox,
  FrameHitbox,
  FrameHurtbox,
  FrameSilhouette,
  HitboxSource,
  HurtboxState,
  ReferenceSettings,
  SilhouettePoint,
} from '../types/frameData.ts';
import { createEditorId, DEFAULT_SILHOUETTE_COLOR } from '../data/falcon/seedAnimation.ts';

export { createEditorId, DEFAULT_SILHOUETTE_COLOR };

export const MAX_ANIMATION_FRAMES = 2000;
export const MAX_HURTBOXES_PER_FRAME = 64;
export const MAX_HITBOXES_PER_FRAME = 64;
export const MAX_GRABBOXES_PER_FRAME = 16;
export const MAX_SILHOUETTE_POINTS = 512;
export const MAX_COORDINATE_UNITS = 500;
export const MAX_CAPSULE_RADIUS = 100;
export const MAX_REFERENCE_FRAME = 10_000;

const STARTER_BEAN_POINTS = [
  [-1.8, 0.5], [-3.2, 1.4], [-4, 3], [-4, 13.5], [-3.3, 16], [-1.7, 17.6],
  [0, 18], [1.7, 17.6], [3.3, 16], [4, 13.5], [4, 3], [3.2, 1.4],
] as const;

export function createStarterSilhouette(): FrameSilhouette {
  return {
    color: DEFAULT_SILHOUETTE_COLOR,
    closed: true,
    points: STARTER_BEAN_POINTS.map(([x, y]) => ({ id: createEditorId(), x, y })),
  };
}

export function createEmptyFrame(frameNumber: number): AnimationFrame {
  return {
    id: createEditorId(),
    frameNumber,
    hurtboxes: [],
    hitboxes: [],
    grabboxes: [],
    silhouette: createStarterSilhouette(),
    referenceFrame: null,
  };
}

export interface ShapeDefaults {
  hurtboxRadius: number;
  hitboxRadius: number;
  grabboxRadius: number;
  hitbox: Pick<
    FrameHitbox,
    | 'damage' | 'angle' | 'baseKnockback' | 'knockbackGrowth' | 'fixedKnockback'
    | 'shieldDamage' | 'hitlagMultiplier' | 'sdiMultiplier' | 'effect' | 'attackType'
    | 'soundLevel' | 'hitsGrounded' | 'hitsAerial' | 'clang' | 'rebound'
  >;
}

export const DEFAULT_SHAPE_DEFAULTS: ShapeDefaults = {
  hurtboxRadius: 2,
  hitboxRadius: 3,
  grabboxRadius: 3,
  hitbox: {
    damage: 5,
    angle: 361,
    baseKnockback: 30,
    knockbackGrowth: 100,
    fixedKnockback: 0,
    shieldDamage: 0,
    hitlagMultiplier: 1,
    sdiMultiplier: 1,
    effect: 'Normal',
    attackType: 'Hand',
    soundLevel: 'M',
    hitsGrounded: true,
    hitsAerial: true,
    clang: true,
    rebound: true,
  },
};

export function createHurtbox(radius = DEFAULT_SHAPE_DEFAULTS.hurtboxRadius): FrameHurtbox {
  return {
    id: createEditorId(),
    start: { x: 0, y: 4, z: 0 },
    end: { x: 0, y: 12, z: 0 },
    radius,
    state: 'normal',
  };
}

export function createHitbox(
  defaults: ShapeDefaults = DEFAULT_SHAPE_DEFAULTS,
  hitboxId = 0,
): FrameHitbox {
  return {
    id: createEditorId(),
    hitboxId,
    part: 0,
    start: { x: 6, y: 10, z: 0 },
    end: { x: 6, y: 10, z: 0 },
    radius: defaults.hitboxRadius,
    ...defaults.hitbox,
    setWeight: false,
    shieldstunMultiplier: 1,
    extraShieldstunFrames: 0,
    tripChance: 0,
    rehitRate: 0,
    facing: 'Forward',
    soundKind: 'Punch',
    direct: true,
    blockable: true,
    reflectable: false,
    absorbable: false,
    flinchless: false,
    noGfx: false,
    heedless: false,
    source: { kind: 'custom' },
  };
}

export function createGrabbox(radius = DEFAULT_SHAPE_DEFAULTS.grabboxRadius, grabboxId = 0): FrameGrabbox {
  return {
    id: createEditorId(),
    grabboxId,
    start: { x: 6, y: 9, z: 0 },
    end: { x: 6, y: 9, z: 0 },
    radius,
    hitsGrounded: true,
    hitsAerial: true,
    source: { kind: 'custom' },
  };
}

export function createSilhouettePoint(x: number, y: number): SilhouettePoint {
  return { id: createEditorId(), x, y };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 120;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE_UNITS;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isShortText(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 60;
}

function isFramePoint3(value: unknown): boolean {
  return isPlainObject(value)
    && isFiniteCoordinate(value.x)
    && isFiniteCoordinate(value.y)
    && isFiniteCoordinate(value.z);
}

function isCapsule(value: Record<string, unknown>): boolean {
  return isFramePoint3(value.start)
    && isFramePoint3(value.end)
    && isFiniteNumber(value.radius)
    && value.radius > 0
    && value.radius <= MAX_CAPSULE_RADIUS;
}

export function isHurtboxState(value: unknown): value is HurtboxState {
  return typeof value === 'string' && (HURTBOX_STATES as readonly string[]).includes(value);
}

function isHurtbox(value: unknown): value is FrameHurtbox {
  return isPlainObject(value)
    && isId(value.id)
    && (value.part === undefined || isShortText(value.part))
    && isCapsule(value)
    && isHurtboxState(value.state);
}

function isSource(value: unknown): value is HitboxSource {
  if (!isPlainObject(value)) return false;
  if (value.kind === 'custom') return true;
  return value.kind === 'smashwiki'
    && typeof value.page === 'string'
    && typeof value.url === 'string'
    && typeof value.section === 'string'
    && typeof value.group === 'string'
    && isFiniteNumber(value.wikiId);
}

const HITBOX_NUMBER_KEYS = [
  'hitboxId', 'part', 'damage', 'angle', 'baseKnockback', 'knockbackGrowth',
  'fixedKnockback', 'shieldDamage', 'hitlagMultiplier', 'sdiMultiplier',
  'shieldstunMultiplier', 'extraShieldstunFrames', 'tripChance', 'rehitRate',
] as const;
const HITBOX_BOOLEAN_KEYS = [
  'setWeight', 'hitsGrounded', 'hitsAerial', 'clang', 'rebound', 'direct',
  'blockable', 'reflectable', 'absorbable', 'flinchless', 'noGfx', 'heedless',
] as const;
const HITBOX_TEXT_KEYS = ['facing', 'effect', 'attackType', 'soundLevel', 'soundKind'] as const;

function isHitbox(value: unknown): value is FrameHitbox {
  return isPlainObject(value)
    && isId(value.id)
    && isCapsule(value)
    && HITBOX_NUMBER_KEYS.every((key) => isFiniteNumber(value[key]))
    && HITBOX_BOOLEAN_KEYS.every((key) => typeof value[key] === 'boolean')
    && HITBOX_TEXT_KEYS.every((key) => isShortText(value[key]))
    && isSource(value.source);
}

function isGrabbox(value: unknown): value is FrameGrabbox {
  return isPlainObject(value)
    && isId(value.id)
    && isCapsule(value)
    && isFiniteNumber(value.grabboxId)
    && typeof value.hitsGrounded === 'boolean'
    && typeof value.hitsAerial === 'boolean'
    && isSource(value.source);
}

function isSilhouettePoint(value: unknown): value is SilhouettePoint {
  return isPlainObject(value) && isId(value.id) && isFiniteCoordinate(value.x) && isFiniteCoordinate(value.y);
}

function isSilhouette(value: unknown): value is FrameSilhouette {
  return isPlainObject(value)
    && typeof value.color === 'string'
    && /^#[0-9a-fA-F]{6}$/.test(value.color)
    && typeof value.closed === 'boolean'
    && Array.isArray(value.points)
    && value.points.length <= MAX_SILHOUETTE_POINTS
    && value.points.every(isSilhouettePoint);
}

/**
 * Validates v3 frames. When `expectedCount` is given the draft must contain
 * exactly that many frames, numbered 1..N in order.
 */
export function validateAnimationFrames(value: unknown, expectedCount?: number): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return 'An animation draft must contain at least one frame.';
  }
  if (value.length > MAX_ANIMATION_FRAMES) {
    return `An animation draft can contain at most ${MAX_ANIMATION_FRAMES} frames.`;
  }
  if (expectedCount !== undefined && value.length !== expectedCount) {
    return `This animation has exactly ${expectedCount} frames; the draft has ${value.length}.`;
  }

  const frameIds = new Set<string>();
  for (const [index, frame] of value.entries()) {
    if (!isPlainObject(frame)) return 'Each frame must be an object.';
    if (!isId(frame.id)) return 'Each frame needs a valid identifier.';
    if (frame.frameNumber !== index + 1) {
      return 'Frames must be numbered 1 to N in order.';
    }
    if (frameIds.has(frame.id)) return 'Frame identifiers must be unique within an animation.';
    frameIds.add(frame.id);

    if (!Array.isArray(frame.hurtboxes) || frame.hurtboxes.length > MAX_HURTBOXES_PER_FRAME || !frame.hurtboxes.every(isHurtbox)) {
      return `Each frame can contain up to ${MAX_HURTBOXES_PER_FRAME} valid capsule hurtboxes.`;
    }
    if (!Array.isArray(frame.hitboxes) || frame.hitboxes.length > MAX_HITBOXES_PER_FRAME || !frame.hitboxes.every(isHitbox)) {
      return `Each frame can contain up to ${MAX_HITBOXES_PER_FRAME} valid hitboxes.`;
    }
    if (!Array.isArray(frame.grabboxes) || frame.grabboxes.length > MAX_GRABBOXES_PER_FRAME || !frame.grabboxes.every(isGrabbox)) {
      return `Each frame can contain up to ${MAX_GRABBOXES_PER_FRAME} valid grab boxes.`;
    }
    if (!isSilhouette(frame.silhouette)) {
      return 'Each frame needs a valid presentation-only silhouette.';
    }
    if (
      frame.referenceFrame !== null
      && (!Number.isSafeInteger(frame.referenceFrame) || Number(frame.referenceFrame) < 0 || Number(frame.referenceFrame) > MAX_REFERENCE_FRAME)
    ) {
      return 'Linked reference frames must be whole numbers or empty.';
    }
  }
  return null;
}

export function isValidReferenceSettings(value: unknown): value is ReferenceSettings {
  if (!isPlainObject(value)) return false;
  const { scale, offsetX, offsetY, locked, opacity, linkFrames } = value;
  return isFiniteNumber(scale) && scale >= 0.2 && scale <= 3
    && isFiniteNumber(offsetX) && Math.abs(offsetX) <= 20
    && isFiniteNumber(offsetY) && Math.abs(offsetY) <= 20
    && typeof locked === 'boolean'
    && isFiniteNumber(opacity) && opacity >= 0 && opacity <= 1
    && typeof linkFrames === 'boolean';
}

/** Fills any missing reference settings (older rows) with defaults. */
export function upgradeReferenceSettings(value: unknown): ReferenceSettings {
  const source = isPlainObject(value) ? value : {};
  const merged = { ...DEFAULT_REFERENCE_SETTINGS, ...source };
  return isValidReferenceSettings(merged) ? merged : { ...DEFAULT_REFERENCE_SETTINGS };
}

// ---------------------------------------------------------------------------
// Migration (schema v1/v2 movement frames -> v3 animation frames)
// ---------------------------------------------------------------------------

/**
 * Converts stored frames from any earlier schema to v3 without dropping work:
 * `isVulnerable: false` becomes `state: 'intangible'`, and the hitbox,
 * grab-box, and reference-link fields are added when missing.
 */
export function upgradeDraftFramesToV3(frames: unknown): AnimationFrame[] {
  if (!Array.isArray(frames)) return [];
  return frames.map((raw, index) => {
    const frame = isPlainObject(raw) ? raw : {};
    const hurtboxes = Array.isArray(frame.hurtboxes) ? frame.hurtboxes : [];
    return {
      id: isId(frame.id) ? frame.id : createEditorId(),
      frameNumber: index + 1,
      hurtboxes: hurtboxes.filter(isPlainObject).map((hurtbox) => {
        const { isVulnerable, ...rest } = hurtbox;
        const state: HurtboxState = isHurtboxState(rest.state)
          ? rest.state
          : isVulnerable === false ? 'intangible' : 'normal';
        return { ...rest, state } as unknown as FrameHurtbox;
      }),
      hitboxes: Array.isArray(frame.hitboxes) ? frame.hitboxes as FrameHitbox[] : [],
      grabboxes: Array.isArray(frame.grabboxes) ? frame.grabboxes as FrameGrabbox[] : [],
      silhouette: isSilhouette(frame.silhouette) ? frame.silhouette : createStarterSilhouette(),
      referenceFrame: Number.isSafeInteger(frame.referenceFrame) ? Number(frame.referenceFrame) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Frame-count locking
// ---------------------------------------------------------------------------

export interface FrameCountNormalization {
  frames: AnimationFrame[];
  /** Frames appended (copies of the last frame) to reach the locked count. */
  padded: number;
  /** Frames beyond the locked count. They are kept until the user confirms trimming. */
  extra: number;
}

/**
 * Pads short drafts with copies of their last frame. Long drafts are never
 * trimmed silently: the extra frames are reported so the editor can ask.
 */
export function normalizeFrameCount(frames: AnimationFrame[], frameCount: number): FrameCountNormalization {
  if (frames.length >= frameCount) {
    return { frames, padded: 0, extra: frames.length - frameCount };
  }
  const result = frames.map((frame, index) => (frame.frameNumber === index + 1 ? frame : { ...frame, frameNumber: index + 1 }));
  const template = result[result.length - 1] ?? createEmptyFrame(1);
  const padded = frameCount - result.length;
  while (result.length < frameCount) {
    result.push(cloneAnimationFrame(template, result.length + 1));
  }
  return { frames: result, padded, extra: 0 };
}

export function trimFramesToCount(frames: AnimationFrame[], frameCount: number): AnimationFrame[] {
  return frames.slice(0, frameCount).map((frame, index) => ({ ...frame, frameNumber: index + 1 }));
}

export interface FrameCountChange {
  frames: AnimationFrame[];
  /** Stored extra frames brought back into the animation. */
  restored: number;
  /** Copies of the last frame appended past every stored frame. */
  added: number;
  /** Frames (visible or stored extras) that would be removed. Needs user confirmation. */
  dropped: number;
}

/**
 * Plans a change to `count` frames for a draft whose visible frames may be
 * followed by stored extra frames. Stored frames are always reused first;
 * copies are added only past the last stored frame, and anything removed is
 * reported so the caller can ask before dropping it.
 */
export function planFrameCountChange(
  visible: AnimationFrame[],
  extra: AnimationFrame[],
  count: number,
): FrameCountChange {
  const stored = [...visible, ...extra].map((frame, index) => (
    frame.frameNumber === index + 1 ? frame : { ...frame, frameNumber: index + 1 }
  ));
  const restored = Math.max(0, Math.min(count, stored.length) - visible.length);
  if (count >= stored.length) {
    const normalized = normalizeFrameCount(stored, count);
    return { frames: normalized.frames, restored, added: normalized.padded, dropped: 0 };
  }
  return { frames: trimFramesToCount(stored, count), restored, added: 0, dropped: stored.length - count };
}

// ---------------------------------------------------------------------------
// Cloning
// ---------------------------------------------------------------------------

export function cloneShape<T extends { id: string }>(shape: T): T {
  return { ...structuredClone(shape), id: createEditorId() };
}

export function cloneAnimationFrame(frame: AnimationFrame, frameNumber: number): AnimationFrame {
  return {
    ...structuredClone(frame),
    id: createEditorId(),
    frameNumber,
    hurtboxes: frame.hurtboxes.map(cloneShape),
    hitboxes: frame.hitboxes.map(cloneShape),
    grabboxes: frame.grabboxes.map(cloneShape),
    silhouette: {
      ...frame.silhouette,
      points: frame.silhouette.points.map((point) => ({ ...point, id: createEditorId() })),
    },
  };
}

export function isFrameDataSchemaVersion(value: unknown): value is typeof FRAME_DATA_SCHEMA_VERSION {
  return value === FRAME_DATA_SCHEMA_VERSION;
}
