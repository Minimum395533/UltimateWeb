import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyShieldHit,
  createShieldState,
  dodgeIsIntangible,
  dodgeLandingLagFrames,
  dodgeTiming,
  dropShield,
  grabHoldFrames,
  mashGrabEscape,
  outOfShieldLag,
  shieldSizeMultiplier,
  stepShield,
} from '../../src/physics/defense.ts';
import { WIKI_MOVE_DATA } from '../../src/data/falcon/wikiMoveData.ts';

const attack = (damage = 10) => ({
  damage,
  shieldDamage: 0,
  shieldstunMultiplier: 1,
  extraShieldstunFrames: 0,
});

test('Ultimate shield loses health while held and regenerates when released', () => {
  let shield = createShieldState();
  for (let frame = 0; frame < 10; frame += 1) shield = stepShield(shield, true);
  assert.ok(Math.abs(shield.health - 48.5) < 1e-9);
  for (let frame = 0; frame < 10; frame += 1) shield = stepShield(shield, false);
  assert.ok(Math.abs(shield.health - 49.3) < 1e-9);
  assert.equal(shieldSizeMultiplier(0), 0.15);
  assert.equal(shieldSizeMultiplier(50), 1);
});

test('shield hits apply Ultimate damage, stun, pushback, and break lockout', () => {
  const result = applyShieldHit(createShieldState(), attack());
  assert.ok(Math.abs(result.shieldDamage - 11.9) < 1e-9);
  assert.equal(result.shieldstunFrames, 10);
  assert.ok(result.pushback > 0);
  const broken = applyShieldHit(createShieldState(1), attack(30));
  assert.equal(broken.broke, true);
  assert.equal(broken.state.broken, true);
  assert.equal(broken.shieldstunFrames, 37.5);
  let recoveredShield = broken.state;
  for (let frame = 0; frame < 38; frame += 1) recoveredShield = stepShield(recoveredShield, false);
  assert.equal(recoveredShield.broken, false);
  assert.ok(recoveredShield.health > 0);
});

test('dropping a raised shield creates a five-frame perfect-shield window', () => {
  let shield = createShieldState();
  for (let frame = 0; frame < 3; frame += 1) shield = stepShield(shield, true);
  const parried = applyShieldHit(dropShield(shield), attack());
  assert.equal(parried.parried, true);
  assert.equal(parried.shieldDamage, 0);
  assert.equal(parried.shieldstunFrames, 0);
});

test('dodge intangibility comes from the animation hurtbox-state frame ranges', () => {
  assert.equal(dodgeIsIntangible('spot-dodge', 2), false);
  assert.equal(dodgeIsIntangible('spot-dodge', 3), true);
  assert.equal(dodgeIsIntangible('spot-dodge', 17), true);
  assert.equal(dodgeIsIntangible('spot-dodge', 18), false);
  assert.equal(dodgeIsIntangible('spot-dodge', 17, 1), false);
  assert.deepEqual(dodgeTiming('roll-forward'), { totalFrames: 30, intangibleRanges: [[4, 15]] });
  assert.equal(dodgeLandingLagFrames('air-dodge'), 10);
  assert.equal(dodgeLandingLagFrames('air-dodge-directional'), 10);
});

test('Ultimate out-of-shield cancel timings distinguish jump from up smash and up special', () => {
  assert.equal(outOfShieldLag('jump'), 3);
  assert.equal(outOfShieldLag('upSmash'), 0);
  assert.equal(outOfShieldLag('upSpecial'), 0);
  assert.equal(outOfShieldLag('shieldDrop'), 11);
});

test('grab escape time scales with percent and mash shortens the remaining hold', () => {
  assert.ok(grabHoldFrames(100) > grabHoldFrames(0));
  assert.equal(mashGrabEscape(12, 3), 9);
  assert.equal(mashGrabEscape(2, 4), 0);
});

test('Falcon has sourced damage and knockback rows for all four throws', () => {
  for (const page of ['Forward_throw', 'Back_throw', 'Up_throw', 'Down_throw']) {
    const rows = WIKI_MOVE_DATA[page].throws;
    assert.ok(rows.length > 0, `${page} has throw data`);
    assert.ok(rows.every((row) => row.damage > 0 && row.angle >= 0 && row.knockbackGrowth >= 0));
  }
});
