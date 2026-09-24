-- Keep existing step IDs and draft versions; 3 is the new separate date screen.
ALTER TABLE working_drafts DROP CONSTRAINT working_drafts_step_check;
ALTER TABLE working_drafts ADD CONSTRAINT working_drafts_step_check CHECK (step BETWEEN 0 AND 3);
