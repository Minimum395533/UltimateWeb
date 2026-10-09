BEGIN;

ALTER TABLE frame_data_drafts
  ADD COLUMN reference_alignment JSONB NOT NULL
    DEFAULT '{"scale": 1, "offsetX": 0, "offsetY": 0, "locked": true}'::jsonb
    CHECK (
      jsonb_typeof(reference_alignment) = 'object'
      AND jsonb_typeof(reference_alignment->'scale') = 'number'
      AND jsonb_typeof(reference_alignment->'offsetX') = 'number'
      AND jsonb_typeof(reference_alignment->'offsetY') = 'number'
      AND jsonb_typeof(reference_alignment->'locked') = 'boolean'
    );

ALTER TABLE frame_data_drafts
  DROP CONSTRAINT frame_data_drafts_schema_version_check;

UPDATE frame_data_drafts
   SET schema_version = 2
 WHERE schema_version = 1;

ALTER TABLE frame_data_drafts
  ADD CONSTRAINT frame_data_drafts_schema_version_check
    CHECK (schema_version = 2);

COMMIT;
