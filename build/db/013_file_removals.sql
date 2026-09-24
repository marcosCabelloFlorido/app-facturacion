-- Remove attachments from use without changing the immutable original bytes.
CREATE TABLE file_removals (
  file_id uuid PRIMARY KEY REFERENCES stored_files(id),
  removed_by uuid NOT NULL REFERENCES public.users(id),
  removed_at timestamptz NOT NULL DEFAULT now()
);

CREATE VIEW active_stored_files AS
SELECT f.* FROM stored_files f
WHERE NOT EXISTS (SELECT 1 FROM file_removals r WHERE r.file_id=f.id);
