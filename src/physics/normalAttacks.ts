import { getCatalogEntry } from '../data/falcon/animationCatalog.ts';
import { WIKI_MOVE_DATA } from '../data/falcon/wikiMoveData.ts';
import { getTimingMarkers } from '../data/falcon/seedAnimation.ts';
import type { AnimationClip } from '../dev/animationPreview.ts';

export const NORMAL_ATTACK_IDS = [
  'jab-1', 'jab-2', 'jab-3', 'rapid-jab', 'rapid-jab-finisher',
  'dash-attack', 'ftilt-up', 'ftilt', 'ftilt-down', 'utilt', 'dtilt',
  'fsmash-up', 'fsmash', 'fsmash-down', 'usmash', 'dsmash',
  'nair', 'fair', 'bair', 'uair', 'dair',
] as const;

export type NormalAttackId = (typeof NORMAL_ATTACK_IDS)[number];
export type AttackStickMode = 'smash' | 'tilt';

export interface NormalAttackCommandInput {
  attackPressed: boolean;
  tiltPressed: boolean;
  smashPressed: boolean;
  horizontal: number;
  vertical: number;
  rightX: number;
  rightY: number;
  airborne: boolean;
  dashAttack: boolean;
  stickMode: AttackStickMode;
  flick: boolean;
}

export interface NormalAttackData {
  id: NormalAttackId;
  label: string;
  animationLength: number;
  firstActionableFrame: number;
  activeFrames: number[];
  landingLag: number;
  autoCancelFrames: number[];
  wikiUrl: string;
}

export function getNormalAttackData(id: NormalAttackId): NormalAttackData {
  const entry = getCatalogEntry(id);
  if (!entry?.timing) throw new Error(`Missing sourced attack data for ${id}`);
  const page = WIKI_MOVE_DATA[entry.timing.page];
  const rows = page.timing.filter((row) => row.section === entry.timing?.section);
  const markers = getTimingMarkers(entry);
  const interrupt = rows.find((row) => /^interruptible/i.test(row.label));
  const activeFrames = [...new Set((entry.hitboxes ?? []).flatMap((seed) =>
    seed.frames.flatMap(([start, end]) => Array.from({ length: end - start + 1 }, (_, i) => start + i)),
  ))].sort((a, b) => a - b);
  const landingPage = WIKI_MOVE_DATA[entry.timing.page];
  const landingRows = landingPage?.timing.filter((row) => row.section === 'Landing lag') ?? [];
  const landingLength = landingRows.find((row) => /Animation length/i.test(row.label));
  const autoCancelFrames = markers.filter((marker) => /autocancel/i.test(marker.label)).flatMap((marker) => marker.frames);
  return {
    id, label: entry.label, animationLength: entry.frameCount,
    firstActionableFrame: interrupt ? Number(interrupt.value.match(/\d+/)?.[0] ?? entry.frameCount + 1) : entry.frameCount + 1,
    activeFrames, landingLag: Number(landingLength?.value.match(/\d+/)?.[0] ?? 0),
    autoCancelFrames, wikiUrl: page.url,
  };
}

export function classifyNormalAttack(input: NormalAttackCommandInput): NormalAttackId | null {
  if (!input.attackPressed && !input.tiltPressed && !input.smashPressed && !input.dashAttack) return null;
  const x = input.rightX || input.horizontal;
  const y = input.rightY || input.vertical;
  const hasRightStick = Math.abs(input.rightX) > 0.65 || Math.abs(input.rightY) > 0.65;
  const smash = input.smashPressed || (input.stickMode === 'smash' && hasRightStick)
    || (!input.tiltPressed && input.flick && !hasRightStick);
  if (input.airborne) {
    if (y > 0.55) return 'uair';
    if (y < -0.55) return 'dair';
    if (x < -0.55) return 'bair';
    if (x > 0.55) return 'fair';
    return 'nair';
  }
  if (input.dashAttack) return 'dash-attack';
  if (smash) {
    if (y > 0.55) return 'usmash';
    if (y < -0.55) return 'dsmash';
    if (Math.abs(x) > 0.55 && y > 0.2) return 'fsmash-up';
    if (Math.abs(x) > 0.55 && y < -0.2) return 'fsmash-down';
    return 'fsmash';
  }
  if (y > 0.55) return 'utilt';
  if (y < -0.55) return 'dtilt';
  if (Math.abs(x) > 0.55 && y > 0.2) return 'ftilt-up';
  if (Math.abs(x) > 0.55 && y < -0.2) return 'ftilt-down';
  if (Math.abs(x) > 0.55) return 'ftilt';
  return 'jab-1';
}

export function resolveAttackClipKey(id: NormalAttackId, clip: AnimationClip): string {
  return `${clip.key}:attack:${id}`;
}

export function scaleAerialHitboxes<T extends { damage: number }>(hitboxes: readonly T[], shortHop: boolean): T[] {
  const multiplier = shortHop ? 0.85 : 1;
  return hitboxes.map((hitbox) => ({ ...hitbox, damage: hitbox.damage * multiplier }));
}

export function scaleAttackHitboxes<T extends { damage: number }>(hitboxes: readonly T[], multiplier: number): T[] {
  return hitboxes.map((hitbox) => ({ ...hitbox, damage: hitbox.damage * Math.max(0, multiplier) }));
}

export function getSmashChargeDamageMultiplier(chargeFrames: number): number {
  return 1 + 0.4 * Math.max(0, Math.min(60, chargeFrames)) / 60;
}

export function getJabFollowup(attack: NormalAttackId, held: boolean): NormalAttackId | null {
  if (attack === 'jab-1') return held ? 'jab-2' : null;
  if (attack === 'jab-2') return held ? 'rapid-jab' : 'jab-3';
  if (attack === 'rapid-jab') return held ? 'rapid-jab' : 'rapid-jab-finisher';
  return null;
}
