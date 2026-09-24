CREATE FUNCTION guard_entry_append() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE creating_xid bigint;
BEGIN
 SELECT xmin::text::bigint INTO creating_xid FROM journal_entries WHERE id=NEW.entry_id;
 IF creating_xid <> (txid_current() % 4294967296) THEN RAISE EXCEPTION 'No se pueden añadir líneas a un asiento ya confirmado'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER no_append_to_posted_entry BEFORE INSERT ON journal_lines FOR EACH ROW EXECUTE FUNCTION guard_entry_append();

CREATE FUNCTION complete_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE payment payments;
BEGIN
 SELECT * INTO payment FROM payments WHERE id=NEW.id;
 IF NOT EXISTS (SELECT 1 FROM journal_entries WHERE payment_id=payment.id AND event='payment') THEN RAISE EXCEPTION 'El movimiento requiere su asiento contable'; END IF;
 IF payment.reversed_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM journal_entries WHERE payment_id=payment.id AND event='reversal') THEN RAISE EXCEPTION 'La reversión requiere su asiento contable'; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER payment_accounted AFTER INSERT OR UPDATE ON payments DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION complete_payment();

CREATE FUNCTION validate_credit_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original documents;
BEGIN
 IF NEW.kind='credit' THEN
   SELECT * INTO original FROM documents WHERE id=NEW.original_id FOR UPDATE;
   IF original.kind<>'invoice' OR original.status<>'issued' OR NEW.total<>original.total OR NEW.lines<>original.lines OR NEW.party<>original.party OR NEW.retention_rate<>original.retention_rate OR NEW.date<original.date THEN RAISE EXCEPTION 'La rectificativa total debe conservar los datos e importes de la factura original'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_credit BEFORE INSERT OR UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION validate_credit_document();
