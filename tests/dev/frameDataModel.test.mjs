import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cloneMovementFrame,
  createMovementFrame,
  replaceMovementFrame,
  validateMovementFrames,
} from '../../src/dev/frameDataModel.ts';
import { MOVEMENT_STATES } from '../../src/types/frameData.ts';

test('movement frame starts with separate visual and collision data', () => {
  const frame = createMovementFrame(1);

  assert.equal(frame.frameNumber, 1);
  assert.deepEqual(frame.hurtboxes, []);
  assert.equal(frame.silhouette.closed, true);
  assert.ok(frame.silhouette.points.length >= 3);
  assert.notEqual(frame.silhouette.color, '');
  assert.equal(validateMovementFrames([frame]), null);
});

test('editing one frame leaves other frame objects unchanged', () => {
  const firstFrame = createMovementFrame(1);
  const secondFrame = createMovementFrame(2);
  const updatedFirstFrame = {
    ...firstFrame,
    silhouette: { ...firstFrame.silhouette, color: '#ffcc00' },
    hurtboxes: [{
      id: 'capsule-1',
      start: { x: -1, y: 2, z: 0 },
      end: { x: 1, y: 14, z: 2 },
      radius: 3.5,
      isVulnerable: true,
    }],
  };

  const updatedFrames = replaceMovementFrame(
    [firstFrame, secondFrame],
    updatedFirstFrame,
  );

  assert.equal(updatedFrames[0].silhouette.color, '#ffcc00');
  assert.equal(updatedFrames[0].hurtboxes.length, 1);
  assert.strictEqual(updatedFrames[1], secondFrame);
  assert.deepEqual(updatedFrames[1].hurtboxes, []);
  assert.notEqual(updatedFrames[1].silhouette.color, '#ffcc00');
});

test('capsule endpoint coordinates, radius, and vulnerability are validated', () => {
  const frame = createMovementFrame(1);
  frame.hurtboxes.push({
    id: 'capsule-1',
    start: { x: -2, y: 1, z: -3 },
    end: { x: 2, y: 16, z: 3 },
    radius: 4,
    isVulnerable: true,
  });
  assert.equal(validateMovementFrames([frame]), null);

  const invalidRadius = structuredClone(frame);
  invalidRadius.hurtboxes[0].radius = 0;
  assert.match(validateMovementFrames([invalidRadius]), /capsule hurtboxes/);

  const invalidDepth = structuredClone(frame);
  invalidDepth.hurtboxes[0].end.z = Number.POSITIVE_INFINITY;
  assert.match(validateMovementFrames([invalidDepth]), /capsule hurtboxes/);

  const invalidVulnerability = structuredClone(frame);
  invalidVulnerability.hurtboxes[0].isVulnerable = 'true';
  assert.match(validateMovementFrames([invalidVulnerability]), /capsule hurtboxes/);
});

test('silhouette color and points remain their own presentation-only fields', () => {
  const frame = createMovementFrame(1);
  frame.silhouette = {
    color: '#35aaff',
    closed: false,
    points: [
      { id: 'p1', x: -3, y: 0 },
      { id: 'p2', x: 0, y: 18 },
      { id: 'p3', x: 3, y: 0 },
    ],
  };

  assert.equal(validateMovementFrames([frame]), null);
  assert.equal(frame.hurtboxes.length, 0);
  assert.deepEqual(frame.silhouette.points.map(({ x, y }) => [x, y]), [
    [-3, 0],
    [0, 18],
    [3, 0],
  ]);

  const invalidColor = structuredClone(frame);
  invalidColor.silhouette.color = 'red';
  assert.match(validateMovementFrames([invalidColor]), /silhouette/);
});

test('cloned frames get independent frame, hurtbox, and visual point identities', () => {
  const frame = createMovementFrame(1);
  frame.hurtboxes.push({
    id: 'capsule-1',
    start: { x: 0, y: 2, z: 0 },
    end: { x: 0, y: 16, z: 0 },
    radius: 4,
    isVulnerable: true,
  });

  const clone = cloneMovementFrame(frame, 2);

  assert.equal(clone.frameNumber, 2);
  assert.notEqual(clone.id, frame.id);
  assert.notEqual(clone.hurtboxes[0].id, frame.hurtboxes[0].id);
  assert.notEqual(clone.silhouette.points[0].id, frame.silhouette.points[0].id);
  clone.silhouette.points[0].x = -10;
  assert.notEqual(frame.silhouette.points[0].x, -10);
});

test('movement selector includes all current grounded and aerial states', () => {
  assert.deepEqual(MOVEMENT_STATES.map(({ id }) => id), [
    'idle',
    'walk',
    'initial-dash',
    'run',
    'turnaround-dash',
    'jump-squat',
    'rising',
    'falling',
    'fast-fall',
    'landing',
  ]);
});
