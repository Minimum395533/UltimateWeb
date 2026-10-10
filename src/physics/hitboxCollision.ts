import type { FrameGrabbox, FrameHitbox, FrameHurtbox, FramePoint3, HurtboxState } from '../types/frameData.ts';

export interface CombatantFrame {
  id: string;
  moveId: string;
  frame: number;
  position: FramePoint3;
  facing: -1 | 1;
  grounded: boolean;
  hitboxes: readonly FrameHitbox[];
  hurtboxes: readonly FrameHurtbox[];
  grabboxes?: readonly FrameGrabbox[];
}

export interface CollisionResult {
  hits: Array<{ attackerId: string; targetId: string; moveId: string; hitboxId: number; hitbox: FrameHitbox; hurtboxId: string; effect: 'hit' | 'invincible' }>;
  clashes: Array<{ attackerId: string; targetId: string; hitboxId: number; targetHitboxId: number; outcome: 'clank' | 'trade' }>;
}

export interface CollisionHistory { lastHitFrame: number; rehitRate: number }

type Point = [number, number, number];
const worldPoint = (position: FramePoint3, facing: -1 | 1, local: FramePoint3): Point =>
  [position.x + local.x * facing, position.y + local.y, position.z + local.z];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** Exact minimum distance between two 3D line segments, including point capsules. */
export function segmentDistanceSquared(p1: Point, q1: Point, p2: Point, q2: Point): number {
  const d1 = subtract(q1, p1);
  const d2 = subtract(q2, p2);
  const r = subtract(p1, p2);
  const a = dot(d1, d1), e = dot(d2, d2), f = dot(d2, r);
  let s = 0, t = 0;
  if (a <= 1e-12 && e <= 1e-12) return dot(r, r);
  if (a <= 1e-12) t = clamp01(f / e);
  else {
    const c = dot(d1, r);
    if (e <= 1e-12) s = clamp01(-c / a);
    else {
      const b = dot(d1, d2);
      const denominator = a * e - b * b;
      if (denominator !== 0) s = clamp01((b * f - c * e) / denominator);
      t = (b * s + f) / e;
      if (t < 0) { t = 0; s = clamp01(-c / a); }
      else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
    }
  }
  const closest = subtract(
    [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s],
    [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t],
  );
  return dot(closest, closest);
}

export function capsulesOverlap(
  a: { start: FramePoint3; end: FramePoint3; radius: number },
  actorA: Pick<CombatantFrame, 'position' | 'facing'>,
  b: { start: FramePoint3; end: FramePoint3; radius: number },
  actorB: Pick<CombatantFrame, 'position' | 'facing'>,
): boolean {
  const startA = worldPoint(actorA.position, actorA.facing, a.start);
  const endA = worldPoint(actorA.position, actorA.facing, a.end);
  const startB = worldPoint(actorB.position, actorB.facing, b.start);
  const endB = worldPoint(actorB.position, actorB.facing, b.end);
  const radius = a.radius + b.radius;
  return segmentDistanceSquared(startA, endA, startB, endB) <= radius * radius;
}

const historyKey = (actorId: string, moveId: string, targetId: string) => `${actorId}:${moveId}:${targetId}`;

/** Resolve one fixed simulation frame of hitboxes, target hurtboxes, clanks, and trades. */
export function resolveHitboxCollisions(
  combatants: readonly CombatantFrame[],
  history: Map<string, CollisionHistory>,
): CollisionResult {
  const result: CollisionResult = { hits: [], clashes: [] };
  for (let ai = 0; ai < combatants.length; ai += 1) {
    const attacker = combatants[ai];
    for (let ti = 0; ti < combatants.length; ti += 1) {
      if (ai === ti) continue;
      const target = combatants[ti];
      const overlapping: Array<{ hitbox: FrameHitbox; hurtbox: FrameHurtbox }> = [];
      for (const hitbox of attacker.hitboxes) {
        if (!(target.grounded ? hitbox.hitsGrounded : hitbox.hitsAerial)) continue;
        for (const hurtbox of target.hurtboxes) {
          if (hurtbox.state !== 'intangible' && capsulesOverlap(hitbox, attacker, hurtbox, target)) {
            overlapping.push({ hitbox, hurtbox });
          }
        }
      }
      overlapping.sort((a, b) => a.hitbox.hitboxId - b.hitbox.hitboxId
        || a.hitbox.id.localeCompare(b.hitbox.id)
        || Number(a.hurtbox.state !== 'normal') - Number(b.hurtbox.state !== 'normal'));
      const eligible = overlapping.find(() => {
        const key = historyKey(attacker.id, attacker.moveId, target.id);
        const previous = history.get(key);
        if (!previous) return true;
        return previous.rehitRate > 0 && attacker.frame - previous.lastHitFrame >= previous.rehitRate;
      });
      if (eligible) {
        const { hitbox, hurtbox } = eligible;
        result.hits.push({
          attackerId: attacker.id, targetId: target.id, moveId: attacker.moveId,
          hitboxId: hitbox.hitboxId, hitbox, hurtboxId: hurtbox.id,
          effect: hurtbox.state === 'invincible' ? 'invincible' : 'hit',
        });
        history.set(historyKey(attacker.id, attacker.moveId, target.id), {
          lastHitFrame: attacker.frame, rehitRate: Math.max(0, hitbox.rehitRate),
        });
      }
      for (const attack of attacker.hitboxes) for (const defense of target.hitboxes) {
        if (!capsulesOverlap(attack, attacker, defense, target)) continue;
        result.clashes.push({
          attackerId: attacker.id, targetId: target.id, hitboxId: attack.hitboxId,
          targetHitboxId: defense.hitboxId,
          outcome: attack.clang && defense.clang ? 'clank' : 'trade',
        });
      }
    }
  }
  result.clashes.sort((a, b) => a.attackerId.localeCompare(b.attackerId) || a.hitboxId - b.hitboxId || a.targetHitboxId - b.targetHitboxId);
  return result;
}

export function defaultTrainingHurtboxes(): FrameHurtbox[] {
  return [
    { id: 'default-head', part: 'head', start: { x: 0, y: 14, z: 0 }, end: { x: 0, y: 17, z: 0 }, radius: 2, state: 'normal' as HurtboxState },
    { id: 'default-torso', part: 'torso', start: { x: 0, y: 5, z: 0 }, end: { x: 0, y: 13, z: 0 }, radius: 3, state: 'normal' as HurtboxState },
    { id: 'default-legs', part: 'legs', start: { x: 0, y: 0, z: 0 }, end: { x: 0, y: 5, z: 0 }, radius: 2.5, state: 'normal' as HurtboxState },
  ];
}
