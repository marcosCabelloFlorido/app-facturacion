-- Facturación recurrente. Nace desactivada por negocio (recurring_settings.enabled=false).
CREATE TABLE recurring_settings(id integer PRIMARY KEY CHECK(id=1),enabled boolean NOT NULL DEFAULT false,updated_by uuid REFERENCES users(id),updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO recurring_settings(id) VALUES(1);
CREATE TABLE recurring_invoices(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 120),
 contact_id uuid NOT NULL REFERENCES contacts(id),
 lines jsonb NOT NULL CHECK(jsonb_array_length(lines) BETWEEN 1 AND 100),
 series_code text REFERENCES series_config(code),
 retention_rate numeric NOT NULL DEFAULT 0 CHECK(retention_rate IN (0,7,15,19)),
 payment_days integer NOT NULL DEFAULT 30 CHECK(payment_days BETWEEN 0 AND 365),
 notes text NOT NULL DEFAULT '',
 template_id uuid REFERENCES document_templates(id),
 frequency text NOT NULL CHECK(frequency IN ('monthly','quarterly','yearly')),
 interval_count integer NOT NULL DEFAULT 1 CHECK(interval_count BETWEEN 1 AND 24),
 start_date date NOT NULL,
 next_date date NOT NULL,
 end_date date CHECK(end_date IS NULL OR end_date>=start_date),
 max_occurrences integer CHECK(max_occurrences IS NULL OR max_occurrences>0),
 occurrences_done integer NOT NULL DEFAULT 0 CHECK(occurrences_done>=0),
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','finished')),
 auto_issue boolean NOT NULL DEFAULT true,
 auto_send boolean NOT NULL DEFAULT false,
 recipient text NOT NULL DEFAULT '',
 subject text NOT NULL DEFAULT 'Factura {numero}',
 body text NOT NULL DEFAULT 'Hola {cliente},' || chr(10) || chr(10) || 'Adjuntamos la factura {numero} por importe de {importe}, con vencimiento el {vencimiento}.' || chr(10) || chr(10) || 'Un saludo,' || chr(10) || '{empresa}',
 created_by uuid NOT NULL REFERENCES users(id),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(NOT auto_send OR auto_issue)
);
CREATE INDEX recurring_due ON recurring_invoices(next_date) WHERE status='active';
CREATE TABLE recurring_runs(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 recurring_id uuid NOT NULL REFERENCES recurring_invoices(id),
 scheduled_date date NOT NULL,
 document_id uuid REFERENCES documents(id),
 status text NOT NULL CHECK(status IN ('issued','draft','failed','skipped')),
 error text,
 note text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(recurring_id,scheduled_date)
);
CREATE INDEX recurring_runs_document ON recurring_runs(document_id);
ALTER TABLE documents ADD COLUMN recurring_id uuid REFERENCES recurring_invoices(id);
CREATE INDEX documents_recurring ON documents(recurring_id) WHERE recurring_id IS NOT NULL;
