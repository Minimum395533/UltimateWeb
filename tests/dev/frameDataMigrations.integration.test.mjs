import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';

const enabled = process.env.FRAME_DATA_INTEGRATION_TEST === '1'
  && Boolean(process.env.DATABASE_URL);

const migration = (name) => readFile(new URL(`../../server/migrations/${name}`, import.meta.url), 'utf8');

const legacyFrame = (id) => ({
  id,
  frameNumber: 1,
  silhouette: { color: '#336699', closed: true, points: [{ id: `${id}-p1`, x: 0, y: 0 }, { id: `${id}-p2`, x: 1, y: 2 }, { id: `${id}-p3`, x: 2, y: 0 }] },
  hurtboxes: [{ id: `${id}-h`, start: { x: 0, y: 1, z: 0 }, end: { x: 0, y: 8, z: 0 }, radius: 3, isVulnerable: false }],
});

test('the catalog migration archives duplicate legacy drafts instead of deleting them', {
  skip: !enabled,
}, async () => {
  // Run every migration inside a throwaway schema so the real tables are untouched.
  const schema = `fd_migration_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET search_path TO ${schema}`);
    for (const name of ['0001_movement_frame_data.sql', '0002_reference_alignment.sql', '0003_idle_variance_state.sql']) {
      await client.query(await migration(name));
    }

    const older = randomUUID();
    const newer = randomUUID();
    const insert = `INSERT INTO frame_data_drafts (id, character_id, motion_state, name, schema_version, frames, updated_at)
                    VALUES ($1, 'captain_falcon', 'idle', $2, 2, $3::jsonb, $4)`;
    await client.query(insert, [older, 'Older idle', JSON.stringify([legacyFrame('old')]), '2026-01-01T00:00:00Z']);
    await client.query(insert, [newer, 'Newer idle', JSON.stringify([legacyFrame('new')]), '2026-02-01T00:00:00Z']);
    const gif = Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', 'base64');
    await client.query(
      `INSERT INTO frame_data_reference_assets (id, draft_id, file_name, media_type, size_bytes, image_data)
       VALUES ($1, $2, 'old.gif', 'image/gif', $3, $4)`,
      [randomUUID(), older, gif.length, gif],
    );

    await client.query(await migration('0004_animation_catalog.sql'));
    await client.query(await migration('0005_archive_duplicate_drafts.sql'));

    const rows = (await client.query(
      'SELECT id, animation_id, archived_at, frames FROM frame_data_drafts ORDER BY updated_at',
    )).rows;
    assert.equal(rows.length, 2, 'no draft is deleted');
    assert.equal(rows[0].id, older);
    assert.ok(rows[0].archived_at, 'the older draft is archived');
    assert.equal(rows[1].id, newer);
    assert.equal(rows[1].archived_at, null, 'the newest draft stays active');
    assert.equal(rows[0].frames[0].hurtboxes[0].state, 'intangible');
    assert.equal(rows[1].animation_id, 'idle');

    const assets = await client.query('SELECT draft_id FROM frame_data_reference_assets');
    assert.deepEqual(assets.rows.map((row) => row.draft_id), [older], 'archived references are kept');

    // Only one active draft per animation is allowed; archived rows do not count.
    await assert.rejects(client.query(
      `INSERT INTO frame_data_drafts (id, character_id, animation_id, name, schema_version, frames)
       VALUES ($1, 'captain_falcon', 'idle', 'Third', 3, '[]'::jsonb)`,
      [randomUUID()],
    ));
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => {});
    await client.end();
  }
});
