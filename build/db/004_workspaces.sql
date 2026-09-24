-- Workspace registry and membership; existing business data stays in public.
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name text UNIQUE NOT NULL CHECK(schema_name='public' OR schema_name ~ '^workspace_[a-f0-9]{32}$'),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  role text NOT NULL CHECK(role IN ('admin','operator','viewer')),
  PRIMARY KEY(workspace_id,user_id)
);
INSERT INTO public.workspaces(schema_name,name)
  SELECT 'public',data->>'name' FROM public.company WHERE id=1;
INSERT INTO public.workspace_members(workspace_id,user_id,role)
  SELECT w.id,u.id,u.role FROM public.workspaces w CROSS JOIN public.users u WHERE w.schema_name='public';
ALTER TABLE public.sessions ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id);
UPDATE public.sessions SET workspace_id=(SELECT id FROM public.workspaces WHERE schema_name='public');
