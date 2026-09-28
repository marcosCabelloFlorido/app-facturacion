# Arranca la app en local, sin Docker, contra la base de datos en Supabase.
# Requiere codigo/.env con DATABASE_URL apuntando a Supabase (ver CLAUDE.md).
Set-Location "$PSScriptRoot\codigo"
pnpm start
