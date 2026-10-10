import type { FrameHitbox } from '../types/frameData.ts';

// Formula references (Ultimate mechanics): SmashWiki, “Damage”,
// “Knockback”, “Hitlag”, “Hitstun”, “Directional influence”, and “Weight”.
// https://www.ssbwiki.com/Damage
// https://www.ssbwiki.com/Knockback
// https://www.ssbwiki.com/Hitlag
// https://www.ssbwiki.com/Hitstun
// https://www.ssbwiki.com/Directional_influence
// https://www.ssbwiki.com/Weight
// https://www.ssbwiki.com/Stale_Moves
// https://www.ssbwiki.com/Tech
// https://www.ssbwiki.com/Crouch_cancel
export const ULTIMATE_ONE_V_ONE_DAMAGE_MULTIPLIER = 1.2;
export const CAPTAIN_FALCON_WEIGHT = 104;
export const STALE_QUEUE_LENGTH = 9;
export const ULTIMATE_STALE_REDUCTION = [0.09, 0.08545, 0.07635, 0.0679, 0.05945, 0.05035, 0.04255, 0.03345, 0.025] as const;
export const ULTIMATE_FRESHNESS_BONUS = 1.05;

export interface CombatStats {
  percent: number;
  weight: number;
  staleQueue: string[];
  crouching: boolean;
  grounded?: boolean;
}
export interface HitReaction {
  damage: number;
  knockback: number;
  launchSpeed: number;
  launchAngle: number;
  hitlagFrames: number;
  hitstunFrames: number;
  tumble: boolean;
  staleMultiplier: number;
}
export interface InfluenceInput {
  diX?: number;
  diY?: number;
  lsi?: number;
  sdiX?: number;
  sdiY?: number;
}
export interface CombatantRuntime {
  percent: number;
  positionX: number;
  positionY: number;
  velocityX: number;
  velocityY: number;
  hitlagFrames: number;
  hitstunFrames: number;
  ko: boolean;
}
export type RecoveryState = 'airborne' | 'knockdown' | 'missed-tech' | 'ground-tech' | 'wall-tech' | 'ceiling-tech'
  | 'getup-neutral' | 'getup-roll-left' | 'getup-roll-right' | 'getup-attack';

export function staleDamageMultiplier(queue: readonly string[], moveId: string): number {
  const slots = queue.slice(0, ULTIMATE_STALE_REDUCTION.length);
  if (!slots.includes(moveId)) return ULTIMATE_FRESHNESS_BONUS;
  const reduction = slots.reduce((total, id, index) => (
    total + (id === moveId ? ULTIMATE_STALE_REDUCTION[index] : 0)
  ), 0);
  return Math.max(0.3, 1 - reduction);
}

export function resolveUltimateAngle(angle: number, knockback: number, grounded: boolean): number {
  if (angle === 361) {
    if (!grounded) return 45;
    return knockback < 60 ? 0 : 45;
  }
  return angle;
}

export function calculateHitReaction(
  hitbox: FrameHitbox,
  target: CombatStats,
  moveId: string,
  oneVsOne = true,
): HitReaction {
  const staleMultiplier = staleDamageMultiplier(target.staleQueue, moveId);
  const staleDamage = hitbox.damage * staleMultiplier;
  const damage = staleDamage
    * (oneVsOne ? ULTIMATE_ONE_V_ONE_DAMAGE_MULTIPLIER : 1)
  const percent = target.percent;
  const weight = hitbox.setWeight ? 100 : Math.max(1, target.weight);
  const crouch = target.crouching ? 0.85 : 1;
  const p = hitbox.fixedKnockback > 0 ? 10 : percent + damage;
  const d = hitbox.fixedKnockback > 0
    ? hitbox.fixedKnockback
    : hitbox.damage * (1 + 0.3 * (staleMultiplier - 1));
  const raw = ((((p / 10 + p * d / 20) * (200 / (weight + 100)) * 1.4 + 18)
    * hitbox.knockbackGrowth / 100) + hitbox.baseKnockback) * 1.4;
  const knockback = raw * crouch;
  const effectMultiplier = hitbox.effect === 'Electric' ? 1.5 : 1;
  const hitlagFrames = hitbox.flinchless
    ? 0
    : Math.min(30, Math.floor((staleDamage * 0.65 + 6) * hitbox.hitlagMultiplier * effectMultiplier * (target.crouching ? 0.67 : 1)));
  const hitstunFrames = hitbox.flinchless ? 0 : Math.max(0, Math.floor(knockback * 0.4 - 1));
  const tumble = knockback >= 80 && !hitbox.flinchless;
  return {
    damage, knockback, launchSpeed: knockback * 0.03,
    launchAngle: resolveUltimateAngle(hitbox.angle, knockback, target.grounded ?? true), hitlagFrames, hitstunFrames, tumble, staleMultiplier,
  };
}

export function applyDirectionalInfluence(
  angleDegrees: number,
  input: InfluenceInput = {},
): { angle: number; speedMultiplier: number; sdi: { x: number; y: number } } {
  let angle = angleDegrees * Math.PI / 180;
  const diX = Math.max(-1, Math.min(1, input.diX ?? 0));
  const diY = Math.max(-1, Math.min(1, input.diY ?? 0));
  const tangent = Math.cos(angle) * diY - Math.sin(angle) * diX;
  angle += Math.max(-0.17, Math.min(0.17, tangent * 0.17));
  const lsi = Math.max(-1, Math.min(1, input.lsi ?? 0));
  const degrees = (angle * 180 / Math.PI + 360) % 360;
  const vertical = (degrees >= 65 && degrees <= 115) || (degrees >= 245 && degrees <= 295);
  const speedMultiplier = vertical
    ? 1
    : lsi > 0 ? 1 + 0.095 * lsi : 1 + 0.08 * lsi;
  return {
    angle: angle * 180 / Math.PI,
    speedMultiplier,
    sdi: { x: (input.sdiX ?? 0) * 3, y: (input.sdiY ?? 0) * 3 },
  };
}

export function advanceCombatFrame(reaction: HitReaction, percent: number, lag: number) {
  const frozen = lag > 0;
  return {
    percent,
    hitlagFrames: Math.max(0, lag - 1),
    hitstunFrames: frozen ? reaction.hitstunFrames : Math.max(0, reaction.hitstunFrames - 1),
    canCancel: !frozen && reaction.hitstunFrames <= 0,
  };
}

export function staleQueueAfterMove(queue: readonly string[], moveId: string): string[] {
  return [moveId, ...queue].slice(0, STALE_QUEUE_LENGTH);
}

export function applyReaction(
  state: CombatantRuntime,
  reaction: HitReaction,
  facing: -1 | 1,
  influence: InfluenceInput = {},
): CombatantRuntime {
  const adjusted = applyDirectionalInfluence(reaction.launchAngle, influence);
  const radians = adjusted.angle * Math.PI / 180;
  return {
    ...state,
    percent: state.percent + reaction.damage,
    velocityX: Math.cos(radians) * reaction.launchSpeed * adjusted.speedMultiplier * facing,
    velocityY: Math.sin(radians) * reaction.launchSpeed * adjusted.speedMultiplier,
    hitlagFrames: reaction.hitlagFrames,
    hitstunFrames: reaction.hitstunFrames,
    ko: false,
  };
}

/** One deterministic launch step: hitlag freezes motion, then Ultimate's 0.051/frame speed decay applies. */
export function stepLaunch(
  state: CombatantRuntime,
  blastzone = { left: -240, right: 240, bottom: -140, top: 179 },
): CombatantRuntime {
  if (state.ko) return state;
  if (state.hitlagFrames > 0) return { ...state, hitlagFrames: state.hitlagFrames - 1 };
  const decay = 0.051;
  const magnitude = Math.hypot(state.velocityX, state.velocityY);
  const factor = magnitude <= decay ? 0 : (magnitude - decay) / magnitude;
  const velocityX = state.velocityX * factor;
  const velocityY = state.velocityY * factor - 0.12;
  const positionX = state.positionX + velocityX;
  const positionY = state.positionY + velocityY;
  const ko = positionX < blastzone.left || positionX > blastzone.right
    || positionY < blastzone.bottom || positionY > blastzone.top;
  return {
    ...state, positionX: ko ? 0 : positionX, positionY: ko ? 0 : positionY,
    velocityX: ko ? 0 : velocityX, velocityY: ko ? 0 : velocityY,
    hitstunFrames: Math.max(0, state.hitstunFrames - 1), ko,
  };
}

export function canCancelHitstun(
  hitstunFramesElapsed: number,
  launchSpeed: number,
  action: 'air-dodge' | 'aerial',
): boolean {
  return action === 'air-dodge'
    ? hitstunFramesElapsed >= 40 && launchSpeed < 2.5
    : hitstunFramesElapsed >= 45 && launchSpeed < 2;
}

/** Ultimate tech input is accepted for 11 frames after impact on a techable surface. */
export function resolveLandingRecovery(
  surface: 'ground' | 'wall' | 'ceiling',
  canTech: boolean,
  techInputWithinWindow: boolean,
): RecoveryState {
  if (canTech && techInputWithinWindow) {
    return surface === 'ground' ? 'ground-tech' : surface === 'wall' ? 'wall-tech' : 'ceiling-tech';
  }
  return canTech ? 'missed-tech' : 'knockdown';
}

export function chooseGetup(option: 'neutral' | 'roll-left' | 'roll-right' | 'attack'): RecoveryState {
  return option === 'neutral' ? 'getup-neutral'
    : option === 'roll-left' ? 'getup-roll-left'
      : option === 'roll-right' ? 'getup-roll-right' : 'getup-attack';
}
