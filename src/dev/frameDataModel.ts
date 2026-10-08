import {
  FRAME_DATA_SCHEMA_VERSION,
  MOVEMENT_STATES,
} from '../types/frameData.ts';
import type {
  MovementFrame,
  MovementHurtbox,
  MovementSilhouette,
  MovementState,
  SilhouettePoint,
} from '../types/frameData.ts';

export const MAX_MOVEMENT_FRAMES = 2000;
export const MAX_HURTBOXES_PER_FRAME = 64;
export const MAX_SILHOUETTE_POINTS = 512;
export const MAX_COORDINATE_UNITS = 500;
export const MAX_HURTBOX_RADIUS = 100;
export const DEFAULT_SILHOUETTE_COLOR = '#20c6e7';

const STARTER_BEAN_POINTS = [
  [-1.8, 0.5],
  [-3.2, 1.4],
  [-4, 3],
  [-4, 13.5],
  [-3.3, 16],
  [-1.7, 17.6],
  [0, 18],
  [1.7, 17.6],
  [3.3, 16],
  [4, 13.5],
  [4, 3],
  [3.2, 1.4],
] as const;

export function createEditorId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `frame-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptySilhouette(): MovementSilhouette {
  return {
    color: DEFAULT_SILHOUETTE_COLOR,
    closed: true,
    points: STARTER_BEAN_POINTS.map(([x, y]) => ({
      id: createEditorId(),
      x,
      y,
    })),
  };
}

export function createMovementFrame(frameNumber: number): MovementFrame {
  return {
    id: createEditorId(),
    frameNumber,
    hurtboxes: [],
    silhouette: createEmptySilhouette(),
  };
}

export function createEmptyHurtbox(): MovementHurtbox {
  return {
    id: createEditorId(),
    start: { x: 0, y: 3, z: 0 },
    end: { x: 0, y: 15, z: 0 },
    radius: 4,
    isVulnerable: true,
  };
}

export function createSilhouettePoint(x: number, y: number): SilhouettePoint {
  return { id: createEditorId(), x, y };
}

export function replaceMovementFrame(
  frames: MovementFrame[],
  updatedFrame: MovementFrame,
): MovementFrame[] {
  return frames.map((frame) => (
    frame.id === updatedFrame.id ? updatedFrame : frame
  ));
}

export function isMovementState(value: unknown): value is MovementState {
  return typeof value === 'string'
    && MOVEMENT_STATES.some((state) => state.id === value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_COORDINATE_UNITS;
}

function isFramePoint3(value: unknown): boolean {
  if (!isPlainObject(value)) return false;
  return isFiniteCoordinate(value.x)
    && isFiniteCoordinate(value.y)
    && isFiniteCoordinate(value.z);
}

function isHurtbox(value: unknown): value is MovementHurtbox {
  if (!isPlainObject(value)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && value.id.length <= 120
    && isFramePoint3(value.start)
    && isFramePoint3(value.end)
    && typeof value.radius === 'number'
    && Number.isFinite(value.radius)
    && value.radius > 0
    && value.radius <= MAX_HURTBOX_RADIUS
    && typeof value.isVulnerable === 'boolean';
}

function isSilhouettePoint(value: unknown): value is SilhouettePoint {
  if (!isPlainObject(value)) return false;
  return typeof value.id === 'string'
    && value.id.length > 0
    && value.id.length <= 120
    && isFiniteCoordinate(value.x)
    && isFiniteCoordinate(value.y);
}

function isSilhouette(value: unknown): value is MovementSilhouette {
  if (!isPlainObject(value)) return false;
  return typeof value.color === 'string'
    && /^#[0-9a-fA-F]{6}$/.test(value.color)
    && typeof value.closed === 'boolean'
    && Array.isArray(value.points)
    && value.points.length <= MAX_SILHOUETTE_POINTS
    && value.points.every(isSilhouettePoint);
}

export function validateMovementFrames(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return 'A motion draft must contain at least one frame.';
  }
  if (value.length > MAX_MOVEMENT_FRAMES) {
    return `A motion draft can contain at most ${MAX_MOVEMENT_FRAMES} frames.`;
  }

  const frameIds = new Set<string>();
  const frameNumbers = new Set<number>();
  for (const frame of value) {
    if (!isPlainObject(frame)) return 'Each frame must be an object.';
    if (typeof frame.id !== 'string' || frame.id.length === 0 || frame.id.length > 120) {
      return 'Each frame needs a valid identifier.';
    }
    if (
      !Number.isSafeInteger(frame.frameNumber)
      || Number(frame.frameNumber) < 1
      || Number(frame.frameNumber) > MAX_MOVEMENT_FRAMES
    ) {
      return `Frame numbers must be whole numbers from 1 to ${MAX_MOVEMENT_FRAMES}.`;
    }
    if (frameIds.has(frame.id) || frameNumbers.has(Number(frame.frameNumber))) {
      return 'Frame identifiers and frame numbers must be unique within a motion.';
    }
    frameIds.add(frame.id);
    frameNumbers.add(Number(frame.frameNumber));

    if (
      !Array.isArray(frame.hurtboxes)
      || frame.hurtboxes.length > MAX_HURTBOXES_PER_FRAME
      || !frame.hurtboxes.every(isHurtbox)
    ) {
      return `Each frame can contain up to ${MAX_HURTBOXES_PER_FRAME} valid capsule hurtboxes.`;
    }
    if (!isSilhouette(frame.silhouette)) {
      return 'Each frame needs a valid presentation-only silhouette.';
    }
  }
  return null;
}

export function cloneMovementFrame(
  frame: MovementFrame,
  frameNumber: number,
): MovementFrame {
  return {
    ...structuredClone(frame),
    id: createEditorId(),
    frameNumber,
    hurtboxes: frame.hurtboxes.map((hurtbox) => ({
      ...structuredClone(hurtbox),
      id: createEditorId(),
    })),
    silhouette: {
      ...frame.silhouette,
      points: frame.silhouette.points.map((point) => ({
        ...point,
        id: createEditorId(),
      })),
    },
  };
}

export function isFrameDataSchemaVersion(
  value: unknown,
): value is typeof FRAME_DATA_SCHEMA_VERSION {
  return value === FRAME_DATA_SCHEMA_VERSION;
}
