import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IDLE_VARIANCE_CHANCE_PER_FRAME,
  IDLE_VARIANCE_MIN_IDLE_FRAMES,
  INITIAL_IDLE_VARIANCE_PLAYBACK,
  INITIAL_MOVEMENT_ANIMATION_PREVIEW,
  stepMovementAnimationPreview,
  stepIdleVariancePlayback,
} from '../../src/dev/animationPreview.ts';
import { createInitialTrainingMovementState } from '../../src/physics/trainingMovement.ts';

function createDraft(id, motionState, frameCount) {
  return {
    id,
    motionState,
    name: id,
    frames: Array.from({ length: frameCount }, (_, index) => ({
      frameNumber: index + 1,
      hurtboxes: [],
      silhouette: { color: '#20c6e7', closed: true, points: [] },
    })),
  };
}

test('idle variance waits through the minimum idle period before a random trigger', () => {
  let playback = INITIAL_IDLE_VARIANCE_PLAYBACK;
  const neverTrigger = () => 1;
  for (let frame = 0; frame < IDLE_VARIANCE_MIN_IDLE_FRAMES - 1; frame += 1) {
    playback = stepIdleVariancePlayback(playback, true, 3, neverTrigger);
  }
  assert.equal(playback.frameIndex, null);
  assert.equal(playback.idleFrames, IDLE_VARIANCE_MIN_IDLE_FRAMES - 1);

  playback = stepIdleVariancePlayback(playback, true, 3, () => 0);
  assert.equal(playback.frameIndex, 0);
  assert.equal(playback.idleFrames, IDLE_VARIANCE_MIN_IDLE_FRAMES);
  assert.equal(IDLE_VARIANCE_CHANCE_PER_FRAME, 1 / 480);
});

test('idle variance advances through its clip once, then returns to idle', () => {
  let playback = stepIdleVariancePlayback(
    INITIAL_IDLE_VARIANCE_PLAYBACK,
    true,
    3,
    () => 1,
    true,
  );
  assert.equal(playback.frameIndex, 0);

  playback = stepIdleVariancePlayback(playback, true, 3);
  assert.equal(playback.frameIndex, 1);
  playback = stepIdleVariancePlayback(playback, true, 3);
  assert.equal(playback.frameIndex, 2);
  playback = stepIdleVariancePlayback(playback, true, 3);
  assert.deepEqual(playback, { idleFrames: 0, frameIndex: null });
});

test('movement cancels idle variance and resets its idle timer', () => {
  const playback = stepIdleVariancePlayback(
    INITIAL_IDLE_VARIANCE_PLAYBACK,
    true,
    2,
    Math.random,
    true,
  );
  assert.deepEqual(
    stepIdleVariancePlayback(playback, false, 2),
    { idleFrames: 0, frameIndex: null },
  );
});

test('gameplay preview plays idle variance over idle, then resumes the idle clip', () => {
  const movement = createInitialTrainingMovementState();
  const drafts = {
    idle: createDraft('idle-draft', 'idle', 2),
    'idle-variance': createDraft('variance-draft', 'idle-variance', 2),
  };

  const idle = stepMovementAnimationPreview(
    INITIAL_MOVEMENT_ANIMATION_PREVIEW,
    movement,
    drafts,
    () => 1,
  );
  assert.equal(idle.animation.motionState, 'idle');
  assert.equal(idle.animation.frameIndex, 0);

  const variationStart = stepMovementAnimationPreview(
    idle.playback,
    movement,
    drafts,
    () => 1,
    true,
  );
  assert.equal(variationStart.animation.motionState, 'idle-variance');
  assert.equal(variationStart.animation.frameIndex, 0);

  const variationEnd = stepMovementAnimationPreview(
    variationStart.playback,
    movement,
    drafts,
    () => 1,
  );
  assert.equal(variationEnd.animation.motionState, 'idle-variance');
  assert.equal(variationEnd.animation.frameIndex, 1);

  const resumedIdle = stepMovementAnimationPreview(
    variationEnd.playback,
    movement,
    drafts,
    () => 1,
  );
  assert.equal(resumedIdle.animation.motionState, 'idle');
  assert.equal(resumedIdle.animation.frameIndex, 0);
});
