import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cloneAnimationFrame,
  createEmptyFrame,
  createGrabbox,
  createHitbox,
  createHurtbox,
  normalizeFrameCount,
  planFrameCountChange,
  trimFramesToCount,
  upgradeDraftFramesToV3,
  upgradeReferenceSettings,
  validateAnimationFrames,
  DEFAULT_SHAPE_DEFAULTS,
} from '../../src/dev/frameDataModel.ts';
import { createApprovedAnimation, renderApprovedModule } from '../../src/dev/approvedExport.ts';
import { DEFAULT_REFERENCE_SETTINGS } from '../../src/types/frameData.ts';

const framesOf = (count) => Array.from({ length: count }, (_, index) => createEmptyFrame(index + 1));

test('empty frames validate and keep the silhouette separate from collision', () => {
  const frame = createEmptyFrame(1);
  assert.deepEqual(frame.hurtboxes, []);
  assert.deepEqual(frame.hitboxes, []);
  assert.deepEqual(frame.grabboxes, []);
  assert.equal(frame.referenceFrame, null);
  assert.ok(frame.silhouette.points.length >= 3);
  assert.equal(validateAnimationFrames([frame]), null);
});

test('frames with every shape kind validate', () => {
  const frame = createEmptyFrame(1);
  frame.hurtboxes.push({ ...createHurtbox(), state: 'invincible' });
  frame.hitboxes.push(createHitbox(DEFAULT_SHAPE_DEFAULTS, 0));
  frame.grabboxes.push(createGrabbox(3, 0));
  assert.equal(validateAnimationFrames([frame]), null);
});

test('validation enforces the exact locked frame count', () => {
  assert.equal(validateAnimationFrames(framesOf(3), 3), null);
  assert.match(validateAnimationFrames(framesOf(2), 3), /exactly 3 frames/);
  assert.match(validateAnimationFrames(framesOf(4), 3), /exactly 3 frames/);
});

test('validation rejects bad numbering, duplicate ids, and unknown hurtbox states', () => {
  const misnumbered = framesOf(2);
  misnumbered[1] = { ...misnumbered[1], frameNumber: 5 };
  assert.match(validateAnimationFrames(misnumbered), /numbered 1 to N/);

  const duplicate = framesOf(2);
  duplicate[1] = { ...duplicate[1], id: duplicate[0].id };
  assert.match(validateAnimationFrames(duplicate), /unique/);

  const badState = framesOf(1);
  badState[0].hurtboxes.push({ ...createHurtbox(), state: 'armored' });
  assert.match(validateAnimationFrames(badState), /hurtboxes/);
});

test('short drafts are padded with copies of the last frame', () => {
  const frames = framesOf(2);
  frames[1].hurtboxes.push(createHurtbox(4));
  const result = normalizeFrameCount(frames, 4);
  assert.equal(result.padded, 2);
  assert.equal(result.extra, 0);
  assert.equal(result.frames.length, 4);
  assert.deepEqual(result.frames.map((frame) => frame.frameNumber), [1, 2, 3, 4]);
  assert.equal(result.frames[3].hurtboxes[0].radius, 4);
  assert.notEqual(result.frames[3].hurtboxes[0].id, frames[1].hurtboxes[0].id);
  assert.equal(validateAnimationFrames(result.frames, 4), null);
});

test('long drafts are never trimmed silently', () => {
  const frames = framesOf(5);
  const result = normalizeFrameCount(frames, 3);
  assert.equal(result.extra, 2);
  assert.equal(result.frames.length, 5);
  const trimmed = trimFramesToCount(frames, 3);
  assert.equal(trimmed.length, 3);
  assert.equal(validateAnimationFrames(trimmed, 3), null);
});

test('count changes reuse stored extra frames before adding copies', () => {
  // A 100-frame draft opened under a 60-frame lock: 60 visible, 40 stored extras.
  const stored = framesOf(100).map((frame, index) => ({ ...frame, hurtboxes: [{ ...createHurtbox(), radius: 1 + index / 100 }] }));
  const visible = stored.slice(0, 60);
  const extra = stored.slice(60);

  const to70 = planFrameCountChange(visible, extra, 70);
  assert.equal(to70.frames.length, 70);
  assert.equal(to70.restored, 10);
  assert.equal(to70.added, 0);
  assert.equal(to70.dropped, 30, 'the remaining 30 stored frames need confirmation to drop');
  assert.deepEqual(to70.frames.slice(60).map((frame) => frame.id), extra.slice(0, 10).map((frame) => frame.id));
  assert.equal(validateAnimationFrames(to70.frames, 70), null);

  const to100 = planFrameCountChange(visible, extra, 100);
  assert.equal(to100.restored, 40);
  assert.equal(to100.dropped, 0);
  assert.deepEqual(to100.frames.map((frame) => frame.id), stored.map((frame) => frame.id));

  const to110 = planFrameCountChange(visible, extra, 110);
  assert.equal(to110.restored, 40);
  assert.equal(to110.added, 10);
  assert.equal(to110.frames[109].hurtboxes[0].radius, stored[99].hurtboxes[0].radius);
  assert.equal(validateAnimationFrames(to110.frames, 110), null);

  const to50 = planFrameCountChange(visible, extra, 50);
  assert.equal(to50.restored, 0);
  assert.equal(to50.dropped, 50);
  assert.equal(validateAnimationFrames(to50.frames, 50), null);

  const noExtra = planFrameCountChange(visible, [], 64);
  assert.equal(noExtra.added, 4);
  assert.equal(noExtra.dropped, 0);
});

test('cloned frames get fresh ids for the frame and every shape', () => {
  const frame = createEmptyFrame(1);
  frame.hurtboxes.push(createHurtbox());
  const copy = cloneAnimationFrame(frame, 7);
  assert.equal(copy.frameNumber, 7);
  assert.notEqual(copy.id, frame.id);
  assert.notEqual(copy.hurtboxes[0].id, frame.hurtboxes[0].id);
  assert.notEqual(copy.silhouette.points[0].id, frame.silhouette.points[0].id);
});

test('v2 movement frames upgrade to v3 without losing hurtboxes', () => {
  const legacy = [{
    id: 'legacy-1',
    frameNumber: 1,
    silhouette: { color: '#336699', closed: true, points: [{ id: 'p1', x: 0, y: 0 }, { id: 'p2', x: 1, y: 2 }, { id: 'p3', x: 2, y: 0 }] },
    hurtboxes: [
      { id: 'h1', start: { x: 0, y: 1, z: 0 }, end: { x: 0, y: 8, z: 0 }, radius: 3, isVulnerable: true },
      { id: 'h2', start: { x: 0, y: 9, z: 0 }, end: { x: 0, y: 9, z: 0 }, radius: 2, isVulnerable: false },
    ],
  }];
  const upgraded = upgradeDraftFramesToV3(legacy);
  assert.equal(upgraded[0].id, 'legacy-1');
  assert.deepEqual(upgraded[0].hurtboxes.map((box) => box.state), ['normal', 'intangible']);
  assert.ok(upgraded[0].hurtboxes.every((box) => !('isVulnerable' in box)));
  assert.deepEqual(upgraded[0].hitboxes, []);
  assert.deepEqual(upgraded[0].grabboxes, []);
  assert.equal(upgraded[0].referenceFrame, null);
  assert.equal(upgraded[0].silhouette.color, '#336699');
  assert.equal(validateAnimationFrames(upgraded, 1), null);
});

test('reference settings fill in missing fields from defaults', () => {
  const upgraded = upgradeReferenceSettings({ scale: 1.4, offsetX: 2, offsetY: -1, locked: false });
  assert.equal(upgraded.scale, 1.4);
  assert.equal(upgraded.locked, false);
  assert.equal(upgraded.opacity, DEFAULT_REFERENCE_SETTINGS.opacity);
  assert.equal(upgraded.linkFrames, false);
  assert.deepEqual(upgradeReferenceSettings({ scale: 99 }), DEFAULT_REFERENCE_SETTINGS);
});

test('approval export rejects drafts that do not match the locked count', () => {
  const draft = {
    id: 'draft-1',
    characterId: 'captain-falcon',
    animationId: 'jump-squat',
    name: 'Jump squat',
    schemaVersion: 3,
    status: 'draft',
    frames: framesOf(3),
    referenceAssetId: null,
    referenceSettings: DEFAULT_REFERENCE_SETTINGS,
    assets: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
  assert.throws(() => createApprovedAnimation(draft, 4, '2026-10-09T00:00:00.000Z'), /locked count is 4/);
  const approved = createApprovedAnimation({ ...draft, frames: draft.frames.map((frame) => ({ ...frame, referenceFrame: 2 })) }, 3, '2026-10-09T00:00:00.000Z');
  assert.equal(approved.frameCount, 3);
  assert.equal(approved.sourceDraftUpdatedAt, draft.updatedAt);
  assert.ok(approved.frames.every((frame) => frame.referenceFrame === null));

  const source = renderApprovedModule({ 'jump-squat': approved });
  assert.match(source, /export const APPROVED_ANIMATIONS/);
  assert.match(source, /"jump-squat"/);
  assert.match(renderApprovedModule({}), /= \{\};/);
});
