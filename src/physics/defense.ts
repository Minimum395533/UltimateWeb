import type { FrameHitbox } from '../types/frameData.ts';
import { ANIMATION_CATALOG } from '../data/falcon/animationCatalog.ts';

// Shield values are from the Ultimate row on SmashWiki's Shield technical table.
// https://www.ssbwiki.com/Shield
export const ULTIMATE_SHIELD = {
  maxHealth: 50,
  shieldDamageMultiplier: 1.19,
  drainPerFrame: 0.15,
  regeneratePerFrame: 0.08,
  shieldDropFrames: 11,
  minimumRaiseFramesForParry: 3,
  parryWindowFrames: 5,
  shieldBreakStunFrames: 37.5,
} as const;

// Ultimate allows up smash/up special directly out of shield; jump has a
// three-frame jump squat. Ordinary shield-drop actions wait 11 frames.
export const OUT_OF_SHIELD_LAG = {
  jump: 3,
  upSmash: 0,
  upSpecial: 0,
  shieldDrop: ULTIMATE_SHIELD.shieldDropFrames,
} as const;
export const ULTIMATE_AIR_DODGE_LANDING_LAG_FRAMES = 10;

export function outOfShieldLag(action: keyof typeof OUT_OF_SHIELD_LAG): number {
  return OUT_OF_SHIELD_LAG[action];
}

export function dodgeLandingLagFrames(animationId: string): number {
  return animationId.startsWith('air-dodge')
    ? ULTIMATE_AIR_DODGE_LANDING_LAG_FRAMES
    : 0;
}

export interface ShieldState {
  health: number;
  heldFrames: number;
  dropFrames: number;
  stunFrames: number;
  broken: boolean;
}

export interface ShieldHitResult {
  state: ShieldState;
  shieldDamage: number;
  shieldstunFrames: number;
  pushback: number;
  parried: boolean;
  broke: boolean;
}

export function createShieldState(health = ULTIMATE_SHIELD.maxHealth): ShieldState {
  return {
    health: Math.max(0, Math.min(ULTIMATE_SHIELD.maxHealth, health)),
    heldFrames: 0,
    dropFrames: 0,
    stunFrames: 0,
    broken: false,
  };
}

export function shieldSizeMultiplier(health: number): number {
  return (Math.max(0, Math.min(ULTIMATE_SHIELD.maxHealth, health)) / ULTIMATE_SHIELD.maxHealth) * 0.85 + 0.15;
}

export function stepShield(state: ShieldState, held: boolean): ShieldState {
  if (state.broken) {
    const stunFrames = Math.max(0, state.stunFrames - 1);
    if (stunFrames > 0) return { ...state, stunFrames };
    return { ...state, broken: false, health: ULTIMATE_SHIELD.regeneratePerFrame, stunFrames: 0 };
  }
  const stunFrames = Math.max(0, state.stunFrames - 1);
  if (held && stunFrames === 0 && state.health > 0) {
    return {
      ...state,
      health: Math.max(0, state.health - ULTIMATE_SHIELD.drainPerFrame),
      heldFrames: state.heldFrames + 1,
      dropFrames: 0,
      stunFrames,
    };
  }
  return {
    ...state,
    health: Math.min(ULTIMATE_SHIELD.maxHealth, state.health + ULTIMATE_SHIELD.regeneratePerFrame),
    heldFrames: 0,
    dropFrames: Math.max(0, state.dropFrames - 1),
    stunFrames,
  };
}

export function dropShield(state: ShieldState): ShieldState {
  return {
    ...state,
    heldFrames: 0,
    dropFrames: state.heldFrames >= ULTIMATE_SHIELD.minimumRaiseFramesForParry
      ? ULTIMATE_SHIELD.parryWindowFrames
      : 0,
  };
}

export function applyShieldHit(
  state: ShieldState,
  hitbox: Pick<FrameHitbox, 'damage' | 'shieldDamage' | 'shieldstunMultiplier' | 'extraShieldstunFrames'>,
): ShieldHitResult {
  const parried = state.dropFrames > 0 && !state.broken;
  const shieldDamage = parried ? 0 : Math.max(0,
    hitbox.damage * ULTIMATE_SHIELD.shieldDamageMultiplier + hitbox.shieldDamage);
  const health = Math.max(0, state.health - shieldDamage);
  const broke = !parried && health <= 0;
  const shieldstunFrames = parried ? 0 : broke
    ? ULTIMATE_SHIELD.shieldBreakStunFrames
    : Math.floor(hitbox.damage * 0.8 * hitbox.shieldstunMultiplier + 2 + hitbox.extraShieldstunFrames);
  const pushback = parried ? 0 : Math.min(1.3, (shieldstunFrames + 1) * 0.09 * shieldSizeMultiplier(health));
  return {
    state: {
      ...state,
      health,
      heldFrames: 0,
      dropFrames: 0,
      stunFrames: shieldstunFrames,
      broken: state.broken || broke,
    },
    shieldDamage,
    shieldstunFrames,
    pushback,
    parried,
    broke,
  };
}

// Dodge invulnerability uses the authored editor hurtbox-state frame ranges,
// not a second hard-coded timing table.
export function dodgeIsIntangible(animationId: string, frame: number, staleCount = 0): boolean {
  const entry = ANIMATION_CATALOG.find((candidate) => candidate.id === animationId);
  return !!entry?.hurtboxStates?.some(({ frames, state }) => (
    state === 'intangible' && frame >= frames[0]
      && frame <= Math.max(frames[0], frames[1] - Math.max(0, Math.floor(staleCount)))
  ));
}

export function dodgeTiming(animationId: string) {
  const entry = ANIMATION_CATALOG.find((candidate) => candidate.id === animationId);
  if (!entry) return null;
  return {
    totalFrames: entry.frameCount,
    intangibleRanges: (entry.hurtboxStates ?? [])
      .filter((state) => state.state === 'intangible')
      .map(({ frames }) => frames),
  };
}

// SmashWiki confirms Ultimate grab releases scale with percent and can be mashed.
// The per-percent slope is an explicit training estimate pending frame lab data.
export function grabHoldFrames(percent: number): number {
  return Math.max(20, Math.min(120, Math.round(60 + Math.max(0, percent) * 0.6)));
}

export function mashGrabEscape(framesRemaining: number, mashInputs = 1): number {
  return Math.max(0, framesRemaining - Math.max(0, Math.floor(mashInputs)));
}
