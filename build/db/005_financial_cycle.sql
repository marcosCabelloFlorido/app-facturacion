ALTER TABLE documents ADD COLUMN operation_date date;
ALTER TABLE documents ADD COLUMN registration_date date;
ALTER TABLE documents ADD COLUMN series_code text;
ALTER TABLE documents ADD COLUMN credit_side text NOT NULL DEFAULT 'sale' CHECK(credit_side IN ('sale','purchase'));
CREATE TABLE series_config(code text PRIMARY KEY CHECK(code ~ '^[A-Z][A-Z0-9]{1,11}$'),kind text NOT NULL CHECK(kind IN ('invoice','quote','purchase','credit')),name text NOT NULL,active boolean NOT NULL DEFAULT true);
CREATE TABLE series_counters(code text NOT NULL REFERENCES series_config(code),year integer NOT NULL,last_number integer NOT NULL DEFAULT 0,last_date date,PRIMARY KEY(code,year));
ALTER TABLE documents ADD CONSTRAINT document_series FOREIGN KEY(series_code) REFERENCES series_config(code);
DROP INDEX one_credit_per_invoice;
DROP INDEX purchase_supplier_reference;
CREATE UNIQUE INDEX purchase_supplier_reference ON documents((regexp_replace(upper(party->>'taxId'),'[^A-Z0-9]','','g')),reference,(extract(year from date))) WHERE kind='purchase' AND status='recorded';

CREATE OR REPLACE FUNCTION validate_credit_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original documents; ln jsonb; src jsonb; pos integer; used numeric; positions integer[]:='{}';
BEGIN
 IF NEW.kind='credit' THEN
   SELECT * INTO original FROM documents WHERE id=NEW.original_id FOR UPDATE;
   IF original.id IS NULL OR original.kind NOT IN ('invoice','purchase') OR original.status NOT IN ('issued','recorded') OR NEW.party<>original.party OR NEW.retention_rate<>original.retention_rate OR NEW.date<original.date OR NEW.credit_side<>(CASE WHEN original.kind='purchase' THEN 'purchase' ELSE 'sale' END) THEN RAISE EXCEPTION 'La rectificativa debe conservar el tercero y tratamiento fiscal del original'; END IF;
   FOR ln,pos IN SELECT value,(ordinality-1)::integer FROM jsonb_array_elements(NEW.lines) WITH ORDINALITY LOOP
     pos:=coalesce((ln->>'sourceLine')::integer,pos);
     IF pos=ANY(positions) OR pos<0 OR pos>=jsonb_array_length(original.lines) THEN RAISE EXCEPTION 'Línea de origen inválida o repetida'; END IF;
     positions:=array_append(positions,pos);src:=original.lines->pos;
     IF ln->>'description'<>src->>'description' OR (ln->>'unitPrice')::numeric<>(src->>'unitPrice')::numeric OR (ln->>'discount')::numeric<>(src->>'discount')::numeric OR (ln->>'taxRate')::numeric<>(src->>'taxRate')::numeric OR ln->>'exemptionReason'<>src->>'exemptionReason' THEN RAISE EXCEPTION 'Conserva el precio y los impuestos de la línea original'; END IF;
     SELECT coalesce(sum((l.value->>'quantity')::numeric),0) INTO used FROM documents d CROSS JOIN LATERAL jsonb_array_elements(d.lines) WITH ORDINALITY l(value,ord) WHERE d.original_id=original.id AND d.id<>NEW.id AND d.status='issued' AND coalesce((l.value->>'sourceLine')::integer,(l.ord-1)::integer)=pos;
     IF (ln->>'quantity')::numeric+used>(src->>'quantity')::numeric THEN RAISE EXCEPTION 'La cantidad supera lo pendiente de rectificar en la línea %',pos+1; END IF;
   END LOOP;
   SELECT coalesce(sum(total),0) INTO used FROM documents WHERE original_id=original.id AND id<>NEW.id AND status='issued';
   IF used+NEW.total>original.total THEN RAISE EXCEPTION 'Las rectificaciones superan el importe original'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION guard_credit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c documents; i documents; b numeric;
BEGIN
 SELECT * INTO i FROM documents WHERE id=NEW.invoice_id FOR UPDATE;
 SELECT * INTO c FROM documents WHERE id=NEW.credit_id FOR UPDATE;
 SELECT balance INTO b FROM document_balances WHERE id=i.id;
 IF c.kind<>'credit' OR c.status<>'issued' OR i.kind NOT IN ('invoice','purchase') OR i.status NOT IN ('issued','recorded') OR c.original_id<>i.id OR NEW.amount>b OR NEW.amount>c.total THEN RAISE EXCEPTION 'Aplicación de rectificativa inválida'; END IF;
 RETURN NEW;
END $$;

CREATE TABLE document_schedules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),document_id uuid NOT NULL REFERENCES documents(id),version integer NOT NULL,reason text NOT NULL,created_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(document_id,version));
CREATE TABLE document_dues(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),schedule_id uuid NOT NULL REFERENCES document_schedules(id),position integer NOT NULL,due_date date NOT NULL,amount numeric(20,2) NOT NULL CHECK(amount>0),UNIQUE(schedule_id,position));
CREATE TRIGGER immutable_schedules BEFORE UPDATE OR DELETE ON document_schedules FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_dues BEFORE UPDATE OR DELETE ON document_dues FOR EACH ROW EXECUTE FUNCTION guard_immutable();
DROP VIEW document_balances;
CREATE VIEW document_balances AS SELECT d.*,COALESCE(p.amount,0)+COALESCE(c.amount,0) AS settled,d.total-COALESCE(p.amount,0)-COALESCE(c.amount,0) AS balance FROM documents d LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM payments WHERE document_id=d.id AND reversed_at IS NULL) p ON true LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM credit_applications WHERE credit_id=d.id OR invoice_id=d.id) c ON true;

CREATE TABLE chart_accounts(code text PRIMARY KEY CHECK(code ~ '^[1-9][0-9]{2,9}$'),name text NOT NULL,control boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true);
INSERT INTO chart_accounts(code,name,control) VALUES('100','Capital social',false),('400','Proveedores',true),('430','Clientes',true),('472','IVA soportado',false),('473','Retenciones soportadas',false),('4751','Retenciones a pagar',false),('477','IVA repercutido',false),('555','Partidas pendientes de aplicación',false),('570','Caja',false),('572','Bancos',false),('600','Compras',false),('629','Otros servicios',false),('700','Ventas',false),('438','Anticipos de clientes',true),('407','Anticipos a proveedores',true),('217','Equipos informáticos',false),('2817','Amortización acumulada equipos',false),('681','Amortización inmovilizado',false),('626','Servicios bancarios',false),('300','Mercaderías',false),('610','Variación de existencias',false);
ALTER TABLE journal_lines DROP CONSTRAINT journal_lines_account_check;
ALTER TABLE journal_lines ADD CONSTRAINT journal_account FOREIGN KEY(account) REFERENCES chart_accounts(code);

CREATE TABLE payment_batches(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),date date NOT NULL,amount numeric(20,2) NOT NULL CHECK(amount>0),reference text NOT NULL,created_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE batch_payments(batch_id uuid NOT NULL REFERENCES payment_batches(id),payment_id uuid NOT NULL UNIQUE REFERENCES payments(id),PRIMARY KEY(batch_id,payment_id));
CREATE TRIGGER immutable_batches BEFORE UPDATE OR DELETE ON payment_batches FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_batch_payments BEFORE UPDATE OR DELETE ON batch_payments FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TABLE unapplied_funds(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),direction text NOT NULL CHECK(direction IN ('receipt','payment')),party jsonb NOT NULL,amount numeric(20,2) NOT NULL CHECK(amount>0),date date NOT NULL,method text NOT NULL CHECK(method IN ('bank','cash','card')),reference text NOT NULL,entry_id uuid NOT NULL UNIQUE REFERENCES journal_entries(id),created_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fund_applications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),fund_id uuid NOT NULL REFERENCES unapplied_funds(id),document_id uuid REFERENCES documents(id),amount numeric(20,2) NOT NULL CHECK(amount>0),date date NOT NULL,entry_id uuid NOT NULL UNIQUE REFERENCES journal_entries(id),kind text NOT NULL CHECK(kind IN ('apply','refund')),created_by uuid NOT NULL REFERENCES public.users(id),CHECK((kind='apply')=(document_id IS NOT NULL)));
CREATE TRIGGER immutable_funds BEFORE UPDATE OR DELETE ON unapplied_funds FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE TRIGGER immutable_fund_applications BEFORE UPDATE OR DELETE ON fund_applications FOR EACH ROW EXECUTE FUNCTION guard_immutable();
CREATE FUNCTION guard_fund_application() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE f unapplied_funds; d documents; used numeric; remaining numeric;
BEGIN
 SELECT * INTO f FROM unapplied_funds WHERE id=NEW.fund_id FOR UPDATE;
 SELECT coalesce(sum(amount),0) INTO used FROM fund_applications WHERE fund_id=f.id;
 IF NEW.date<f.date OR used+NEW.amount>f.amount THEN RAISE EXCEPTION 'La aplicación supera el importe disponible o tiene una fecha anterior'; END IF;
 IF NEW.kind='apply' THEN
  SELECT * INTO d FROM documents WHERE id=NEW.document_id FOR UPDATE;
  SELECT balance INTO remaining FROM document_balances WHERE id=d.id;
  IF d.id IS NULL OR d.kind<>(CASE WHEN f.direction='receipt' THEN 'invoice' ELSE 'purchase' END) OR d.status NOT IN ('issued','recorded') OR regexp_replace(upper(d.party->>'taxId'),'[^A-Z0-9]','','g')<>regexp_replace(upper(f.party->>'taxId'),'[^A-Z0-9]','','g') OR NEW.date<d.date OR NEW.amount>remaining THEN RAISE EXCEPTION 'La factura, el tercero o el importe no corresponden al anticipo'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER fund_application_guard BEFORE INSERT ON fund_applications FOR EACH ROW EXECUTE FUNCTION guard_fund_application();
CREATE OR REPLACE VIEW document_balances AS SELECT d.*,COALESCE(p.amount,0)+COALESCE(c.amount,0)+COALESCE(f.amount,0) AS settled,d.total-COALESCE(p.amount,0)-COALESCE(c.amount,0)-COALESCE(f.amount,0) AS balance FROM documents d LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM payments WHERE document_id=d.id AND reversed_at IS NULL) p ON true LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM credit_applications WHERE credit_id=d.id OR invoice_id=d.id) c ON true LEFT JOIN LATERAL (SELECT sum(amount) AS amount FROM fund_applications WHERE document_id=d.id AND kind='apply') f ON true;
CREATE OR REPLACE FUNCTION guard_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE d documents; remaining numeric;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Los pagos se revierten, no se borran'; END IF;
 SELECT * INTO d FROM documents WHERE id=NEW.document_id FOR UPDATE;
 IF d.status NOT IN ('issued','recorded') OR d.kind='quote' OR NEW.date<d.date THEN RAISE EXCEPTION 'Documento o fecha no válidos para pagar'; END IF;
 IF TG_OP='UPDATE' THEN
   IF (to_jsonb(NEW)-ARRAY['reversed_at','reversal_date','reversal_reason']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reversed_at','reversal_date','reversal_reason']) OR OLD.reversed_at IS NOT NULL OR NEW.reversed_at IS NULL OR NEW.reversal_date<OLD.date THEN RAISE EXCEPTION 'Solo se permite revertir el pago una vez'; END IF;
   IF EXISTS(SELECT 1 FROM credit_applications WHERE invoice_id=d.id) THEN RAISE EXCEPTION 'Factura rectificada: registra los movimientos sobre su rectificativa'; END IF;
 ELSE
   SELECT balance INTO remaining FROM document_balances WHERE id=d.id;
   IF NEW.amount>remaining THEN RAISE EXCEPTION 'El pago supera el saldo pendiente'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE VIEW document_due_balances AS
 WITH latest AS (SELECT DISTINCT ON(document_id) id,document_id FROM document_schedules ORDER BY document_id,version DESC),
 dues AS (SELECT d.id AS document_id,v.position,v.due_date,v.amount,d.settled FROM document_balances d JOIN latest s ON s.document_id=d.id JOIN document_dues v ON v.schedule_id=s.id UNION ALL SELECT d.id,0,d.due_date,d.total,d.settled FROM document_balances d WHERE NOT EXISTS(SELECT 1 FROM latest s WHERE s.document_id=d.id)),
 ordered AS (SELECT *,coalesce(sum(amount) OVER(PARTITION BY document_id ORDER BY due_date,position ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS previous FROM dues)
 SELECT document_id,position,due_date,amount,greatest(0,amount-greatest(0,settled-previous)) AS balance FROM ordered;
