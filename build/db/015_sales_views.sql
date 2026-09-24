CREATE TABLE sales_views (
 id uuid PRIMARY KEY,
 owner_id uuid NOT NULL REFERENCES public.users(id),
 name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
 query jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX sales_views_owner_name ON sales_views(owner_id,lower(name));
