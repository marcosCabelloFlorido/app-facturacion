CREATE TABLE document_template_choices (
 document_id uuid PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
 template_id uuid REFERENCES document_templates(id),
 updated_by uuid NOT NULL REFERENCES public.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portal_settings(id integer PRIMARY KEY CHECK(id=1),base_url text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1);
