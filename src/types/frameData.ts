export const FRAME_DATA_SCHEMA_VERSION = 2 as const;
export const FRAME_DATA_CHARACTER_ID = 'captain_falcon' as const;

export const MOVEMENT_STATES = [
  { id: 'idle', label: 'Idle' },
  { id: 'idle-variance', label: 'Idle variance' },
  { id: 'walk', label: 'Walk' },
  { id: 'initial-dash', label: 'Initial dash' },
  { id: 'run', label: 'Run' },
  { id: 'turnaround-dash', label: 'Turnaround dash' },
  { id: 'jump-squat', label: 'Jump squat' },
  { id: 'rising', label: 'Rising' },
  { id: 'falling', label: 'Falling' },
  { id: 'fast-fall', label: 'Fast fall' },
  { id: 'landing', label: 'Landing' },
] as const;

export type MovementState = (typeof MOVEMENT_STATES)[number]['id'];

export interface FramePoint3 {
  x: number;
  y: number;
  z: number;
}

export interface MovementHurtbox {
  id: string;
  start: FramePoint3;
  end: FramePoint3;
  radius: number;
  isVulnerable: boolean;
}

export interface SilhouettePoint {
  id: string;
  x: number;
  y: number;
}

/**
 * Presentation-only path. It is intentionally separate from hurtboxes and is
 * never consumed by gameplay collision code.
 */
export interface MovementSilhouette {
  color: string;
  closed: boolean;
  points: SilhouettePoint[];
}

export interface MovementFrame {
  id: string;
  frameNumber: number;
  hurtboxes: MovementHurtbox[];
  silhouette: MovementSilhouette;
}

export interface ReferenceAssetMetadata {
  id: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ReferenceAlignment {
  scale: number;
  offsetX: number;
  offsetY: number;
  locked: boolean;
}

export const DEFAULT_REFERENCE_ALIGNMENT: ReferenceAlignment = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  locked: true,
};

export interface MovementFrameDraft {
  id: string;
  characterId: typeof FRAME_DATA_CHARACTER_ID;
  motionState: MovementState;
  name: string;
  schemaVersion: typeof FRAME_DATA_SCHEMA_VERSION;
  status: 'draft';
  frames: MovementFrame[];
  referenceAssetId: string | null;
  referenceAlignment: ReferenceAlignment;
  assets: ReferenceAssetMetadata[];
  createdAt: string;
  updatedAt: string;
}
