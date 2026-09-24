# Fuentes de referencia

`src`, `package.json` y `tsconfig.json` proceden de la copia visual original. `server`, `shared`, `db` y el archivo de bloqueo proceden de la imagen del servidor archivada. `build/runtime-package.json` conserva las dependencias del servidor incluido.

El despliegue reproducible se realiza con las imágenes exportadas en `imagenes/docker.tar`, sin recompilar. No se garantiza que reconstruir estas fuentes mixtas con una instalación nueva de dependencias produzca los mismos archivos: la interfaz original está preservada y comprobada en `build/dist` y en la imagen portátil.