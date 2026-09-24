# Factura anterior al modal: copia preparada, no aplicada

El usuario aclaró el 18/09/2026 que esta tarea solo debe preparar el punto de restauración. No aplicar esta copia ni cambiar la app salvo una nueva petición explícita.

Esta carpeta es una copia verificada de `factura-vista-20260917-155547`, capturada antes de convertir el visor de factura en modal. Contiene el código de referencia, la compilación servida, configuración de compilación, documentación visual y capturas. `inventario-verificado.json` registra los hashes de los archivos originales copiados y `manifest.json` identifica el origen y el estado preparado.

Para solicitarlo en el futuro: «Aplica el punto de restauración de factura sin modal».

Si llega esa petición, guardar primero el estado posterior y comparar los archivos del visor con los de esta copia. Restaurar únicamente la presentación de factura; conservar los cambios de otros módulos, el editor y todos los datos. No sobrescribir globalmente src ni el sistema visual. Coordinar cualquier cambio en archivos compartidos con las tareas activas antes de desplegar. Solo después de la petición y de la revisión, reconstruir y actualizar app y verificar el puerto 3000.

No contiene una copia de la base de datos ni sustituye los puntos generales del 14 y 15 de septiembre, la copia de Clientes o la copia original del 17. Es un punto visual específico.
