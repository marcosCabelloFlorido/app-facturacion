# Restaurar la vista de factura anterior al modal

Copia visual anterior a la conversión de la ficha de factura en modal. Incluye src, sistema visual, configuración de compilación y dist servido.

Restauración selectiva: comparar src/documents.tsx y los archivos nuevos del modal con esta copia; retirar únicamente la integración del modal y su CSS. Conservar los cambios posteriores de otras secciones y todos los datos. Las copias de src y del sistema visual son referencias, no sobrescribirlas globalmente. Preservar primero el estado posterior. Reconstruir únicamente app con docker compose build app y docker compose up -d --no-deps --wait app; comprobar puerto 3000.

Esta copia no sustituye ni redefine los puntos generales de restauración ni la copia de Clientes.
