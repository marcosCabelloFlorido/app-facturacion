CREATE TABLE company (id integer PRIMARY KEY CHECK(id = 1), data jsonb NOT NULL, demo boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text UNIQUE NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK(role IN ('admin','operator','viewer')), active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku text UNIQUE NOT NULL, name text NOT NULL, description text NOT NULL DEFAULT '', unit_price numeric(20,4) NOT NULL CHECK(unit_price>=0), tax_rate numeric NOT NULL CHECK(tax_rate IN (0,4,10,21)), exemption_reason text NOT NULL DEFAULT '', unit text NOT NULL DEFAULT 'ud.', active boolean NOT NULL DEFAULT true);
CREATE TABLE periods (month date PRIMARY KEY CHECK(extract(day from month)=1), closed_at timestamptz, closed_by uuid REFERENCES users(id));
CREATE TABLE series (kind text NOT NULL, year integer NOT NULL, last_number integer NOT NULL DEFAULT 0, last_date date, PRIMARY KEY(kind,year));
CREATE TABLE documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('invoice','quote','purchase','credit')),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','recorded','sent','accepted','rejected','converted')),
 number text UNIQUE, version integer NOT NULL DEFAULT 1, date date NOT NULL, due_date date NOT NULL CHECK(due_date>=date),
 party jsonb NOT NULL, reference text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '', retention_rate numeric NOT NULL DEFAULT 0 CHECK(retention_rate IN (0,7,15,19)),
 lines jsonb NOT NULL CHECK(jsonb_array_length(lines)>0 AND jsonb_array_length(lines)<=100), net numeric(20,2) NOT NULL CHECK(net>=0), tax numeric(20,2) NOT NULL CHECK(tax>=0), retention numeric(20,2) NOT NULL CHECK(retention>=0), total numeric(20,2) NOT NULL CHECK(total>=0 AND total=net+tax-retention),
 calculation_version text NOT NULL DEFAULT 'line-half-up-v1', company_snapshot jsonb,
 original_id uuid REFERENCES documents(id), converted_id uuid UNIQUE REFERENCES documents(id),
 created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), issued_at timestamptz,
 CHECK ((kind='credit') = (original_id IS NOT NULL)),
 CHECK ((kind IN ('invoice','credit') AND status IN ('draft','issued')) OR (kind='purchase' AND status IN ('draft','recorded')) OR (kind='quote' AND status IN ('draft','sent','accepted','rejected','converted'))),
 CHECK(status='draft' OR (number IS NOT NULL AND company_snapshot IS NOT NULL AND issued_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_credit_per_invoice ON documents(original_id) WHERE kind='credit';
CREATE UNIQUE INDEX purchase_supplier_reference ON documents((upper(party->>'taxId')),reference) WHERE kind='purchase' AND status='recorded';
CREATE INDEX documents_date ON documents(date DESC,created_at DESC);
CREATE INDEX documents_status ON documents(kind,status);
CREATE TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid NOT NULL REFERENCES documents(id), amount numeric(20,2) NOT NULL CHECK(amount>0), date date NOT NULL, method text NOT NULL CHECK(method IN ('bank','cash','card')), reference text NOT NULL DEFAULT '', created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), reversed_at timestamptz, reversal_date date, reversal_reason text, CHECK((reversed_at IS NULL)=(reversal_date IS NULL)));
CREATE INDEX payments_document ON payments(document_id);
CREATE TABLE credit_applications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), credit_id uuid NOT NULL UNIQUE REFERENCES documents(id), invoice_id uuid NOT NULL REFERENCES documents(id), amount numeric(20,2) NOT NULL CHECK(amount>0));
CREATE TABLE journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), number bigserial UNIQUE, date date NOT NULL, description text NOT NULL, document_id uuid REFERENCES documents(id), payment_id uuid REFERENCES payments(id), event text NOT NULL CHECK(event IN ('issue','payment','reversal','manual')), created_by uuid NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX journal_once_document ON journal_entries(document_id,event) WHERE event='issue';
CREATE UNIQUE INDEX journal_once_payment ON journal_entries(payment_id,event) WHERE payment_id IS NOT NULL;
CREATE TABLE journal_lines (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entry_id uuid NOT NULL REFERENCES journal_entries(id), account text NOT NULL CHECK(account IN ('430','400','700','600','472','477','473','4751','572','570','629','100','555')), debit numeric(20,2) NOT NULL DEFAULT 0 CHECK(debit>=0), credit numeric(20,2) NOT NULL DEFAULT 0 CHECK(credit>=0), CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)));
CREATE INDEX journal_lines_entry ON journal_lines(entry_id);
CREATE TABLE audit_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, actor_id uuid REFERENCES users(id), entity_id text NOT NULL, action text NOT NULL, details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX audit_entity ON audit_events(entity_id,id DESC);
CREATE TABLE idempotency_keys (key uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES users(id), request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fiscal_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_id uuid UNIQUE NOT NULL REFERENCES documents(id), mode text NOT NULL DEFAULT 'development' CHECK(mode='development'), status text NOT NULL DEFAULT 'not_submitted' CHECK(status='not_submitted'), payload jsonb NOT NULL, hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());

CREATE VIEW document_balances AS SELECT d.*,
 COALESCE(p.amount,0)+COALESCE(c.amount,0) AS settled,
 d.total-COALESCE(p.amount,0)-COALESCE(c.amount,0) AS balance
 FROM documents d
 LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM payments WHERE document_id=d.id AND reversed_at IS NULL) p ON true
 LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM credit_applications WHERE credit_id=d.id OR invoice_id=d.id) c ON true;

CREATE FUNCTION guard_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE l jsonb; n numeric:=0; t numeric:=0; b numeric; v numeric;
BEGIN
 IF TG_OP='DELETE' THEN
   IF OLD.status<>'draft' THEN RAISE EXCEPTION 'Los documentos confirmados no se pueden eliminar'; END IF;
   RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND OLD.status<>'draft' THEN
   IF (to_jsonb(NEW)-ARRAY['status','version','converted_id']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['status','version','converted_id']) THEN RAISE EXCEPTION 'El documento confirmado es inmutable'; END IF;
   IF OLD.kind<>'quote' OR NOT ((OLD.status='sent' AND NEW.status IN ('accepted','rejected')) OR (OLD.status='accepted' AND NEW.status='converted')) THEN RAISE EXCEPTION 'Transición de estado no permitida'; END IF;
 END IF;
 FOR l IN SELECT value FROM jsonb_array_elements(NEW.lines) LOOP
   IF (l->>'quantity')::numeric<=0 OR (l->>'unitPrice')::numeric<0 OR (l->>'discount')::numeric NOT BETWEEN 0 AND 100 OR (l->>'taxRate')::numeric NOT IN (0,4,10,21) THEN RAISE EXCEPTION 'Línea inválida'; END IF;
   b:=round((l->>'quantity')::numeric*(l->>'unitPrice')::numeric*(1-(l->>'discount')::numeric/100),2);
   v:=round(b*(l->>'taxRate')::numeric/100,2);
   IF b<>(l->>'net')::numeric OR v<>(l->>'tax')::numeric OR b+v<>(l->>'total')::numeric THEN RAISE EXCEPTION 'Importes de línea inconsistentes'; END IF;
   n:=n+b; t:=t+v;
 END LOOP;
 IF NEW.net<>n OR NEW.tax<>t OR NEW.retention<>round(n*NEW.retention_rate/100,2) THEN RAISE EXCEPTION 'Totales inconsistentes'; END IF;
 IF NEW.status<>'draft' AND (coalesce(NEW.party->>'taxId','')='' OR coalesce(NEW.company_snapshot->>'taxId','')='') THEN RAISE EXCEPTION 'Faltan datos fiscales'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER document_guard BEFORE INSERT OR UPDATE OR DELETE ON documents FOR EACH ROW EXECUTE FUNCTION guard_document();

CREATE FUNCTION guard_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Registro inmutable; utiliza un asiento de reversión'; END $$;
CREATE TRIGGER immutable_entries BEFORE UPDATE OR DELETE ON journal_entries FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_lines BEFORE UPDATE OR DELETE ON journal_lines FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_fiscal BEFORE UPDATE OR DELETE ON fiscal_records FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_credit BEFORE UPDATE OR DELETE ON credit_applications FOR EACH ROW EXECUTE FUNCTION guard_immutable();

CREATE FUNCTION check_entry() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_uuid uuid; d numeric; c numeric; cnt integer;
BEGIN
 IF TG_TABLE_NAME='journal_entries' THEN entry_uuid:=NEW.id; ELSE entry_uuid:=NEW.entry_id; END IF;
 SELECT sum(debit),sum(credit),count(*) INTO d,c,cnt FROM journal_lines WHERE entry_id=entry_uuid;
 IF cnt<2 OR d<>c THEN RAISE EXCEPTION 'El asiento debe estar equilibrado'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER balanced_entry AFTER INSERT ON journal_entries DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_entry();
CREATE CONSTRAINT TRIGGER balanced_line AFTER INSERT ON journal_lines DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_entry();

CREATE FUNCTION guard_period() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE p periods;
BEGIN
 INSERT INTO periods(month) VALUES(date_trunc('month',NEW.date)::date) ON CONFLICT DO NOTHING;
 SELECT * INTO p FROM periods WHERE month=date_trunc('month',NEW.date)::date FOR SHARE;
 IF p.closed_at IS NOT NULL THEN RAISE EXCEPTION 'El periodo contable está cerrado'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER period_entry BEFORE INSERT ON journal_entries FOR EACH ROW EXECUTE FUNCTION guard_period();

CREATE FUNCTION check_issuance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status IN ('issued','recorded') AND NOT EXISTS(SELECT 1 FROM journal_entries WHERE document_id=NEW.id AND event='issue') THEN RAISE EXCEPTION 'La emisión requiere asiento contable'; END IF;
 IF NEW.kind IN ('invoice','credit') AND NEW.status='issued' AND NOT EXISTS(SELECT 1 FROM fiscal_records WHERE document_id=NEW.id) THEN RAISE EXCEPTION 'La emisión requiere registro interno'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER complete_issuance AFTER INSERT OR UPDATE ON documents DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION check_issuance();

CREATE FUNCTION guard_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d documents; used numeric; credits numeric;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los pagos se revierten, no se borran'; END IF;
 SELECT * INTO d FROM documents WHERE id=NEW.document_id FOR UPDATE;
 IF d.status NOT IN ('issued','recorded') OR d.kind='quote' OR NEW.date<d.date THEN RAISE EXCEPTION 'Documento o fecha no válidos para pagar'; END IF;
 IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-ARRAY['reversed_at','reversal_date','reversal_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reversed_at','reversal_date','reversal_reason']) OR OLD.reversed_at IS NOT NULL OR NEW.reversed_at IS NULL OR NEW.reversal_date<OLD.date THEN RAISE EXCEPTION 'Solo se permite revertir el pago una vez'; END IF;
   IF EXISTS(SELECT 1 FROM credit_applications WHERE invoice_id=d.id) THEN RAISE EXCEPTION 'Factura rectificada: registra los movimientos sobre su rectificativa'; END IF;
 ELSE
   SELECT coalesce(sum(amount),0) INTO used FROM payments WHERE document_id=d.id AND reversed_at IS NULL;
   SELECT coalesce(sum(amount),0) INTO credits FROM credit_applications WHERE invoice_id=d.id OR credit_id=d.id;
   IF used+credits+NEW.amount>d.total THEN RAISE EXCEPTION 'El pago supera el saldo pendiente'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_guard BEFORE INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE FUNCTION guard_payment();

CREATE FUNCTION guard_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c documents; i documents; b numeric;
BEGIN
 SELECT * INTO i FROM documents WHERE id=NEW.invoice_id FOR UPDATE;
 SELECT * INTO c FROM documents WHERE id=NEW.credit_id FOR UPDATE;
 SELECT balance INTO b FROM document_balances WHERE id=i.id;
 IF c.kind<>'credit' OR c.status<>'issued' OR i.kind<>'invoice' OR i.status<>'issued' OR c.original_id<>i.id OR NEW.amount>b OR NEW.amount>c.total THEN RAISE EXCEPTION 'Aplicación de rectificativa inválida'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER credit_guard BEFORE INSERT ON credit_applications FOR EACH ROW EXECUTE FUNCTION guard_credit();
