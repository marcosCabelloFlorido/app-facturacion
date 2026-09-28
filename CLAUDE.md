# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Habla siempre en español, toda la documentación que añadas debe de ser en español.

## Modo de uso actual: local sin Docker, DB en Supabase

Desde 2026-09-28 esta copia se ejecuta **en local, sin Docker**, con la base de datos en Supabase (proyecto `facturacion`, ref `mmrwaadhypxrmfyxppue`, región `eu-west-1`) en vez de en el contenedor `db`.

- **Arrancar**: `.\arrancar.ps1` desde la raíz del repo (hace `cd codigo && pnpm start`). Sirve API + SPA compilada en `http://127.0.0.1:3000`.
- **Config**: `codigo/.env` (no versionado, en `.gitignore`) tiene `DATABASE_URL` apuntando al *connection pooler* de Supabase (puerto 5432, sesión) — el connection directo (IPv6) puede fallar según el router de casa, por eso se usa el pooler.
- **Clave de cifrado**: `codigo/.local/encryption.key` (no versionada) — es la misma clave que usaba el volumen Docker `privado`, copiada una vez con `docker cp` para poder seguir descifrando SMTP/config guardados antes de la migración. Si se borra, se genera una nueva automáticamente pero se pierde acceso a lo cifrado con la anterior.
- **Docker sigue instalado como respaldo**: los contenedores originales (`facturacion-sin-modal-v1-*`) están parados (`docker compose ... stop`) pero sus volúmenes (`datos`, `privado`) no se han borrado — sirven de copia de seguridad de la base de datos y la clave, por si hiciera falta comparar o recuperar algo. El resto de este documento (`imagenes/docker.tar`, `compose.yaml`, `instalar.ps1`/`.sh`, `manifest.json`) describe ese modo antiguo/de distribución, que ya no es el flujo principal de uso diario pero se mantiene para poder empaquetar copias portables a terceros.

## Qué es este repo

Copia portable empaquetada de "kronjop-facturacion" (app de facturación): imágenes Docker + volcado de base de datos + scripts de instalación, pensada para ejecutarse sin recompilar. No es un repo fuente normal donde se hace `npm run build` y se despliega: el despliegue aquí es levantar contenedores Docker desde imágenes ya construidas (`imagenes/docker.tar`, referenciadas en `manifest.json` y `compose.yaml`). El código fuente está presente como referencia/edición, pero cambiar `codigo/` NO reconstruye automáticamente los contenedores en marcha.

Dos árboles de código contienen la misma app en distintos puntos:
- `codigo/` — fuente completa (frontend + backend + shared), incluye `node_modules` (pnpm). Este es el que se edita.
- `build/` — los `dist/`, `server/`, `shared/`, `db/` exactos horneados en la imagen Docker actual (`build/Dockerfile` los copia sobre la imagen base archivada). Tratar `build/` como snapshot de artefacto, no como lugar para editar a mano.
- `interfaz-original/` — checkpoint histórico del frontend, solo de referencia; sus instrucciones de instalación propias no aplican a este paquete.

## Comandos (dentro de `codigo/`)

```sh
pnpm install          # deps ya están en node_modules, pero este es el gestor
pnpm dev              # concurrently: API (tsx watch server/index.ts) + Vite frontend en 127.0.0.1
pnpm build            # tsc --noEmit && vite build
pnpm start            # solo servidor: tsx server/index.ts
pnpm check            # tsc --noEmit (solo typecheck)
pnpm test             # tsx --test tests/*.test.ts
pnpm db:migrate       # tsx server/migrate.ts
pnpm format           # prettier --write src server shared tests package.json tsconfig.json vite.config.ts compose.yaml
```

Ejecutar un solo test: `tsx --test tests/<nombre>.test.ts`.

Requiere Postgres accesible vía `DATABASE_URL` (ver servicio `db` en compose) y `APP_ENCRYPTION_KEY_FILE` (por defecto `.local/encryption.key` si no está definido, ver `server/index.ts`).

## Ejecutar la app empaquetada (raíz del repo, no `codigo/`)

```powershell
powershell -ExecutionPolicy Bypass -File .\instalar.ps1 -ProjectName <nombre> -Port 3800   # instalación inicial (Windows)
```
```sh
sh ./instalar.sh <nombre> 3800   # instalación inicial (Linux)
```
Reiniciar instalación existente (no volver a ejecutar el instalador para esto):
```sh
docker compose -p <nombre> --env-file configuracion.env -f compose.yaml stop
docker compose -p <nombre> --env-file configuracion.env -f compose.yaml up -d --wait
```

## Arquitectura

Stack de 3 servicios en Docker Compose (`compose.yaml`):
- `db` — Postgres, imagen `facturacion-portable:postgres-*`, datos en volumen `datos`.
- `app` — servidor Fastify que sirve API y SPA compilada (`dist/`), imagen `facturacion-portable:sin-modal-*`. Sin puerto publicado. Lee `DATABASE_URL`, clave de cifrado desde `/app/private` (volumen `privado`).
- `acceso` — proxy HTTP inverso delgado en Node (`instalacion/acceso.mjs`) que reenvía todo a `app:3000`; es el único servicio con puerto publicado (`HTTP_PORT`, por defecto 3800, en `BIND_ADDRESS`, por defecto `127.0.0.1`). Esta indirección permite auditar/cambiar el punto de entrada sin tocar la imagen de la app. `acceso` monta `instalacion/acceso.mjs` desde la carpeta extraída en tiempo de ejecución — no mover/borrar ese archivo respecto a `compose.yaml`.

Aislamiento de red: `AISLAR_RED=true` (por defecto) hace la red por defecto `internal`, así los contenedores `app`/`db` no llegan a internet (correos en cola no se envían). Poner `AISLAR_RED=false` y recrear servicios para permitir salida (p.ej. envío real de correo).

### Backend (`codigo/server/`)
App Fastify, entrada `server/index.ts`: carga `.env`, inicializa secretos (`secrets.ts`), corre migraciones (`migrate.ts`) contra `db/*.sql` (numeradas, secuenciales — ver `build/db/001_core.sql` … `021_profile_second_surname.sql` para el historial del esquema actual), construye la instancia Fastify (`app.ts`), arranca a escuchar, luego arranca un worker de correo en background (`mail-worker.ts`). Cada área de dominio es su propio archivo en la raíz de `server/` (p.ej. `contacts.ts`, `document-list.ts`, `finance.ts`, `imports.ts`, `pdf.ts`, `templates.ts`, `workspaces.ts`) en vez de carpetas anidadas — buscar el archivo que coincida con el dominio, no una carpeta.

### Shared (`codigo/shared/`)
Lógica/tipos puros usados por servidor y frontend (validación, formateo, cálculos de dominio — p.ej. `domain.ts`, `nif.ts`, `iban.ts`, `document-tax-breakdown.ts`, `sales-tools.ts`). Al cambiar reglas de negocio que afectan tanto respuestas de API como UI, revisar aquí primero — duplicar lógica en `src/` en vez de importar de `shared/` es el error habitual a evitar.

### Frontend (`codigo/src/`)
SPA React 19 + Vite, estructura plana (sin anidamiento profundo): un componente `PascalCase.tsx` por archivo, emparejado con un `.css` del mismo nombre cuando tiene estilos propios (p.ej. `Contacts.tsx` + `contacts.css`). `design-system.css` y `feature-designs.ts`/`feature-designs.css` tienen tokens/patrones de diseño compartidos — revisar antes de introducir nuevos patrones visuales. Ruteo/composición de páginas vive en `pages.tsx` / `App.tsx`. Usa `react-aria-components` para primitivas accesibles, `gsap` para animación, `lucide-react` para iconos.

## Notas específicas de esta copia empaquetada

- `configuracion.env` está commiteado con contraseña real de Postgres (intencional según `LEEME.md` — "para que la app funcione lista para usar al clonar"). Asunción de repo privado; no tratarlo como secreto filtrado a redactar, pero tampoco copiar este patrón a otros repos.
- `manifest.json` registra procedencia exacta (digests de imágenes, checkpoint fuente, timestamp de captura de datos) de este paquete — útil para confirmar qué snapshot de frontend/backend está realmente corriendo, ya que `build/` puede desincronizarse de `codigo/` si alguien edita fuente sin reconstruir la imagen.

## Reconstrucción tras editar `codigo/`

**Modo local actual (Docker parado, uso diario)**: no hace falta nada de Docker. Basta con:
- `pnpm dev` (recarga en caliente, frontend y backend), o
- `pnpm build` seguido de reiniciar `.\arrancar.ps1` si se quiere probar el build de producción servido por Fastify.

Si `pnpm build`/`tsc` falla por errores preexistentes no relacionados con el cambio en curso, está bien corregirlos si son triviales (p.ej. una clave de objeto que falta); si el error es más profundo, avisar al usuario antes de tocar código no relacionado.

**Modo empaquetado/distribución (solo si se pide generar una copia portable en Docker para otra máquina)**: hay que dejar la imagen Docker reflejando el cambio:

1. `pnpm build` dentro de `codigo/` (o `tsc --noEmit` + `vite build` vía los binarios de `node_modules/.bin` si `pnpm` falla por la política de `minimumReleaseAge` del lockfile).
2. Sincronizar los artefactos generados a `build/` (sobrescribir `build/dist`, `build/server`, `build/shared`, `build/db` con las copias de `codigo/`).
3. Reconstruir la imagen Docker con el mismo tag que usa `compose.yaml` (ver `image:` de `app`/`acceso`, p.ej. `docker build -t facturacion-portable:sin-modal-20260918-092100 -f build/Dockerfile build/`).
4. Recrear los servicios `app` y `acceso` para que tomen la imagen nueva: `docker compose -p <nombre-del-proyecto> --env-file configuracion.env -f compose.yaml up -d --force-recreate --no-deps app acceso`.

Esto solo aplica cuando se está trabajando explícitamente en el paquete portable (ver "Modo de uso actual" arriba), no en el flujo normal de desarrollo local.

## Agente frontend

Existe subagente `frontend-minimal` (`.claude/agents/frontend-minimal.md`, modelo Sonnet 5, esfuerzo medio) para tareas de maquetado/UI: fuerza estilo minimalista blanco y negro, bordes redondeados, alta usabilidad. Usarlo para trabajo de frontend en vez de editar estilos directo.
