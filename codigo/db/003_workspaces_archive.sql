CREATE TABLE working_drafts (
 owner_id uuid NOT NULL REFERENCES public.users(id), resource_key text NOT NULL,
 payload jsonb NOT NULL, step integer NOT NULL CHECK(step BETWEEN 0 AND 2),
 document_version integer, version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_id,resource_key)
);
CREATE TABLE document_archives (
 document_id uuid PRIMARY KEY REFERENCES documents(id), data bytea NOT NULL,
 sha256 text NOT NULL, renderer_version text NOT NULL, origin text NOT NULL CHECK(origin IN ('issuance','reconstructed')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER immutable_archive BEFORE UPDATE OR DELETE ON document_archives FOR EACH ROW EXECUTE FUNCTION guard_immutable();
