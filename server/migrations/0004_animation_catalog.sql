-- Generalize movement drafts to every catalog animation (schema version 3).
-- Existing drafts keep their frames: motion_state values are also catalog ids.
BEGIN;

ALTER TABLE frame_data_drafts
  DROP CONSTRAINT IF EXISTS frame_data_drafts_motion_state_check;

DROP INDEX IF EXISTS frame_data_drafts_motion_state_updated_idx;

ALTER TABLE frame_data_drafts
  RENAME COLUMN motion_state TO animation_id;

ALTER TABLE frame_data_drafts
  ADD CONSTRAINT frame_data_drafts_animation_id_check
    CHECK (animation_id ~ '^[a-z0-9][a-z0-9-]{0,62}$');

-- One working draft per animation. Older duplicates (the previous schema allowed
-- several per movement state) are archived, not deleted, so their frames and
-- uploaded references stay in the database. Archived rows are hidden from the
-- editor; clear archived_at on a row (after archiving the current one) to restore it.
ALTER TABLE frame_data_drafts
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

UPDATE frame_data_drafts older
   SET archived_at = NOW()
  FROM frame_data_drafts newer
 WHERE older.character_id = newer.character_id
   AND older.animation_id = newer.animation_id
   AND older.archived_at IS NULL
   AND (older.updated_at, older.id) < (newer.updated_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS frame_data_drafts_active_animation_key
  ON frame_data_drafts (character_id, animation_id)
  WHERE archived_at IS NULL;

-- Reference settings gain opacity and frame linking.
ALTER TABLE frame_data_drafts
  DROP CONSTRAINT IF EXISTS frame_data_drafts_reference_alignment_check;

ALTER TABLE frame_data_drafts
  RENAME COLUMN reference_alignment TO reference_settings;

UPDATE frame_data_drafts
   SET reference_settings = '{"opacity": 0.55, "linkFrames": false}'::jsonb || reference_settings;

ALTER TABLE frame_data_drafts
  ALTER COLUMN reference_settings SET DEFAULT
    '{"scale": 1, "offsetX": 0, "offsetY": 0, "locked": true, "opacity": 0.55, "linkFrames": false}'::jsonb;

ALTER TABLE frame_data_drafts
  ADD CONSTRAINT frame_data_drafts_reference_settings_check
    CHECK (
      jsonb_typeof(reference_settings) = 'object'
      AND jsonb_typeof(reference_settings->'scale') = 'number'
      AND jsonb_typeof(reference_settings->'offsetX') = 'number'
      AND jsonb_typeof(reference_settings->'offsetY') = 'number'
      AND jsonb_typeof(reference_settings->'locked') = 'boolean'
      AND jsonb_typeof(reference_settings->'opacity') = 'number'
      AND jsonb_typeof(reference_settings->'linkFrames') = 'boolean'
    );

-- Frames: hurtbox isVulnerable -> state; add hitbox/grab-box layers and reference links.
UPDATE frame_data_drafts AS draft
   SET frames = (
     SELECT COALESCE(jsonb_agg(
              (frame - 'hurtboxes')
              || jsonb_build_object(
                   'hurtboxes', COALESCE((
                     SELECT jsonb_agg(
                              (hurtbox - 'isVulnerable')
                              || jsonb_build_object(
                                   'state',
                                   COALESCE(
                                     hurtbox->>'state',
                                     CASE WHEN (hurtbox->>'isVulnerable')::boolean IS FALSE
                                          THEN 'intangible' ELSE 'normal' END
                                   )
                                 )
                              ORDER BY hurtbox_index)
                       FROM jsonb_array_elements(frame->'hurtboxes')
                            WITH ORDINALITY AS h(hurtbox, hurtbox_index)
                   ), '[]'::jsonb),
                   'hitboxes', COALESCE(frame->'hitboxes', '[]'::jsonb),
                   'grabboxes', COALESCE(frame->'grabboxes', '[]'::jsonb),
                   'referenceFrame', COALESCE(frame->'referenceFrame', 'null'::jsonb)
                 )
              ORDER BY frame_index), '[]'::jsonb)
       FROM jsonb_array_elements(draft.frames) WITH ORDINALITY AS f(frame, frame_index)
   );

ALTER TABLE frame_data_drafts
  DROP CONSTRAINT frame_data_drafts_schema_version_check;

UPDATE frame_data_drafts SET schema_version = 3 WHERE schema_version = 2;

ALTER TABLE frame_data_drafts
  ADD CONSTRAINT frame_data_drafts_schema_version_check
    CHECK (schema_version = 3);

-- Frame counts the user confirmed in the editor (override catalog counts).
CREATE TABLE IF NOT EXISTS frame_data_frame_counts (
  character_id TEXT NOT NULL CHECK (character_id = 'captain_falcon'),
  animation_id TEXT NOT NULL CHECK (animation_id ~ '^[a-z0-9][a-z0-9-]{0,62}$'),
  frame_count INTEGER NOT NULL CHECK (frame_count BETWEEN 1 AND 2000),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (character_id, animation_id)
);

COMMIT;
