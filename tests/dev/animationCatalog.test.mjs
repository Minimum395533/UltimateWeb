import assert from 'node:assert/strict';
import test from 'node:test';
import { ANIMATION_CATALOG, getCatalogEntry, getEffectiveFrameCount } from '../../src/data/falcon/animationCatalog.ts';
import { getSeedHitboxRows, getTimingMarkers, parseTimingFrames, seedAnimationFrames } from '../../src/data/falcon/seedAnimation.ts';
import { WIKI_MOVE_DATA } from '../../src/data/falcon/wikiMoveData.ts';
import { buildTrainingClips, resolveAnimationClip } from '../../src/data/falcon/trainingClips.ts';
import { validateAnimationFrames } from '../../src/dev/frameDataModel.ts';
import { MOVEMENT_STATES } from '../../src/types/frameData.ts';

test('every catalog animation seeds exactly its frame count and validates', () => {
  const ids = new Set();
  for (const entry of ANIMATION_CATALOG) {
    assert.ok(!ids.has(entry.id), `duplicate id ${entry.id}`);
    ids.add(entry.id);
    const frames = seedAnimationFrames(entry);
    assert.equal(frames.length, entry.frameCount, entry.id);
    assert.equal(validateAnimationFrames(frames, entry.frameCount), null, entry.id);
    assert.ok(frames.every((frame) => frame.hurtboxes.length > 0), `${entry.id} needs seeded hurtboxes`);
  }
});

test('every training movement state has a catalog animation', () => {
  for (const state of MOVEMENT_STATES) assert.ok(getCatalogEntry(state.id), state.id);
});

test('a three-frame animation has exactly three frames', () => {
  const jumpSquat = getCatalogEntry('jump-squat');
  assert.equal(jumpSquat.frameCount, 3);
  assert.equal(seedAnimationFrames(jumpSquat).length, 3);
});

test('confirmed counts override the catalog count', () => {
  const walk = getCatalogEntry('walk');
  assert.equal(getEffectiveFrameCount(walk, null), walk.frameCount);
  assert.equal(getEffectiveFrameCount(walk, 72), 72);
  assert.equal(seedAnimationFrames(walk, 72).length, 72);
});

test('wiki hitboxes appear only on their active frames', () => {
  const jab = getCatalogEntry('jab-1');
  const frames = seedAnimationFrames(jab);
  const active = frames.filter((frame) => frame.hitboxes.length > 0).map((frame) => frame.frameNumber);
  assert.ok(active.length > 0);
  for (const hitbox of frames.flatMap((frame) => frame.hitboxes)) {
    assert.equal(hitbox.source.kind, 'smashwiki');
    assert.match(hitbox.source.url, /ssbwiki\.com/);
  }
  const markers = getTimingMarkers(jab);
  assert.ok(markers.length > 0);
});

test('every catalog hitbox window resolves to sourced wiki rows and stays inside its animation', () => {
  for (const entry of ANIMATION_CATALOG) {
    const expectedFrames = new Set();
    for (const seed of entry.hitboxes ?? []) {
      const rows = getSeedHitboxRows(seed);
      assert.ok(rows.length > 0, `${entry.id}: missing ${seed.page}/${seed.section}/${seed.group}`);
      assert.ok(WIKI_MOVE_DATA[seed.page].url.includes('ssbwiki.com'), `${entry.id}: missing source URL`);
      for (const [start, end] of seed.frames) {
        assert.ok(start >= 1 && end >= start && end <= entry.frameCount, `${entry.id}: invalid active window ${start}-${end}`);
        for (let frame = start; frame <= end; frame += 1) expectedFrames.add(frame);
      }
    }
    if (!(entry.hitboxes?.length)) continue;
    const frames = seedAnimationFrames(entry);
    const actualFrames = new Set(frames.filter((frame) => frame.hitboxes.length).map((frame) => frame.frameNumber));
    assert.deepEqual([...actualFrames].sort((a, b) => a - b), [...expectedFrames].sort((a, b) => a - b), entry.id);
    for (const hitbox of frames.flatMap((frame) => frame.hitboxes)) {
      assert.equal(hitbox.source.kind, 'smashwiki', `${entry.id}: hitbox must retain source provenance`);
      assert.equal(hitbox.source.url, WIKI_MOVE_DATA[hitbox.source.page].url, `${entry.id}: source URL mismatch`);
    }
  }
});

test('grab animations seed grab boxes and intangibility is seeded where listed', () => {
  const grab = seedAnimationFrames(getCatalogEntry('grab'));
  assert.ok(grab.some((frame) => frame.grabboxes.length > 0));
  const spotDodge = seedAnimationFrames(getCatalogEntry('spot-dodge'));
  assert.ok(spotDodge.some((frame) => frame.hurtboxes.some((box) => box.state !== 'normal')));
});

test('timing values parse into frame lists', () => {
  assert.deepEqual(parseTimingFrames('3-5', 10), [3, 4, 5]);
  assert.deepEqual(parseTimingFrames('8-', 10), [8, 9, 10]);
  assert.deepEqual(parseTimingFrames('2, 4', 10), [2, 4]);
});

test('training clips use a draft first, then approved data, then labeled defaults', () => {
  const clips = buildTrainingClips();
  for (const state of MOVEMENT_STATES) {
    assert.ok(clips[state.id], state.id);
    assert.equal(clips[state.id].source, 'default');
  }
  const frames = seedAnimationFrames(getCatalogEntry('walk'));
  const draft = { id: 'd1', animationId: 'walk', updatedAt: '2026-10-09T00:00:00.000Z', frames };
  const clip = resolveAnimationClip('walk', draft);
  assert.equal(clip.source, 'draft');
  assert.equal(clip.frames, frames);
  assert.equal(resolveAnimationClip('not-an-animation'), undefined);
});
