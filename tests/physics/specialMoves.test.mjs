import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  falconSpecialAnimationId,
  falconSpecialArmorFrames,
  falconSpecialCanBReverse,
  falconSpecialContactWindow,
  selectFalconSpecial,
  specialLandingAnimationId,
  specialRequiresHelplessFall,
} from '../../src/physics/specialMoves.ts';

const input = (horizontal = 0, vertical = 0) => ({ horizontal, vertical });

test('special direction selects all four Captain Falcon specials and grounded/air variants', () => {
  assert.equal(falconSpecialAnimationId(selectFalconSpecial(input(), true, 1)), 'falcon-punch');
  assert.equal(falconSpecialAnimationId(selectFalconSpecial(input(1), true, 1)), 'raptor-boost');
  assert.equal(falconSpecialAnimationId(selectFalconSpecial(input(0, 1), false, 1)), 'falcon-dive');
  assert.equal(falconSpecialAnimationId(selectFalconSpecial(input(0, -1), true, 1)), 'falcon-kick');
  assert.equal(falconSpecialAnimationId(selectFalconSpecial(input(1), false, 1)), 'raptor-boost-air');
});

test('neutral special uses Falcon Punch reversal data, not a generic B-reverse clip', () => {
  const command = selectFalconSpecial(input(-1), true, 1);
  assert.equal(command.move, 'raptor-boost');
  const punch = selectFalconSpecial(input(), true, 1);
  assert.equal(falconSpecialAnimationId({ ...punch, reversed: true }), 'falcon-punch-reverse');
  assert.deepEqual(falconSpecialContactWindow({ ...punch, reversed: true }), [62, 66]);
  assert.deepEqual(falconSpecialContactWindow(punch), [53, 57]);
});

test('smashed side-special input is retained only for Raptor Boost', () => {
  const side = selectFalconSpecial(input(1), true, 1, true);
  assert.equal(side.smashedSideInput, true);
  assert.equal(selectFalconSpecial(input(), true, 1, true).smashedSideInput, false);
});

test('all specials except Falcon Punch permit B-reverse, while Punch has a separate turnaround', () => {
  const neutral = selectFalconSpecial(input(), true, 1);
  const side = selectFalconSpecial(input(1), true, 1);
  const up = selectFalconSpecial(input(0, 1), true, 1);
  const down = selectFalconSpecial(input(0, -1), true, 1);
  assert.equal(falconSpecialCanBReverse(neutral), false);
  assert.equal(falconSpecialCanBReverse(side), true);
  assert.equal(falconSpecialCanBReverse(up), true);
  assert.equal(falconSpecialCanBReverse(down), true);
});

test('ground Raptor Boost hit phase exposes its sourced five-frame damage-based armor window', () => {
  assert.deepEqual(falconSpecialArmorFrames(selectFalconSpecial(input(1), true, 1)), [1, 5]);
  assert.equal(falconSpecialArmorFrames(selectFalconSpecial(input(1), false, 1)), null);
  assert.equal(falconSpecialArmorFrames(selectFalconSpecial(input(), true, 1)), null);
});

test('special hit and grab windows match the sourced Falcon frame data', () => {
  assert.deepEqual(falconSpecialContactWindow(selectFalconSpecial(input(1), true, 1)), [10, 25]);
  assert.deepEqual(falconSpecialContactWindow(selectFalconSpecial(input(1), false, 1)), [19, 35]);
  assert.deepEqual(falconSpecialContactWindow(selectFalconSpecial(input(0, 1), false, 1)), [14, 30]);
  assert.deepEqual(falconSpecialContactWindow(selectFalconSpecial(input(0, -1), true, 1)), [13, 33]);
  assert.deepEqual(falconSpecialContactWindow(selectFalconSpecial(input(0, -1), false, 1)), [14, 27]);
});

test('aerial Raptor Boost, Falcon Dive, and Falcon Kick enter helpless fall and use sourced landing clips', () => {
  for (const vertical of [-1, 0, 1]) {
    const command = vertical === 0
      ? selectFalconSpecial(input(1), false, 1)
      : selectFalconSpecial(input(0, vertical), false, 1);
    assert.equal(specialRequiresHelplessFall(command), true);
    assert.ok(specialLandingAnimationId(command));
  }
  assert.equal(specialRequiresHelplessFall(selectFalconSpecial(input(), false, 1)), false);
  assert.equal(specialLandingAnimationId(selectFalconSpecial(input(), false, 1)), null);
});

test('Falcon Dive requires helpless fall even when initiated from the ground', () => {
  const command = selectFalconSpecial(input(0, 1), true, 1);
  assert.equal(specialRequiresHelplessFall(command), true);
  assert.equal(specialLandingAnimationId(command), 'falcon-dive-landing');
});
