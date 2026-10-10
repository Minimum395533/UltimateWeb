import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ULTIMATE_LEDGE, canChooseLedgeOption, chooseLedgeOption, createLedgeRecoveryState,
  detectLedgeGrab, grabLedge, ledgeGrabActionDelayFrames, ledgeGrabIntangibility,
  ledgeHangLimit, ledgeOptionFrameCount, ledgeOptionIntangible, snapLedgePosition,
  stepLedge, trumpLedge,
} from '../../src/physics/ledgeRecovery.ts';

test('ledge snap detects both platform edges only while descending beside the ledge', () => {
  assert.equal(detectLedgeGrab(82, -4, -1, true), 1);
  assert.equal(detectLedgeGrab(-82, -4, -1, true), -1);
  assert.equal(detectLedgeGrab(80, -4, 1, true), null);
  assert.equal(detectLedgeGrab(80, -4, -1, false), null);
  assert.equal(Number(snapLedgePosition(-1)), -80);
});

test('Ultimate ledge intangibility follows airtime and percent, and regrabs lose it', () => {
  assert.equal(ledgeGrabIntangibility(0, 120), 23);
  assert.equal(ledgeGrabIntangibility(300, 0), 123);
  let ledge = grabLedge(createLedgeRecoveryState(), 1, 90, 25);
  assert.ok(ledge.intangibilityFrames > 0);
  ledge = grabLedge(ledge, -1, 120, 40);
  assert.equal(ledge.intangibilityFrames, 0);
  assert.equal(ledgeGrabActionDelayFrames(3), 21);
  const afterHitstun = grabLedge(ledge, 1, 120, 40, true);
  assert.equal(afterHitstun.grabCount, 1);
  assert.ok(afterHitstun.intangibilityFrames > 0);
  for (let count = 2; count < ULTIMATE_LEDGE.maxRegrabs; count += 1) {
    ledge = grabLedge(ledge, 1, 120, 40);
  }
  assert.equal(grabLedge(ledge, -1, 120, 40), null);
});

test('ledge hang time, action lockout, trumping, and all five distinct catalog options work', () => {
  assert.equal(ledgeHangLimit(0), 390);
  assert.equal(ledgeHangLimit(100), 300);
  let ledge = grabLedge(createLedgeRecoveryState(), 1, 0, 0);
  assert.equal(canChooseLedgeOption(ledge), false);
  for (let frame = 0; frame < 19; frame += 1) ledge = stepLedge(ledge);
  assert.equal(canChooseLedgeOption(ledge), true);
  assert.deepEqual(trumpLedge('P1', 'P2'), { occupant: 'P2', trumped: 'P1' });
  assert.deepEqual(trumpLedge(null, 'P1'), { occupant: 'P1', trumped: null });
  for (const option of ['getup', 'roll', 'jump', 'drop', 'attack']) {
    assert.ok(ledgeOptionFrameCount(option) > 0, `${option} has a catalog animation`);
    const selected = chooseLedgeOption(ledge, option);
    assert.equal(selected.option, option);
  }
  assert.equal(ledgeOptionIntangible({ ...ledge, option: 'attack', optionFrame: 22 }), true);
  assert.equal(ledgeOptionIntangible({ ...ledge, option: 'attack', optionFrame: 25 }), false);
});
