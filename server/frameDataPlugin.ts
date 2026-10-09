import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { ServerResponse } from 'node:http';
import { Pool } from 'pg';
import type { Plugin, ViteDevServer } from 'vite';
import {
  isValidReferenceSettings,
  upgradeDraftFramesToV3,
  upgradeReferenceSettings,
  validateAnimationFrames,
} from '../src/dev/frameDataModel.ts';
import {
  getCatalogEntry,
  getEffectiveFrameCount,
} from '../src/data/falcon/animationCatalog.ts';
import {
  DEFAULT_REFERENCE_SETTINGS,
  FRAME_DATA_CHARACTER_ID,
  FRAME_DATA_SCHEMA_VERSION,
} from '../src/types/frameData.ts';
import type {
  AnimationDraft,
  ConfirmedFrameCount,
  ReferenceAssetMetadata,
} from '../src/types/frameData.ts';

const ROUTE_BASE = '/api/dev/frame-data';
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type NextFunction = (error?: unknown) => void;

interface DraftRow {
  id: string;
  character_id: string;
  animation_id: string;
  name: string;
  schema_version: number;
  status: 'draft';
  frames: unknown;
  reference_asset_id: string | null;
  reference_settings: unknown;
  created_at: Date | string;
  updated_at: Date | string;
}

interface FrameCountRow {
  animation_id: string;
  frame_count: number;
  confirmed_at: Date | string;
}

const DRAFT_COLUMNS = `id, character_id, animation_id, name, schema_version, status,
            frames, reference_asset_id, reference_settings, created_at, updated_at`;

interface AssetRow {
  id: string;
  draft_id: string;
  file_name: string;
  media_type: string;
  size_bytes: number;
  created_at: Date | string;
}

interface AssetContentRow extends AssetRow {
  image_data: Buffer;
}

interface JsonObject {
  [key: string]: unknown;
}

function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toAssetMetadata(row: AssetRow): ReferenceAssetMetadata {
  return {
    id: row.id,
    fileName: row.file_name,
    mediaType: row.media_type,
    sizeBytes: Number(row.size_bytes),
    createdAt: toIsoString(row.created_at),
  };
}

/** Rows are upgraded on read, so drafts saved by older editors still load. */
function toDraft(row: DraftRow, assets: ReferenceAssetMetadata[] = []): AnimationDraft {
  return {
    id: row.id,
    characterId: FRAME_DATA_CHARACTER_ID,
    animationId: row.animation_id,
    name: row.name,
    schemaVersion: FRAME_DATA_SCHEMA_VERSION,
    status: 'draft',
    frames: upgradeDraftFramesToV3(row.frames),
    referenceAssetId: row.reference_asset_id,
    referenceSettings: upgradeReferenceSettings(row.reference_settings),
    assets,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function sendError(
  response: ServerResponse,
  status: number,
  message: string,
): void {
  sendJson(response, status, { error: message });
}

function readBody(
  request: IncomingMessage,
  maximumBytes: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let rejected = false;

    request.on('data', (chunk: Buffer | string) => {
      if (rejected) return;
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += buffer.length;
      if (totalBytes > maximumBytes) {
        rejected = true;
        reject(new RangeError('Request body is too large.'));
        request.resume();
        return;
      }
      chunks.push(buffer);
    });

    request.on('end', () => {
      if (!rejected) resolve(Buffer.concat(chunks));
    });
    request.on('error', (error) => {
      if (!rejected) reject(error);
    });
  });
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const rawBody = await readBody(request, MAX_JSON_BYTES);
  try {
    return JSON.parse(rawBody.toString('utf8')) as unknown;
  } catch {
    throw new SyntaxError('Request body must be valid JSON.');
  }
}

function getAllowedMediaType(fileName: string, requestType: string): string | null {
  const normalizedRequestType = requestType.split(';', 1)[0].trim().toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(normalizedRequestType)) return normalizedRequestType;

  if (normalizedRequestType && normalizedRequestType !== 'application/octet-stream') {
    return null;
  }
  const extension = fileName.split('.').pop()?.toLowerCase();
  const extensionTypes: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
  };
  const inferredType = extension ? extensionTypes[extension] : undefined;
  return inferredType && ALLOWED_IMAGE_TYPES.has(inferredType) ? inferredType : null;
}

function isValidImageHeader(data: Buffer, mediaType: string): boolean {
  if (mediaType === 'image/png') {
    return data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mediaType === 'image/jpeg') {
    return data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (mediaType === 'image/webp') {
    return data.length >= 12
      && data.toString('ascii', 0, 4) === 'RIFF'
      && data.toString('ascii', 8, 12) === 'WEBP';
  }
  if (mediaType === 'image/gif') {
    const signature = data.toString('ascii', 0, 6);
    return signature === 'GIF87a' || signature === 'GIF89a';
  }
  return false;
}

function cleanFileName(fileName: string): string {
  const name = fileName.replaceAll('\\', '/').split('/').pop() ?? '';
  const cleaned = name.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 255);
  return cleaned || 'reference-image';
}

function toFrameCount(row: FrameCountRow): ConfirmedFrameCount {
  return {
    animationId: row.animation_id,
    frameCount: Number(row.frame_count),
    confirmedAt: toIsoString(row.confirmed_at),
  };
}

async function getConfirmedFrameCount(pool: Pool, animationId: string): Promise<number | null> {
  const result = await pool.query<FrameCountRow>(
    `SELECT animation_id, frame_count, confirmed_at
       FROM frame_data_frame_counts
      WHERE character_id = $1 AND animation_id = $2`,
    [FRAME_DATA_CHARACTER_ID, animationId],
  );
  return result.rows[0] ? Number(result.rows[0].frame_count) : null;
}

async function listFrameCounts(pool: Pool): Promise<ConfirmedFrameCount[]> {
  const result = await pool.query<FrameCountRow>(
    `SELECT animation_id, frame_count, confirmed_at
       FROM frame_data_frame_counts
      WHERE character_id = $1
      ORDER BY animation_id ASC`,
    [FRAME_DATA_CHARACTER_ID],
  );
  return result.rows.map(toFrameCount);
}

/** Locked frame count for an animation: a confirmed count wins over the catalog. */
async function getLockedFrameCount(pool: Pool, animationId: string): Promise<number | null> {
  const entry = getCatalogEntry(animationId);
  if (!entry) return null;
  return getEffectiveFrameCount(entry, await getConfirmedFrameCount(pool, animationId));
}

async function getDraft(
  pool: Pool,
  draftId: string,
): Promise<AnimationDraft | null> {
  const result = await pool.query<DraftRow>(
    `SELECT ${DRAFT_COLUMNS}
       FROM frame_data_drafts
      WHERE id = $1`,
    [draftId],
  );
  const row = result.rows[0];
  if (!row) return null;
  const assetsResult = await pool.query<AssetRow>(
    `SELECT id, draft_id, file_name, media_type, size_bytes, created_at
       FROM frame_data_reference_assets
      WHERE draft_id = $1
      ORDER BY created_at ASC`,
    [draftId],
  );
  return toDraft(row, assetsResult.rows.map(toAssetMetadata));
}

async function listDrafts(pool: Pool): Promise<AnimationDraft[]> {
  const draftResult = await pool.query<DraftRow>(
    `SELECT ${DRAFT_COLUMNS}
       FROM frame_data_drafts
      ORDER BY animation_id ASC`,
  );
  if (draftResult.rows.length === 0) return [];

  const ids = draftResult.rows.map((row) => row.id);
  const assetsResult = await pool.query<AssetRow>(
    `SELECT id, draft_id, file_name, media_type, size_bytes, created_at
       FROM frame_data_reference_assets
      WHERE draft_id = ANY($1::uuid[])
      ORDER BY created_at ASC`,
    [ids],
  );
  const assetsByDraft = new Map<string, ReferenceAssetMetadata[]>();
  for (const asset of assetsResult.rows) {
    const assets = assetsByDraft.get(asset.draft_id) ?? [];
    assets.push(toAssetMetadata(asset));
    assetsByDraft.set(asset.draft_id, assets);
  }
  return draftResult.rows.map((row) => toDraft(row, assetsByDraft.get(row.id) ?? []));
}

function middleware(
  pool: Pool | null,
  server: ViteDevServer,
): (request: IncomingMessage, response: ServerResponse, next: NextFunction) => void {
  return (request, response, next) => {
    if (request.method === 'OPTIONS') {
      response.statusCode = 204;
      response.end();
      return;
    }
    if (!pool) {
      sendError(response, 503, 'Development database is not configured.');
      return;
    }

    void handleRequest(request, response, pool).catch((error: unknown) => {
      if (error instanceof RangeError && error.message === 'Request body is too large.') {
        sendError(response, 413, error.message);
        return;
      }
      if (error instanceof SyntaxError) {
        sendError(response, 400, error.message);
        return;
      }
      server.config.logger.error(
        `[frame-data] ${error instanceof Error ? error.message : 'Unexpected API error'}`,
      );
      sendError(response, 500, 'The frame-data request could not be completed.');
    });
    void next;
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', 'http://development.local');
  const segments = requestUrl.pathname.split('/').filter(Boolean);

  if (request.method === 'GET' && segments.length === 0) {
    sendJson(response, 200, await listDrafts(pool));
    return;
  }

  if (segments[0] === 'frame-counts') {
    await handleFrameCounts(request, response, pool, segments);
    return;
  }

  if (request.method === 'POST' && segments.length === 0) {
    const body = await readJsonBody(request);
    const entry = isObject(body) && typeof body.animationId === 'string'
      ? getCatalogEntry(body.animationId)
      : undefined;
    if (!isObject(body) || !entry) {
      sendError(response, 400, 'Choose an animation from the catalog.');
      return;
    }
    const rawName = typeof body.name === 'string' ? body.name.trim() : '';
    const name = rawName || `Captain Falcon · ${entry.label}`;
    if (name.length > 100) {
      sendError(response, 400, 'Draft names must be 100 characters or fewer.');
      return;
    }
    const frameCount = await getLockedFrameCount(pool, entry.id);
    const framesError = validateAnimationFrames(body.frames, frameCount ?? undefined);
    if (framesError) {
      sendError(response, 400, framesError);
      return;
    }
    const referenceSettings = body.referenceSettings ?? DEFAULT_REFERENCE_SETTINGS;
    if (!isValidReferenceSettings(referenceSettings)) {
      sendError(response, 400, 'Reference settings must include a supported scale, offsets, opacity, and lock state.');
      return;
    }

    const id = randomUUID();
    const result = await pool.query<DraftRow>(
      `INSERT INTO frame_data_drafts
         (id, character_id, animation_id, name, schema_version, status, frames, reference_settings)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6::jsonb, $7::jsonb)
       ON CONFLICT (character_id, animation_id) DO NOTHING
       RETURNING ${DRAFT_COLUMNS}`,
      [
        id,
        FRAME_DATA_CHARACTER_ID,
        entry.id,
        name,
        FRAME_DATA_SCHEMA_VERSION,
        JSON.stringify(body.frames),
        JSON.stringify(referenceSettings),
      ],
    );
    if (!result.rows[0]) {
      sendError(response, 409, 'This animation already has a working draft.');
      return;
    }
    sendJson(response, 201, toDraft(result.rows[0]));
    return;
  }

  const draftId = segments[0];
  if (!UUID_PATTERN.test(draftId)) {
    sendError(response, 404, 'Animation draft not found.');
    return;
  }

  if (segments.length === 1 && request.method === 'GET') {
    const draft = await getDraft(pool, draftId);
    if (!draft) {
      sendError(response, 404, 'Animation draft not found.');
      return;
    }
    sendJson(response, 200, draft);
    return;
  }

  if (segments.length === 1 && request.method === 'PUT') {
    const body = await readJsonBody(request);
    if (!isObject(body)) {
      sendError(response, 400, 'A draft update must be a JSON object.');
      return;
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name || name.length > 100) {
      sendError(response, 400, 'Draft names must be between 1 and 100 characters.');
      return;
    }
    const existing = await pool.query<{ animation_id: string }>(
      'SELECT animation_id FROM frame_data_drafts WHERE id = $1',
      [draftId],
    );
    const animationId = existing.rows[0]?.animation_id;
    if (!animationId) {
      sendError(response, 404, 'Animation draft not found.');
      return;
    }
    const frameCount = await getLockedFrameCount(pool, animationId);
    const framesError = validateAnimationFrames(body.frames, frameCount ?? undefined);
    if (framesError) {
      sendError(response, 400, framesError);
      return;
    }
    const referenceAssetId = body.referenceAssetId;
    const referenceSettings = body.referenceSettings;
    if (
      referenceAssetId !== null
      && (typeof referenceAssetId !== 'string' || !UUID_PATTERN.test(referenceAssetId))
    ) {
      sendError(response, 400, 'Choose a valid reference asset or clear the reference.');
      return;
    }
    if (referenceSettings !== undefined && !isValidReferenceSettings(referenceSettings)) {
      sendError(response, 400, 'Reference settings must include a supported scale, offsets, opacity, and lock state.');
      return;
    }

    if (referenceAssetId !== null) {
      const assetResult = await pool.query(
        `SELECT id
           FROM frame_data_reference_assets
          WHERE id = $1 AND draft_id = $2`,
        [referenceAssetId, draftId],
      );
      if (assetResult.rowCount === 0) {
        sendError(response, 400, 'The selected reference image does not belong to this draft.');
        return;
      }
    }

    const result = await pool.query<DraftRow>(
      `UPDATE frame_data_drafts
          SET name = $1, frames = $2::jsonb, reference_asset_id = $3,
              reference_settings = COALESCE($4::jsonb, reference_settings), updated_at = NOW()
        WHERE id = $5
        RETURNING ${DRAFT_COLUMNS}`,
      [
        name,
        JSON.stringify(body.frames),
        referenceAssetId,
        referenceSettings === undefined ? null : JSON.stringify(referenceSettings),
        draftId,
      ],
    );
    if (!result.rows[0]) {
      sendError(response, 404, 'Animation draft not found.');
      return;
    }
    sendJson(response, 200, await getDraft(pool, draftId));
    return;
  }

  if (segments.length === 1 && request.method === 'DELETE') {
    const result = await pool.query(
      'DELETE FROM frame_data_drafts WHERE id = $1 RETURNING id',
      [draftId],
    );
    if (result.rowCount === 0) {
      sendError(response, 404, 'Animation draft not found.');
      return;
    }
    sendJson(response, 200, { deleted: true });
    return;
  }

  if (segments[1] !== 'assets' || segments.length < 2 || segments.length > 3) {
    sendError(response, 404, 'Frame-data endpoint not found.');
    return;
  }

  if (segments.length === 2 && request.method === 'POST') {
    const fileName = cleanFileName(requestUrl.searchParams.get('fileName') ?? '');
    const mediaType = getAllowedMediaType(
      fileName,
      String(request.headers['content-type'] ?? ''),
    );
    if (!mediaType) {
      sendError(response, 415, 'Upload a PNG, JPEG, WebP, or GIF reference image.');
      return;
    }
    const imageData = await readBody(request, MAX_ASSET_BYTES);
    if (imageData.length === 0 || !isValidImageHeader(imageData, mediaType)) {
      sendError(response, 400, 'The uploaded file does not match its image type.');
      return;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const draftResult = await client.query(
        'SELECT id FROM frame_data_drafts WHERE id = $1 FOR UPDATE',
        [draftId],
      );
      if (draftResult.rowCount === 0) {
        await client.query('ROLLBACK');
        sendError(response, 404, 'Animation draft not found.');
        return;
      }
      const assetId = randomUUID();
      const assetResult = await client.query<AssetRow>(
        `INSERT INTO frame_data_reference_assets
           (id, draft_id, file_name, media_type, size_bytes, image_data)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, draft_id, file_name, media_type, size_bytes, created_at`,
        [assetId, draftId, fileName, mediaType, imageData.length, imageData],
      );
      // A new upload becomes the active reference with fresh alignment; the
      // animation keeps its opacity and frame-link preferences.
      await client.query(
        `UPDATE frame_data_drafts
            SET reference_asset_id = $1,
                reference_settings = reference_settings || $3::jsonb,
                updated_at = NOW()
          WHERE id = $2`,
        [assetId, draftId, JSON.stringify({ scale: 1, offsetX: 0, offsetY: 0, locked: true })],
      );
      await client.query('COMMIT');
      sendJson(response, 201, toAssetMetadata(assetResult.rows[0]));
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  const assetId = segments[2];
  if (!UUID_PATTERN.test(assetId)) {
    sendError(response, 404, 'Reference image not found.');
    return;
  }

  if (segments.length === 3 && request.method === 'GET') {
    const result = await pool.query<AssetContentRow>(
      `SELECT id, draft_id, file_name, media_type, size_bytes, image_data, created_at
         FROM frame_data_reference_assets
        WHERE id = $1 AND draft_id = $2`,
      [assetId, draftId],
    );
    const asset = result.rows[0];
    if (!asset) {
      sendError(response, 404, 'Reference image not found.');
      return;
    }
    response.statusCode = 200;
    response.setHeader('Content-Type', asset.media_type);
    response.setHeader('Content-Length', asset.size_bytes);
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.end(asset.image_data);
    return;
  }

  if (segments.length === 3 && request.method === 'DELETE') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `DELETE FROM frame_data_reference_assets
          WHERE id = $1 AND draft_id = $2
          RETURNING id`,
        [assetId, draftId],
      );
      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        sendError(response, 404, 'Reference image not found.');
        return;
      }
      await client.query(
        `UPDATE frame_data_drafts
            SET reference_asset_id = NULL, updated_at = NOW()
          WHERE id = $1 AND reference_asset_id = $2`,
        [draftId, assetId],
      );
      await client.query('COMMIT');
      sendJson(response, 200, { deleted: true });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  sendError(response, 404, 'Frame-data endpoint not found.');
}

async function handleFrameCounts(
  request: IncomingMessage,
  response: ServerResponse,
  pool: Pool,
  segments: string[],
): Promise<void> {
  if (segments.length === 1 && request.method === 'GET') {
    sendJson(response, 200, await listFrameCounts(pool));
    return;
  }
  const animationId = segments[1];
  if (segments.length !== 2 || !getCatalogEntry(animationId)) {
    sendError(response, 404, 'Animation not found in the catalog.');
    return;
  }
  if (request.method === 'PUT') {
    const body = await readJsonBody(request);
    const frameCount = isObject(body) ? body.frameCount : undefined;
    if (!Number.isSafeInteger(frameCount) || Number(frameCount) < 1 || Number(frameCount) > 2000) {
      sendError(response, 400, 'Frame counts must be whole numbers from 1 to 2000.');
      return;
    }
    const result = await pool.query<FrameCountRow>(
      `INSERT INTO frame_data_frame_counts (character_id, animation_id, frame_count)
       VALUES ($1, $2, $3)
       ON CONFLICT (character_id, animation_id)
       DO UPDATE SET frame_count = EXCLUDED.frame_count, confirmed_at = NOW()
       RETURNING animation_id, frame_count, confirmed_at`,
      [FRAME_DATA_CHARACTER_ID, animationId, frameCount],
    );
    sendJson(response, 200, toFrameCount(result.rows[0]));
    return;
  }
  if (request.method === 'DELETE') {
    await pool.query(
      'DELETE FROM frame_data_frame_counts WHERE character_id = $1 AND animation_id = $2',
      [FRAME_DATA_CHARACTER_ID, animationId],
    );
    sendJson(response, 200, { deleted: true });
    return;
  }
  sendError(response, 404, 'Frame-data endpoint not found.');
}

export function frameDataPlugin(): Plugin {
  return {
    name: 'frame-data-development-api',
    apply: 'serve',
    configureServer(server) {
      const databaseUrl = process.env.DATABASE_URL;
      const pool = databaseUrl
        ? new Pool({ connectionString: databaseUrl, max: 4 })
        : null;

      if (pool) {
        pool.on('error', (error) => {
          server.config.logger.error(
            `[frame-data] database pool error: ${error.message}`,
          );
        });
        server.httpServer?.once('close', () => {
          void pool.end();
        });
      }

      server.middlewares.use(ROUTE_BASE, middleware(pool, server));
      server.config.logger.info('Development-only frame-data API registered.');
    },
  };
}
