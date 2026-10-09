-- For databases that ran an earlier revision of 0004 (which enforced one draft
-- per animation with a plain unique constraint): switch to archiving so older
-- drafts are never deleted. Safe to run on any database at schema v3.
BEGIN;

ALTER TABLE frame_data_drafts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE frame_data_drafts
  DROP CONSTRAINT IF EXISTS frame_data_drafts_character_animation_key;

CREATE UNIQUE INDEX IF NOT EXISTS frame_data_drafts_active_animation_key
  ON frame_data_drafts (character_id, animation_id)
  WHERE archived_at IS NULL;

COMMIT;
