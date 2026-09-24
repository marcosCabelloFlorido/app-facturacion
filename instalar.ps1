param(
  [ValidatePattern('^facturacion-sin-modal-[a-z0-9-]+$')][string]$ProjectName = ('facturacion-sin-modal-' + (Get-Date -Format 'yyyyMMdd-HHmmss')),
  [ValidateRange(1024,65535)][int]$Port = 3800
)
$ErrorActionPreference = 'Stop'
function Check([string]$message) { if ($LASTEXITCODE -ne 0) { throw $message } }
$root = $PSScriptRoot
$manifest = Get-Content -Raw -LiteralPath (Join-Path $root 'manifest.json') | ConvertFrom-Json
foreach ($line in Get-Content -LiteralPath (Join-Path $root 'SHA256SUMS.txt')) {
  if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw 'Formato de integridad incorrecto.' }
  $expected=$Matches[1]; $relative=$Matches[2]
  $target=[IO.Path]::GetFullPath((Join-Path $root $relative))
  if (!$target.StartsWith($root+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera del paquete.' }
  if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expected) { throw ('Archivo dañado: '+$relative) }
}
$containers=@(docker ps -aq --filter ('label=com.docker.compose.project='+$ProjectName)); Check 'Docker no está disponible.'
$volumes=@(docker volume ls -q --filter ('label=com.docker.compose.project='+$ProjectName)); Check 'Docker no está disponible.'
if ($containers.Count -or $volumes.Count) { throw 'Ese proyecto ya existe. Elige otro nombre; no se sobrescriben datos.' }
$priorPort=$env:HTTP_PORT
$env:HTTP_PORT=[string]$Port
$composeArgs=@('compose','-p',$ProjectName,'--env-file',(Join-Path $root 'configuracion.env'),'-f',(Join-Path $root 'compose.yaml'))
try {
  docker image load -i (Join-Path $root 'imagenes/docker.tar'); Check 'No se pudieron cargar las imágenes.'
  foreach ($pair in @(@($manifest.appTag,$manifest.appFilesystemSignature),@($manifest.postgresTag,$manifest.postgresFilesystemSignature))) {
    $actual=(docker image inspect --format '{{.Os}}/{{.Architecture}} {{join .RootFS.Layers ","}}' $pair[0]).Trim(); Check 'Falta una imagen.'
    if ($actual -ne $pair[1]) { throw 'La imagen no coincide con el paquete.' }
  }
  & docker @composeArgs up -d --wait db; Check 'No se pudo iniciar PostgreSQL.'
  & docker @composeArgs cp (Join-Path $root 'datos/facturacion.dump') 'db:/tmp/paquete.dump'; Check 'No se pudo copiar la base.'
  & docker @composeArgs exec -T db pg_restore -U facturacion --no-owner --no-privileges --exit-on-error -d facturacion /tmp/paquete.dump; Check 'Falló la restauración en la base nueva.'
  & docker @composeArgs exec -T db rm -f /tmp/paquete.dump; Check 'No se pudo retirar el temporal.'
  $mount=(Join-Path $root 'datos')+':/respaldo:ro'
  & docker @composeArgs run --rm --no-deps --user 0 --entrypoint tar -v $mount app -xzf /respaldo/volumen-privado.tar.gz -C /app/private; Check 'No se pudo recuperar la clave.'
  $keyHash=((& docker @composeArgs run --rm --no-deps --entrypoint sha256sum app /app/private/encryption.key) -split '\s+')[0]; Check 'No se pudo comprobar la clave.'
  if ($keyHash -ne $manifest.privateKeySha256) { throw 'La clave no coincide.' }
  & docker @composeArgs up -d --wait app acceso; Check 'La app no ha iniciado correctamente.'
  (Invoke-WebRequest -UseBasicParsing -Uri ('http://127.0.0.1:'+$Port+'/api/health') -TimeoutSec 15).StatusCode | Out-Null
  [ordered]@{projectName=$ProjectName;port=$Port;installedAt=(Get-Date).ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $root 'instalacion-local.json') -Encoding utf8
  Write-Output ('Disponible en http://127.0.0.1:'+ $Port)
  Write-Output ('Proyecto independiente: '+$ProjectName)
} finally { $env:HTTP_PORT=$priorPort }
