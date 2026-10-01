-- Registros de "Más funciones" (disputas, mandatos, incidentes...). Un registro genérico nunca crea documentos, cobros ni asientos.
CREATE TABLE feature_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 feature_id text NOT NULL CHECK(feature_id ~ '^[a-z][a-z0-9-]{1,40}$'),
 data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 status text NOT NULL DEFAULT 'open' CHECK(length(status) BETWEEN 1 AND 30),
 contact_id uuid REFERENCES contacts(id),
 document_id uuid REFERENCES documents(id),
 due_date date,
 amount numeric(20,2),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_by uuid NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 archived_at timestamptz
);
CREATE INDEX feature_records_list ON feature_records(feature_id,archived_at,updated_at DESC);
CREATE INDEX feature_records_document ON feature_records(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX feature_records_due ON feature_records(due_date) WHERE archived_at IS NULL;
