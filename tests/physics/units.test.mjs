import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  framesPerSecond,
  gameplayFrameIndex,
  meters,
  metersPerSecond,
  metersPerSecondSquared,
  metersPerSecondSquaredToUnitsPerFrameSquared,
  metersPerSecondToUnitsPerFrame,
  metersToWorldUnits,
  unitsPerFrame,
  unitsPerFrameSquared,
  unitsPerFrameSquaredToMetersPerSecondSquared,
  unitsPerFrameToMetersPerSecond,
  worldUnits,
  worldUnitsToMeters,
} from '../../src/physics/units.ts';

test('one modern Smash world unit is approximately one decimeter', () => {
  assert.equal(worldUnitsToMeters(worldUnits(1)), meters(0.1));
  assert.equal(metersToWorldUnits(meters(0.1)), worldUnits(1));
  assert.equal(worldUnitsToMeters(metersToWorldUnits(meters(2.5))), meters(2.5));
});

test('per-frame speed conversions require and use the explicit simulation rate', () => {
  const rate = framesPerSecond(60);
  const speed = unitsPerFrame(2);

  assert.equal(unitsPerFrameToMetersPerSecond(speed, rate), metersPerSecond(12));
  assert.equal(
    metersPerSecondToUnitsPerFrame(metersPerSecond(12), rate),
    speed,
  );
});

test('per-frame-squared acceleration conversions preserve signed friction', () => {
  const rate = framesPerSecond(60);
  const friction = unitsPerFrameSquared(-0.5);
  const metersPerSecondSquaredValue =
    unitsPerFrameSquaredToMetersPerSecondSquared(friction, rate);

  assert.equal(metersPerSecondSquaredValue, metersPerSecondSquared(-180));
  assert.equal(
    metersPerSecondSquaredToUnitsPerFrameSquared(metersPerSecondSquared(-180), rate),
    friction,
  );
});

test('frame rates and frame indices reject invalid values', () => {
  assert.throws(() => framesPerSecond(0), RangeError);
  assert.throws(() => framesPerSecond(Number.NaN), RangeError);
  assert.throws(() => gameplayFrameIndex(-1), RangeError);
  assert.equal(gameplayFrameIndex(12), 12);
});

test('unit constructors reject non-finite gameplay values', () => {
  assert.throws(() => worldUnits(Number.POSITIVE_INFINITY), RangeError);
  assert.throws(() => unitsPerFrameSquared(Number.NaN), RangeError);
});
