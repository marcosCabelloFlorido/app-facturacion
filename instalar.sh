#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT="${1:-facturacion-sin-modal-$(date +%Y%m%d-%H%M%S)}"
HTTP_PORT="${2:-3800}"
export HTTP_PORT
case "$PROJECT" in facturacion-sin-modal-*) ;; *) echo 'El proyecto debe empezar por facturacion-sin-modal-'; exit 1;; esac
case "$PROJECT" in *[!a-z0-9-]*) echo 'Nombre de proyecto no válido'; exit 1;; esac
case "$HTTP_PORT" in *[!0-9]*|'') echo 'Puerto no válido'; exit 1;; esac
[ "$HTTP_PORT" -ge 1024 ] && [ "$HTTP_PORT" -le 65535 ] || exit 1
cd "$ROOT"
sha256sum -c --status SHA256SUMS.txt
docker info >/dev/null
[ -z "$(docker ps -aq --filter "label=com.docker.compose.project=$PROJECT")" ] || { echo 'El proyecto ya existe'; exit 1; }
[ -z "$(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT")" ] || { echo 'Los datos del proyecto ya existen'; exit 1; }
compose() { docker compose -p "$PROJECT" --env-file "$ROOT/configuracion.env" -f "$ROOT/compose.yaml" "$@"; }
docker image load -i "$ROOT/imagenes/docker.tar"
[ "$(docker image inspect --format '{{.Os}}/{{.Architecture}} {{join .RootFS.Layers ","}}' facturacion-portable:sin-modal-20260918-092100)" = 'linux/amd64 sha256:34884abbe92863fce933ed7c39c0e045631af0ed86d5cc0dfbdf9fdca426ce3c,sha256:4d247cf2080a3351fd5a457bbe8322834cbc76afa87fccf0dc797ce91ef995e9,sha256:2f761960891e55cf9bf0b57d70b00e8538841f709ef66b6ca6e2d44dcec312d9,sha256:8ddc5e0463d19319bdf5a32a5b1e2dd45792c77f3e2d47f748e220d57ca5a853,sha256:a878913119a0168512d0fea4c9e0913de1bce251449cede359fbfc70a680477f,sha256:a48f745c84c8f635fbdfa4338fb937e358b882961cd26bf799735368e342ce0a,sha256:28abd7f99c21f68905a7267e94e4228b8205bafbaf1fb6d366999e4031275fdc,sha256:cc1bae74443758a5a0c6c5b1d254720707ac2ad8e61eed180272ff265d75cfdc,sha256:ea4911dd51dc79103c1e59c619601cba2eb466a288ee4de7e71bcec12d0c6b58,sha256:d0cfcad5de1566a2bbcbe6b7ab67caaf73c278a96f598e79c266d487c0548d13,sha256:f9d2be911e5d76ee375368e077f43d1e850fba4e9d4c9e5b9e0dcfa1f31812d3,sha256:04b2c0f211b8be21e6a334168ac65070a1af359684603cb72ffd1dc348144fa2,sha256:c1e02660689ba34f7a0bc0fe82ae5d72329c0c8949a2d5c38e8f951c5d921d45,sha256:21d84a5070bd936ce36c01b2f47fb98a0efa558c4f01b9763c0f587878a62938' ]
[ "$(docker image inspect --format '{{.Os}}/{{.Architecture}} {{join .RootFS.Layers ","}}' facturacion-portable:postgres-20260918-092100)" = 'linux/amd64 sha256:34884abbe92863fce933ed7c39c0e045631af0ed86d5cc0dfbdf9fdca426ce3c,sha256:e5e448e5ad445a46af63fef09fb6ed3a99165ad6fc85946546e24ca0e6b8a5a4,sha256:e64ed932fbeb1283dc125f8083317ffc4dfd0f65493b937e54a8e7f7ee0ed31e,sha256:bbb3a19e120c236b81d19b367730201efd613240b2d998b315ce681b599afebe,sha256:1e74e3081df40556dc6a8ae195ebda8365b97b9974e6d1bb8deb302048fe93ea,sha256:7d7ad4753cf935190966b60894b4c1083d98b177f1730a0f5cdc491c2eca61e5,sha256:77d620d0c07cbfd3db733544add57587916e1e7dd3946ecdc4129ba7eccdd404,sha256:4f7a295ea45a171c932bf6347ffb0be1d0c6e744713751c9fd4aaaccc26c361b,sha256:e48b2bdc78e71baf8ad50548ad745be7512e77340c8056118449f0a83bbda601,sha256:aa28d005217b3acc29759a94f0e031a5b4cd8bb198d27b535850ca0b49e01f7e,sha256:6d437def03148555cd80549696fafe17a0f458d8971e5dcef73c683b08f8a76e' ]
compose up -d --wait db
compose cp "$ROOT/datos/facturacion.dump" db:/tmp/paquete.dump
compose exec -T db pg_restore -U facturacion --no-owner --no-privileges --exit-on-error -d facturacion /tmp/paquete.dump
compose exec -T db rm -f /tmp/paquete.dump
compose run --rm --no-deps --user 0 --entrypoint tar -v "$ROOT/datos:/respaldo:ro" app -xzf /respaldo/volumen-privado.tar.gz -C /app/private
KEY_HASH=$(compose run --rm --no-deps --entrypoint sha256sum app /app/private/encryption.key | awk '{print $1}')
[ "$KEY_HASH" = '8432da4756af64c0a6b24c54f7704ff4b1cbce94c8e4a96111083c90aebe504b' ]
compose up -d --wait app acceso
compose exec -T acceso node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
printf 'PROJECT=%s\nHTTP_PORT=%s\n' "$PROJECT" "$HTTP_PORT" > instalacion-local.env
printf 'Disponible en http://127.0.0.1:%s\nProyecto: %s\n' "$HTTP_PORT" "$PROJECT"
