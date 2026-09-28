-- Tokens de acceso para el servidor MCP (integraciones de IA), globales como sessions.
CREATE TABLE public.mcp_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX mcp_tokens_active ON public.mcp_tokens(token_hash) WHERE revoked_at IS NULL;
