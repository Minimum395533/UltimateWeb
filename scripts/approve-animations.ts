/**
 * Exports approved animation drafts into src/data/falcon/approvedAnimations.ts.
 *
 *   npm run approve-animations -- <animationId> [animationId...]
 *   npm run approve-animations -- --remove <animationId> [animationId...]
 *
 * Run only after the user approves the named animations in chat. Each draft must
 * match its locked frame count; any mismatch aborts without writing anything.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { getCatalogEntry, getEffectiveFrameCount } from '../src/data/falcon/animationCatalog.ts';
import { APPROVED_ANIMATIONS } from '../src/data/falcon/approvedAnimations.ts';
import { createApprovedAnimation, renderApprovedModule } from '../src/dev/approvedExport.ts';
import { upgradeDraftFramesToV3, upgradeReferenceSettings } from '../src/dev/frameDataModel.ts';
import { FRAME_DATA_CHARACTER_ID, FRAME_DATA_SCHEMA_VERSION } from '../src/types/frameData.ts';
import type { AnimationDraft, ApprovedAnimation } from '../src/types/frameData.ts';

const OUTPUT = fileURLToPath(new URL('../src/data/falcon/approvedAnimations.ts', import.meta.url));

interface Row {
  id: string;
  animation_id: string;
  name: string;
  frames: unknown;
  reference_asset_id: string | null;
  reference_settings: unknown;
  created_at: Date;
  updated_at: Date;
}

async function main() {
  const args = process.argv.slice(2);
  const remove = args[0] === '--remove';
  const ids = remove ? args.slice(1) : args;
  if (!ids.length) {
    console.error('Usage: npm run approve-animations -- [--remove] <animationId> [animationId...]');
    process.exit(1);
  }
  const unknown = ids.filter((id) => !getCatalogEntry(id));
  if (unknown.length) throw new Error(`Unknown animation id(s): ${unknown.join(', ')}`);

  const records: Record<string, ApprovedAnimation> = { ...APPROVED_ANIMATIONS };
  if (remove) {
    for (const id of ids) delete records[id];
    await writeFile(OUTPUT, renderApprovedModule(records));
    console.log(`Removed ${ids.join(', ')} from approved animations.`);
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    const approvedAt = new Date().toISOString();
    for (const id of ids) {
      const entry = getCatalogEntry(id)!;
      const draftResult = await pool.query<Row>(
        `SELECT id, animation_id, name, frames, reference_asset_id, reference_settings, created_at, updated_at
           FROM frame_data_drafts
          WHERE character_id = $1 AND animation_id = $2 AND archived_at IS NULL`,
        [FRAME_DATA_CHARACTER_ID, id],
      );
      const row = draftResult.rows[0];
      if (!row) throw new Error(`${id}: no saved draft. Save it in the editor first.`);
      const countResult = await pool.query<{ frame_count: number }>(
        'SELECT frame_count FROM frame_data_frame_counts WHERE character_id = $1 AND animation_id = $2',
        [FRAME_DATA_CHARACTER_ID, id],
      );
      const confirmed = countResult.rows[0] ? Number(countResult.rows[0].frame_count) : null;
      const draft: AnimationDraft = {
        id: row.id,
        characterId: FRAME_DATA_CHARACTER_ID,
        animationId: row.animation_id,
        name: row.name,
        schemaVersion: FRAME_DATA_SCHEMA_VERSION,
        status: 'draft',
        frames: upgradeDraftFramesToV3(row.frames),
        referenceAssetId: row.reference_asset_id,
        referenceSettings: upgradeReferenceSettings(row.reference_settings),
        assets: [],
        createdAt: new Date(row.created_at).toISOString(),
        updatedAt: new Date(row.updated_at).toISOString(),
      };
      records[id] = createApprovedAnimation(draft, getEffectiveFrameCount(entry, confirmed), approvedAt);
      console.log(`${id}: ${draft.frames.length} frames from draft saved ${draft.updatedAt}`);
    }
  } finally {
    await pool.end();
  }
  await writeFile(OUTPUT, renderApprovedModule(records));
  console.log(`Wrote ${OUTPUT}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
