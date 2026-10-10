import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NORMAL_ATTACK_IDS,
  classifyNormalAttack,
  getJabFollowup,
  getNormalAttackData,
  getSmashChargeDamageMultiplier,
  scaleAttackHitboxes,
} from '../../src/physics/normalAttacks.ts';

test('every Captain Falcon normal attack has sourced timing, hit frames, and a wiki link', () => {
  assert.equal(NORMAL_ATTACK_IDS.length, 21);
  for (const id of NORMAL_ATTACK_IDS) {
    const data = getNormalAttackData(id);
    assert.ok(data.animationLength > 0, id);
    assert.ok(data.activeFrames.length > 0, id);
    assert.ok(data.firstActionableFrame > 0, id);
    assert.match(data.wikiUrl, /^https:\/\/www\.ssbwiki\.com\/(?:wiki\/)?/);
  }
});

test('aerial data exposes landing lag and autocancel windows', () => {
  for (const id of ['nair', 'fair', 'bair', 'uair', 'dair']) {
    const data = getNormalAttackData(id);
    assert.ok(data.landingLag > 0, id);
    assert.ok(data.autoCancelFrames.length > 0, id);
  }
});

test('input classification covers grounded, angled, C-stick, and aerial attacks', () => {
  const base = { attackPressed: true, tiltPressed: false, smashPressed: false, horizontal: 0, vertical: 0, rightX: 0, rightY: 0, airborne: false, dashAttack: false, stickMode: 'smash', flick: false };
  assert.equal(classifyNormalAttack(base), 'jab-1');
  assert.equal(classifyNormalAttack({ ...base, horizontal: 0.8, vertical: 0.3 }), 'ftilt-up');
  assert.equal(classifyNormalAttack({ ...base, smashPressed: true, vertical: 0.8 }), 'usmash');
  assert.equal(classifyNormalAttack({ ...base, rightX: 0.9, stickMode: 'tilt' }), 'ftilt');
  assert.equal(classifyNormalAttack({ ...base, airborne: true }), 'nair');
  assert.equal(classifyNormalAttack({ ...base, airborne: true, horizontal: -0.8 }), 'bair');
});

test('smash charge caps at 60 frames and scales damage to 1.4x', () => {
  assert.equal(getSmashChargeDamageMultiplier(0), 1);
  assert.equal(getSmashChargeDamageMultiplier(30), 1.2);
  assert.equal(getSmashChargeDamageMultiplier(60), 1.4);
  assert.equal(getSmashChargeDamageMultiplier(90), 1.4);
  assert.equal(scaleAttackHitboxes([{ damage: 10 }], 1.4)[0].damage, 14);
});

test('jab inputs advance to the rapid loop or finisher based on hold/release', () => {
  assert.equal(getJabFollowup('jab-1', true), 'jab-2');
  assert.equal(getJabFollowup('jab-2', true), 'rapid-jab');
  assert.equal(getJabFollowup('jab-2', false), 'jab-3');
  assert.equal(getJabFollowup('rapid-jab', false), 'rapid-jab-finisher');
});
