-- Global identities; membership state is local to each business.
ALTER TABLE public.workspace_members ADD COLUMN active boolean NOT NULL DEFAULT true;
ALTER TABLE public.workspace_members ADD COLUMN version integer NOT NULL DEFAULT 1;
ALTER TABLE public.sessions ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.sessions ADD CONSTRAINT session_id_unique UNIQUE(id);
ALTER TABLE public.sessions ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.sessions ADD COLUMN user_agent text NOT NULL DEFAULT '';
