import { LEFT_DEPTH, POSES, RIGHT_DEPTH, lerpPose } from './poses.ts';
import type { Joint2, Pose } from './poses.ts';
import { WIKI_MOVE_DATA } from './wikiMoveData.ts';
import type { WikiGrabbox, WikiHitbox, WikiOffset, WikiPageKey } from './wikiMoveData.ts';
import type { AnimationCatalogEntry, PoseKey, WikiShapeSeed } from './animationCatalog.ts';
import type {
  AnimationFrame,
  FrameGrabbox,
  FrameHitbox,
  FrameHurtbox,
  FramePoint3,
  FrameSilhouette,
  SilhouettePoint,
} from '../../types/frameData.ts';

export const DEFAULT_SILHOUETTE_COLOR = '#20c6e7';
const MAX_SEEDED_SILHOUETTE_POINTS = 28;

export function createEditorId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `frame-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const round = (value: number) => Math.round(value * 100) / 100;

function point3(joint: Joint2, z: number): FramePoint3 {
  return { x: round(joint[0]), y: round(joint[1]), z: round(z) };
}

function lerp2(a: Joint2, b: Joint2, t: number): Joint2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Pose for a 1-based frame, interpolated between the surrounding keys. */
export function poseAtFrame(keys: readonly PoseKey[], frame: number): Pose {
  if (keys.length === 0) return POSES.stand;
  const sorted = [...keys].sort((a, b) => a.frame - b.frame);
  if (frame <= sorted[0].frame) return POSES[sorted[0].pose];
  for (let index = 1; index < sorted.length; index += 1) {
    const next = sorted[index];
    if (frame <= next.frame) {
      const previous = sorted[index - 1];
      const span = next.frame - previous.frame;
      const linear = span <= 0 ? 1 : (frame - previous.frame) / span;
      const eased = 0.5 - Math.cos(Math.PI * linear) / 2;
      return lerpPose(POSES[previous.pose], POSES[next.pose], eased);
    }
  }
  return POSES[sorted[sorted.length - 1].pose];
}

interface CapsuleSpec {
  part: string;
  start: Joint2;
  end: Joint2;
  radius: number;
  z: number;
}

function capsulesForPose(pose: Pose): CapsuleSpec[] {
  return [
    { part: 'head', start: lerp2(pose.neck, pose.head, 0.45), end: pose.head, radius: 2.4, z: 0 },
    { part: 'torso', start: lerp2(pose.hip, pose.neck, 0.1), end: lerp2(pose.hip, pose.neck, 0.82), radius: 3.2, z: 0 },
    { part: 'upperArmL', start: pose.shoulderL, end: pose.elbowL, radius: 1.3, z: LEFT_DEPTH },
    { part: 'forearmL', start: pose.elbowL, end: pose.handL, radius: 1.25, z: LEFT_DEPTH },
    { part: 'upperArmR', start: pose.shoulderR, end: pose.elbowR, radius: 1.3, z: RIGHT_DEPTH },
    { part: 'forearmR', start: pose.elbowR, end: pose.handR, radius: 1.25, z: RIGHT_DEPTH },
    { part: 'thighL', start: pose.hipL, end: pose.kneeL, radius: 1.8, z: LEFT_DEPTH },
    { part: 'shinL', start: pose.kneeL, end: pose.footL, radius: 1.45, z: LEFT_DEPTH },
    { part: 'thighR', start: pose.hipR, end: pose.kneeR, radius: 1.8, z: RIGHT_DEPTH },
    { part: 'shinR', start: pose.kneeR, end: pose.footR, radius: 1.45, z: RIGHT_DEPTH },
  ];
}

export function hurtboxesForPose(pose: Pose, createId = createEditorId): FrameHurtbox[] {
  return capsulesForPose(pose).map((capsule) => ({
    id: createId(),
    part: capsule.part,
    start: point3(capsule.start, capsule.z),
    end: point3(capsule.end, capsule.z),
    radius: capsule.radius,
    state: 'normal',
  }));
}

function cross(o: Joint2, a: Joint2, b: Joint2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

export function convexHull(points: Joint2[]): Joint2[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const lower: Joint2[] = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: Joint2[] = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function simplifyClosedPath(points: Joint2[], maximum: number): Joint2[] {
  const result = [...points];
  while (result.length > maximum) {
    let smallestIndex = 0;
    let smallestArea = Number.POSITIVE_INFINITY;
    for (let index = 0; index < result.length; index += 1) {
      const previous = result[(index - 1 + result.length) % result.length];
      const next = result[(index + 1) % result.length];
      const area = Math.abs(cross(previous, result[index], next));
      if (area < smallestArea) {
        smallestArea = area;
        smallestIndex = index;
      }
    }
    result.splice(smallestIndex, 1);
  }
  return result;
}

/** Presentation-only outline: the convex hull of the pose's capsules. */
export function silhouetteForPose(pose: Pose, createId = createEditorId): FrameSilhouette {
  const samples: Joint2[] = [];
  for (const capsule of capsulesForPose(pose)) {
    const radius = capsule.radius + 0.35;
    for (const center of [capsule.start, capsule.end]) {
      for (let step = 0; step < 12; step += 1) {
        const angle = (step / 12) * Math.PI * 2;
        samples.push([center[0] + Math.cos(angle) * radius, center[1] + Math.sin(angle) * radius]);
      }
    }
  }
  const outline = simplifyClosedPath(convexHull(samples), MAX_SEEDED_SILHOUETTE_POINTS);
  const points: SilhouettePoint[] = outline.map(([x, y]) => ({ id: createId(), x: round(x), y: round(y) }));
  return { color: DEFAULT_SILHOUETTE_COLOR, closed: true, points };
}

interface BoneFrame {
  origin: Joint2;
  direction: Joint2;
  depth: number;
}

function unit(from: Joint2, to: Joint2): Joint2 {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  return length === 0 ? [1, 0] : [dx / length, dy / length];
}

export const SUPPORTED_BONES = [
  'top', 'rot', 'hip', 'waist', 'head',
  'shoulderl', 'arml', 'handl', 'shoulderr', 'armr', 'handr',
  'legl', 'kneel', 'footl', 'legr', 'kneer', 'footr',
] as const;

function boneFrame(pose: Pose, bone: string): BoneFrame | null {
  switch (bone) {
    case 'rot':
    case 'hip':
    case 'waist':
      return { origin: pose.hip, direction: [1, 0], depth: 0 };
    case 'head':
      return { origin: pose.head, direction: unit(pose.neck, pose.head), depth: 0 };
    case 'shoulderl':
      return { origin: pose.shoulderL, direction: unit(pose.shoulderL, pose.elbowL), depth: LEFT_DEPTH };
    case 'arml':
      return { origin: pose.elbowL, direction: unit(pose.elbowL, pose.handL), depth: LEFT_DEPTH };
    case 'handl':
      return { origin: pose.handL, direction: unit(pose.elbowL, pose.handL), depth: LEFT_DEPTH };
    case 'shoulderr':
      return { origin: pose.shoulderR, direction: unit(pose.shoulderR, pose.elbowR), depth: RIGHT_DEPTH };
    case 'armr':
      return { origin: pose.elbowR, direction: unit(pose.elbowR, pose.handR), depth: RIGHT_DEPTH };
    case 'handr':
      return { origin: pose.handR, direction: unit(pose.elbowR, pose.handR), depth: RIGHT_DEPTH };
    case 'legl':
      return { origin: pose.hipL, direction: unit(pose.hipL, pose.kneeL), depth: LEFT_DEPTH };
    case 'kneel':
      return { origin: pose.kneeL, direction: unit(pose.kneeL, pose.footL), depth: LEFT_DEPTH };
    case 'footl':
      return { origin: pose.footL, direction: unit(pose.kneeL, pose.footL), depth: LEFT_DEPTH };
    case 'legr':
      return { origin: pose.hipR, direction: unit(pose.hipR, pose.kneeR), depth: RIGHT_DEPTH };
    case 'kneer':
      return { origin: pose.kneeR, direction: unit(pose.kneeR, pose.footR), depth: RIGHT_DEPTH };
    case 'footr':
      return { origin: pose.footR, direction: unit(pose.kneeR, pose.footR), depth: RIGHT_DEPTH };
    default:
      return null;
  }
}

function pick(offset: WikiOffset, end: boolean): number {
  return typeof offset === 'number' ? offset : offset[end ? 1 : 0];
}

/**
 * Approximate editor position of a wiki hitbox. `top` offsets are exact
 * (forward = Z, height = Y, depth = X). Other bones use the seeded pose's
 * limb directions, so those positions are rough and meant to be adjusted.
 */
export function placeWikiShape(
  pose: Pose,
  shape: Pick<WikiHitbox, 'bone' | 'offsetX' | 'offsetY' | 'offsetZ'>,
): { start: FramePoint3; end: FramePoint3 } {
  const place = (end: boolean): FramePoint3 => {
    const ox = pick(shape.offsetX, end);
    const oy = pick(shape.offsetY, end);
    const oz = pick(shape.offsetZ, end);
    if (shape.bone === 'top') {
      return { x: round(oz), y: round(oy), z: round(ox) };
    }
    const frame = boneFrame(pose, shape.bone);
    if (!frame) {
      throw new Error(`Unsupported hitbox bone "${shape.bone}".`);
    }
    const [dx, dy] = frame.direction;
    return {
      x: round(frame.origin[0] + dx * ox - dy * oy),
      y: round(frame.origin[1] + dy * ox + dx * oy),
      z: round(frame.depth + oz),
    };
  };
  return { start: place(false), end: place(true) };
}

function wikiSource(page: WikiPageKey, section: string, group: string, wikiId: number) {
  return { kind: 'smashwiki' as const, page, url: WIKI_MOVE_DATA[page].url, section, group, wikiId };
}

export function wikiHitboxToFrameHitbox(
  page: WikiPageKey,
  hitbox: WikiHitbox,
  pose: Pose,
  createId = createEditorId,
): FrameHitbox {
  const { start, end } = placeWikiShape(pose, hitbox);
  return {
    id: createId(),
    hitboxId: hitbox.id,
    part: hitbox.part,
    start,
    end,
    radius: hitbox.radius,
    damage: hitbox.damage,
    angle: hitbox.angle,
    baseKnockback: hitbox.baseKnockback,
    knockbackGrowth: hitbox.knockbackGrowth,
    fixedKnockback: hitbox.fixedKnockback,
    setWeight: hitbox.setWeight,
    shieldDamage: hitbox.shieldDamage,
    hitlagMultiplier: hitbox.hitlagMultiplier,
    sdiMultiplier: hitbox.sdiMultiplier,
    shieldstunMultiplier: hitbox.shieldstunMultiplier,
    extraShieldstunFrames: hitbox.extraShieldstunFrames,
    tripChance: hitbox.tripChance,
    rehitRate: hitbox.rehitRate,
    facing: hitbox.facing,
    effect: hitbox.effect,
    attackType: hitbox.attackType,
    soundLevel: hitbox.soundLevel,
    soundKind: hitbox.soundKind,
    hitsGrounded: hitbox.hitsGrounded,
    hitsAerial: hitbox.hitsAerial,
    clang: hitbox.clang,
    rebound: hitbox.rebound,
    direct: hitbox.direct,
    blockable: hitbox.blockable,
    reflectable: hitbox.reflectable,
    absorbable: hitbox.absorbable,
    flinchless: hitbox.flinchless,
    noGfx: hitbox.noGfx,
    heedless: hitbox.heedless,
    source: wikiSource(page, hitbox.section, hitbox.group, hitbox.id),
  };
}

export function wikiGrabboxToFrameGrabbox(
  page: WikiPageKey,
  grabbox: WikiGrabbox,
  pose: Pose,
  createId = createEditorId,
): FrameGrabbox {
  const { start, end } = placeWikiShape(pose, grabbox);
  return {
    id: createId(),
    grabboxId: grabbox.id,
    start,
    end,
    radius: grabbox.radius,
    hitsGrounded: grabbox.hitsGrounded,
    hitsAerial: grabbox.hitsAerial,
    source: wikiSource(page, grabbox.section, grabbox.group, grabbox.id),
  };
}

export function getSeedHitboxRows(seed: WikiShapeSeed): readonly WikiHitbox[] {
  return WIKI_MOVE_DATA[seed.page].hitboxes.filter(
    (row) => row.section === seed.section && row.group === seed.group,
  );
}

export function getSeedGrabboxRows(seed: WikiShapeSeed): readonly WikiGrabbox[] {
  return WIKI_MOVE_DATA[seed.page].grabboxes.filter(
    (row) => row.section === seed.section && row.group === seed.group,
  );
}

function inWindows(frame: number, windows: readonly (readonly [number, number])[]): boolean {
  return windows.some(([start, end]) => frame >= start && frame <= end);
}

/** Builds the default (seeded) frames for a catalog animation. */
export function seedAnimationFrames(
  entry: AnimationCatalogEntry,
  frameCount = entry.frameCount,
  createId = createEditorId,
): AnimationFrame[] {
  const frames: AnimationFrame[] = [];
  for (let frameNumber = 1; frameNumber <= frameCount; frameNumber += 1) {
    const pose = poseAtFrame(entry.keys, frameNumber);
    const hurtboxes = hurtboxesForPose(pose, createId);
    for (const stateSeed of entry.hurtboxStates ?? []) {
      if (frameNumber < stateSeed.frames[0] || frameNumber > stateSeed.frames[1]) continue;
      for (const hurtbox of hurtboxes) {
        if (!stateSeed.parts || (hurtbox.part && stateSeed.parts.includes(hurtbox.part))) {
          hurtbox.state = stateSeed.state;
        }
      }
    }
    const hitboxes: FrameHitbox[] = [];
    for (const seed of entry.hitboxes ?? []) {
      if (!inWindows(frameNumber, seed.frames)) continue;
      for (const row of getSeedHitboxRows(seed)) {
        hitboxes.push(wikiHitboxToFrameHitbox(seed.page, row, pose, createId));
      }
    }
    const grabboxes: FrameGrabbox[] = [];
    for (const seed of entry.grabboxes ?? []) {
      if (!inWindows(frameNumber, seed.frames)) continue;
      for (const row of getSeedGrabboxRows(seed)) {
        grabboxes.push(wikiGrabboxToFrameGrabbox(seed.page, row, pose, createId));
      }
    }
    frames.push({
      id: createId(),
      frameNumber,
      hurtboxes,
      hitboxes,
      grabboxes,
      silhouette: silhouetteForPose(pose, createId),
      referenceFrame: null,
    });
  }
  return frames;
}

export interface TimingMarker {
  label: string;
  value: string;
  frames: number[];
}

/** Parses a SmashWiki timing value such as "7-10", "19-", "14", or "5, 7, 9". */
export function parseTimingFrames(value: string, frameCount: number): number[] {
  const frames = new Set<number>();
  for (const part of value.split(',')) {
    const text = part.trim();
    const range = text.match(/^(\d+)\s*-\s*(\d+)?$/);
    if (range) {
      const start = Number(range[1]);
      const end = range[2] ? Number(range[2]) : frameCount;
      for (let frame = start; frame <= end; frame += 1) frames.add(frame);
    } else if (/^\d+$/.test(text)) {
      frames.add(Number(text));
    }
  }
  return [...frames].sort((a, b) => a - b);
}

export function getTimingMarkers(entry: AnimationCatalogEntry, frameCount = entry.frameCount): TimingMarker[] {
  if (!entry.timing) return [];
  const { page, section } = entry.timing;
  return WIKI_MOVE_DATA[page].timing
    .filter((row) => row.section === section && !row.label.startsWith('Animation length'))
    .map((row) => ({ label: row.label, value: row.value, frames: parseTimingFrames(row.value, frameCount) }));
}
