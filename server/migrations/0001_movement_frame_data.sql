CREATE TABLE IF NOT EXISTS frame_data_drafts (
  id UUID PRIMARY KEY,
  character_id TEXT NOT NULL CHECK (character_id = 'captain_falcon'),
  motion_state TEXT NOT NULL CHECK (
    motion_state IN (
      'idle',
      'walk',
      'initial-dash',
      'run',
      'turnaround-dash',
      'jump-squat',
      'rising',
      'falling',
      'fast-fall',
      'landing'
    )
  ),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status = 'draft'),
  frames JSONB NOT NULL CHECK (jsonb_typeof(frames) = 'array'),
  reference_asset_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS frame_data_drafts_motion_state_updated_idx
  ON frame_data_drafts (motion_state, updated_at DESC);

CREATE TABLE IF NOT EXISTS frame_data_reference_assets (
  id UUID PRIMARY KEY,
  draft_id UUID NOT NULL REFERENCES frame_data_drafts (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 255),
  media_type TEXT NOT NULL CHECK (
    media_type IN ('image/png', 'image/jpeg', 'image/webp', 'image/gif')
  ),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  image_data BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS frame_data_reference_assets_draft_idx
  ON frame_data_reference_assets (draft_id, created_at);
