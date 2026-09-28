-- Autorización OAuth 2.1 + PKCE para que cualquier cliente MCP (Claude, ChatGPT, etc.) pueda
-- conectarse con un flujo de "un clic" (registro dinámico + autorización) en vez de pegar un
-- token a mano. Los tokens emitidos por este flujo se guardan en mcp_tokens, como los manuales.
CREATE TABLE public.oauth_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_name text NOT NULL,
  redirect_uris jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.oauth_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash text NOT NULL UNIQUE,
  client_id text NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
CREATE INDEX oauth_codes_pending ON public.oauth_codes(code_hash) WHERE used_at IS NULL;
ALTER TABLE public.mcp_tokens ADD COLUMN oauth_client_id text REFERENCES public.oauth_clients(client_id);
