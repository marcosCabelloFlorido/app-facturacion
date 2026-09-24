# Verificación del paquete

Comprobaciones realizadas el 18/09/2026 en un proyecto Docker independiente, con sus propios volúmenes y puerto 43819:

- Restauración completa desde el dump, con `pg_restore --exit-on-error`.
- Recuperación y hash de la clave de cifrado correctos.
- Arranque del servidor, PostgreSQL y servicio de acceso; `/api/health` devuelve 200 desde Windows.
- Instalador Windows ejecutado desde cero. La comprobación de identidad de imágenes se verificó también por plataforma y capas para admitir diferentes almacenes de Docker.
- Instalador Linux: sintaxis comprobada; no se ha ejecutado una instalación completa en un servidor Linux independiente.
- Dos negocios restaurados. Datos: 47 facturas, 37 presupuestos, 36 compras, 2 rectificativas y 40 adjuntos. Hash y tamaño correctos en todos los adjuntos. Ningún índice inválido.
- Consultas de facturas, presupuestos, compras, ficha de factura y adjuntos: HTTP 200. Descarga de PDF comprobada por su respuesta y formato.
- Los 13 archivos publicados de la interfaz coinciden byte a byte con `build/dist`.
- Los 158 archivos del punto visual preparado permanecen intactos en `interfaz-original`; los 146 archivos de su `src` coinciden con `codigo/src`.
- Apertura automatizada del visor en escritorio (1440 × 1000) y móvil (390 × 844): ficha de documento presente y sin diálogo modal; sin errores JavaScript ni peticiones API fallidas durante la apertura.
- Las capturas no se han revisado visualmente: la revisión automática bloqueó su visualización por posibles datos de clientes. La igualdad de los archivos y la estructura del visor sí se verificaron.

No se han modificado ni desplegado archivos de esta copia en la app que utiliza el puerto 3000. El entorno temporal de prueba se ha eliminado al terminar. Las sesiones temporales de comprobación solo existían en su base de datos y no están en el dump entregado.

Estas comprobaciones cubren el arranque, la conservación de la interfaz, la restauración y los recorridos citados. No constituyen una prueba exhaustiva de todas las operaciones de la aplicación ni de sus integraciones externas.