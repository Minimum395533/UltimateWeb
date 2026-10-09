import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { createServer } from 'vite';
import { ANIMATION_CATALOG } from '../../src/data/falcon/animationCatalog.ts';
import { seedAnimationFrames } from '../../src/data/falcon/seedAnimation.ts';

const enabled = process.env.FRAME_DATA_INTEGRATION_TEST === '1'
  && Boolean(process.env.DATABASE_URL);
let vite;
let origin;

before(async () => {
  if (!enabled) return;
  vite = await createServer({
    configFile: 'vite.config.ts',
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await vite.listen();
  const address = vite.httpServer?.address();
  if (!address || typeof address === 'string') {
    throw new Error('Vite test server did not bind to a TCP port.');
  }
  origin = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (vite) await vite.close();
});

const api = (path, init) => fetch(`${origin}/api/dev/frame-data${path}`, init);
const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('development API locks frame counts, persists drafts and per-animation references', {
  skip: !enabled,
}, async (context) => {
  // Use a catalog animation the user has not touched, so real work is never modified.
  const drafts = await (await api('')).json();
  const counts = await (await api('/frame-counts')).json();
  const used = new Set([...drafts.map((draft) => draft.animationId), ...counts.map((count) => count.animationId)]);
  const entry = [...ANIMATION_CATALOG].reverse().find((candidate) => !used.has(candidate.id));
  assert.ok(entry, 'needs one catalog animation without a draft or confirmed count');

  let draftId;
  let countChanged = false;
  context.after(async () => {
    if (draftId) await api(`/${draftId}`, { method: 'DELETE' });
    if (countChanged) await api(`/frame-counts/${entry.id}`, { method: 'DELETE' });
  });

  const frames = seedAnimationFrames(entry);

  const wrongCount = await api('', json('POST', { animationId: entry.id, frames: frames.slice(1) }));
  assert.equal(wrongCount.status, 400);
  assert.match((await wrongCount.json()).error, /exactly/);

  const unknown = await api('', json('POST', { animationId: 'not-an-animation', frames }));
  assert.equal(unknown.status, 400);

  const createResponse = await api('', json('POST', { animationId: entry.id, frames }));
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  draftId = created.id;
  assert.equal(created.animationId, entry.id);
  assert.equal(created.frames.length, entry.frameCount);
  assert.equal(created.referenceSettings.locked, true);

  const duplicate = await api('', json('POST', { animationId: entry.id, frames }));
  assert.equal(duplicate.status, 409);

  const edited = structuredClone(created.frames);
  edited[0].hurtboxes[0] = { ...edited[0].hurtboxes[0], radius: 3.25, state: 'invincible' };
  const settings = { scale: 1.35, offsetX: 2.5, offsetY: -1, locked: false, opacity: 0.4, linkFrames: true };
  const updateResponse = await api(`/${draftId}`, json('PUT', {
    name: created.name,
    frames: edited,
    referenceAssetId: null,
    referenceSettings: settings,
  }));
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.deepEqual(updated.referenceSettings, settings);
  assert.equal(updated.frames[0].hurtboxes[0].state, 'invincible');

  const trimmed = await api(`/${draftId}`, json('PUT', { name: created.name, frames: edited.slice(0, -1), referenceAssetId: null }));
  assert.equal(trimmed.status, 400);

  const badSettings = await api(`/${draftId}`, json('PUT', {
    name: created.name,
    frames: edited,
    referenceAssetId: null,
    referenceSettings: { ...settings, scale: 4 },
  }));
  assert.equal(badSettings.status, 400);

  // Confirming a new count changes what the server accepts.
  const confirmed = await api(`/frame-counts/${entry.id}`, json('PUT', { frameCount: entry.frameCount + 2 }));
  assert.equal(confirmed.status, 200);
  countChanged = true;
  const oldLength = await api(`/${draftId}`, json('PUT', { name: created.name, frames: edited, referenceAssetId: null }));
  assert.equal(oldLength.status, 400);
  const longer = seedAnimationFrames(entry, entry.frameCount + 2);
  const longerSave = await api(`/${draftId}`, json('PUT', { name: created.name, frames: longer, referenceAssetId: null }));
  assert.equal(longerSave.status, 200);
  assert.equal((await longerSave.json()).frames.length, entry.frameCount + 2);
  await api(`/frame-counts/${entry.id}`, { method: 'DELETE' });
  countChanged = false;

  // Reference uploads stay with this animation; each new upload starts unlocked and re-aligned.
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6kAAAAASUVORK5CYII=',
    'base64',
  );
  const pngUpload = await api(`/${draftId}/assets?fileName=still.png`, {
    method: 'POST', headers: { 'Content-Type': 'image/png' }, body: pngBytes,
  });
  assert.equal(pngUpload.status, 201);
  const pngAsset = await pngUpload.json();

  const gifBytes = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
  const gifUpload = await api(`/${draftId}/assets?fileName=frame.gif`, {
    method: 'POST', headers: { 'Content-Type': 'image/gif' }, body: gifBytes,
  });
  assert.equal(gifUpload.status, 201);
  const gifAsset = await gifUpload.json();

  const gifContent = await api(`/${draftId}/assets/${gifAsset.id}`);
  assert.equal(gifContent.status, 200);
  assert.deepEqual(Buffer.from(await gifContent.arrayBuffer()), gifBytes);

  const afterUpload = await (await api(`/${draftId}`)).json();
  assert.equal(afterUpload.referenceAssetId, gifAsset.id);
  assert.equal(afterUpload.assets.length, 2);
  assert.deepEqual(afterUpload.referenceSettings, {
    scale: 1, offsetX: 0, offsetY: 0, locked: false, opacity: 0.4, linkFrames: true,
  });

  // Switch back to the earlier upload.
  const switched = await api(`/${draftId}`, json('PUT', {
    name: created.name, frames, referenceAssetId: pngAsset.id,
  }));
  assert.equal(switched.status, 200);
  assert.equal((await switched.json()).referenceAssetId, pngAsset.id);

  const removeAsset = await api(`/${draftId}/assets/${pngAsset.id}`, { method: 'DELETE' });
  assert.equal(removeAsset.status, 200);
  const afterRemove = await (await api(`/${draftId}`)).json();
  assert.equal(afterRemove.referenceAssetId, null);
  assert.equal(afterRemove.assets.length, 1);

  const deleteResponse = await api(`/${draftId}`, { method: 'DELETE' });
  assert.equal(deleteResponse.status, 200);
  draftId = undefined;
  assert.equal((await api(`/${created.id}`)).status, 404);
});
