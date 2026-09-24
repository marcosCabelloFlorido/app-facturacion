# Facturación · copia completa con visor sin modal

Este paquete permite instalar una copia independiente. No hay que copiar archivos sobre la app existente.

## Estado conservado

- Interfaz exacta del punto `factura-vista-20260917-155547`, incluido en el ZIP visual `factura-sin-modal-preparada-20260918-091343`. No se ha recompilado ni modificado: se conservan sus archivos publicados.
- Servidor y dependencias de la imagen archivada del 17/09/2026 a las 20:40, comprobados con esa interfaz y la base restaurada.
- Datos actuales capturados el 18/09/2026 a las 09:22:45, hora de Madrid: usuarios, negocios, documentos, contactos, configuración y adjuntos. El ZIP visual original no tenía una base de datos histórica.
- Clave de cifrado y volumen privado necesarios para recuperar la configuración cifrada.

## Instalar en Windows

Necesitas Docker Desktop funcionando con contenedores Linux. Las imágenes y dependencias de la aplicación ya están incluidas; no hace falta instalar Node, pnpm o PostgreSQL.

1. Extrae todo el ZIP en una carpeta permanente.
2. Abre PowerShell en la carpeta que contiene este archivo.
3. Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\instalar.ps1 -ProjectName facturacion-sin-modal-mi-copia -Port 3800
```

4. Abre `http://127.0.0.1:3800` y entra con la cuenta y contraseña que usas en la aplicación.

El instalador comprueba la integridad, carga las imágenes, crea volúmenes nuevos, restaura los datos y arranca la copia. Rechaza proyectos que ya existan. Si el puerto 3800 está ocupado, utiliza otro con `-Port`.

## Instalar en Linux

Necesitas Docker Engine, el complemento Docker Compose v2 y las herramientas `sh` y `sha256sum`. La plataforma incluida es Linux x86_64 (`linux/amd64`); no se ha probado ARM.

Desde esta carpeta:

```sh
sh ./instalar.sh facturacion-sin-modal-mi-copia 3800
```

En un servidor remoto, puedes abrir la copia mediante un túnel SSH al puerto elegido. Por defecto solo escucha en la máquina donde la instales.

## Configuración y acceso desde Internet

`configuracion.env` contiene una contraseña nueva para esta base PostgreSQL. Puedes editarla antes de la primera instalación; utiliza una cadena aleatoria hexadecimal para no introducir caracteres especiales en la conexión. No la cambies después sin actualizar también la contraseña de PostgreSQL.

La configuración inicial abre el puerto 3800 en `127.0.0.1`. La red del servidor está aislada del exterior (`AISLAR_RED=true`) para que una copia de tus datos no envíe automáticamente correos que estuvieran en cola. Puedes consultar los datos, generar PDF y trabajar localmente.

Para una instalación operativa que necesite enviar correos o acceder a servicios externos, establece `AISLAR_RED=false` y recrea los servicios. Antes de activarlo, revisa las cuentas y la cola de correo de esta copia. No actives envíos de dos instalaciones simultáneas sobre los mismos documentos.

Para un dominio público, configura un proxy con HTTPS y `COOKIE_SECURE=true`. Si el proxy está en la misma máquina, conserva `BIND_ADDRESS=127.0.0.1`; utiliza `0.0.0.0` solo si necesitas recibir conexiones desde otro equipo y has configurado su acceso. El dominio, certificado HTTPS y las credenciales de servicios externos dependen del servidor de destino. El ZIP no los crea.

El paquete conserva la configuración funcional y fiscal existente. Completar la instalación no cambia esos modos ni activa integraciones nuevas.

## Parar y volver a arrancar

Utiliza siempre el mismo nombre de proyecto y puerto que elegiste. Desde la carpeta del paquete, por ejemplo para la instalación anterior:

```sh
docker compose -p facturacion-sin-modal-mi-copia --env-file configuracion.env -f compose.yaml stop
docker compose -p facturacion-sin-modal-mi-copia --env-file configuracion.env -f compose.yaml up -d --wait
```

Si elegiste otro puerto, cambia `HTTP_PORT` en `configuracion.env` a ese valor antes de volver a arrancar. Los instaladores guardan el nombre y puerto utilizados en `instalacion-local.json` (Windows) o `instalacion-local.env` (Linux).

No vuelvas a ejecutar el instalador para arrancar una copia existente: está diseñado para instalaciones nuevas. Mantén la carpeta extraída, porque el servicio de acceso monta `instalacion/acceso.mjs` desde ella. Los datos de trabajo quedan en los volúmenes Docker propios del proyecto; no se escriben dentro del ZIP. No borres sus volúmenes si quieres conservar los cambios posteriores.

## Contenido

- `imagenes/docker.tar`: imágenes del servidor, PostgreSQL y base del servidor. Incluyen el entorno de ejecución y todas sus dependencias.
- `datos/facturacion.dump`: copia PostgreSQL de todos los negocios de la base principal.
- `datos/volumen-privado.tar.gz`: clave y archivos privados persistentes.
- `build/dist`: interfaz publicada original, sin recompilar.
- `build/Dockerfile`: composición de la imagen portátil a partir del servidor archivado y la interfaz original.
- `codigo`: fuentes de la interfaz guardada y del servidor archivado. Son referencia; el despliegue usa las imágenes incluidas.
- `interfaz-original`: punto visual original intacto, incluidas sus notas históricas. Para instalar este paquete usa este LEEME y los instaladores de la raíz; no apliques las instrucciones históricas sobre la app existente.
- `manifest.json`: fechas, procedencia e identificadores de imágenes.
- `verificacion`: resultados de las comprobaciones.
- `SHA256SUMS.txt`: hashes de los archivos. Excluye la configuración editable y los archivos generados por una instalación.

El ZIP contiene datos de la aplicación y la clave que protege su configuración privada. Guárdalo como una copia de seguridad privada.