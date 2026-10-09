import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commitHistory,
  copyFrames,
  copySelection,
  createHistory,
  deleteSelection,
  fillFrames,
  flipSelection,
  interpolateRange,
  listShapeRefs,
  normalizeRect,
  pasteFrames,
  pasteShapes,
  pasteShapesIntoRange,
  pruneSelection,
  redoHistory,
  scaleSelection,
  sealHistory,
  selectionBounds,
  shapesInRect,
  toggleSelection,
  translateSelection,
  undoHistory,
} from '../../src/dev/editorOps.ts';
import { createEmptyFrame, createHurtbox, MAX_GRABBOXES_PER_FRAME, createGrabbox } from '../../src/dev/frameDataModel.ts';

function capsule(x, y, radius = 2) {
  return { ...createHurtbox(radius), start: { x, y, z: 0 }, end: { x, y: y + 4, z: 0 } };
}

function frameWith(...hurtboxes) {
  const frame = createEmptyFrame(1);
  return { ...frame, hurtboxes, silhouette: { ...frame.silhouette, points: [] } };
}

test('selection toggles and prunes missing shapes', () => {
  const a = capsule(0, 0);
  const b = capsule(5, 0);
  const frame = frameWith(a, b);
  let selection = toggleSelection([], { kind: 'hurtbox', id: a.id });
  selection = toggleSelection(selection, { kind: 'hurtbox', id: b.id });
  assert.equal(selection.length, 2);
  selection = toggleSelection(selection, { kind: 'hurtbox', id: a.id });
  assert.deepEqual(selection, [{ kind: 'hurtbox', id: b.id }]);
  const pruned = pruneSelection(frameWith(a), [{ kind: 'hurtbox', id: a.id }, { kind: 'hurtbox', id: b.id }]);
  assert.deepEqual(pruned, [{ kind: 'hurtbox', id: a.id }]);
  assert.equal(listShapeRefs(frame, ['hurtbox']).length, 2);
});

test('box select picks shapes inside the rectangle on editable layers only', () => {
  const inside = capsule(0, 0, 1);
  const outside = capsule(20, 0, 1);
  const frame = frameWith(inside, outside);
  const rect = normalizeRect({ x: 3, y: 8 }, { x: -3, y: -3 });
  assert.deepEqual(shapesInRect(frame, rect, ['hurtbox']), [{ kind: 'hurtbox', id: inside.id }]);
  assert.deepEqual(shapesInRect(frame, rect, ['hitbox']), []);
});

test('group transforms move, scale, and flip only the selection', () => {
  const a = capsule(2, 0);
  const b = capsule(6, 0);
  const frame = frameWith(a, b);
  const selection = [{ kind: 'hurtbox', id: a.id }];
  const moved = translateSelection(frame, selection, 1.5, -1);
  assert.deepEqual(moved.hurtboxes[0].start, { x: 3.5, y: -1, z: 0 });
  assert.deepEqual(moved.hurtboxes[1], b);

  const both = [{ kind: 'hurtbox', id: a.id }, { kind: 'hurtbox', id: b.id }];
  const bounds = selectionBounds(frame, both);
  const flipped = flipSelection(frame, both);
  const center = (bounds.minX + bounds.maxX) / 2;
  assert.equal(flipped.hurtboxes[0].start.x, 2 * center - 2);
  const scaled = scaleSelection(frame, both, 2);
  assert.equal(scaled.hurtboxes[0].radius, 4);

  const deleted = deleteSelection(frame, selection);
  assert.deepEqual(deleted.hurtboxes.map((box) => box.id), [b.id]);
});

test('shape copy/paste creates new ids and respects per-frame limits', () => {
  const a = capsule(0, 0);
  const source = frameWith(a);
  const clipboard = copySelection(source, [{ kind: 'hurtbox', id: a.id }], 'jab-1');
  assert.equal(clipboard.sourceAnimationId, 'jab-1');
  const target = frameWith();
  const result = pasteShapes(target, clipboard);
  assert.equal(result.frame.hurtboxes.length, 1);
  assert.notEqual(result.frame.hurtboxes[0].id, a.id);
  assert.deepEqual(result.selection, [{ kind: 'hurtbox', id: result.frame.hurtboxes[0].id }]);

  const full = { ...frameWith(), grabboxes: Array.from({ length: MAX_GRABBOXES_PER_FRAME }, () => createGrabbox()) };
  const grab = full.grabboxes[0];
  const grabClip = copySelection(full, [{ kind: 'grabbox', id: grab.id }], 'grab');
  assert.equal(pasteShapes(full, grabClip).dropped, 1);

  const frames = [frameWith(), frameWith(), frameWith()].map((frame, index) => ({ ...frame, frameNumber: index + 1 }));
  const ranged = pasteShapesIntoRange(frames, 0, 1, clipboard);
  assert.deepEqual(ranged.frames.map((frame) => frame.hurtboxes.length), [1, 1, 0]);
});

test('frame copy/paste never changes the frame count', () => {
  const frames = [1, 2, 3].map((number) => ({ ...createEmptyFrame(number), hurtboxes: [capsule(number, 0)] }));
  const clipboard = copyFrames(frames, 0, 1, 'walk');
  const pasted = pasteFrames(frames, 2, clipboard);
  assert.equal(pasted.frames.length, 3);
  assert.equal(pasted.pasted, 1);
  assert.equal(pasted.skipped, 1);
  assert.equal(pasted.frames[2].frameNumber, 3);
  assert.equal(pasted.frames[2].id, frames[2].id);
  assert.equal(pasted.frames[2].hurtboxes[0].start.x, 1);

  const filled = fillFrames(frames, 1, 2, frames[0]);
  assert.deepEqual(filled.map((frame) => frame.hurtboxes[0].start.x), [1, 1, 1]);
  assert.deepEqual(filled.map((frame) => frame.frameNumber), [1, 2, 3]);
});

test('interpolation fills frames between two key frames', () => {
  const first = { ...frameWith(capsule(0, 0, 2)), frameNumber: 1 };
  const middle = { ...frameWith(), frameNumber: 2, id: 'middle' };
  const last = { ...frameWith(capsule(10, 0, 4)), frameNumber: 3 };
  const result = interpolateRange([first, middle, last], 0, 2);
  assert.deepEqual(result.skipped, []);
  assert.equal(result.frames[1].hurtboxes.length, 1);
  assert.equal(result.frames[1].hurtboxes[0].start.x, 5);
  assert.equal(result.frames[1].hurtboxes[0].radius, 3);
  assert.equal(result.frames[1].id, 'middle');
  assert.equal(result.frames.length, 3);

  const mismatched = interpolateRange([first, middle, { ...last, hurtboxes: [] }], 0, 2);
  assert.ok(mismatched.skipped.includes('hurtboxes'));
});

test('history merges keyed edits into one undo step', () => {
  let history = createHistory(0);
  history = commitHistory(history, 1, 'drag');
  history = commitHistory(history, 2, 'drag');
  history = commitHistory(history, 3, 'drag');
  history = sealHistory(history);
  history = commitHistory(history, 4, 'drag');
  assert.equal(history.present, 4);
  history = undoHistory(history);
  assert.equal(history.present, 3);
  history = undoHistory(history);
  assert.equal(history.present, 0);
  history = redoHistory(history);
  assert.equal(history.present, 3);
  history = commitHistory(history, 9);
  assert.equal(history.future.length, 0);
});
