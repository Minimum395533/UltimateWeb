import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { createServer } from 'vite';

const enabled = process.env.FRAME_DATA_INTEGRATION_TEST === '1'
  && Boolean(process.env.DATABASE_URL);
let vite;
let origin;

before(async () => {
  if (!enabled) return;
  vite = await createServer({
    configFile: 'vite.config.ts',
    logLevel: 'error',
    server: {
      host: '127.0.0.1',
      port: 0,
      strictPort: false,
    },
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

test('development API persists frames and reference media then deletes the draft', {
  skip: !enabled,
}, async (context) => {
  let draftId;
  context.after(async () => {
    if (draftId) {
      await fetch(`${origin}/api/dev/frame-data/${draftId}`, { method: 'DELETE' });
    }
  });
  const createResponse = await fetch(`${origin}/api/dev/frame-data`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ motionState: 'idle' }),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  draftId = created.id;
  assert.equal(created.status, 'draft');
  assert.equal(created.frames.length, 1);
  assert.deepEqual(created.referenceAlignment, {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    locked: true,
  });

  const firstFrame = {
    ...created.frames[0],
    hurtboxes: [{
      id: 'integration-capsule',
      start: { x: -1, y: 2, z: -0.5 },
      end: { x: 1, y: 15, z: 0.5 },
      radius: 3.25,
      isVulnerable: true,
    }],
    silhouette: {
      color: '#5ce1e6',
      closed: true,
      points: [
        { id: 'integration-point-1', x: -4, y: 0 },
        { id: 'integration-point-2', x: 0, y: 18 },
        { id: 'integration-point-3', x: 4, y: 0 },
      ],
    },
  };
  const secondFrame = {
    ...created.frames[0],
    id: 'integration-frame-2',
    frameNumber: 2,
    hurtboxes: [],
    silhouette: {
      ...created.frames[0].silhouette,
      color: '#ffc400',
    },
  };
  const updateResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Captain Falcon · Idle',
        frames: [firstFrame, secondFrame],
        referenceAssetId: null,
        referenceAlignment: {
          scale: 1.35,
          offsetX: 2.5,
          offsetY: -1,
          locked: false,
        },
      }),
    },
  );
  assert.equal(updateResponse.status, 200);
  const updatedDraft = await updateResponse.json();
  assert.deepEqual(updatedDraft.referenceAlignment, {
    scale: 1.35,
    offsetX: 2.5,
    offsetY: -1,
    locked: false,
  });

  const invalidFrame = structuredClone(firstFrame);
  invalidFrame.hurtboxes[0].radius = -1;
  const invalidUpdateResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Invalid draft',
        frames: [invalidFrame, secondFrame],
        referenceAssetId: null,
      }),
    },
  );
  assert.equal(invalidUpdateResponse.status, 400);

  const invalidAlignmentResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Captain Falcon · Idle',
        frames: [firstFrame, secondFrame],
        referenceAssetId: null,
        referenceAlignment: {
          scale: 4,
          offsetX: 2.5,
          offsetY: -1,
          locked: false,
        },
      }),
    },
  );
  assert.equal(invalidAlignmentResponse.status, 400);

  const loadedResponse = await fetch(`${origin}/api/dev/frame-data/${created.id}`);
  assert.equal(loadedResponse.status, 200);
  const loaded = await loadedResponse.json();
  assert.equal(loaded.frames[0].hurtboxes[0].radius, 3.25);
  assert.equal(loaded.frames[0].hurtboxes[0].end.z, 0.5);
  assert.deepEqual(loaded.frames[1].hurtboxes, []);
  assert.equal(loaded.frames[0].silhouette.color, '#5ce1e6');
  assert.equal(loaded.frames[1].silhouette.color, '#ffc400');
  assert.deepEqual(loaded.referenceAlignment, {
    scale: 1.35,
    offsetX: 2.5,
    offsetY: -1,
    locked: false,
  });

  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a6kAAAAASUVORK5CYII=',
    'base64',
  );
  const pngUploadResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}/assets?fileName=still.png`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/png' },
      body: pngBytes,
    },
  );
  assert.equal(pngUploadResponse.status, 201);
  const pngAsset = await pngUploadResponse.json();
  assert.equal(pngAsset.mediaType, 'image/png');
  const pngReferenceResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}/assets/${pngAsset.id}`,
  );
  assert.equal(pngReferenceResponse.status, 200);
  assert.deepEqual(Buffer.from(await pngReferenceResponse.arrayBuffer()), pngBytes);

  const gifBytes = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
  const uploadResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}/assets?fileName=frame.gif`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'image/gif' },
      body: gifBytes,
    },
  );
  assert.equal(uploadResponse.status, 201);
  const asset = await uploadResponse.json();
  assert.equal(asset.mediaType, 'image/gif');

  const referenceResponse = await fetch(
    `${origin}/api/dev/frame-data/${created.id}/assets/${asset.id}`,
  );
  assert.equal(referenceResponse.status, 200);
  assert.deepEqual(Buffer.from(await referenceResponse.arrayBuffer()), gifBytes);

  const savedAfterUpload = await fetch(`${origin}/api/dev/frame-data/${created.id}`);
  const draftAfterUpload = await savedAfterUpload.json();
  assert.equal(draftAfterUpload.referenceAssetId, asset.id);
  assert.equal(draftAfterUpload.assets.length, 2);
  assert.deepEqual(draftAfterUpload.referenceAlignment, {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    locked: true,
  });

  const deleteResponse = await fetch(`${origin}/api/dev/frame-data/${created.id}`, {
    method: 'DELETE',
  });
  assert.equal(deleteResponse.status, 200);
  draftId = undefined;
  const missingResponse = await fetch(`${origin}/api/dev/frame-data/${created.id}`);
  assert.equal(missingResponse.status, 404);
});
