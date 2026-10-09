export const FRAME_DATA_SCHEMA_VERSION = 3 as const;
export const LEGACY_FRAME_DATA_SCHEMA_VERSION = 2 as const;
export const FRAME_DATA_CHARACTER_ID = 'captain_falcon' as const;

/**
 * Animation ids used by the training movement preview. They are also catalog
 * animation ids, so drafts created by the old movement editor keep working.
 */
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

/** normal: can be hit. intangible: attacks pass through. invincible: attacks connect but deal nothing. */
export const HURTBOX_STATES = ['normal', 'intangible', 'invincible'] as const;
export type HurtboxState = (typeof HURTBOX_STATES)[number];

export interface FrameHurtbox {
  id: string;
  /** Optional body-part label, e.g. "head" or "shinR". */
  part?: string;
  start: FramePoint3;
  end: FramePoint3;
  radius: number;
  state: HurtboxState;
}

export const HITBOX_EFFECTS = [
  'Normal', 'Flame', 'Electric', 'Slash', 'Ice', 'Darkness', 'Aura', 'Magic',
  'Water', 'Sleep', 'Bury', 'Paralyze', 'Flower', 'Stun', 'Coin', 'Grass',
  'Inert', 'Rapid', 'Punch', 'Kick', 'Purple fire', 'Death ball',
] as const;

export const HITBOX_ATTACK_TYPES = [
  'Hand', 'Foot', 'Knee', 'Body', 'Head', 'Tail', 'Hip', 'Throwing',
  'Typeless', 'Bat', 'Sword', 'Magic', 'PSI', 'Palutena', 'Object',
] as const;

export const HITBOX_FACING = ['Forward', 'Backward', 'Standard', 'Reverse', 'Hit position'] as const;
export const HITBOX_SOUND_LEVELS = ['S', 'M', 'L', 'LL'] as const;

/** Special Ultimate angle values. Anything else is a plain angle in degrees. */
export const SPECIAL_HITBOX_ANGLES: Record<number, string> = {
  361: 'Sakurai angle',
  363: 'Autolink (365 variant)',
  365: 'Autolink (attacker speed)',
  366: 'Autolink (hitbox position)',
  367: 'Autolink (vectoring)',
  368: 'Autolink (fixed vector)',
};

export type HitboxSource =
  | { kind: 'smashwiki'; page: string; url: string; section: string; group: string; wikiId: number }
  | { kind: 'custom' };

/**
 * A capsule hitbox with every Ultimate hitbox property later gameplay tasks
 * need. The capsule position is hand-drawn (approval required); the numeric
 * properties come straight from SmashWiki when `source.kind === 'smashwiki'`.
 */
export interface FrameHitbox {
  id: string;
  hitboxId: number;
  part: number;
  start: FramePoint3;
  end: FramePoint3;
  radius: number;
  damage: number;
  angle: number;
  baseKnockback: number;
  knockbackGrowth: number;
  fixedKnockback: number;
  setWeight: boolean;
  shieldDamage: number;
  hitlagMultiplier: number;
  sdiMultiplier: number;
  shieldstunMultiplier: number;
  extraShieldstunFrames: number;
  tripChance: number;
  rehitRate: number;
  facing: string;
  effect: string;
  attackType: string;
  soundLevel: string;
  soundKind: string;
  hitsGrounded: boolean;
  hitsAerial: boolean;
  clang: boolean;
  rebound: boolean;
  direct: boolean;
  blockable: boolean;
  reflectable: boolean;
  absorbable: boolean;
  flinchless: boolean;
  noGfx: boolean;
  heedless: boolean;
  source: HitboxSource;
}

export interface FrameGrabbox {
  id: string;
  grabboxId: number;
  start: FramePoint3;
  end: FramePoint3;
  radius: number;
  hitsGrounded: boolean;
  hitsAerial: boolean;
  source: HitboxSource;
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
export interface FrameSilhouette {
  color: string;
  closed: boolean;
  points: SilhouettePoint[];
}

export interface AnimationFrame {
  id: string;
  frameNumber: number;
  hurtboxes: FrameHurtbox[];
  hitboxes: FrameHitbox[];
  grabboxes: FrameGrabbox[];
  silhouette: FrameSilhouette;
  /** Reference frame (0-based) shown with this editor frame, or null to follow the reference player. */
  referenceFrame: number | null;
}

export interface ReferenceAssetMetadata {
  id: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ReferenceSettings {
  scale: number;
  offsetX: number;
  offsetY: number;
  locked: boolean;
  opacity: number;
  /** When true, each editor frame shows its linked reference frame. */
  linkFrames: boolean;
}

export const DEFAULT_REFERENCE_SETTINGS: ReferenceSettings = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  locked: true,
  opacity: 0.55,
  linkFrames: false,
};

export interface AnimationDraft {
  id: string;
  characterId: typeof FRAME_DATA_CHARACTER_ID;
  animationId: string;
  name: string;
  schemaVersion: typeof FRAME_DATA_SCHEMA_VERSION;
  status: 'draft';
  frames: AnimationFrame[];
  referenceAssetId: string | null;
  referenceSettings: ReferenceSettings;
  assets: ReferenceAssetMetadata[];
  createdAt: string;
  updatedAt: string;
}

/** A frame count the user confirmed in the editor (overrides the catalog count). */
export interface ConfirmedFrameCount {
  animationId: string;
  frameCount: number;
  confirmedAt: string;
}

/** Source-controlled, chat-approved animation exported from a draft. */
export interface ApprovedAnimation {
  animationId: string;
  name: string;
  frameCount: number;
  approvedAt: string;
  sourceDraftId: string;
  sourceDraftUpdatedAt: string;
  frames: AnimationFrame[];
}
