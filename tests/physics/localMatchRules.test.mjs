import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceLocalMatchRules, countdownLabel, createLocalMatchRules, formatMatchTime,
  loseLocalMatchStock, resolveLocalMatchTimeout,
} from '../../src/physics/localMatchRules.ts';

test('local match defaults to three stocks and seven minutes with a four-part countdown', () => {
  const rules = createLocalMatchRules();
  assert.deepEqual(rules.stocks, [3, 3]);
  assert.equal(rules.timeLimitFrames, 420 * 60);
  assert.equal(countdownLabel(240), '3');
  assert.equal(countdownLabel(150), '2');
  assert.equal(countdownLabel(90), '1');
  assert.equal(countdownLabel(30), 'GO!');
  assert.equal(advanceLocalMatchRules({ ...rules, countdownFrames: 1 }).phase, 'playing');
});

test('stock KOs finish the match on the last stock and identify the surviving player', () => {
  let rules = createLocalMatchRules(1, 0);
  rules = { ...rules, phase: 'playing' };
  rules = loseLocalMatchStock(rules, 0);
  assert.deepEqual(rules.stocks, [0, 1]);
  assert.equal(rules.phase, 'finished');
  assert.equal(rules.winner, 1);
});

test('timer awards the lead by stocks, then by lower damage percent', () => {
  const active = { ...createLocalMatchRules(3, 1), phase: 'playing', framesRemaining: 0 };
  const byStocks = resolveLocalMatchTimeout({ ...active, stocks: [2, 1] }, [0, 999]);
  assert.equal(byStocks.winner, 0);
  const byPercent = resolveLocalMatchTimeout(active, [28, 28.1]);
  assert.equal(byPercent.winner, 0);
  assert.equal(formatMatchTime(61), '0:02');
});

test('an exact timer tie starts sudden death at one stock each', () => {
  const active = { ...createLocalMatchRules(3, 1), phase: 'playing', framesRemaining: 0 };
  const sudden = resolveLocalMatchTimeout(active, [150, 150]);
  assert.equal(sudden.phase, 'sudden-death');
  assert.equal(sudden.suddenDeath, true);
  assert.deepEqual(sudden.stocks, [1, 1]);
  assert.equal(loseLocalMatchStock(sudden, 1).phase, 'finished');
});

test('no-time-limit matches never enter timeout or sudden death', () => {
  const active = { ...createLocalMatchRules(3, 0), phase: 'playing' };
  assert.equal(advanceLocalMatchRules(active, 999999).phase, 'playing');
  assert.equal(resolveLocalMatchTimeout(active, [100, 100]).phase, 'playing');
  assert.equal(formatMatchTime(0), '0:00');
});
