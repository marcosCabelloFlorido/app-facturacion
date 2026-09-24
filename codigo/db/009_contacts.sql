CREATE TABLE contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL,
  tax_key text GENERATED ALWAYS AS (upper(regexp_replace(data->>'taxId', '[[:space:].-]', '', 'g'))) STORED NOT NULL,
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contacts_tax_key_unique UNIQUE (tax_key),
  CHECK (length(tax_key) BETWEEN 3 AND 30),
  CHECK (data->>'type' IN ('customer', 'supplier', 'both'))
);
CREATE INDEX contacts_name ON contacts (lower(data->>'name'), id);
