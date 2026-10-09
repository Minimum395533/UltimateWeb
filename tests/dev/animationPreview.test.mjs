import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IDLE_VARIANCE_CHANCE_PER_FRAME,
  IDLE_VARIANCE_MIN_IDLE_FRAMES,
  INITIAL_IDLE_VARIANCE_PLAYBACK,
  stepIdleVariancePlayback,
} from '../../src/dev/animationPreview.ts';

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
