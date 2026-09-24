-- Keep immutable originals after deleting an unconfirmed draft, without a live document link.
ALTER TABLE stored_files ADD COLUMN deleted_document_id uuid;
ALTER TABLE stored_files ADD CONSTRAINT stored_files_deleted_document
  CHECK (deleted_document_id IS NULL OR document_id IS NULL);

-- Historical attachments must never collide with independently uploaded source files.
DROP INDEX file_once_source;
CREATE UNIQUE INDEX file_once_source ON stored_files(sha256)
  WHERE document_id IS NULL AND deleted_document_id IS NULL;

CREATE FUNCTION guard_stored_file() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.deleted_document_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- The document guard only permits deleting drafts. Its FK action runs after deletion.
  -- No live document may be detached, and all original bytes and metadata stay unchanged.
  IF TG_OP = 'UPDATE'
    AND OLD.document_id IS NOT NULL AND NEW.document_id IS NULL
    AND OLD.deleted_document_id IS NULL
    AND (to_jsonb(NEW) - 'document_id') = (to_jsonb(OLD) - 'document_id')
    AND NOT EXISTS (SELECT 1 FROM documents WHERE id = OLD.document_id) THEN
    NEW.deleted_document_id := OLD.document_id;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Registro inmutable; utiliza un asiento de reversión';
END $$;
DROP TRIGGER immutable_stored_file ON stored_files;
CREATE TRIGGER immutable_stored_file BEFORE INSERT OR UPDATE OR DELETE ON stored_files
  FOR EACH ROW EXECUTE FUNCTION guard_stored_file();

ALTER TABLE stored_files DROP CONSTRAINT stored_files_document_id_fkey;
ALTER TABLE stored_files ADD CONSTRAINT stored_files_document_id_fkey
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW active_stored_files AS
SELECT f.* FROM stored_files f
WHERE f.deleted_document_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM file_removals r WHERE r.file_id = f.id);
