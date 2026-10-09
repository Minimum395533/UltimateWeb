BEGIN;

ALTER TABLE frame_data_drafts
  DROP CONSTRAINT frame_data_drafts_motion_state_check;

ALTER TABLE frame_data_drafts
  ADD CONSTRAINT frame_data_drafts_motion_state_check
    CHECK (motion_state IN (
      'idle',
      'idle-variance',
      'walk',
      'initial-dash',
      'run',
      'turnaround-dash',
      'jump-squat',
      'rising',
      'falling',
      'fast-fall',
      'landing'
    ));

COMMIT;
