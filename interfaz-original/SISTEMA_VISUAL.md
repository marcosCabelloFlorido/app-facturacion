# Sistema visual de Facturación · base CronJob/Kronjop

## Referencia actualizada · 14 de septiembre de 2026

Por petición del usuario, **Kronjop × Ley IA · Design System 4.1.0** es la referencia de kit para futuros trabajos visuales. La copia íntegra está en [kronjop-leyia-design-kit](kronjop-leyia-design-kit/README.md): [catálogo](kronjop-leyia-design-kit/index.html), [decisiones](kronjop-leyia-design-kit/fusion/DECISIONES.md), [tokens](kronjop-leyia-design-kit/fusion/tokens.json) e [implementación](kronjop-leyia-design-kit/fusion/IMPLEMENTACION.md). `design-kit/` conserva el kit v2 como referencia histórica de los componentes adaptados.

Se mantienen las instrucciones actuales del usuario y las adaptaciones aprobadas de Facturación descritas en este documento. El nuevo kit conserva Inter Variable, paleta neutra, radio cero, navegación de 272 px y cabecera negra de 130 px. Aporta criterios de legibilidad y documentación: texto esencial mínimo de 12 px, espacios de 4/8/12/16/24 px, controles de 36–40 px y áreas táctiles de 44 px. Su cuerpo propuesto de 14 px no sustituye automáticamente los 13 px ni los pesos 400/500/600 aprobados aquí. El tema oscuro, pestañas, navegación móvil y separadores de sus propuestas tampoco reemplazan las decisiones vigentes por incorporar el kit.

Consultar la composición, componente y procedencia antes de extender la interfaz. Reutilizar `src/design-system.css` y los componentes comunes; mantener la prioridad del espacio y la jerarquía sobre líneas y cajas. Conservar etiquetas, foco visible, Escape, movimiento reducido y desplazamiento local de tablas cuando proceda. No importar globalmente el CSS ni las operaciones simuladas del catálogo.

El [alcance del kit](kronjop-leyia-design-kit/fusion/ALCANCE-PRODUCCION.md) distingue seis referencias de Kronjop renderizadas con datos sintéticos desde un bundle contrastado, siete referencias locales de Ley IA y catorce composiciones propuestas. No atribuir a producción las propuestas ni los módulos no habilitados. Esta incorporación documental no modifica las pantallas actuales.

## Criterio vigente · 12 de septiembre de 2026

La petición vigente exige aplicar la misma base del kit a toda la aplicación, con esquinas rectas en todos los elementos. Sustituye las anteriores excepciones de botones de 6 px y ventanas de 10 px, las cabeceras compuestas por una barra global y un título separado, y la propuesta documentada en `REDISENO_MINIMALISTA.md`. Esa propuesta queda como registro histórico, no como referencia para nuevos cambios.

La base original de los componentes adaptados es [design-kit/SKILL.md](design-kit/SKILL.md), con sus componentes, tokens y seis plantillas conservados sin modificaciones. La grafía de marca en esos archivos es **kronjop.**. Este documento registra cómo se aplican esos componentes al módulo financiero; no sustituye al kit.

## Base común

### Validación de NIF españoles · 16 de septiembre de 2026

El DNI limita su entrada a ocho números y una letra en el buscador compartido y en la ficha. Rechaza el noveno número y las letras adicionales, también al pegar, conservando el valor previo y mostrando «El DNI debe tener 8 números y una letra». No recorta ni corrige silenciosamente el identificador. Las búsquedas por nombre y los formatos NIE y NIF de entidades se conservan; el guardado continúa comprobando el carácter de control.

Por petición del usuario, las búsquedas compartidas de clientes y proveedores y el alta y edición de fichas admiten únicamente NIF españoles. `shared/nif.ts` comprueba formato y carácter de control de DNI, NIE, NIF especiales K/L/M y entidades. Normaliza minúsculas, espacios, puntos, guiones y el prefijo ES. No equivale a comprobar el alta censal en AEAT.

El buscador común de facturas, presupuestos, compras, anticipos y alta de contactos conserva nombres y fragmentos desde tres caracteres. Un NIF completo incorrecto muestra un error en el campo y no abre el alta ni selecciona una ficha. Las fichas antiguas con NIF incorrecto se pueden consultar y corregir desde el directorio. El formulario y la API rechazan altas y ediciones con NIF inválido; la consulta exacta del servidor también lo valida. Los errores de guardado conservan los datos y enfocan el campo correspondiente. Los documentos ya guardados no se modifican.


- `src/design-system.css` contiene la tipografía, paleta, pesos, controles, estados y dimensiones comunes. Se importa al final de `src/main.tsx`. Las hojas de módulo contienen disposición y adaptación, sin escalas tipográficas locales ni tamaños en línea.
- Inter Variable, pesos 400, 500 y 600. Texto normal de 13 px, metadatos de 12 px, títulos de página de 20 px en escritorio y 17 px en móvil, secciones de 18 px, subtítulos y títulos de ventanas de 16 px. Los campos pasan a 16 px en móvil.
- El saludo usa 32 px en escritorio y 30 px en móvil. Los indicadores generales usan 30 px en escritorio y 22 px cuando se estrecha el contenido; los saldos destacados usan 26/22 px y los totales de documento 20 px. Los valores se expresan en `rem` y respetan la escala del navegador.
- Cifras tabulares, con la misma familia que el texto. Código monoespaciado solo para huellas de archivo y contenido técnico.
- Fondo blanco, superficies neutras, navegación y cabeceras negras. Bordes comunes al 8 % y controles al 16 % de negro. Texto secundario `#6b7280` para mantener legibles las ayudas y referencias.
- **Radio cero sin excepciones:** botones, inputs, selectores, avatares, menús, etiquetas, ventanas y pseudo-elementos. Las declaraciones locales y las variables tienen valor cero; la regla global impide que los portales o componentes nuevos recuperen curvas.

## Navegación y cabeceras

### Estudios dentro de Configuración · 16 de septiembre de 2026

Por petición del usuario, el selector de estudios deja el menú lateral y se integra como sección Estudios de Configuración, en `#settings/workspaces`. Reutiliza SectionNavigation en escritorio y móvil. La lista se muestra dentro de la página, con filas sin borde y una marca para el estudio actual; elegir otro conserva el cambio de contexto, permisos y regreso a Visión general. Añadir estudio se abre desde el menú de la cabecera y reutiliza los campos y la creación existentes. La búsqueda de acciones incluye esta sección. Los usuarios conservan el acceso a sus estudios según las pertenencias activas, también desde el modo integrado.


- La navegación sigue `02-sidebar.md`: ancho de 272 px, filas de 44 px, selección a todo el ancho y marca de 2 px en el extremo izquierdo. El contenido principal tiene un máximo de 1280 px, con 34 px arriba y 40 px a los lados.
- Por petición posterior del 14 de septiembre de 2026, la barra lateral añade hasta 8 px entre opciones y 24 px entre grupos. El espaciado responde a la altura disponible mediante `--sidebar-spacing`: se reduce gradualmente en pantallas bajas, conservando filas de 44 px y la cuenta al pie. Los márgenes de marca, negocio y títulos siguen esa misma adaptación, sin añadir divisores. Verificado sin scroll horizontal ni vertical en 1440 × 900, 1366 × 768, 1024 × 600, 390 × 844 y 320 × 568.
- Por petición del 14 de septiembre de 2026, el menú lateral contiene Gestión y Análisis; se retiran el grupo Sistema y la Guía de uso con su ventana. Configuración se abre desde el icono situado junto a Cerrar sesión, en la fila inferior de la cuenta. Ambos controles tienen un objetivo de 44 px, nombre accesible, ayuda al pasar el cursor y foco visible; Configuración señala su estado activo. En móvil se accede desde el mismo pie del menú desplegado.
- `PageHeading` representa la cabecera completa de `03-module-header.md`: mínimo 130 px, relleno 24/32 px, título y herramientas dentro de la superficie negra. No existe una barra global adicional que duplique esta cabecera. Por petición del 14 de septiembre de 2026, ninguna pantalla muestra rutas del tipo «Inicio › Facturas de venta › Crear». La cabecera empieza por el título, sin reservar una fila vacía para esa ruta.
- Por petición del 14 de septiembre de 2026, las cabeceras tampoco muestran flechas ni botones de regreso. La navegación entre apartados y el regreso a sus listados se realizan desde el menú lateral, disponible en móvil mediante «Mostrar menú». Este criterio se aplica a fichas, editores y detalles de Visión general. Los controles de pasos de formulario y paginación mantienen su función dentro del contenido.
- En móvil la cabecera reserva al menos 140 px; el título ocupa su propia fila y las herramientas se alinean debajo. Los textos pueden aumentar la altura. La página usa márgenes de 16 px y espacio superior para el botón de navegación.
- Por petición del 14 de septiembre de 2026, las acciones de creación de cada sección se muestran dentro de su menú «…», como en Visión general. `PageHeading` incorpora `primaryAction` como primera opción de `ActionsMenu`, sin duplicarla si ya está declarada y respetando los permisos de creación. La cabecera no muestra un botón «+» adicional. Facturas, presupuestos, compras, clientes y catálogo conservan sus acciones y formularios correspondientes. Las acciones secundarias comparten ese menú. En los listados de Gestión, la búsqueda propia también se abre desde ese menú; Visión general y los demás módulos conservan su herramienta de búsqueda de acciones. En Cobros y pagos, «Registrar cobro o pago» abre el formulario existente para aplicar un movimiento a una o varias facturas.
- Los listados conservan `Select` para Estado y Vista. En facturas, presupuestos y compras, Estado se filtra desde su encabezado de tabla, con texto y una flecha pequeña, sin selector adicional en la barra de búsqueda. Las páginas con secciones persistentes usan `SectionNavigation`: aside de 200 px con marca de selección a la derecha y selector móvil por debajo de 760 px de contenido. No crear una navegación alternativa por módulo.

## Composición de las pantallas

Visión general usa la bienvenida de `12-greeting-card.md`: por petición posterior del 14 de septiembre de 2026, su cabecera se compacta a una altura mínima de 220 px en escritorio y 180 px en móvil, con relleno vertical de 32/24 px e interior horizontal de 28/20 px. La altura puede crecer con el texto. Conserva la escala del saludo, sin fecha encima. La búsqueda y el menú «…» se sitúan arriba a la derecha; en móvil preceden al saludo para que el texto conserve todo el ancho. La textura de estrellas es estática. Los cuatro indicadores siguen `11-stat-tile.md`: importe antes de la etiqueta, alineación centrada y separadores verticales en escritorio; etiqueta antes del importe y alineación izquierda en móvil. Cada cifra abre los documentos que la explican. «Evolución y actividad» se abre desde el menú «…» de la cabecera, sin repetir el enlace debajo de los indicadores. Esa vista conserva la evolución, los vencimientos y la actividad.

Por petición posterior del 14 de septiembre de 2026, «Facturación del mes» de Visión general abre `#sales?view=list&metric=month&asOf=…`, el mismo listado que «Facturado este mes» de Facturas de venta. Conserva la fecha de corte del indicador y entra desde la primera página, sin heredar búsquedas ni otros filtros. Se reutilizan la tabla, las herramientas y la selección del menú lateral de ventas; este acceso deja de abrir el detalle independiente `#overview/revenue`. Los otros indicadores y la presentación del dashboard conservan su comportamiento.

Por petición del 14 de septiembre de 2026, el segundo indicador de Visión general pasa de «Pendiente de cobro» a «Presupuestos pendientes». Muestra el importe total de los presupuestos confirmados, vigentes y sin respuesta, con el mismo criterio que «Pendientes de respuesta» en Presupuestos; excluye borradores, caducados, aceptados, rechazados y convertidos. Abre `#overview/quotes` con la fecha de corte y los documentos que suman ese total. Mantiene la composición y los tamaños existentes. La búsqueda de «Pendiente de cobro» dirige al indicador de Facturas de venta.

Verificado en 1440, 390 y 320 px con datos de demostración: total y detalle coincidentes, apertura por teclado, enlace al documento, recarga y conservación del indicador de ventas. Capturas y resultados en [revision-overview-presupuestos](revision-overview-presupuestos/verificacion.json).

Configuración sigue `04-section-layout.md` y `10-setting-row.md`. Empresa, facturación y seguridad usan filas de etiqueta/valor, separación de 32 px y relleno de 14/20 px. Las filas pasan a una columna cuando el contenido no tiene espacio. Series, requisitos del comprador y permisos comparten la misma sección y sus ventanas. El alta de una serie y de una cuenta contable se abre con una acción explícita, sin mantener un formulario vacío encima del listado.

Importaciones forma parte de Configuración mediante `SectionNavigation`, tanto en el aside de escritorio como en el selector móvil. Su ruta es `#settings/imports`; el acceso antiguo `#imports` abre esa misma composición. La búsqueda de acciones apunta a la nueva ruta. Solo aparece la cabecera negra de Configuración, con el título de sección Importaciones dentro del contenido. Preparación, carga, relación de columnas, revisión de lotes e historial reutilizan el componente existente y sus permisos; los usuarios de consulta acceden al historial. El selector Vista cambia entre preparación e historial. Las secciones de Configuración conservan su selección en la ruta para permitir recarga y navegación del navegador.

Las fichas de documentos reutilizan esa navegación de secciones: Resumen, Vencimientos cuando procede, Archivos adjuntos y Movimientos e historial. Por elección del 14 de septiembre de 2026, `DocumentSheet` aplica la propuesta «Lectura guiada» a facturas, presupuestos, compras/gastos y rectificativas. La hoja blanca sobre superficie neutra conserva un máximo de 860 px, márgenes interiores y ausencia de borde o sombra; su altura se ajusta al contenido, sin reservar una página A4 vacía. El nombre del emisor abre la hoja. Debajo, cliente a la izquierda y fechas a la derecha forman una única fila. No se repiten el tipo de documento, el número ni «Borrador»; la cabecera de navegación conserva su título sin repetir cliente y fecha.

Por petición posterior del 14 de septiembre de 2026, la cabecera negra de la ficha de facturas de venta utiliza el nombre del cliente como título. Debajo muestra el primer producto o servicio facturado en los 13 px comunes y, en otra línea de 12 px, «Vencimiento · DD/MM/AAAA». Si hay más conceptos, el primero lleva el recuento «+n conceptos»; la hoja conserva todos los detalles. La cabecera reutiliza `PageHeading.description` y la nueva propiedad común `metadata`, basada en `03-module-header.md` (AbsencesModule.tsx:2865–2880), con color secundario sobre negro. Los textos pueden envolver y ampliar la altura, también en móvil, sin invadir las herramientas. La cabecera se conserva en todas las secciones de la factura y también en borradores, con sus acciones y estado existentes. El número permanece en los listados y el PDF; presupuestos, compras y rectificativas mantienen sus cabeceras. Esta petición sustituye para facturas la decisión anterior de no repetir cliente ni vencimiento en la cabecera. Verificado en el puerto 3000 a 1440, 390 y 320 px, incluidos textos largos, varios conceptos, borradores, permisos de consulta, navegación de secciones, recarga y menú por teclado. Capturas y resultados en [revision-cabecera-factura-cliente](revision-cabecera-factura-cliente/verificacion.json).

La jerarquía usa los tokens comunes de `src/design-system.css`: emisor de 30 px y peso 500 (26 px en móvil), cliente de 16 px, conceptos de 18 px y peso 500, cuerpo de 13 px y metadatos de 12 px. Emisión y Vencimiento (Válido hasta en presupuestos) mantienen dos pequeñas columnas, etiqueta sobre fecha DD/MM/AAAA, con elementos `time` y peso 500. Operación distinta, referencias de compras y «Rectifica a» aparecen debajo cuando corresponden. Facturas de venta y presupuestos omiten la referencia guardada en esta vista; su edición se conserva.

Los conceptos se leen en una lista vertical, sin tabla, numeración visible, separadores ni cajas por servicio. Cada descripción precede a cantidad × precio unitario e importe antes de descuento. Los descuentos aparecen solo cuando existen, con porcentaje y reducción en euros; esta reducción concilia los importes visibles con el neto guardado. Se conservan hasta cuatro decimales del precio unitario y la cantidad. Si hay varios conceptos, cada uno muestra su tipo de IVA y solo añade otra fila de importe neto cuando tiene descuento, evitando repetir cantidades iguales. Con uno solo, esa información se presenta una vez en los totales. Las exenciones se muestran junto a su concepto. El resumen alinea base imponible, IVA agrupado por tipo y retención cuando existe; el IVA suma los importes guardados por línea para respetar su redondeo original. `DocumentTotals` admite ese desglose sin cambiar la presentación del editor. El único total destacado usa 20 px en una franja neutra a todo el ancho. En móvil, los importes excepcionalmente largos pasan a los tokens de 16 o 13 px según su longitud para conservar la cifra completa. Las rectificativas conservan la indicación de su efecto económico negativo. No se añaden notas, agradecimientos ni texto explicativo al pie; las notas guardadas mantienen su edición y su inclusión en el PDF. Esta adaptación corresponde a la vista de la ficha; la exportación PDF conserva su plantilla.

La gestión queda encima de la hoja con estado, saldo cuando existe y acciones disponibles. Por petición posterior del 14 de septiembre, solo las facturas de venta en borrador sustituyen la lupa de la cabecera por «Editar borrador» con lápiz, reutilizando el botón `dark-ghost` de `05-button.md`; esa acción se retira del menú y respeta los permisos de consulta. Su estado «Borrador» se traslada a la esquina inferior derecha de la cabecera negra mediante `PageHeading.status`, sin recuadro adicional, con el cuadrado de estado, texto de 12 px y color `--on-dark-muted`. Se mantiene visible en Resumen, Archivos adjuntos y Movimientos e historial. «Emitir factura» permanece a la derecha sobre la hoja; en consulta no se reserva una franja de gestión vacía. Los demás documentos conservan sus estados y acciones. No duplicar «Pendiente» ni mostrar «Liquidado: 0,00 €»; el importe liquidado se conserva cuando explica un saldo parcial. Los borradores usan los datos actuales de empresa y los confirmados su instantánea guardada; en compras y abonos de proveedor, este ocupa el lugar del emisor. Con menos de 540 px de ancho del resumen, cliente y fechas se apilan. La lectura de conceptos conserva el mismo orden, y etiquetas e importes pueden ocupar otra línea sin desbordar. Los archivos originales, calendarios y registros de actividad permanecen accesibles.

Por petición del 14 de septiembre de 2026, el editor comparte cuatro pantallas en facturas, presupuestos y compras: Cliente (Proveedor en compras) → Fecha → Conceptos → Revisión. El primer paso solo contiene la selección por NIF; el segundo, fecha del documento y vencimiento (Válido hasta en presupuestos), más el número de factura del proveedor en compras. Se retiran los controles de operación y serie de este flujo; se conservan los valores guardados y los predeterminados del documento. Pedido, centro de coste, contrato, notas, referencia y registro contable quedan en Datos adicionales, dentro de Revisión.

Cliente y Fecha usan una composición central de hasta 720 px, sin panel de totales ni espacio reservado para él. Conceptos y Revisión recuperan el resumen de importes. El indicador de cuatro pasos usa números, una superficie neutra para la selección y marcas de pasos anteriores, sin líneas divisorias; en móvil, número y etiqueta se apilan y todos los pasos permanecen visibles. Se permite regresar a pantallas visitadas, validando los datos antes de avanzar; Revisión ofrece edición directa de cliente, fechas y conceptos. Cada cambio dirige el foco al título o al primer campo con error. La transición dura 180 ms y se desactiva con movimiento reducido. Se reutilizan los controles de `06-input.md` y `05-button.md`, la tipografía común y las esquinas rectas. Los borradores conservan los identificadores de sus pasos anteriores al añadir Fecha, tanto en el navegador como en el servidor.

El filtro «Borradores» reúne los documentos guardados y los trabajos incompletos del usuario en una única tabla con búsqueda y paginación. Se elimina el bloque desplegable «Borradores sin terminar». Al pulsar un trabajo incompleto se recupera su editor y su paso; su menú de fila permite descartarlo. Una copia de edición sustituye a la fila del documento guardado, sin duplicarla. Los importes o fechas todavía incompletos se muestran como «—».

Facturas de venta, Presupuestos, Compras y gastos, Cobros y pagos, Clientes y proveedores y Catálogo muestran la búsqueda con icono de lupa dentro del menú «…», después de la acción de creación cuando está disponible. Las etiquetas identifican el listado: «Buscar facturas», «Buscar presupuestos», «Buscar compras», «Buscar cobros y pagos», «Buscar clientes y proveedores» y «Buscar catálogo». Sus cabeceras muestran únicamente ese menú, sin la lupa de acciones globales. La búsqueda está disponible también en modo lectura y conserva Ctrl/Cmd + K. `PageHeading` permite sustituir sus herramientas y compartir la referencia del botón del menú para restaurar el foco.

`ListSearch` y `useListSearch` comparten el campo desplegable de `06-input.md`: hasta 410 px en escritorio y el ancho disponible en móvil, foco al abrir y una X para cerrar. Al cerrar mediante X o Escape se limpia la consulta y se devuelve el foco al menú «…». Cerrado, el campo no reserva espacio. Las rutas con una consulta guardada lo muestran al recuperar el listado. Se conservan los filtros Estado y Vista. En Clientes y proveedores aparece antes del directorio y la actividad, y abre el directorio móvil para mostrar coincidencias. Catálogo filtra artículos por nombre, código o descripción. En Cobros y pagos filtra la vista seleccionada: vencimientos por documento, cliente/proveedor o NIF, movimientos además por referencia y anticipos por tercero, NIF o referencia; los filtros y enlaces al documento conservan la consulta. Los resultados se filtran en el servidor antes de paginar y calcular saldos; los movimientos muestran hasta 250 coincidencias.

Cobros, pagos y anticipos comparten encabezados, campos, tablas y ventanas. Las advertencias de saldo o plazos se distinguen por su texto, superficie y marca lateral. Importaciones conserva preparación, opciones de archivo, relación de columnas, revisión del lote e historial. Los resultados presentan registro, estado y motivo de error juntos en móvil.

Por petición del 14 de septiembre de 2026, cada vencimiento pendiente de Cobros y pagos abre la ficha del documento al pulsar su título o fila, igual que en Compras y gastos. El listado usa la misma tabla de cuatro columnas que Facturas de venta: Documento, Cliente / proveedor, Vencimiento y Estado, con el reparto 22/38/22/18. Se retiran la columna de saldo y el resumen de importes encima; el contador queda en la paginación. Estado muestra Por cobrar o Por pagar y añade Atrasado cuando corresponde. Solo los documentos fraccionados conservan «Plazo n de m» para distinguir vencimientos de la misma factura. Vencimiento filtra entre todos, atrasados y próximos; Estado filtra cobros o pagos. Ambos selectores viven en sus encabezados y permanecen disponibles en móvil, carga, errores y estados vacíos, sin un botón Filtros ni ventana adicional. La búsqueda, página y selección se conservan al abrir un documento y regresar, junto con la posición y el foco. No hay detalles desplegables ni flechas de expansión; la ficha conserva Resumen, Vencimientos, Archivos adjuntos y Movimientos e historial.

Acceso y configuración inicial se componen con la misma familia, paleta, superficies y campos. No hay una plantilla original de autenticación entre las seis disponibles; no se debe describir esa composición como copia literal de una pantalla de CronJob no proporcionada.

Solo en el editor de facturas de venta, la última revisión del 14 de septiembre retira «Borrador guardado» y «Borrador recuperado» de los cuatro pasos, sin reservar su espacio superior; se conservan los demás estados de guardado, incluidos los errores. Los cuatro pasos se desplazan 48 px hacia la izquierda respecto al centrado (24 px adicionales sobre la revisión anterior) cuando hay espacio, sin salir del contenido en móvil. El paso Fecha omite el título «Fecha y vencimiento» y empieza por los campos; conserva el nombre accesible de la sección y dirige el foco al primer campo. La petición posterior del mismo día elimina el campo «Fecha de generación» del paso Fecha en facturas de venta. Solo queda Vencimiento, que ocupa el ancho disponible y recibe el foco al entrar. La fecha del documento conserva su valor automático en nuevas facturas y el valor guardado al editar o recuperar borradores; la revisión mantiene su consulta. El error de vencimiento indica la fecha mínima concreta. Se reutilizan los campos, espaciados, botones y tipografía del sistema; los otros tipos de documento conservan su presentación.

Por la petición posterior del mismo día, Conceptos simplifica sus campos mediante la variante común `fields-filled`: superficie `--bg-muted`, sin subrayados, con las etiquetas, errores y el foco explícito de `Field` y `Select`. Es la adaptación solicitada de `06-input.md` (AbsencesModule.tsx:5049–5070). «Concepto n» identifica la descripción; se retira la etiqueta visual duplicada, conservando su nombre accesible con `field-label-hidden`. «Añadir concepto» utiliza el botón ghost a su ancho natural. Los totales del editor separan el total mediante espacio, sin línea. Cantidad, precio, descuento e IVA mantienen su alineación inferior; en móvil, la base con descuento ocupa una fila completa alineada a la derecha. Se conservan catálogo, impuestos, motivo del IVA 0 %, descuentos, retención y guardado automático.

La siguiente petición del 14 de septiembre integra el catálogo en el propio campo de producto o servicio mediante `ProductConceptInput`, y retira el pequeño selector «Catálogo». Al pulsar o enfocar el campo se muestran todos los productos activos, con nombre, descripción, precio sin IVA y tipo de IVA. Al escribir se filtra por nombre, descripción o código; el texto libre sigue siendo válido. La selección rellena descripción, precio, IVA y motivo de exención. Reutiliza `Field` y el patrón de combobox de `ContactLookup`, con lista al ancho del campo, desplazamiento interior, flechas e Intro, cierre con Escape, Tab o clic exterior, nombre accesible y foco visible. La superficie y los estados siguen `06-input.md` (AbsencesModule.tsx:5049–5070) y el selector común; en móvil conserva los precios y adapta los nombres sin desbordar la página.

En facturas, Precio sin IVA muestra coma decimal y al menos dos cifras decimales: `65.0000` se presenta como `65,00`, también al recuperar un borrador o elegir el catálogo. Los ceros sobrantes se omiten y la precisión significativa de hasta cuatro decimales se conserva (por ejemplo, `19,995`). Durante la edición se conserva el texto y la posición del cursor; se admiten coma o punto decimal y se aplica la presentación al salir. El valor para cálculo y guardado mantiene el punto decimal; no se redondea el precio unitario ni se encubren entradas incompletas o inválidas.

Por petición posterior del 14 de septiembre, la cabecera del editor de facturas de venta omite la lupa de búsqueda en Cliente, Fecha, Conceptos y Revisión mediante `PageHeading.tools`. Se aplica también al recuperar o editar el borrador. Mantiene el título, la composición y los controles de cada paso.

Por petición posterior del 14 de septiembre de 2026, las facturas de venta unen Conceptos y Revisión en un único paso «Cumplimentar factura»: Cliente → Fecha → Cumplimentar factura. El último paso utiliza la misma hoja «Lectura guiada» de la ficha mediante `DocumentSheetLayout`, con emisor, cliente, emisión y vencimiento arriba. Los conceptos se editan dentro de la hoja, con el catálogo integrado, descripción que crece con el texto, cantidad, precio, IVA, descuentos, exención y retención; los importes se actualizan al escribir. Se mantienen los campos de superficie neutra de `06-input.md` (AbsencesModule.tsx:5049–5070), la escala compartida y los controles accesibles. La descripción utiliza los 18 px y peso 500 del concepto de la hoja. El cliente y el vencimiento ofrecen lápices para regresar a su paso, sin perder los conceptos.

La base imponible, el IVA agrupado por tipo, la retención y el total aparecen una sola vez, al pie de la factura. El desglose suma el IVA ya redondeado de cada línea, igual que en la ficha. Datos adicionales permanece dentro del mismo paso y se abre cuando hay errores en sus campos. Guardar borrador valida el documento completo directamente desde la hoja. No se reserva una columna lateral de totales ni una cuarta pantalla de revisión. Los borradores antiguos guardados en Conceptos o Revisión se recuperan en el tercer paso, conservando todos sus datos; presupuestos y compras mantienen sus cuatro pantallas y sus identificadores. La hoja comparte sus adaptaciones móviles con la ficha, y los campos numéricos pasan a dos columnas cuando se estrecha. Verificado en el puerto 3000 a 1440, 390 y 320 px: catálogo, cálculos en directo, IVA mixto, retención, validación, guardado, recarga, borradores antiguos, modo consulta, texto e importes largos y conservación de la ficha final. Capturas y resultados en [revision-factura-editable](revision-factura-editable/verificacion.json) y [comprobaciones adicionales](revision-factura-editable/verificacion-adicional.json).

Por petición posterior del 14 de septiembre, «Movimientos e historial» se compacta en la ficha del documento. Los movimientos solo se muestran cuando existen, con su tabla y el título «Movimientos»; se retira la ilustración y el bloque vacío «Sin movimientos». «Historial» muestra cada evento en una fila con acción, usuario y fecha, sin cajas ni separadores y sin repetir «del documento» en los títulos. El contenido usa hasta 860 px, espacios comunes de 16/24 px y altura según los datos. En móvil, usuario y fecha pasan debajo del evento; se mantiene toda la información y la navegación de secciones. Si no hay eventos, una frase breve sustituye a la ilustración vacía.

## Superficies, formularios y ventanas

Archivos originales usa una sección plana de hasta 640 px. Por la última petición del 14 de septiembre de 2026, muestra solo el título y un clip sin marco ni texto visible, mediante `.icon-button` y la variante ghost/icon de `05-button.md` (components/ui/button.tsx:7–31). El control conserva un objetivo de 44 px, nombre accesible «Adjuntar archivo» y foco visible. La ayuda común `Tooltip` muestra la acción, los formatos y el límite de 5 MB al pasar el cursor o enfocar con teclado. Se elimina «Sin archivos adjuntos» y la línea permanente de formatos, sin reservar un bloque vacío. Durante la subida, el clip pasa al indicador de carga y se anuncia el estado; se conservan los errores y `Loading compact` al consultar la lista. Los archivos mantienen descarga, tamaño y huella desplegable; en móvil se apilan cuando falta ancho. Este patrón se comparte en las fichas de documentos.

Por petición posterior del mismo día, cada archivo original añade una X sin marco con ayuda «Eliminar archivo», nombre accesible que incluye el archivo y objetivo de 44 px. Elimina el adjunto de la lista y ofrece «Deshacer» junto a su nombre, sin ventana intermedia. La X y Deshacer respetan los permisos de escritura y se bloquean durante la operación; los errores conservan el archivo o la posibilidad de restaurarlo. El foco pasa a Deshacer al quitar el archivo y al clip al restaurarlo. En móvil, la X permanece junto al nombre y la huella queda debajo. La retirada es reversible: los originales conservan sus bytes inmutables y la auditoría; los archivos retirados dejan de estar disponibles para descarga, uso y enlaces compartidos.

- Agrupar primero mediante espacio, alineación y jerarquía. Paneles planos sin contorno, sombra o cajas anidadas por defecto. No añadir separadores repetidos entre cada bloque.
- Los campos siguen la variante subrayada de `06-input.md`. Conservan etiqueta visible, línea de base y foco explícito. Las búsquedas de listados usan la variante subrayada aprobada; los demás buscadores conservan sus límites actuales. Los errores se asocian al campo y se explican con texto.
- Controles de 44 px; herramientas compactas de 32/36 px en escritorio según su función y 44 px en móvil. Deshabilitado, selección, hover y foco se resuelven en el sistema común.
- `Modal` usa ventana nativa accesible, título de 16 px, relleno de 28/32 px y sombra neutra del kit. En móvil ocupa la pantalla, con relleno de 24/20 px. Escape, cierre, bloqueo de desplazamiento y restauración de foco son comunes. Una confirmación conserva su resumen y consecuencias junto a la acción.
- `Empty`, `Loading` y `ErrorBox` son las únicas bases de vacío, carga y error. Un apartado sin datos se identifica con un título y, cuando corresponda, una acción. La descripción de `Empty` es opcional: se omite si repite el título o el botón. Una carga no se presenta como un listado vacío.

Los importes largos de Conceptos ocupan una fila completa cuando lo necesitan, sin invadir el selector de IVA. Los totales permiten apilar etiqueta e importe; en un resumen estrecho, las cifras largas reutilizan los tamaños de 16 y 13 px de la escala común. La comprobación del flujo de cuatro pantallas, incluidos errores, recuperación y cifras máximas en móvil, se registra en [revision-editor-pantallas/VERIFICACION.md](revision-editor-pantallas/VERIFICACION.md).

## Paginación de tablas · 14 de septiembre de 2026

Los pies de tabla solo aparecen cuando hay más de una página. Con cero resultados o una sola página se omite el bloque completo, incluidos el recuento, la línea y su espacio. Se aplica a documentos, vencimientos, mayor contable, revisión e historial de importaciones y auditoría; contactos y detalles de Visión general conservan su paginación condicional. Con total conocido, se muestra «Página n de m». En historial de importaciones y auditoría, el servidor comprueba si existe otro registro antes de ofrecer Siguiente, incluso cuando la última página está completa. Si los datos disminuyen mientras se consulta una página posterior, se conserva Anterior para poder regresar. Se reutilizan los controles, foco y adaptación móvil existentes.

## Textos mínimos · 14 de septiembre de 2026

Las pantallas muestran títulos, datos y acciones sin frases de acompañamiento que repitan lo evidente. Se retiran las introducciones del tipo «Consulta tus…», «Aquí aparecerán…», «Revisa los datos antes de continuar» y las instrucciones que ya expresa el botón. Los cuatro detalles de Visión general muestran importe, periodo y documentos, sin el párrafo lateral explicativo. La base imponible sigue identificada por su etiqueta; los cálculos no cambian.

Conservar únicamente el texto que ayude a decidir o completar una acción: errores, requisitos de campos, formatos y límites de archivos, saldos iniciales, periodo de los datos, restricciones de acceso y consecuencias de confirmar, eliminar, revertir o cerrar. Los estados vacíos guían cuando hace falta; la ayuda consultada voluntariamente conserva sus explicaciones. Los textos introducidos por usuarios —conceptos, notas, referencias y datos fiscales— no forman parte de esta limpieza.

Eliminar los bloques redundantes en el componente, sin ocultar globalmente párrafos o descripciones con CSS ni dejar contenedores vacíos. Antes de añadir una frase nueva, comprobar si la etiqueta, el estado, el dato o la acción ya comunican lo mismo. La revisión está registrada en [REVISION_TEXTOS_MINIMOS.md](REVISION_TEXTOS_MINIMOS.md).

## Identificación de clientes y proveedores · 14 de septiembre de 2026

Facturas, presupuestos, compras, anticipos y el alta en el directorio comparten `ContactPicker`: un único campo enmarcado de NIF que sugiere fichas desde el primer carácter, sin exigir Intro. Las coincidencias contienen la secuencia escrita en el NIF normalizado; el desplegable muestra nombre y NIF, limita la lista a ocho resultados y permite concretar escribiendo más. Se selecciona con un clic o mediante flechas e Intro; Escape cierra las sugerencias sin cerrar la ventana anfitriona. Su superficie y estados siguen el selector común y `06-input.md`.

Al escribir un identificador ya guardado completo se abre automáticamente su resumen. Un NIF español con estructura completa de nueve caracteres y sin coincidencias abre el alta; esta detección de forma no valida el dígito de control. Para otros identificadores se conserva la lupa y la consulta explícita. Una pausa de 250 ms agrupa las peticiones y se descartan las respuestas de una búsqueda anterior. No se abre un alta a partir de una coincidencia parcial ni ante un error de red. La lista usa una única superficie con desplazamiento interior en móvil, sin separadores entre opciones. Flota bajo el campo en las páginas; dentro de una ventana participa en su altura para evitar que sus límites recorten las opciones.

Una coincidencia exacta abre `Modal` con razón social, NIF, dirección y datos de contacto disponibles. «Usar estos datos» incorpora la ficha; si está archivada, «Recuperar y usar» la reactiva sin duplicarla. Si no existe, el formulario habitual se abre con el NIF ya cumplimentado y «Guardar y usar» persiste la ficha. Al cambiar el NIF se retira la identidad anterior hasta confirmar la nueva. Los documentos recuperados conservan sus datos guardados. El resumen usa espacio y etiquetas, sin cajas anidadas, y se adapta a la ventana móvil común.

Por petición posterior del 14 de septiembre de 2026, la identidad confirmada se muestra en un recuadro compacto ajustado al nombre: fondo `--bg-subtle`, un único borde `--border`, relleno de 8/12 px y marca de selección Lucide de 16 px. El nombre usa el cuerpo común de 13 px y peso 500; los nombres largos crecen en varias líneas dentro del ancho disponible. Es un estado estático, sin hover ni acción «Ver datos», anunciado como cliente o proveedor seleccionado. El NIF conserva su campo y su búsqueda para cambiar de ficha. Este patrón de `ContactPicker` se comparte en facturas, presupuestos, compras y anticipos; los datos completos se consultan desde Clientes y proveedores.

## Tablas e importes

La petición más reciente del 14 de septiembre recupera el importe en Facturas de venta: el listado añade «Precio» después de Estado, con el total guardado del documento en euros y dos decimales. Las facturas cobradas conservan su precio total; los borradores incompletos sin importe muestran «—». La variante `document-list-priced` de `DocumentTable` distribuye Documento, Cliente, Vencimiento, Estado y Precio en 20/28/20/16/16, con cifras tabulares alineadas a la derecha y los estilos comunes de `07-table.md`. En móvil, Precio ocupa una línea propia al final, con etiqueta y cifra completa. Esta petición sustituye la omisión de Total y las cuatro columnas solo en ventas; presupuestos, compras y tablas compactas conservan su composición.

Por petición posterior del 14 de septiembre, se retira la X de los borradores del listado de ventas, tanto guardados como incompletos. La celda muestra únicamente el estado, sin acción adicional ni espacio reservado. La eliminación sigue disponible dentro del propio borrador, en su menú «…». Se conservan las cuatro columnas, la apertura del borrador y los menús de los otros listados.

Facturas de venta, Presupuestos y Compras y gastos comparten cuatro columnas sobre la base de `design-kit/templates/04-horarios.html`: Documento, Cliente (Proveedor en compras), Vencimiento y Estado. Por petición posterior del 14 de septiembre de 2026, el formato aprobado en ventas se aplica a los tres listados: se omiten Fecha, Total y la segunda línea de referencia, proyecto o primer concepto. La fecha de emisión, los conceptos y los importes se consultan dentro del documento; las referencias conservan su edición y los datos guardados no cambian. El reparto ocupa todo el ancho con un 22 % para Documento, 38 % para Cliente o Proveedor, 22 % para Vencimiento y 18 % para Estado, sin acumular el espacio sobrante en la última columna. Las filas habituales mantienen los 64 px comunes y una sola línea por dato cuando cabe.

`DocumentTable` y `document-list-balanced` resuelven la composición común, sin variantes de ancho por tipo de documento, y la conservan al buscar, filtrar o quedar sin resultados. Nombres y números de documento pueden crecer sin perder información. En móvil, los tres listados muestran número y estado en la primera línea, solo el cliente o proveedor debajo y vencimiento al final. No se dejan columnas, celdas ni filas vacías por los datos retirados.

En Presupuestos, Vencimiento muestra la fecha de validez existente. Compras mantiene la identidad del proveedor. Los tres listados conservan la búsqueda, el filtro Estado, la paginación y los enlaces a documentos y trabajos incompletos. Vencimientos pendientes de Cobros y pagos reutiliza esta misma distribución mediante `document-list-balanced`.

Por petición del 14 de septiembre de 2026, las tablas existentes comparten el estilo aprobado en Cobros y pagos sobre la base de `07-table.md`: cabecera transparente de peso 400, un límite tenue bajo las columnas, fondo alterno al 1,5 % y filas de al menos 64 px capaces de crecer con textos largos. El margen interior exterior es de 24 px y entre columnas hay 20 px, definidos en los tokens comunes. En móvil, las filas adaptadas usan 16 px a los lados y separaciones de 8/12 px. Las tablas de documentos se adaptan por debajo de 760 px de contenido, como los cobros; el resto conserva sus distribuciones y su desplazamiento interior cuando corresponde.

Esta unificación conserva las tablas, datos, enlaces, acciones y permisos existentes. Por petición del 14 de septiembre de 2026, cada documento muestra siempre su Estado, también las facturas cobradas, las compras pagadas, las rectificativas devueltas y los presupuestos confirmados o aceptados. Las etiquetas mantienen sus cálculos y permanecen visibles al filtrar, tanto en los listados principales como en las tablas compactas. Cobros y pagos conserva el estado de cada vencimiento o movimiento. El encabezado Estado permanece visible también sin resultados. El selector común usa la variante `table-filter-select`, sin marco ni fondo, y muestra la selección activa. En móvil se conserva ese encabezado sobre las filas adaptadas, con un objetivo táctil de 44 px. Los importes siguen alineados a la derecha en escritorio.

Por debajo de 540 px de contenido, documentos, contactos, catálogo, pagos, anticipos, cuentas, periodos, usuarios, auditoría y resultados de importación distribuyen la información en filas legibles. Precio, impuestos, identidad y acciones deben seguir visibles. No imponer un ancho mínimo de 360 px al nombre del artículo. Los códigos contables no se parten.

Las tablas cuya comparación depende de columnas simultáneas —balances, mayor, revisión de cierre o muestra de columnas de un archivo— mantienen desplazamiento interior. La página completa nunca debe desbordarse. Los totales y saldos se comprueban también con valores largos. La paginación sigue siendo compacta y conserva objetivos táctiles de 44 px en móvil.

## Presentación dentro de CronJob

`/?embedded=1#overview` elimina la navegación propia. Funciona con cualquier ruta, por ejemplo `/?embedded=1#sales`. La adaptación responde al ancho disponible del contenido, incluyendo una columna anfitriona más estrecha que el navegador.

Este parámetro es de presentación. El servidor actual conserva `X-Frame-Options: DENY` y `frame-ancestors none`; la integración efectiva en un iframe requiere configurar el origen autorizado de CronJob. No añade SSO, sesiones compartidas ni integración de autenticación. Esos cambios necesitan el código y la configuración del anfitrión.

## Verificación y continuidad

El inventario de pantallas, capturas y comprobaciones de esta revisión se conserva en [REVISION_CRONJOB_INTEGRAL.md](REVISION_CRONJOB_INTEGRAL.md) y `docs/revision-cronjob-integral/`. Las verificaciones anteriores documentan estados históricos, no el contrato vigente.

Antes de extender una pantalla: consultar el componente correspondiente del kit, reutilizar los componentes comunes y verificar escritorio y móvil con datos, vacíos, errores, menús y foco. No incorporar otro lenguaje visual por preferencias de un módulo. Las decisiones nuevas se registran aquí; las instrucciones actuales del usuario tienen prioridad.

## Directorio y actividad de clientes · 14 de septiembre de 2026

Por la última petición del 14 de septiembre, la entrada de Clientes y proveedores muestra únicamente la cabecera y los cuatro KPIs. El directorio, el botón Filtros, la búsqueda desplegada y la actividad no se montan mientras se muestra ese resumen. Al pulsar un indicador —incluido Proveedores activos— aparece su listado con las herramientas existentes. El regreso desde el título vuelve a ocultar ese contenido. La búsqueda abierta con Ctrl/Cmd + K y el alta resuelta abren el listado; las rutas guardadas con un cliente, búsqueda o filtros siguen recuperando esos datos. Verificado en 1440, 390 y 320 px, con capturas y resultados en [revision-clientes-resumen/VERIFICACION.md](revision-clientes-resumen/VERIFICACION.md).

Clientes y proveedores presenta un directorio de 260 px con solo nombre y NIF por ficha, búsqueda y paginación. La selección se reconoce mediante superficie neutra y una marca de 2 px, sin separadores entre filas ni marcos anidados. Ninguna ficha se selecciona automáticamente: al pulsar un KPI se ocultan los indicadores generales y queda solo el directorio filtrado, en su misma columna, hasta elegir un nombre. Por la última petición del 14 de septiembre, elegirlo oculta el directorio, la búsqueda y los filtros de contactos; la ficha ocupa todo el ancho disponible, en escritorio y móvil. La zona de actividad no reserva contenido vacío ni muestra instrucciones de selección.

La ficha muestra el nombre como título, sin la etiqueta gris «Cliente» o «Proveedor» y sin el ojo. El botón textual «Ver datos» sustituye al menú de tres puntos de la ficha, reutilizando `05-button.md` (components/ui/button.tsx:7–31). Abre el `Modal` existente con todos los datos y las acciones «Editar ficha» y «Archivar ficha» o «Recuperar ficha». La variante común `closePosition="left"` mantiene la X antes del título, Escape, bloqueo de desplazamiento y restauración de foco. La edición abre un único formulario, sin dejar la ventana de datos debajo. El estado Archivado sigue visible cuando corresponde; los permisos de consulta ocultan las acciones de escritura.

Una flecha izquierda junto al nombre devuelve al directorio y oculta la ficha. Reutiliza `.icon-button`, con objetivo de 44 px, ayuda «Volver al listado de clientes y proveedores» y nombre accesible. Conserva la búsqueda, el indicador, el tipo, el estado y la página del directorio, y devuelve el foco al último cliente consultado. No es una flecha en la cabecera negra. Al elegir otro cliente se abre su actividad completa, sin heredar el filtro de actividad del anterior.

La franja sobre el directorio se retira por la última petición del 14 de septiembre: no aparece el nombre del KPI, el resumen de filtros ni la acción de limpieza bajo la cabecera negra o sobre las filas. Cuando los KPIs están ocultos, el título «Clientes y proveedores» mantiene el enlace subrayado al resumen mediante PageHeading.titleLink. Al pulsarlo se limpian los filtros y la selección y se muestran los cuatro indicadores. La dirección conserva kpis=hidden, el indicador, la selección y la actividad para recarga y regreso desde documentos. La revisión inicial del directorio se guarda en revision-clientes-kpis/VERIFICACION.md.

El regreso desde el título se ha comprobado a 1440, 390 y 320 px, desde los cuatro KPIs, una ficha y los filtros locales, además de recarga, búsqueda, teclado y modo lectura. Las capturas y comprobaciones se guardan en `docs/revision-regreso-clientes/`.

La ventana Filtrar contactos muestra el criterio aplicado desde cualquiera de los cuatro KPIs y conserva Estado, con Activos, Archivados y Todos. No vuelve a introducir el selector Tipo. La categoría elegida desde el KPI se mantiene al cambiar Estado; los indicadores de saldo conservan su condición. KpiFilter se reutiliza dentro de la ventana para identificar el criterio y ofrecer Limpiar filtros. Esta acción borra del borrador indicador, categoría, búsqueda y estado; Aplicar filtros confirma la limpieza y muestra todos los contactos, incluidos los archivados, desde la primera página y con los KPIs ocultos. Cancelar, Escape y cerrar descartan los cambios. Se eliminan los estilos exclusivos de la franja retirada.

Por petición posterior del 14 de septiembre, el directorio de Clientes y proveedores utiliza ListToolbar, igual que Catálogo y Facturas de venta. Filtro y lupa se alinean a la derecha del ancho completo del módulo, encima del listado. El filtro muestra solo su icono, ayuda y nombre accesible, con la señal compartida cuando hay criterios activos. Se elimina el botón textual de la izquierda y su CSS. La búsqueda inline se abre hacia la izquierda con la animación común de 240 ms; Intro conserva los resultados y cierra, mientras X y Escape limpian y cierran. La consulta por nombre o NIF conserva el KPI y el estado, reinicia la página y permanece en la ruta. El foco regresa a la lupa. La búsqueda se abre desde la lupa del listado o con Ctrl/Cmd + K; se retira la opción de búsqueda de la cabecera. Los controles se ocultan al seleccionar una ficha o volver a los KPIs, y usan los tamaños móviles y la preferencia de movimiento reducido ya definidos.

Por petición posterior del 14 de septiembre, Clientes y proveedores sustituye el menú de tres puntos por el botón blanco + de HeaderAction, idéntico al de Facturas de venta y Catálogo y basado en 18-add-button.md (TeamModule.tsx:1679–1689). Está disponible en resumen, directorio y ficha para quienes pueden editar; conserva el nombre accesible Añadir cliente o proveedor y abre el formulario existente. La opción Buscar clientes y proveedores se elimina del menú: la búsqueda se abre desde la lupa de la barra del listado o con Ctrl/Cmd + K. No se añaden estilos ni controles de creación duplicados. Esta petición amplía a Clientes la excepción sobre creación en cabecera.

El diseño anterior queda conservado en `backups/clientes-antes-kpis-20260914-120534/`, con el código, el sistema visual, un manifiesto SHA-256 y la captura `antes-1440.png`. La copia permite recuperar esta versión cuando el usuario lo solicite; no se añade un interruptor de diseño a la interfaz.

La actividad adapta sus indicadores al tipo de ficha: clientes muestran Facturado neto, Pendiente de cobro y Presupuestos pendientes; proveedores, Compras netas y Pendiente de pago; las fichas mixtas conservan los cuatro indicadores de ventas, cobros, pagos y presupuestos pendientes. Un saldo pendiente en sentido contrario —por ejemplo, una devolución— mantiene visible su indicador, y un proveedor con presupuestos pendientes también puede consultarlos. Los saldos usan documentos emitidos o contabilizados y contemplan aplicaciones, anticipos y reversiones. El botón «Filtros» sustituye a «Vista / Todos los documentos», alineado a la derecha de Actividad. Abre `Modal` con `sidePanel`, basado en `15-side-panel-filters.md` (AbsencesModule.tsx:3040–3314), y permite elegir documentos, facturas, presupuestos, compras, rectificativas, cobros y pagos o anticipos mediante `Field` y `Select`. Aplicar confirma la elección y reinicia la página; Cancelar y Escape la descartan. Limpiar filtros recupera Todos los documentos al aplicar. El botón señala un filtro activo con la superficie neutra del sistema, y el panel conserva el filtro de saldo o facturación elegido desde los KPIs de actividad. Los importes y la actividad se consultan por NIF exacto normalizado dentro del negocio activo; los totales abarcan todas las páginas.

Con menos de 760 px de contenido, el listado ocupa todo el ancho y se sustituye por la ficha al seleccionar, igual que en escritorio. Se retira el anterior desplegable «Cambiar cliente o proveedor»; el regreso usa la flecha junto al nombre. Las tablas responden al ancho de la propia ficha: por debajo de 540 px pasan a filas con identidad, fecha, estado e importe; los anticipos conservan las etiquetas de importe y disponible. Los datos del modal pasan a una columna en móvil. Capturas y resultados de esta adaptación en [revision-clientes-ficha-completa/VERIFICACION.md](revision-clientes-ficha-completa/VERIFICACION.md).

### Ficha de contacto compacta y actividad consultable · 14 de septiembre de 2026

La petición de aplicar las seis mejoras reduce la separación entre la identidad y los indicadores a 8 px, la altura mínima de estos a 88 px y el espacio antes de Actividad a 16 px. Conserva la escala común de nombres, cifras y tablas, sin añadir líneas. La cuadrícula se ajusta a dos, tres o cuatro indicadores; en móvil se reorganiza a dos columnas y a una cuando el contenido baja de 380 px.

Presupuestos pendientes usa el mismo criterio del módulo de presupuestos: confirmado (`sent`), vigente hasta hoy o una fecha posterior y sin respuesta. Excluye borradores, aceptados, rechazados, caducados y convertidos. El recuento se calcula sobre todo el contacto, independientemente de la búsqueda y de la página. Al pulsar un KPI se limpia la búsqueda de actividad y se abre su conjunto desde la primera página; Todos los documentos y Presupuestos conservan el historial completo.

Los borradores de Actividad se identifican por el primer concepto, con la referencia como alternativa; Borrador aparece solo en Estado. El estado Convertido es un desplegable nativo accesible que muestra el enlace a la factura generada, con su número actual o «Abrir factura en borrador». Reutiliza la navegación a documentos y conserva el regreso a la misma ficha, página, búsqueda y filtro.

Actividad integra `ListToolbar` junto al título: filtros y lupa con el campo subrayado extensible aprobado. Busca en número, conceptos y referencias; también localiza presupuestos por el número de la factura generada. Cobros/pagos y anticipos buscan sus referencias. Las coincidencias se calculan en el servidor por NIF exacto dentro del negocio activo, antes de paginar, tratando `%` y `_` como texto literal. `activitySearch` conserva esta consulta separada del `search` del directorio. Intro aplica y cierra sin limpiar, X/Escape limpian y cierran; Ctrl/Cmd + K abre la búsqueda de la ficha cuando esta está visible. Se mantienen los indicadores durante la búsqueda para evitar desplazamientos y se anuncian los resultados. Los errores permiten reintentar.

Por petición posterior del 14 de septiembre, el panel «Filtros de actividad» de cada cliente o proveedor combina Documentos y movimientos, Estado, importe mínimo/máximo y fecha desde/hasta, con periodos rápidos. El importe usa el total con impuestos del documento o el importe original del movimiento; las fechas corresponden a la emisión o al movimiento y ambos límites son inclusivos. Los estados se adaptan a documentos, cobros/pagos y anticipos; los de vencimiento respetan el próximo plazo pendiente que muestra la fila. Reutiliza `Modal` con `sidePanel`, `Field`, `Select` y los rangos de `ListFilters`, con importes en dos columnas y fechas a todo el ancho. Admite coma decimal, muestra errores junto al campo y enfoca el primer rango inválido.

Aplicar combina los filtros con la búsqueda y reinicia la paginación; Cancelar y Escape descartan la edición y restauran el foco. Limpiar filtros restablece los campos del panel al aplicar. El servidor filtra por NIF exacto dentro del negocio antes de contar y paginar. Los indicadores conservan sus totales globales del contacto; pulsarlos limpia los filtros de actividad y la búsqueda. `activityStatus`, `activityMinTotal`, `activityMaxTotal`, `activityFrom` y `activityTo` se conservan en recarga y enlaces de regreso, sin sustituir el estado o la búsqueda del directorio; elegir otra ficha empieza con su actividad completa. Verificación en [revision-filtros-actividad](revision-filtros-actividad/verificacion.json).

## Indicadores accionables por módulo · 14 de septiembre de 2026

### Prueba de navegación en Facturas de venta · 14 de septiembre de 2026

Solo en Facturas de venta, `#sales` muestra la cabecera del módulo y sus cuatro KPIs. Cada indicador abre `#sales?view=list` con su filtro y fecha de corte; la tabla se muestra en esa segunda vista sin repetir los KPIs. Limpiar filtros conserva el listado completo. El menú lateral vuelve al resumen; las rutas anteriores con estado, búsqueda, página o indicador siguen abriendo la tabla y los enlaces al documento conservan esos parámetros.

Tras elegir la segunda ubicación propuesta el 14 de septiembre de 2026, el resumen de ventas sitúa «Ver todas las facturas →» debajo del título, dentro de la cabecera negra y alineado a la izquierda. Sustituye al botón anterior situado bajo los cuatro KPIs. `PageHeading` incorpora el enlace opcional `subtitleLink`, basado en `03-module-header.md` (AbsencesModule.tsx:2865–2880) y la variante enlace de `05-button.md` (components/ui/button.tsx:7–31). Usa el cuerpo común de 13 px y peso 400, texto claro, flecha Lucide decorativa y separación de 8 px respecto al título, sin fondo ni marco; conserva subrayado al pasar el cursor, foco visible y objetivo de al menos 44 px en móvil. El enlace abre `#sales?view=list`, desde la primera página y sin búsqueda, estado, indicador ni fecha de corte heredados, para consultar todo el historial. Está disponible también en modo lectura. Los cuatro KPIs, el botón «+», la tabla y sus herramientas conservan su comportamiento; el acceso solo aparece en el resumen de ventas.

La ubicación bajo el título se comprueba en la aplicación local del puerto 3000 a 1440, 390 y 320 px: alineación izquierda, un único enlace dentro de la cabecera, cuatro KPIs, ausencia de desbordamiento horizontal, objetivo móvil de 44 px, foco visible y apertura del listado completo con clic o Intro. Compilación de producción y actualización del servicio `app` completadas; los recursos servidos incluyen el cambio. Las pruebas anteriores de modo lectura, búsqueda de facturas de meses anteriores y recarga se conservan en [revision-ventas-historial](revision-ventas-historial/verificacion.json); sus capturas muestran la ubicación anterior.

En ambas vistas de ventas, el menú «…» se sustituye por `HeaderAction`, el botón blanco «+» de `18-add-button.md` (TeamModule.tsx:1679–1689), con nombre accesible «Nueva factura» y respetando el modo lectura. Se retira Exportar de estas cabeceras. Esta excepción sustituye únicamente para ventas el criterio anterior de creación y búsqueda dentro del menú.

La tabla conserva `DocumentTable`, sus cuatro columnas, proporciones, filas y selector Estado. Una barra independiente basada en `08-toolbar.md` (AbsencesModule.tsx:2910–2911) coloca Filtros y Buscar juntos a la derecha, con 24 px de separación antes de la tabla y sin separador decorativo. Sus herramientas usan los controles comunes de 36 px en escritorio y 44 px en móvil; la búsqueda desplegable se alinea a la derecha y devuelve el foco a la lupa al cerrar.

Por la última petición del 14 de septiembre de 2026, ventas retira toda la franja superior del indicador aplicado, incluido «Facturado este mes · base imponible», sin reservar su espacio. El filtrado se mantiene y se consulta o limpia dentro del panel Filtros. Los demás módulos mantienen su franja y su acción de limpieza actuales.

Tras elegir la propuesta 7, únicamente el listado de Facturas de venta convierte su título en un enlace al resumen `#sales`. `PageHeading` admite `titleLink` y mantiene el `h1`, la tipografía, el color y la posición originales. El título lleva el subrayado fino de la propuesta, ayuda «Volver al resumen de facturas» y foco de teclado visible; en móvil amplía su área de pulsación a 44 px sin desplazar la cabecera. Vuelve siempre a las cuatro KPIs, también desde el historial completo, búsquedas o filtros. En el resumen el título sigue siendo estático. El «+», los editores, las fichas y las cabeceras de otros módulos conservan su comportamiento. Esta excepción actualiza solo para ese listado el criterio general anterior sobre el regreso desde cabeceras.

Regreso comprobado en 1440, 390 y 320 px desde los cuatro indicadores y el historial, con teclado, área táctil ampliada y modo lectura. La cabecera conserva su posición y altura. Capturas y resultados en [revision-regreso-ventas](revision-regreso-ventas/verificacion.json).

Esta retirada se verifica en 1440, 390 y 320 px, conservando el filtrado del panel y las acciones de presupuestos y compras. Capturas y resultados en [revision-limpiar-filtros-ventas](revision-limpiar-filtros-ventas/verificacion.json).

Filtros abre la variante `sidePanel` de `Modal`, basada en `15-side-panel-filters.md` (AbsencesModule.tsx:3040–3314): 380 px a la derecha, fondo y sombra neutros, pantalla completa en móvil y cierre con Escape, clic exterior o X. Indicador y Estado reutilizan `Field` y `Select`; Aplicar confirma el filtro y reinicia la página, Cancelar descarta los cambios. Cambiar uno limpia el otro. No se añade Agrupar sin una función que lo justifique. Presupuestos, compras y los demás módulos mantienen su navegación y herramientas actuales.

Por petición posterior del 14 de septiembre, Estado en la tabla de ventas es un encabezado estático: su filtro queda únicamente en el panel superior, mientras cada fila conserva su etiqueta. Vencimiento incorpora `Select` con la variante `table-filter-select` para elegir Orden predeterminado, Más reciente primero o Más antiguo primero. El encabezado mantiene el texto Vencimiento, la flecha y `aria-sort`; el menú identifica la opción seleccionada. En móvil, ese control permanece encima de las filas. Se ordena por la fecha de vencimiento que muestra cada documento, incluido su próximo plazo pendiente, en el servidor y antes de paginar. Los borradores sin fecha válida quedan al final en ambos sentidos. Cambiar el orden vuelve a la primera página, conserva búsqueda y filtros y guarda la elección en la dirección y en los enlaces al detalle. El orden predeterminado conserva la presentación anterior.

Verificado en 1440, 390 y 320 px con la base de demostración aislada: entrada, cuatro enlaces, búsqueda sin resultados, filtros, restauración de foco, recarga, regreso del detalle y formulario de creación. Se comprueban también el modo lectura, errores con reintento y la conservación de las herramientas de presupuestos y compras. Capturas y resultados en [revision-ventas-kpis](revision-ventas-kpis/verificacion.json). La compilación de producción pasa; conserva los avisos existentes de dependencias y tamaño de paquete.

### Catálogo · resumen y listado como Facturas de venta

Por petición del 14 de septiembre de 2026, `#catalog` muestra únicamente la cabecera y los cuatro KPIs: Artículos en catálogo, Artículos activos, Sin precio y Archivados. Cada indicador abre su listado y oculta los KPIs; Sin precio incluye solo artículos activos a 0 €. El resumen conserva el acceso «Ver todo el catálogo» bajo el título, como el acceso a todas las facturas en ventas. No se montan tabla, búsqueda ni filtros en el resumen.

El listado convierte «Catálogo» en el mismo título subrayado de regreso de ventas, mediante `PageHeading.titleLink`, con ayuda «Volver al resumen del catálogo», foco visible y área táctil de 44 px. Vuelve a los cuatro indicadores sin filtros heredados. Ambas vistas usan `HeaderAction` para «Nuevo artículo», respetando el modo lectura. Esta petición amplía a Catálogo las excepciones de ventas sobre creación en cabecera y regreso desde el título.

Ventas y Catálogo comparten `ListToolbar` y `ListFilters`: filtros y lupa juntos a la derecha, 24 px antes de la tabla, búsqueda desplegable con foco y cierre mediante X o Escape, y panel lateral de filtros con Aplicar y Cancelar. Indicador y Estado se consultan y limpian dentro del panel, sin franja de filtro ni título redundante sobre la tabla. Cambiar uno limpia el otro. La ruta conserva la vista, la búsqueda y el filtro para recarga y navegación del navegador; los enlaces antiguos con búsqueda o indicador siguen abriendo el listado. Ctrl/Cmd + K desde el resumen abre el listado con su búsqueda.

La tabla conserva código, artículo, descripción, unidad, precio e IVA, y señala los archivados cuando aparecen. Editar y Eliminar se agrupan en un único `ActionsMenu` por fila. Los formularios, la confirmación de eliminación y los permisos conservan sus funciones. El error permite reintentar tanto el resumen como el listado. Se reutilizan la escala, los espacios y los componentes existentes, sin bordes ni cajas adicionales.

Comprobado en la aplicación local del puerto 3000 a 1440, 390 y 320 px: cuatro accesos, regreso, búsqueda, filtros, recarga, formularios y ausencia de desbordamiento horizontal. Resultados en [revision-catalogo-resumen/VERIFICACION.md](revision-catalogo-resumen/VERIFICACION.md).

### Búsqueda de listados · propuesta 1 aprobada

Por petición del 14 de septiembre, `ListToolbar` integra la búsqueda en la misma fila de herramientas, tanto en ventas como en catálogo. La lupa se transforma en un campo subrayado de hasta 360 px, extendiéndose hacia la izquierda durante 240 ms sin desplazar la tabla. Reutiliza `06-input.md` (AbsencesModule.tsx:2972–2991 y 5049–5070), los controles de 36/44 px, los colores y el foco del sistema. En móvil se adapta al espacio junto a Filtros; respeta la preferencia de movimiento reducido.

`ListSearch` conserva los resultados al pulsar Intro y cierra el campo. Los listados con búsqueda diferida aplican inmediatamente el texto actual y vuelven a la primera página. Reabrir permite editar la consulta; la lupa señala que hay una búsqueda activa y la identifica en su ayuda y nombre accesible. La X y Escape limpian y cierran. El cierre devuelve el foco al botón que abre la búsqueda; Intro durante la composición de texto no la confirma. Este comportamiento se comparte con clientes y proveedores, presupuestos, compras y cobros y pagos, manteniendo sus criterios de búsqueda existentes (incluidos nombre y NIF) y sus filtros.

### Base compartida

Los listados de facturas, presupuestos, compras, cobros y pagos, contactos, catálogo, contabilidad, importaciones y auditoría comparten `ModuleKpis`, basado en `11-stat-tile.md` (DashboardModule.tsx:115–169) y en los indicadores de Visión general. Cada vista muestra tres o cuatro enlaces, únicamente con cifra y título. Por petición del usuario del 14 de septiembre de 2026 se eliminan de todos los KPIs los textos pequeños de contexto, subtítulos y recuentos auxiliares, también en Visión general. No se trasladan a ayudas al pasar el cursor ni se reserva espacio para ellos. Los indicadores conservan sus filtros y estados de selección. Se mantienen Inter, los pesos y tamaños comunes, las superficies planas, los separadores verticales del kit en escritorio y las esquinas rectas.

La selección se señala con superficie neutra y `aria-current`, manteniendo el foco visible. Pulsar un indicador limpia la búsqueda anterior y lleva a su listado filtrado desde la primera página. El filtro activo tiene una acción «Limpiar filtros»; búsqueda, página y selección se conservan en la dirección y los enlaces al detalle. Los KPIs mantienen el resumen global del módulo aunque el listado se filtre. En contabilidad, el resumen responde al intervalo de fechas elegido. Resumen fiscal e Informes sustituyen los indicadores generales por sus tres indicadores específicos, también filtrables, evitando duplicar filas de KPIs.

Facturación mensual muestra base imponible neta de rectificativas hasta la fecha de corte. Pendiente de cobro/pago usa el saldo restante de facturas; Vencidas muestra ese saldo de las facturas que tienen algún plazo atrasado. Cobros y pagos desglosa los plazos pendientes, incluyendo la dirección de los abonos. Presupuestos distingue los vigentes sin respuesta, aceptados sin convertir, caducados sin respuesta y borradores guardados. Los borradores incompletos privados siguen accesibles mediante el filtro Estado y no se suman como documentos guardados. Los recuentos de contactos, importaciones y auditoría se calculan en el servidor sobre todo el negocio; el catálogo y el diario usan sus conjuntos completos, nunca una página parcial. Los contactos con saldos incluyen fichas archivadas para no ocultar deuda.

Con hasta 760 px de contenido los cuatro indicadores forman dos columnas; con hasta 540 px pasan a una columna, sin divisiones, con la etiqueta antes del importe de 22 px. Los textos e importes pueden crecer sin desbordamiento. Los formularios de creación y la edición de configuración mantienen su composición de trabajo sin indicadores ajenos a esa acción.

Los indicadores de la ficha de cada contacto filtran su actividad según su tipo: ventas/compras confirmadas netas de rectificativas, saldos por cobrar y pagar y presupuestos vigentes pendientes de respuesta. El panel Filtros y los enlaces al documento conservan el filtro, la búsqueda de actividad y la página.

### Facturas · intervalo de emisión

Por petición del 14 de septiembre de 2026, Filtros de facturas añade «Fecha de emisión» con los campos Desde y Hasta, tanto al entrar desde un KPI como desde Ver todas las facturas. Reutiliza ListFilters, Field, los campos nativos de fecha y el panel de 15-side-panel-filters.md, sin bordes ni escala nuevos. Se permite indicar ambos extremos o uno solo; ambos días se incluyen y se rechazan intervalos invertidos con error asociado al campo Hasta. Aplicar combina fechas, estado, indicador y búsqueda y vuelve a la primera página; Cancelar descarta los cambios y Limpiar filtros elimina también las fechas. El intervalo permanece en la dirección, la paginación y el regreso desde una factura. El servidor filtra antes de contar y paginar, también en borradores guardados y trabajos incompletos; los trabajos sin fecha de emisión válida quedan fuera cuando hay un intervalo activo.

Verificado a 1440, 390 y 320 px en el servicio app del puerto 3000: ambos accesos, aplicación y limpieza de fechas, límites opcionales, error de intervalo, paginación, recarga y regreso desde la ficha. Las 16 pruebas de intervalo, borradores y ordenación pasan en bases temporales aisladas. Capturas y comprobaciones en `test-results/facturas-fechas/`; la imagen de app incluye la consulta verificada.

### Facturas · filtro por cliente

Por petición del 14 de septiembre de 2026, Filtros de facturas añade Cliente entre Estado y Fecha de emisión. Reutiliza Field y Select con búsqueda por nombre o NIF, mostrando nombre e identificador para distinguir homónimos. Todos elimina la selección. El filtro coincide por NIF normalizado exacto, se combina con fechas, estado, indicador y búsqueda y se aplica antes de contar y paginar. Se conserva en la dirección, recarga y regreso del documento; Aplicar vuelve a la primera página y Cancelar descarta cambios. Limpiar filtros elimina también el cliente. Las opciones incluyen fichas de clientes activas o archivadas, identidades de ventas históricas y clientes del trabajo incompleto propio; el modo lectura excluye esos trabajos y cada negocio mantiene su ámbito. La carga y los errores de clientes se muestran en el campo con reintento, conservando la selección aplicada. No se añaden estilos ni tipografía: el selector usa el portal del panel y se adapta a escritorio y móvil.

Verificado a 1440, 390 y 320 px en el puerto 3000: búsqueda por nombre y NIF, teclado, ambas entradas al listado, combinación con fechas, paginación, regreso, recarga, Cancelar, limpieza, nombres largos, sin resultados y error con reintento. Las 21 pruebas de clientes, fechas, borradores y ordenación pasan en bases aisladas, incluidos permisos y separación de negocios. Capturas y comprobaciones en `test-results/facturas-clientes/`; app sirve el código de consulta verificado.

### Facturas · acceso a la ficha del cliente desde la cabecera

Por petición del 14 de septiembre de 2026, el nombre del cliente de la cabecera negra de una factura es un enlace a su ficha de Clientes y proveedores. Reutiliza PageHeading.titleLink, su subrayado fino, foco visible y área táctil, conservando concepto y vencimiento debajo. Resuelve el NIF normalizado exacto dentro del negocio actual, también si la ficha está archivada o fuera de la primera página del directorio. Abre los indicadores y toda la actividad sin filtros heredados; la dirección queda con el identificador de la ficha para recargar o compartir el acceso. Una ficha ausente o un error de carga permite reintentar o volver al listado.

Verificado en app del puerto 3000 a 1440, 390 y 320 px: enlace con teclado y ratón, ficha archivada fuera de página, homónimos, indicadores, actividad completa, recarga, historial del navegador, otra pestaña, reintento, modo lectura y textos largos. Ocho pruebas de identidad y rutas pasan. Las capturas y resultados están en [revision-enlace-cliente-factura](revision-enlace-cliente-factura/verificacion.json), con datos de API interceptados y recursos reales del servicio.

### Facturas · acceso a la ficha desde la columna Cliente

Por petición del 14 de septiembre de 2026, el nombre de Cliente en la tabla de Facturas de venta abre su ficha en Clientes y proveedores. Reutiliza `contactDetailHref`, con NIF normalizado exacto, acceso a fichas archivadas y sin filtros heredados. Se aplica también a borradores con cliente identificado. El enlace usa `text-link` y `table-name`, con foco visible, ayuda «Ver ficha de…» y adaptación de nombres largos. Por petición posterior del mismo día se elimina su subrayado, también al pasar el cursor, mediante una regla específica en el sistema visual; conserva la tipografía y el comportamiento del enlace. Documento conserva su enlace independiente a la factura; los borradores sin nombre o NIF válido mantienen el texto sin enlace.

### Facturas · hoja visible desde Cliente y Fecha

Por petición del 14 de septiembre de 2026, los tres pasos de la factura comparten la misma hoja de Lectura guiada mediante DocumentSheetLayout. Cliente incorpora el buscador de NIF en el lugar del destinatario; al confirmar, los datos fiscales ocupan ese lugar sin tarjeta añadida. El lápiz permite cambiarlo. Fecha edita Vencimiento dentro de las fechas de la hoja, conservando la emisión automática existente. Los controles de ambos pasos usan la superficie neutra de los conceptos, con etiqueta accesible, errores y foco, sin líneas ni marcos adicionales.

La hoja conserva el ancho y la estructura durante el proceso. Los conceptos y totales aparecen al cumplimentarlos; si se vuelve a Cliente o Fecha, permanecen visibles en lectura mediante DocumentSheetLines, con los mismos cálculos y desglose de la ficha. No se reserva una página vacía ni se repiten formularios junto a una segunda vista previa. Continúan los tres pasos, validaciones, guardado automático y recuperación de borradores. Presupuestos y compras mantienen sus formularios y pasos actuales. La ficha final comparte el renderizado de conceptos sin cambios visuales. Los plazos de pago se agrupan bajo Vencimiento en dos columnas de botones sin borde, con selección y foco visibles; el bloque de fechas reserva espacio para el campo sin comprimirlo.

Verificado en el servicio app del puerto 3000 a 1440, 390 y 320 px: hoja presente en los tres pasos, confirmación y cambio de cliente, nombres largos, validación de vencimiento, conceptos y totales conservados al volver atrás, recuperación en Cliente y Fecha, y guardado del documento. Presupuestos y compras conservan sus cuatro pasos. Pasan las seis pruebas de compatibilidad de pasos y desglose de IVA. Capturas y resultados en `test-results/factura-progresiva/`; las pruebas de navegador usan datos interceptados sin escribir en la base del usuario.

### Facturas · filtro por precio e intervalo

Por petición del 14 de septiembre de 2026, el panel Filtros de facturas permite ordenar por Precio: de mayor a menor o Precio: de menor a mayor. Precio total muestra Mínimo (€) y Máximo (€) juntos en una fila, mediante Field y los inputs del sistema, sin ocultarlos en opciones adicionales. Se acepta coma o punto decimal; cada extremo es opcional e inclusivo. El cálculo usa el total que muestra la columna Precio, con descuentos, IVA y retención. Los importes y la ordenación se conservan al paginar, recargar y regresar del documento, y se combinan con cliente, fechas, estado e indicador. Limpiar filtros elimina ambos límites y el orden; Cancelar descarta cambios. Un intervalo invertido señala y enfoca Máximo, mostrando el error también en móvil.

La consulta filtra y ordena antes de paginar, incluidos los trabajos incompletos del usuario. Los borradores sin importe calculable quedan al final al ordenar y fuera de un intervalo activo. La comparación conserva los céntimos también en importes largos. La disposición usa dos columnas con ancho mínimo cero y el espacio existente del kit 15-side-panel-filters.md y 06-input.md; no se añaden escalas, colores ni bordes.

Verificado en app del puerto 3000 a 1440, 390 y 320 px: ambos sentidos, límites opcionales, coma decimal, error visible, limpieza, cancelación, paginación, recarga, regreso del documento y consulta. Pasan las 21 pruebas de precio, fechas, cliente y ordenación en bases temporales aisladas. Capturas y resultados en test-results/facturas-precios/verificacion.json; la revisión de navegador usa datos simulados y recursos reales del servicio.

### Facturas · consulta y ayudas de creación

La consulta incorpora periodos de emisión rápidos y vencimiento desde/hasta en una sección desplegable. Los precios mínimo/máximo permanecen visibles en la fila ya aprobada, con ordenación en el panel y desde la cabecera Precio. Las herramientas secundarias se reúnen en ActionsMenu junto a Filtros y Buscar: resumen de todo el conjunto filtrado y exportación CSV. El resumen aparece en Modal, sin añadir otra fila de KPIs al listado. Usa definiciones e importes alineados, cifras tabulares y la escala común. Se mantienen errores, reintento y foco.

El paso Fecha conserva la hoja compartida y añade plazos Al contado, 15, 30 y 60 días dentro de Vencimiento. El estado elegido se comunica con aria-pressed y los controles caben en dos columnas sin bordes añadidos. El paso Cumplimentar factura añade Historial del cliente desplegable, después de los campos del documento: saldos reales y un selector para reutilizar conceptos. Deshacer solo aparece mientras conserva íntegra la última inserción. Los avisos por coincidencia y precio cero usan texto contextual; no bloquean la edición. Los enlaces al historial abren otra pestaña para conservar el borrador.

Comprobado en los recursos de app:3000 a 1440, 390 y 320 px, con datos de prueba y sin modificar facturas reales. Ver `test-results/sales-tools/verificacion.json`. La comparación funcional y las limitaciones operativas se conservan en `docs/MEJORAS_VENTAS_Y_COMPARATIVA.md`.

### Facturas · continuar el flujo desde la tabla

Por petición del 14 de septiembre de 2026, cada factura sin liquidar ofrece un único menú «…» junto a Documento, reutilizando ActionsMenu y el espacio de doc-identity-content. El menú contiene Emitir factura en borradores guardados, Continuar borrador en trabajos incompletos y Registrar cobro en pendientes, parciales y vencidas. Cobrada es el estado final y no muestra ese menú. Las rectificativas equivalentes ofrecen Emitir rectificativa y Registrar devolución hasta liquidarse. Los permisos de consulta mantienen las filas sin acciones de modificación.

La emisión comparte IssueDocumentForm con la ficha y conserva el resumen, las consecuencias y la validación de versión; el cobro reutiliza PaymentForm con importe pendiente, fecha y medio de pago. Antes de abrirlos desde la tabla se consulta la versión y el saldo actuales, con carga, error y reintento. Guardar actualiza la tabla sin salir del listado ni perder búsqueda, filtros y orden; si desaparece la última fila de una página, se ajusta a la última página disponible. El foco regresa al documento o al listado si deja de coincidir con el filtro. Se conservan las cinco columnas, los enlaces a factura y cliente, los controles y la escala común, sin bordes ni contenedores nuevos.

Verificado en app del puerto 3000 a 1440, 390 y 320 px: estados y acciones, teclado y foco, cancelación, emisión con reintento, cobros parciales y totales, vencidas, saldo actualizado, errores, borradores incompletos, rectificativas, filtros, última página y modo consulta. Las 31 pruebas de flujo y circuitos financieros pasan en una base temporal aislada. Capturas y resultados en `test-results/facturas-flujo/verificacion.json`; la revisión de navegador intercepta los datos de prueba y usa los recursos reales del servicio.

Por petición posterior del usuario, se retira Vistas guardadas del listado de facturas, su ventana y sus operaciones de servidor. El menú contextual conserva Resumen del filtro y Exportar listado filtrado, con los componentes y el foco existentes.

Retirada verificada en app:3000 a 1440, 390 y 320 px: menú, resumen, exportación, filtros y foco. Evidencia en test-results/sales-without-saved-views/verificacion.json; datos simulados y recursos reales del servicio.

### Facturas · movimientos e historial simplificados

Por petición del 14 de septiembre de 2026, Movimientos e historial de ventas sustituye la tabla por una lista de Cobros (Devoluciones en rectificativas de venta). Cada fila muestra medio, fecha, referencia cuando existe e importe alineado a la derecha. Se omite el estado repetitivo Registrado; Revertido permanece visible. La composición adapta las filas de etiqueta y valor del kit Kronjop × Ley IA, con espacio y tipografía común, sin cabeceras de columnas, líneas ni cajas añadidas.

Historial utiliza un desplegable nativo con objetivo de 44 px, indicador de apertura y foco visible. Empieza cerrado si hay movimientos y abierto si es el único contenido. Conserva todos los eventos, autor y fecha con hora y minutos. Los apartados sin datos no reservan bloques vacíos. Los importes y referencias largos pueden ocupar otra línea en móvil. SalesDocumentActivity reutiliza PanelHeading, document-history y los tokens comunes; compras y presupuestos conservan su presentación.

Verificado en los recursos reales de app:3000 a 1440, 390 y 320 px: cobros, referencias, revertidos, apertura y cierre con teclado, foco, borradores, vacíos, rectificativas, textos e importes largos y modo consulta. Compilación TypeScript y Vite correcta; diez escenarios de navegador sin errores ni escrituras, con datos interceptados. Capturas y resultados en test-results/facturas-actividad/verificacion.json. Actualizado únicamente el servicio app mediante reconstrucción de su imagen.

### Facturas · filtros sin selector de indicador

Por petición del 14 de septiembre de 2026, el panel Filtros de facturas empieza por Estado y elimina el selector Indicador, sin dejar espacio vacío. Conserva Cliente, ordenación, precios y fechas con los componentes y la disposición existentes. Los accesos desde los KPIs mantienen su criterio al aplicar otros filtros; cambiar Estado o Limpiar filtros puede retirarlo como hasta ahora. ListFilters admite que no se proporcionen opciones de indicador, de modo que el cambio queda acotado a este panel.

### Facturas · diez mejoras de usabilidad

Se añade una variante de selección por nombre o NIF con aplicación directa de fichas activas en la hoja. Las fichas archivadas conservan la recuperación explícita. El alta permite completar identificadores de otros formatos sin convertir automáticamente una búsqueda por nombre en una identidad fiscal. Los errores de búsqueda no crean fichas.

Los lápices de cliente y vencimiento editan su bloque sin cambiar de paso ni retirar los conceptos. Cancelar el cambio de cliente conserva la identidad anterior. El borrador ofrece deshacer eliminaciones de conceptos en orden inverso, recuperando posición y datos sin reemplazar las demás líneas. Tab recorre los campos; Ctrl/⌘ + Intro añade un concepto, también con las sugerencias abiertas, y Intro en campos de una factura no guarda el formulario por accidente.

Crear otra factura al guardar prepara un nuevo borrador independiente y permite conservar solo el cliente. La confirmación del guardado queda dentro del siguiente editor, con acceso al borrador anterior, para no tapar Continuar. El siguiente trabajo conserva su propia recuperación y deja de depender del documento de origen una vez guardado.

Registrar cobros se abre desde Más opciones del listado de ventas. Las facturas seleccionadas conservan el importe editable en su propia fila, también al buscar o cambiar de página; se respeta el máximo de 100 del servidor. Los cobros individuales y múltiples muestran Pendiente, Registras y Quedarán con cálculo decimal y validación de importes. Se mantienen los endpoints financieros, la revisión del saldo vigente y el registro transaccional.

Factura anterior y Factura siguiente se sitúan en el contenido del detalle cuando se entra desde un listado de ventas. La consulta mantiene filtros y orden, cruza páginas y respeta empresa, permisos y privacidad de trabajos incompletos. Si un documento deja de coincidir con el filtro, se informa sin inventar una posición. Un listado sin resultados permite retirar cada criterio presente por separado.

Las disposiciones nuevas reutilizan controles, superficies planas, espacio y tipografía del sistema. No se crean escalas locales ni nuevas cajas por fila. Este bloque no añade creación desde la ficha del cliente ni unificación de los recorridos de otros documentos; las ampliaciones simultáneas de Presupuestos se documentan aparte.

Retirada verificada en app:3000 a 1440, 390 y 320 px: campo ausente, Estado en primer lugar, aplicación, cancelación, limpieza, acceso desde KPIs y restauración del foco con Escape. Compilación correcta y capturas revisadas; evidencia en test-results/facturas-sin-indicador/verificacion.json, con datos interceptados y recursos reales del servicio. Imagen de app reconstruida y actualizada.

### Facturas · registro de cobros en Cobros y pagos

Por petición posterior del 14 de septiembre de 2026, se retiran Registrar cobros del menú del listado y Registrar cobro de las filas y la ficha de facturas. El registro de cobros se realiza desde Cobros y pagos. Se conservan estados, saldos, historial y acciones de borradores, sin reservar espacios vacíos. Esta decisión sustituye el acceso al cobro desde la tabla descrito anteriormente.

Verificado en app:3000 a 1440, 390 y 320 px. La suite final pasa 166 pruebas; los recorridos usan datos interceptados y recursos reales. Detalles y alcance en [MEJORAS_USABILIDAD_VENTAS.md](MEJORAS_USABILIDAD_VENTAS.md), con capturas y resultados en `test-results/sales-usability/`.

### KPIs · cifras sin decimales

Por petición del 14 de septiembre de 2026, todos los KPIs muestran números enteros, redondeados al entero más cercano mediante formatKpiValue. Se mantiene el formato español y el símbolo € en importes. El criterio se aplica a Visión general, su cifra resumen de detalle, indicadores de módulos y fichas de contactos. Solo cambia la presentación del indicador: cálculos, tablas, documentos y formularios conservan sus decimales.
Verificado en app:3000 a 1440, 390 y 320 px: 15 comprobaciones de Visión general, módulos, fichas y resumen de detalle, con importes positivos, negativos y cero. Los enlaces de KPI mantienen su filtro; no hay desbordamiento horizontal ni errores de navegador. Los recursos servidos coinciden con la compilación. Evidencia en test-results/kpis-sin-decimales/verificacion.json, usando datos interceptados sin escrituras reales.

### Presupuestos · adaptación al diseño y al flujo de Ventas

Por petición del 14 de septiembre de 2026, Presupuestos adopta la composición vigente de Facturas de venta. Esta decisión sustituye las excepciones anteriores que mantenían cuatro columnas y cuatro pasos de creación en Presupuestos. Se reutilizan PageHeading, ModuleKpis, DocumentTable, ListToolbar, ListFilters, ActionsMenu y la hoja de Lectura guiada; permanecen la escala, los pesos y los tokens comunes, sin añadir hojas de estilos ni contenedores por fila. Las referencias del nuevo catálogo son Tabla de personas, Tabla de documentación, Campos y ayuda y Confirmación y panel lateral, subordinadas a las adaptaciones aprobadas de Facturación.

La entrada muestra la cabecera, Nuevo presupuesto y los cuatro indicadores existentes: pendientes de respuesta, aceptados sin facturar, caducados y borradores. Cada indicador abre su listado conservando la fecha de corte; Ver todos los presupuestos abre la consulta completa. El listado oculta los KPIs y el título regresa al resumen, igual que en Ventas.

La tabla utiliza Documento, Cliente, Válido hasta, Estado y Precio, con la distribución compartida de cinco columnas y adaptación móvil. Cliente enlaza a su ficha por NIF. Precio muestra el total del presupuesto, con céntimos, descuentos, IVA y retención. Válido hasta y Precio permiten ordenar desde la cabecera; Estado se elige dentro de Filtros. El panel comparte cliente, fechas de emisión, periodos, intervalo de validez y precio mínimo/máximo. Omite ordenación por deuda y mantiene la retirada del selector Indicador. Estado añade Caducados; los indicadores siguen disponibles en la entrada. Los filtros se aplican antes de paginar y permanecen al recargar o regresar del documento.

Más opciones del listado ofrece Resumen del filtro y Exportar listado filtrado. El resumen incluye recuento, importe total y borradores de todas las páginas; los presupuestos no se presentan como deuda. La descarga presupuestos.csv conserva el filtro y el orden, etiqueta Válido hasta y omite la columna de pendiente de cobro. El selector de clientes incluye las identidades históricas de presupuestos y los trabajos del usuario en la empresa activa, sin incorporar clientes exclusivos de facturas por ese motivo.

Cada fila mantiene un único menú de acciones: continuar o confirmar un borrador, registrar aceptación o rechazo, convertir el aceptado en borrador de factura y abrir la factura creada. Los trabajos incompletos conservan Descartar borrador dentro de ese menú. La confirmación reutiliza IssueDocumentForm; aceptación, rechazo y conversión actualizan el listado con notificación, conservando filtros, página y foco. Antes de actuar se comprueba el documento actual; un cambio concurrente refresca las acciones disponibles. Los confirmados cuya validez ha terminado muestran Caducado y dejan de ofrecer aceptación. El servidor conserva sus transiciones y evita la doble conversión.

La ficha utiliza el nombre del cliente enlazado a su ficha, primer concepto y Válido hasta en la cabecera. Los borradores muestran allí su estado y Editar borrador; Confirmar presupuesto permanece sobre la hoja. La factura creada queda accesible en el menú de los convertidos. Se conservan el PDF, los adjuntos, el historial y los permisos.

La creación pasa a Cliente → Fecha → Cumplimentar presupuesto, sobre la misma hoja del documento. Se trasladan la búsqueda por nombre o NIF, la selección directa del cliente, la edición contextual de cliente y validez, el catálogo dentro del concepto, el precio con coma decimal y precisión conservada, el cálculo de totales, deshacer conceptos y Ctrl/Cmd + Intro para añadirlos. La validez ofrece 7, 15, 30 y 60 días desde la fecha del presupuesto. Crear otro presupuesto al guardar permite conservar el cliente y muestra el enlace al borrador anterior dentro del contenido, para no tapar controles en móvil. Los antiguos pasos Conceptos y Revisión se recuperan en el tercer paso conservando los datos y el guardado automático. Compras mantiene sus cuatro pantallas.

Verificado en app:3000 a 1440, 390 y 320 px: 63 comprobaciones de navegador sin errores, con revisión de capturas de resumen, tabla, filtros, ficha y editor completo. Incluye acciones comerciales, errores y reintento, orden, filtros, exportación, cálculo, deshacer, crear otro conservando cliente, recuperación de revisión antigua, cuatro pasos de compras y permisos de consulta. Las respuestas de prueba se interceptan en el navegador; los recursos pertenecen al servicio real. Filtros, clientes históricos, importes, CSV, caducidad, conversión única y aislamiento de empresa se verifican por separado en PostgreSQL temporal, junto con la compatibilidad de pasos y regresiones de Ventas. Evidencias en `test-results/presupuestos-redesign/verificacion.json` y pruebas en `tests/quotes-design.test.ts`. La imagen de app se reconstruyó y actualizó conservando la base del usuario.

### Facturas · emisión directa desde el editor

El último paso de Facturas de venta ofrece Guardar en borrador y Emitir factura en el menú contextual «…», reutilizando ActionsMenu. La hoja actúa como revisión; no se añade una ventana de confirmación ni se exige abrir antes el borrador. El aviso junto al cierre del formulario explica la asignación del número y la rectificación posterior. Presupuestos y Compras conservan sus acciones actuales. Crear otra factura al guardar sigue asociado al guardado del borrador; emitir abre la ficha emitida.

Guardar y emitir se ejecutan dentro de una misma transacción, con las comprobaciones y el archivo PDF de la emisión existente. Un rechazo conserva el trabajo y permite corregirlo. Ante un resultado incierto se bloquean los campos y la acción alternativa, se conserva la petición original y se permite reintentar, también tras recargar, sin duplicar la factura.

Verificado en app:3000 a 1440, 390 y 320 px: menú de dos acciones, validación, protección frente a Intro, guardado, emisión sin modal, corrección de errores y recuperación de red con la misma clave de operación. Recursos reales y respuestas interceptadas, sin emitir documentos del usuario. Capturas revisadas y resultados en test-results/direct-issue/verification.json. Las 175 pruebas del proyecto pasan, incluida tests/direct-issue.test.ts sobre PostgreSQL temporal. Imagen de app reconstruida y servicio actualizado conservando la base de datos.

### Contactos · acciones, pendientes, ordenación y extracto

Por petición del 14 de septiembre de 2026, la ficha incorpora un menú contextual junto a Ver datos. Ofrece crear factura y presupuesto para clientes, registrar compra para proveedores y las tres opciones en contactos de ambos tipos. El documento abre Fecha con el contacto seleccionado, con un trabajo independiente; recuperar un borrador conserva su contenido. Las fichas archivadas no ofrecen crear documentos. Registrar cobro y Registrar pago muestran exclusivamente los documentos pendientes de esa identidad fiscal, incluidas devoluciones, y reutilizan el formulario financiero existente. Registrar el movimiento actualiza la ficha sin salir. Los permisos de consulta permiten descargar el extracto, sin acciones de escritura. Estos accesos son propios de contactos y no cambian la retirada de los cobros en las pantallas de ventas.

El directorio ocupa el ancho disponible. Conserva nombre y NIF y añade Por cobrar y Por pagar solo cuando hay importe, con los vencidos debajo del saldo correspondiente. No se compensan ambos sentidos entre sí. Las cuotas pagadas dejan de contar como vencidas. En móvil, los importes pasan debajo de la identidad; se mantienen céntimos y la escala común, sin bordes ni contenedores por registro.

Filtrar contactos incorpora Ordenar por: nombre ascendente o descendente, mayor pendiente de cobro o pago, próximo vencimiento y última actividad. El servidor ordena antes de paginar, con desempate estable y fechas ausentes al final. El orden se conserva en la URL, al volver de una ficha y al recargar. Al ordenar por fecha, se muestra el vencimiento o la última actividad en la fila.

Descargar extracto abre Desde, Hasta y Formato (PDF o Excel). Incluye todos los documentos definitivos y movimientos del intervalo, sin limitarse a una página de la actividad. Mantiene separados cobros, pagos, reversiones, anticipos y compensaciones sin movimiento de caja. Los saldos se etiquetan como actuales y de todas las fechas; no representan un cierre histórico. No se exportan notas internas. PDF repite cabeceras y numera páginas. Excel conserva fechas e importes tipados, filtros y cabecera fija; los importes que exceden la precisión de Excel se guardan como texto exacto.

Verificado con 32 pruebas de contactos, saldos, filtros, permisos y aislamiento en PostgreSQL temporal; recorridos a 1440, 390 y 320 px con datos interceptados y recursos reales de app:3000. Revisión visual de fichas, formularios, PDF multipágina y hojas de Excel. Evidencias en `test-results/contact-tools/` y `tests/contact-tools.test.ts`.

### Facturas · botón Finalizar

La segunda propuesta aprobada sustituye los tres puntos aislados del último paso por «Finalizar …». Reutiliza la clase button y el mismo marco, altura y tipografía de Anterior. ActionsMenu admite una etiqueta visible opcional; en Facturas abre Guardar en borrador y Emitir factura. Los demás menús conservan su presentación. Se mantienen el flujo de emisión, el guardado y la recuperación.
Verificado en app:3000 a 1440, 390 y 320 px: Finalizar comparte altura, borde, fondo y tipografía con Anterior. Guardar, emitir, validación y recuperación pasan sin errores de navegador. Evidencias en test-results/finalizar-button/verification.json. Compilación correcta e imagen de app actualizada.

### Facturas emitidas · siguientes acciones

El resumen de una factura emitida termina con «Acciones …», del mismo estilo que Finalizar, acompañado de «Factura emitida. Ya puedes descargarla y enviarla al cliente.». El menú ofrece Descargar PDF, Crear otra factura y Volver a facturas. La descarga conserva la empresa activa y el nombre del documento; crear otra abre un trabajo independiente; volver recupera el listado de ventas de origen si existe. En cuentas de consulta, Crear otra factura permanece deshabilitado. Se reutilizan ActionsMenu y los tokens de espacio, sin añadir contenedores ni divisores.
Verificado en app:3000 a 1440, 390 y 320 px: tres opciones, descarga efectiva con nombre PDF, nueva factura independiente, regreso al listado filtrado, foco tras Escape, ausencia en borradores y permisos de consulta. Sin errores de navegador ni desbordamiento; capturas revisadas en test-results/issued-actions/. Compilación correcta y servicio app actualizado, conservando la base de datos.

### Compras y gastos · diseño y navegación de Ventas

Por petición del 14 de septiembre de 2026, Compras y gastos adopta la composición vigente de Facturas de venta. Sustituye la excepción anterior de cuatro pasos y del listado con indicadores. Reutiliza PageHeading, ModuleKpis, DocumentTable, ListToolbar, ListFilters, ActionsMenu, SectionNavigation y DocumentSheetLayout, con los tokens y la escala comunes. Referencias: tablas de documentación, campos, acciones y paneles del nuevo kit, subordinadas a las adaptaciones aprobadas de Facturación.

La entrada presenta Compras del mes, Pendiente de pago, Facturas vencidas y Borradores. Ver todas las compras abre el listado; cada indicador conserva su criterio y fecha de corte. El título del listado regresa al resumen. La tabla comparte las cinco columnas de Ventas: Documento, Proveedor, Vencimiento, Estado y Precio. Añade bajo el número interno la referencia de la factura del proveedor, útil para identificar el original. Proveedor enlaza a su ficha. Precio y Vencimiento permiten ordenar; el orden, los filtros y la página se conservan al recargar o regresar.

El panel de filtros incluye Estado, Proveedor, emisión, vencimiento e importes; conserva el criterio de no mostrar selector de indicador. Las identidades de proveedor provienen de fichas de proveedor o mixtas, compras históricas y trabajos propios dentro de la empresa activa. Más opciones ofrece resumen del filtro completo y compras.csv con proveedor, referencia original y pendientes. El resumen distingue Pendiente de pago y Abonos por recibir: aplica los saldos después de pagos y compensaciones, excluye borradores del pendiente y resta abonos del total.

Las filas de borrador permiten editar, continuar o contabilizar; los trabajos incompletos conservan Descartar dentro del mismo menú. La ficha muestra proveedor, conceptos y vencimiento en la cabecera y permite recorrer Compra anterior / Compra siguiente manteniendo la consulta, incluso entre páginas. Los pagos ordinarios se registran desde Cobros y pagos, siguiendo el recorrido actual de Ventas; permanecen saldos, vencimientos, abonos, adjuntos e historial.

El editor pasa a Proveedor → Fecha → Cumplimentar compra. El proveedor ocupa el lugar del emisor en la hoja y la empresa propia el de destinatario. La fecha de la factura original y su número se editan en Fecha, junto al vencimiento y los plazos rápidos. Los lápices permiten cambiar proveedor, fecha, referencia y vencimiento conservando los conceptos. Cancelar el cambio de proveedor restaura la identidad anterior y evita que el cierre de sugerencias desplace el botón durante la pulsación.

La hoja comparte búsqueda por nombre o NIF, catálogo en el concepto, coma decimal, descuentos, retención, cálculo de totales, deshacer y Ctrl/Cmd + Intro. Crear otra compra al guardar puede conservar únicamente el proveedor; la nueva referencia queda vacía y el borrador anterior tiene un enlace dentro del contenido. Los antiguos pasos Conceptos y Revisión se recuperan en la hoja final conservando sus datos. La fecha de registro contable sigue disponible en Datos adicionales; un error en la referencia principal no despliega ese bloque.

El cierre ofrece Guardar en borrador y Contabilizar compra en el menú contextual, como Ventas. Guardar y contabilizar reutiliza la transacción, bloqueo de versión, idempotencia, archivo PDF y controles contables existentes. El rechazo conserva el trabajo; un resultado incierto mantiene la acción y la petición para reintentar sin duplicar la compra.

### Facturas · búsqueda por petición en el buscador existente

Por petición del 14 de septiembre de 2026, la lupa junto a Filtros admite peticiones como «Pendientes de Ana de septiembre de 2026 por más de 500 €». Reutiliza ListToolbar y ListSearch, con una interpretación en el flujo bajo el campo, sin otro apartado ni chat. La apertura vacía muestra un ejemplo; el campo conserva su ancho mientras se escribe y responde al ancho disponible en móvil. Las acciones usan el patrón quiet-link del panel de filtros, con objetivo de 44 px, foco y tipografía común. La referencia es Toolbar y búsqueda / Campos y ayuda del kit Kronjop × Ley IA, subordinada al sistema vigente.

El intérprete local reconoce estados, clientes, periodos de emisión y vencimiento, fechas concretas, intervalos e importes y ordenación. Los clientes se consultan desde document-customers dentro del negocio y los permisos actuales. Las coincidencias múltiples requieren elegir nombre y NIF en Select; una consulta fallida permite reintentar y un cliente ausente no se sustituye por otro. Los meses sin año muestran el año usado y permiten corregirlo; las semanas van de lunes a domingo. «Más de» y «menos de» se convierten a límites inclusivos ajustados un céntimo, conservando la precisión decimal de la consulta existente.

La lista no cambia mientras se escribe. Intro o Aplicar búsqueda valida la interpretación y sustituye los criterios anteriores, incluido el indicador de origen. La búsqueda literal por número, nombre o NIF sigue disponible con Intro; Buscar como texto permite utilizar literalmente una frase que coincida con la gramática. El texto no reconocido se señala y bloquea la aplicación interpretada, sin omitir condiciones. Es una gramática acotada y no un asistente general; no ejecuta acciones sobre documentos ni utiliza servicios externos de IA.

La frase aplicada se conserva en la dirección y el campo, junto con los valores efectivos de los filtros. Paginación, recarga y regreso desde la factura mantienen esos valores, sin recalcular periodos relativos. Al cambiar un criterio manualmente se retira la frase para no mostrar una interpretación desactualizada. Escape y la X cierran y limpian la búsqueda; si procedía de una petición, limpian sus criterios. La API y la exportación reciben los filtros validados, no la frase. Presupuestos y Compras conservan su búsqueda habitual.

Verificado en app:3000 a 1440, 390 y 320 px: interpretación previa sin cambiar resultados al escribir, homónimos, selección por NIF, límites estrictos e inclusivos, año corregible, vencimiento, ordenación, sustitución de filtros, modo literal, errores y reintento, teclado, recarga, paginación, regreso desde documento y edición manual de filtros. Capturas finales revisadas sin desbordamiento. Pasan las 30 pruebas del intérprete, el buscador común y los filtros reales de clientes, fechas e importes en PostgreSQL temporal. Compilación correcta, imagen reconstruida y app actualizado conservando la base del usuario. Evidencia de navegador con datos interceptados en test-results/sales-natural-search/verificacion.json; pruebas en tests/sales-search.test.ts.

Verificado en app:3000 a 1440, 390 y 320 px: 87 comprobaciones del resumen, filtros, tabla, ficha, navegación, edición, validación, guardado, contabilización, recuperación y permisos. Sin errores de navegador ni desbordamiento horizontal; capturas revisadas. Las respuestas de prueba se interceptan y no modifican documentos del usuario. Recursos servidos comprobados por hash y servicio saludable con la imagen reconstruida. Pasan las 199 pruebas del proyecto, incluidas las de Compras en PostgreSQL temporal. Evidencias: test-results/purchases-redesign/verificacion.json y tests/purchases-design.test.ts.

## Regreso con flecha y etiqueta corta · 14 de septiembre de 2026

La propuesta 5 aprobada incorpora `PageHeading.backLink` encima del título: flecha izquierda y nombre corto («Factura», «Presupuesto», «Compra / gasto», «Cobro», «Clientes» o «Catálogo»), sin «Volver al listado» ni subrayado. Sustituye el título enlazado de regreso en los listados de ventas, presupuestos, compras, clientes y catálogo. Cobros ofrece el regreso a su vista inicial desde otras vistas o criterios. Los resúmenes iniciales no muestran un regreso a sí mismos.

Las fichas documentales conservan el destino de origen validado y sus filtros; la etiqueta identifica ese destino, incluidos Cobro, Clientes y Visión general. El editor permite regresar a la ficha del borrador o al listado del apartado. Los enlaces a la ficha del tercero conservan su función independiente. El regreso tiene un objetivo de 44 px, nombre accesible «Volver a …», foco visible, icono decorativo y texto de la escala común; respeta abrir en otra pestaña. Este criterio sustituye la retirada previa de flechas para estos apartados.

## Barra lateral contraída con iconos · 14 de septiembre de 2026

Al contraer la navegación de escritorio, se conserva una columna negra de 72 px con los ocho iconos de los apartados, el selector de negocio, Configuración y Cerrar sesión. El control superior alterna «Contraer menú» y «Expandir menú». La columna mantiene filas de 44 px, el indicador de apartado activo, nombres accesibles, ayudas al pasar el cursor y foco visible; no queda inerte ni oculta para lectores de pantalla. Los títulos de grupo permanecen accesibles sin ocupar espacio visual. El contenido aprovecha el ancho liberado y la preferencia anterior de menú oculto se recupera como menú contraído al recargar.

En móvil se conserva el menú superpuesto con cierre, Escape y restauración de foco; la preferencia de escritorio no reduce el ancho de los formularios móviles. El modo integrado sigue sin navegación propia. Esta decisión sustituye la ocultación completa de la barra en escritorio.

Comprobado en la app del puerto 3000 a 1440 × 900, 1366 × 768, 1024 × 600 y 761 × 600: columna de 72 px, ocho destinos con nombres accesibles, selección, controles de cuenta, ausencia de desbordamiento, expansión y persistencia tras recarga. Revisados el cambio a móvil, apertura/cierre con Escape y restauración de foco a 390 y 320 px, además del modo integrado. Registro: `test-results/sidebar-icons/verification.json`.

## Flecha en el borde de la navegación · 14 de septiembre de 2026

El control de escritorio se sitúa sobre el borde derecho de la barra, con una flecha hacia la derecha cuando está contraída y hacia la izquierda cuando está desplegada. Su centro acompaña el borde al cambiar entre 72 y 272 px, sin invadir la cabecera del contenido ni quedar recortado por el desplazamiento de la barra. Sustituye el icono de panel anterior, mantiene un objetivo de 44 px, ayuda y nombre accesible, foco visible y activación con Intro o Espacio. Respeta movimiento reducido y la preferencia guardada. En móvil, el acceso al menú cerrado también utiliza una flecha derecha; el cierre conserva la X.

### Documentos · espacio compacto y estado en la cabecera

Por petición del 14 de septiembre de 2026, las fichas de facturas, presupuestos, compras/gastos y rectificativas muestran siempre su estado en la esquina inferior derecha de la cabecera negra, mediante PageHeading.status. Incluye borradores, pendientes, parciales, vencidos, cobrados/pagados, presupuestos confirmados/aceptados/rechazados/convertidos/caducados y devoluciones. Los importes pendientes y lo liquidado acompañan al estado sobre negro, conservando los céntimos y las etiquetas accesibles. El estado permanece al cambiar a Vencimientos, Archivos adjuntos o Movimientos e historial. Se retira la franja de estado sobre la hoja; las acciones de gestión permanecen cuando proceden y no dejan un bloque vacío al desaparecer.

En estas fichas, el aside ocupa 176 px y la separación con el contenido es de 16 px. Se elimina su línea vertical continua y se conserva la marca de la sección seleccionada y el foco. El contenido empieza 16 px bajo la cabecera, sin el relleno superior adicional de Configuración. El marco neutro pasa a 16 px, la hoja aprovecha el ancho del contenido y su relleno interior es de 32 px. En móvil, el selector de sección precede al documento; se usan 8 px de marco y 24/16 px de relleno interior. Estos ajustes de disposición afectan a las fichas de documentos; las escalas tipográficas siguen siendo comunes.

Comprobación en app:3000 a 1440, 390 y 320 px: estados, saldos, textos largos, navegación entre secciones y transición de borrador a emitido. Capturas y resultados en `test-results/document-header-compact/`. Datos de prueba interceptados, sin modificar registros del usuario; recursos reales del servicio app reconstruido.

## Recorrido de documentos en la cabecera · 14 de septiembre de 2026

Por elección del usuario, las fichas de ventas y compras sustituyen «Factura/Compra anterior» y «siguiente» por dos chevrones y el contador «2 de 50». Se sitúan dentro de la cabecera negra, justo debajo del estado y del saldo, alineados a la derecha. `PageHeading.navigation` conserva esta posición común. Los controles son cuadrados, de 44 px, con superficie neutra sobre negro, nombres accesibles, ayuda y foco visible; se desactivan al llegar al primer o último documento.

El contador expresa la posición y el total del listado filtrado completo, conservando orden, filtros y enlace de origen al cruzar páginas. Incluye los trabajos propios cuando el listado de borradores los muestra. Mientras carga no se inventa una posición; los errores permiten reintentar y un documento que deja de coincidir con los filtros conserva el aviso. Este recorrido se mantiene visible al cambiar de sección dentro de la ficha.

### Factura emitida · acciones reunidas en la cabecera

Por petición del 14 de septiembre de 2026, Descargar PDF y Crear otra factura pasan al menú de la cabecera negra de la factura emitida. La descarga conserva el nombre del documento y la empresa activa; crear otra factura abre un trabajo nuevo independiente y requiere permiso de edición. Se retiran el menú Acciones y el texto auxiliar del pie de la hoja. No se duplica Volver a facturas: se conserva el enlace de regreso de la cabecera con su destino y filtros. Las acciones existentes del menú y el recorrido anterior/siguiente permanecen disponibles.

Verificado a 1440, 390 y 320 px: menú único en cabecera, descarga con nombre de factura y empresa activa, nueva factura con trabajo independiente desde Adjuntos, enlace de regreso con filtros, permisos de consulta y borradores, Escape y restauración del foco. Sin bloque inferior ni desbordamiento horizontal. Evidencia en `test-results/invoice-header-actions/verificacion.json`, con datos interceptados y recursos reales de app:3000.

### Facturas · hoja amplia con proporción A4

Por petición del usuario, Cliente y Fecha mantienen un ancho máximo de 720 px. Cumplimentar factura amplía la hoja blanca hasta 960 px y adopta una altura mínima en proporción 210:297, igual que la ficha de factura. Esta decisión sustituye para facturas de venta la altura exclusiva del contenido descrita en Lectura guiada. Se amplía el espacio entre emisor, cliente, conceptos y totales, que cierran la zona inferior del papel. La hoja crece cuando los conceptos o campos adicionales lo necesitan, sin altura fija ni recorte. Con 700 px o menos de ancho disponible, la altura vuelve a adaptarse al contenido y se conservan los controles móviles. Se reutiliza la tipografía común; la exportación PDF y los demás tipos de documento conservan su diseño.

## Punta integrada sin fondo · 14 de septiembre de 2026

La última elección del usuario es la primera propuesta minimalista: un chevron pequeño dentro del extremo superior derecho de la barra, sin fondo ni pestaña exterior. Apunta a la derecha para expandir y a la izquierda para contraer. Sustituye la flecha con asta y su posición sobre el borde. Conserva un objetivo de 44 px, nombre accesible, ayuda, foco de teclado y preferencia guardada; el espacio de marca se ajusta para evitar superponer controles. La navegación contraída sigue mostrando los iconos.
Verificado en app:3000 a 1440, 390 y 320 px: Cliente y Fecha con hoja de 672 px en escritorio; Cumplimentar factura de 960 × 1358 px; ficha de 864 × 1222 px. Las facturas con 18 conceptos crecen sin recortarse. En móvil se conserva el ancho disponible, sin altura mínima de A4 ni desbordamiento. Capturas revisadas y resultados en test-results/invoice-paper/verification.json. Compilación correcta y servicio app actualizado conservando la base de datos.

## Recorrido común entre registros · 14 de septiembre de 2026

Por petición del usuario, `RecordNavigation` extiende los chevrones y el contador de la cabecera a presupuestos, compras/gastos y sus abonos, clientes/proveedores, artículos del catálogo y documentos abiertos desde Cobros y pagos. Conserva ubicación bajo el estado y el importe, foco visible, objetivos de 44 px, extremos desactivados y avisos de carga, error o exclusión del filtro.

El recorrido de clientes respeta búsqueda, estado, tipo, indicador y orden antes de paginar. El catálogo añade una ficha de consulta accesible desde el nombre del artículo; mantiene la edición en el formulario existente. Ambas fichas regresan al listado filtrado. Los vencimientos recorren plazos, incluidos varios de la misma factura, y los movimientos recorren las entradas de la vista actual (los últimos 250 resultados). Fecha e importe identifican el plazo o movimiento seleccionado. Las vistas de creación o edición conservan sus controles propios.

## Cobros, contabilidad y navegación contextual · 14 de septiembre de 2026

Por petición del usuario, Facturas de venta es la referencia visual de las secciones de gestión. Cobros y pagos y Contabilidad separan ahora su resumen inicial del listado, con el enlace bajo el título y los indicadores comunes. El listado de cobros reutiliza `ListToolbar`, `Modal` lateral, `Field` y `Select`, mantiene Vista y los filtros de encabezado y recupera el importe pendiente por plazo. Cada fila ofrece una única entrada de acciones para registrar el movimiento o abrir el documento. Los nombres enlazan a la ficha fiscal por NIF, conservando el origen.

Facturas pendientes, parciales y vencidas vuelven a permitir registrar cobros desde su fila y desde el menú de cabecera. Compras aplica el mismo patrón a los pagos. Esto sustituye las decisiones anteriores que remitían los cobros y pagos ordinarios exclusivamente a su apartado. Los documentos saldados y los permisos de consulta no ofrecen esa acción. Se reutiliza el formulario y la vista previa de saldo; desde un plazo se propone su importe, validado contra el saldo actual del documento.

Contabilidad mantiene diario, sumas y saldos, informes, mayor, borradores, cuentas, resumen fiscal y periodos. El diario usa una tabla común con número de asiento, concepto, fecha, origen e importe. El número abre el detalle y el concepto abre el documento asociado. El menú agrupa las acciones secundarias. En móvil, sus filas se apilan como los documentos de ventas, manteniendo importe y acciones visibles; las demás tablas conservan desplazamiento local cuando lo necesitan. El periodo se edita en el panel lateral con atajos; la búsqueda del diario no se muestra en vistas donde no tiene efecto. Los enlaces de cuentas abren el mayor conservando el intervalo y los documentos regresan a su vista contable de origen.

Clientes y proveedores incorpora el acceso al listado bajo el título de su resumen. Las acciones de una ficha se reúnen en el menú de la cabecera, incluyendo Ver datos, crear documentos, registrar movimientos y extracto. Crear desde la ficha conserva el tercero y el regreso. El catálogo incorpora creación de factura y presupuesto con los datos del artículo; los borradores recuperados mantienen sus cambios. Presupuestos conserva sus acciones y añade regreso contextual desde la factura creada. Los enlaces de regreso admiten exclusivamente rutas internas conocidas.

La bienvenida elimina reloj, fecha e icono del saludo. La marca se descarga de kronjop.com y se incorpora como recurso local, conservando la proporción del logotipo. El símbolo del menú usa la versión publicada con contraste sobre negro.

Referencias: `03-module-header.md`, `08-toolbar.md`, `11-stat-tile.md`, `15-side-panel-filters.md` del kit histórico y las familias de cabeceras, tablas, acciones y campos del catálogo Kronjop × Ley IA. Se mantienen la escala tipográfica y tokens comunes. Investigación y alcance en `REDISENO_FLUJOS_2026-09-14.md`; copia previa en `backups/antes-diseno-flujos-20260914-183408/`.

Verificado en app:3000 con 203 pruebas del proyecto y 96 comprobaciones de navegador a 1440, 390 y 320 px. Capturas revisadas, importes y acciones visibles en el diario móvil, recursos contrastados por SHA-256 y servicio app reconstruido y saludable. Evidencias en `test-results/redesign-flows/verification.json`; las operaciones de prueba usan una base temporal independiente.

## Selector de vista en Cobros y pagos · 15 de septiembre de 2026

Por petición del usuario, el listado de Cobros y pagos elimina el selector Vista de la barra. Vencimientos pendientes, Movimientos registrados y Anticipos y fondos se seleccionan desde el panel de filtros existente, sin duplicar el control.

## Resumen y exportación dentro de Filtros · 15 de septiembre de 2026

Por petición del usuario, los listados de ventas, presupuestos y compras eliminan el menú «Más opciones del listado» de la barra. El panel de filtros contiene el desplegable «Resumen del filtro aplicado» y «Exportar listado filtrado». Ambas acciones conservan el alcance del listado actual y todas sus páginas; cambiar campos del panel requiere Aplicar para actualizar el listado. El resumen se despliega en el mismo panel, sin abrir otra ventana.

## Encabezados con ordenación directa · 15 de septiembre de 2026

Por petición del usuario, Estado permanece como columna informativa y se filtra únicamente desde el panel. Los encabezados Vencimiento, Válido hasta y Precio alternan orden descendente en la primera pulsación y ascendente en la siguiente, sin desplegables. Cobros y pagos usa el mismo patrón para Vencimiento y Pendiente. Se comparte `TableSortButton`, con flecha de dirección, `aria-sort` en la columna y objetivo de 44 px. La ordenación abarca el listado completo, vuelve a la primera página y se conserva al filtrar, paginar y recorrer fichas.

## Flechas sutiles en columnas ordenables (16/09/2026)

TableSortButton sustituye las flechas con asta por chevrones Lucide de 13 px y trazo de 1,6, siguiendo las referencias del usuario. Muestra subir y bajar cuando aún no hay orden aplicado, y solo la dirección activa al ordenar. Usa el gris secundario común, con opacidad del 75 % en reposo y completa en la columna ordenada. Se aplica a Vencimiento, Válido hasta, Total y Pendiente, conservando el área de 44 px, los nombres accesibles, aria-sort y el orden de los registros.

## Fechas breves según el año del sistema (16/09/2026)

El formato breve común de la interfaz omite el año únicamente cuando coincide con el año actual del sistema: en 2026, «14 nov 2026» se muestra como «14 nov». Las fechas de cualquier otro año, anterior o posterior, lo conservan. La comparación se calcula al formatear, sin fijar 2026 como constante, para que se adapte al cambio de año. Se mantiene el día y mes en español y la interpretación de fechas sin desplazamientos horarios; los valores guardados y los formatos de los PDF no cambian.

## Encabezados de tabla sin fondo al pasar el cursor (16/09/2026)

Por aclaración del usuario, la fila de encabezados de las tablas documentales mantiene el fondo transparente al pasar el cursor y al enfocar sus controles. El fondo de hover y foco se limita a las filas del cuerpo de la tabla. Los números de documento y Borrador recuperan el subrayado al pasar el cursor; se mantienen los enlaces, la apertura de filas, los controles de ordenación y el foco visible de teclado.

## Navegación desde filas y nombres · 15 de septiembre de 2026

Los nombres enlazados de clientes y proveedores se subrayan al pasar el ratón o recibir foco de teclado. El enlace ocupa el nombre; el espacio restante de la celda sigue perteneciendo a la fila. En los listados con ficha de consulta, pulsar fuera de los controles abre el mismo destino que el enlace principal: documento maquetado en ventas, presupuestos, compras, vencimientos, movimientos e historial del contacto; ficha en catálogo; documento o asiento en contabilidad. Los resultados importados abren el registro concreto.

Se comparte `openTableRow`, que respeta enlaces secundarios, botones, campos, desplegables, menús en portales, selección de texto y clics modificados. Se conservan los enlaces nativos para teclado y los parámetros de regreso. Las filas sin ficha propia mantienen sus acciones explícitas. El directorio de contactos conserva su fila completa como botón y subraya el nombre en hover y foco.

## Limpiar filtros al principio · 15 de septiembre de 2026

«Limpiar filtros» se coloca al principio del contenido del panel, antes de los campos. Se aplica en `ListFilters` (ventas, presupuestos, compras y catálogo), Cobros y pagos y actividad del contacto. El directorio de contactos ya presenta la acción al principio. Se conserva la lógica de limpieza y aplicación existente, con el estilo discreto `quiet-link`.

## Acciones al final de las tablas · 15 de septiembre de 2026

El menú de tres puntos ocupa la última columna, después de los datos y el importe. Ventas, presupuestos, compras y vencimientos comparten `table-actions-cell` y una columna compacta de acciones; se omite cuando no se ofrecen acciones. Catálogo, movimientos registrados y diario mantienen su columna final alineada a la derecha. En móvil, los menús se sitúan al final de cada registro, junto al importe en documentos y diario. Se conservan las etiquetas accesibles, las acciones contextuales y la navegación independiente de filas y nombres.

## Facturas sin menú en cada fila · 16 de septiembre de 2026

Por petición del usuario, Facturas de venta omite los tres puntos de cada fila y la columna de acciones, incluidos borradores y rectificativas. Las acciones contextuales se consultan en el menú de la cabecera al abrir el documento: emitir, registrar cobro o devolución, editar y descartar borrador ya estaban disponibles allí, según estado y permisos. Los trabajos sin terminar conservan su enlace al editor y su acción de descartar en la cabecera. Las filas mantienen la navegación al documento, el subrayado de sus enlaces y el hover del cuerpo. Los demás listados conservan sus acciones.

## Referencias útiles en movimientos · 15 de septiembre de 2026


Los listados e historiales de movimientos omiten las referencias genéricas generadas para las pruebas («Pago ficticio · DEMO-…», «Cobro de demostración» y «Pago de demostración»). «Primer plazo · DEMO» se muestra como «Primer plazo». `MovementReference` aplica el mismo criterio en Cobros y pagos, actividad del contacto, anticipos y detalle del documento, sin dejar una línea vacía ni separadores sueltos. Las referencias propias de operaciones se mantienen; las nuevas cargas de demostración ya no generan esas etiquetas genéricas.

## Descuentos por concepto y factura compacta · 15 de septiembre de 2026

Actualización del 16 de septiembre: en el editor compartido, Retención queda junto a Añadir concepto, debajo de los conceptos, sin desplazarse al extremo derecho de la hoja. Al pulsarla abre una lista flotante a su lado con los porcentajes disponibles, reutilizando Popover, Menu y los estilos del selector común. El porcentaje elegido queda en la misma fila y permite reabrir la lista. Desmarcar Retención la desactiva directamente y recalcula el total; la casilla no se bloquea tras elegir un porcentaje. Cerrar sin elegir no aplica retención. Se conservan Escape, teclado, retorno del foco, cálculo y áreas de pulsación de 44 px. En pantallas estrechas las acciones se apilan con 8 px de separación; la lista se mantiene dentro de la pantalla y no desplaza el documento. El aviso para deshacer un concepto eliminado ocupa una fila completa antes de las acciones.

Por petición del usuario, facturas, presupuestos y compras/gastos muestran siempre «Descuento %» dentro de cada producto o servicio, junto a cantidad, precio e IVA. Se retira la casilla general «Descuentos». Cada campo modifica únicamente su línea; los conceptos nuevos empiezan en 0 %. Se conservan los valores al recuperar borradores, reutilizar conceptos y deshacer una eliminación. La retención permanece en el documento. Se reutilizan Field, los controles existentes, la escala común y la disposición de dos columnas en móvil; la etiqueta accesible del descuento identifica el concepto.

La factura vuelve a la hoja común ajustada al contenido, tanto en edición como en consulta. Esta decisión sustituye «Facturas · hoja amplia con proporción A4» del 14 de septiembre: se retiran la altura mínima A4, el ancho especial de 960 px y los espacios ampliados. Cumplimentar factura usa el máximo común de 860 px; la ficha conserva el ancho disponible de las demás fichas documentales. Cliente y Fecha mantienen su ancho compacto. Los totales siguen a los conceptos, sin reservar espacio hasta un pie de página. La exportación PDF conserva su formato.

Verificado en app:3000 a 1440, 390 y 320 px: descuentos independientes de 0, 10, 25 y 100 %, coma decimal, IVA mixto, retención, altas de conceptos, eliminación y deshacer, recuperación, validación y guardado. Las fichas muestran el descuento en su concepto. Pasan 20 pruebas de cálculo, borradores y reutilización y 45 comprobaciones de navegador, sin errores ni desbordamiento horizontal. Capturas revisadas y recursos servidos identificados por SHA-256 en `test-results/line-discounts/verification.json`. Prueba reproducible: `tests/line-discounts.browser.mjs`, con API real y PostgreSQL temporal independiente. Servicio app reconstruido y actualizado.

## Periodo contable sin resumen bajo la barra · 15 de septiembre de 2026

Por petición del usuario, las vistas de Contabilidad omiten la línea con el intervalo aplicado bajo la barra de herramientas. Las fechas se consultan y modifican desde el botón de filtros; se conservan el intervalo activo, el indicador del botón y las rutas de navegación.

## Ayuda de teclado del editor · 15 de septiembre de 2026

Por petición del usuario, se retira el texto visible «Añadir concepto: Ctrl/⌘ + Intro» del editor compartido de facturas, presupuestos y compras/gastos, sin reservar su espacio. El botón Añadir concepto conserva el atajo y su atributo accesible `aria-keyshortcuts`.

## Búsqueda avanzada común · 15 de septiembre de 2026

La búsqueda de Facturas de venta se extiende a Presupuestos, Compras y gastos, Clientes y proveedores, Catálogo, Vencimientos, Movimientos, Anticipos, Diario contable, Actividad de contactos, Auditoría e Historial de importaciones. Mantiene `ListSearch`, `ListToolbar`, la lupa y la vista previa de ventas; no incorpora nuevas cajas, escalas ni colores. Los informes agregados y formularios de configuración conservan sus controles de periodo y campos propios.

La frase se edita sin lanzar consultas al listado. Intro o «Aplicar búsqueda» confirma los criterios mostrados; «Buscar como texto» conserva expresamente el texto literal. Escape y la X limpian la búsqueda y devuelven el foco a la lupa. Las consultas se mantienen al paginar, abrir una ficha y regresar. Las fechas relativas se convierten en fechas concretas al confirmar; su vista previa posterior usa esos valores guardados.

Cada vista admite sus propios criterios: tipo y estado en contactos; precio y archivo en catálogo; saldo y vencimiento en pendientes; fecha, importe, sentido y medio en movimientos y anticipos; fecha e importe en diario y actividad; fecha y texto en los historiales. La vista previa distingue precio, saldo e importe. Los estados de presupuesto y la denominación de proveedor se adaptan al tipo documental.

Se reconocen tildes, mayúsculas, espacios, nombres entre comillas, importes con coma, miles españoles, comparadores inclusivos y estrictos, meses, años, intervalos, límites abiertos y periodos relativos. Los últimos/próximos N días incluyen el día de referencia. Los meses sin año muestran el año utilizado en la fecha de la vista previa; se puede especificar otro en la frase. Facturas, presupuestos y compras conservan la selección explícita de terceros homónimos por NIF.

Los errores de fecha, importes invertidos, estados incompatibles y condiciones desconocidas impiden aplicar la interpretación y permiten corregirla o usar texto literal. Los planes guardados se validan por versión, ámbito y campos admitidos. Las consultas a la API usan parámetros y filtran antes de paginar; los totales y el recorrido entre fichas usan el mismo conjunto. Diario y catálogo filtran sus conjuntos completos ya cargados. Movimientos conserva su límite visible de 250 coincidencias.

Referencia de uso y comprobaciones: [Búsqueda avanzada](BUSQUEDA_AVANZADA.md).

## Vista contable dentro de filtros · 15 de septiembre de 2026

El usuario elige integrar el selector de vista en Filtros. Contabilidad elimina el recuadro «Vista» de la barra; el panel «Filtros de contabilidad» comienza con Vista y reúne las ocho vistas existentes, los atajos de periodo y las fechas. «Aplicar filtros» confirma la vista y el intervalo juntos; Cancelar o cerrar no cambia la pantalla. Cambiar de vista conserva el periodo elegido y retira los criterios propios de la vista anterior, como hacía el selector de la barra. Aplicar un periodo en la misma vista conserva su contexto. Los títulos de cada contenido indican la vista actual.

## Consulta del asiento con ventana amplia · 15 de septiembre de 2026

Por petición del usuario, «Ver asiento» utiliza la variante `wide` del Modal común: 750 px en escritorio en lugar de 500 px. La tabla de cuentas, Debe y Haber dispone de más ancho para evitar desplazamiento horizontal innecesario. La altura se adapta al contenido y al espacio disponible; en móvil se conserva la ventana a pantalla completa, el desplazamiento necesario para tablas extensas y el cierre accesible.

## Acceso · estrellas en espiral · 15 de septiembre de 2026

El usuario aclara que la animación de estrellas es el fondo de la zona negra: se conservan el logo, «Tu negocio, en un mismo lugar» y las tres ventajas originales. Solo se retiran «TU ESPACIO DE GESTIÓN» y el botón «Enter» del ejemplo. El contenido queda por encima del lienzo, cuya opacidad del 40 % mantiene legibles los textos. Se conserva la distribución original: dos columnas en escritorio y cabecera compacta con logo en móvil, donde la presentación sigue oculta.

`SpiralAnimation`, en `src/components/ui/`, adapta el lienzo al panel sin deformarlo y usa GSAP para el ciclo de 15 segundos. Solo la animación es decorativa y queda oculta a los lectores de pantalla; no recibe foco ni intercepta pulsaciones. Con movimiento reducido muestra una composición estática; se pausa al ocultar la pestaña y libera la animación al abandonar la pantalla. Los campos, acciones y escala tipográfica conservan el sistema común.

## Movimientos e historial comunes · 15 de septiembre de 2026

Por petición del usuario, todas las fichas documentales comparten `DocumentActivity`: facturas, presupuestos, compras/gastos y rectificativas o abonos, también al acceder desde cobros, pagos y contactos. Los movimientos usan la tabla común de Fecha, Medio/referencia, Estado e Importe; se conservan los importes, las referencias útiles y las reversiones. Historial queda siempre visible, con acción, usuario y fecha/hora en filas compactas, sin desplegable. Se retira la variante de ventas con cobros en lista y auditoría plegable. No se reserva una tabla vacía si no hay movimientos; el historial sin eventos mantiene su mensaje breve. La tabla conserva la adaptación móvil común y la tipografía del sistema.

Verificación final: 236 pruebas automáticas y 39 comprobaciones de navegador superadas, sin errores de JavaScript. Se han revisado los 12 listados en 1440, 390 y 320 px, además de fechas guardadas, texto literal y recuperación de consultas inválidas. Evidencias: `test-results/advanced-search-ui/verification.json` y capturas de la misma carpeta. La búsqueda del listado tiene prioridad sobre el buscador global para Ctrl/⌘ + K; los diálogos conservan sus interacciones de teclado. Aplicación comprobada en el puerto 3000, con el código de búsqueda del contenedor contrastado mediante SHA-256.

## Indicador contable dentro de filtros · 15 de septiembre de 2026

Por petición del usuario, Contabilidad retira de sus listados la franja del indicador activo («Ingresos del periodo», etc.) y «Limpiar filtros». El indicador y su limpieza se consultan al principio del panel de filtros. Limpiar modifica el borrador del panel; Aplicar confirma y Cancelar o cerrar conserva el criterio anterior. Se mantiene el indicador discreto del botón de filtros y el filtrado de los asientos al entrar desde un KPI. Cambiar de vista continúa retirando los criterios de la vista anterior.

## Búsqueda no aplicada y fechas escritas · 15 de septiembre de 2026

La búsqueda común indica expresamente «Búsqueda no aplicada» y «Se mantienen los resultados anteriores» cuando una frase no se puede interpretar. Ventas, presupuestos y compras omiten las etiquetas parciales en ese estado para evitar que el listado anterior parezca filtrado por la frase nueva. Se conserva la vista previa común, el aviso accesible y la acción Buscar como texto.

Las fechas escritas completas y los intervalos como «del 1 al 15 de octubre de 2026» se muestran con los mismos criterios de fecha ya existentes. Emisión sigue siendo la fecha documental predeterminada; «con vencimiento» usa el vencimiento y la vista previa lo identifica. Verificado en app:3000 a 1440, 390 y 320 px, sin errores ni desbordamiento horizontal, con capturas en `test-results/search-reported-ui/`.

## Plantillas, correo y portal · 15 de septiembre de 2026

Configuración incorpora Plantillas, Correo de salida y Portal del cliente mediante SectionNavigation. La ficha documental añade PDF y envío y una acción contextual. Se reutilizan PanelHeading, Field, Select, Modal y ActionsMenu; los estados del correo incluyen texto y no dependen solo del color. Los paneles de comunicaciones organizan su contenido con separación de 16 px y secciones de 24 px, sin sumar márgenes externos de panel ni crear cajas adicionales.

El portal independiente conserva la cabecera del módulo y DocumentSheet dentro del contenedor document-summary; así se aplican las reglas de lectura guiada y el bloque del cliente ocupa una fila completa en móvil. No incluye navegación del área privada. Los controles de decisión usan la paleta común y etiquetas con zona táctil de 44 px. En ventanas estrechas, las acciones de los formularios de comunicaciones se apilan y mantienen el ancho útil para correos largos. No se añaden escalas tipográficas locales.

La vista previa del PDF utiliza el visor del navegador y ofrece apertura en una pestaña. Los formularios conservan desplazamiento vertical y foco accesible. Verificación con capturas de escritorio, 390 y 320 px en artifacts/communications/.

## Vista previa ampliada de plantillas · 15 de septiembre de 2026

Por petición del usuario, el PDF de prueba deja de ocupar un recuadro de 520 px debajo del formulario. DocumentPreview usa la variante documentPreview del Modal común: hasta 1360 px de ancho y toda la altura disponible con 24 px de margen exterior en escritorio; pantalla completa en móvil. El visor inicia ajustado al ancho y con el panel de miniaturas oculto, manteniendo los controles de zoom, descarga e impresión del navegador y la apertura en otra pestaña.

Volver a la plantilla, la X y Escape cierran únicamente la vista previa. El formulario conserva campos, selección del documento y cambios sin guardar; el foco vuelve al botón que abrió la vista. El cierre por Escape no se propaga a las ventanas que estén debajo. Se conservan Inter, la escala común y controles de 44 px. No cambia el PDF generado ni el archivado.

## Cuatro mejoras de primera utilización · 15 de septiembre de 2026

El usuario aprueba incorporar la propuesta de filtros visibles, saldo pendiente, número de documento y acciones reconocibles. Se han consultado el kit original (03-module-header, 05-button, 07-table, 08-toolbar y 18-icon-actions) y Kronjop × Ley IA 4.1.0 (decisiones, tokens, implementación y composiciones de búsqueda y acciones). Se reutilizan los componentes y tokens comunes, sin importar el CSS del catálogo.

En los listados de ventas, presupuestos y compras, DocumentListContext muestra los criterios aplicados y el número total de coincidencias junto a Quitar. Incluye estado, indicador, cliente/proveedor, texto, fechas, importes y orden no predeterminado. No refleja el borrador de búsqueda. Al limpiar se retiran también los criterios del indicador y se devuelve el foco a Filtros. La línea solo ocupa espacio cuando hay contexto; usa texto y separación, sin nuevas cajas. Esta decisión sustituye el ocultamiento del contexto en esos tres listados; las decisiones particulares de Contabilidad se mantienen.

La columna documental se llama Total. Las facturas y compras con liquidación parcial añaden debajo Pendiente y el saldo real. Las totalmente pagadas, sin pagos, presupuestos y borradores omiten la segunda línea. Los dos importes conservan la alineación numérica en escritorio y móvil.

Las fichas comerciales muestran su número asignado junto a la fecha de vencimiento o validez. Se conservan cliente y concepto como jerarquía principal; los documentos sin numerar no inventan un identificador. La cabecera nombra el saldo como Pendiente o Por devolver según el documento.

HeaderAction muestra icono y texto. ListToolbar etiqueta Filtros y Buscar; la navegación móvil muestra Menú y la navegación desplegada nombra Configuración. Visión general ofrece Nueva factura. Las fichas pendientes presentan Registrar cobro o Registrar pago fuera del menú secundario, respetando los permisos y sin duplicar la acción. Esta aprobación sustituye la presentación exclusivamente icónica de esos controles.

Se mantienen Inter Variable, los pesos 400/500/600, las escalas del sistema, superficies planas y límites necesarios de controles. Los criterios pasan a una línea propia cuando falta espacio. Las acciones conservan foco visible y objetivos de 44 px en móvil; la navegación contraída conserva sus iconos y nombres accesibles.

Recorrido para el usuario: [Comprobar las cuatro mejoras](COMPROBACION_CUATRO_MEJORAS.md). Pruebas y capturas: tests/four-usability.browser.mjs y test-results/usability-four/. La revisión usa datos de demostración en una base temporal independiente de los documentos del usuario.

Verificación de la vista ampliada: 35 comprobaciones de navegador correctas en el puerto 3000, incluidos 1440, 1366, 390 y 320 px, plantilla guardada, cambios sin guardar, Escape y retorno del foco. Recursos JS/CSS contrastados por SHA-256. Evidencia: artifacts/communications/preview-verification.json.

Verificación final: compilación TypeScript/Vite correcta, 22 pruebas de lógica, 38 comprobaciones de las cuatro mejoras y 39 comprobaciones de búsqueda en los 12 listados. Revisado a 1440, 390 y 320 px, con comprobaciones adicionales de navegación contraída y ventanas bajas. Sin errores de JavaScript ni desbordamiento horizontal; los recursos del puerto 3000 coinciden mediante SHA-256 con la imagen Docker activa. Solo se reconstruye y actualiza app; se conserva la base de datos del usuario. Evidencias: test-results/usability-four/verification.json y test-results/advanced-search-ui/verification.json.

## Cabecera documental compacta · 15 de septiembre de 2026

Por petición del usuario, las fichas documentales reúnen el número y la fecha de vencimiento o validez a la izquierda, y el estado y saldo pendiente a la derecha, en una misma fila. PageHeading incorpora la variante document con altura ajustada al contenido: elimina la fila separada del estado y el espacio negro reservado. Conserva el título, el concepto, los controles y la navegación entre documentos. En móvil, los elementos envuelven según el ancho disponible, sin recortar importes. Reutiliza la cabecera de ambos kits, los márgenes y la escala comunes; no añade bordes ni contenedores visibles.

Verificado en app:3000 a 1440, 390 y 320 px: fecha y estado alineados en escritorio, importes completos en móvil y navegación conservada. Compilación correcta y 38 comprobaciones de navegador superadas, sin errores de JavaScript ni escrituras desde la interfaz. Capturas e identificación SHA-256 de recursos en test-results/compact-document-header/verification.json.

## Secciones vacías sin textos de relleno · 15 de septiembre de 2026

Por petición del usuario, se retiran los mensajes que solo anuncian que una sección todavía no contiene registros: correos preparados, enlaces compartidos, historial documental, plantillas, requisitos de compradores, series, asientos pendientes, contactos, documentos, catálogo, movimientos, anticipos, importaciones y próximos vencimientos. No se reserva el bloque ilustrado ni su espacio; los títulos y las acciones existentes permanecen disponibles.

Empty muestra solo su acción por defecto. showMessage se activa expresamente para búsquedas o filtros sin resultados, registros que no se encuentran, páginas que ya no contienen resultados o selección de documentos elegibles para una operación. Los mensajes de carga, errores, configuración pendiente y validación conservan su función. Esta decisión sustituye los avisos generales de estados vacíos del kit y del historial, por instrucción actual del usuario. Se mantienen las etiquetas accesibles de controles y campos.

Verificación: compilación correcta y 43 vistas revisadas a 1440, 390 y 320 px con una base temporal aislada. PDF y envío conserva la apertura de sus formularios; los listados filtrados siguen indicando cuando no hay resultados. Sin errores de JavaScript, desbordamiento horizontal ni escrituras desde la interfaz. Servicio app actualizado en el puerto 3000 y recursos contrastados con su imagen mediante SHA-256. Capturas e informe: test-results/empty-section-copy/verification.json.

## KPI sin borradores y con comparativas · 15 de septiembre de 2026

Por petición del usuario, los resúmenes de ventas, compras y presupuestos retiran el KPI Borradores y distribuyen los tres indicadores restantes mediante ModuleKpis. Los documentos en borrador continúan disponibles en los filtros del listado.

Ventas y compras añaden debajo de cada indicador dos comparativas: mes anterior y mismo mes del año anterior. Cada una muestra la variación, el importe de referencia y las fechas visibles. La facturación compara la base imponible desde el día 1 hasta el mismo día del mes; si el mes anterior es más corto, usa su último día. Pendiente y vencido comparan saldos a la fecha equivalente, reconstruidos con las fechas de documentos, cobros/pagos, reversiones, abonos y aplicaciones de anticipos. El vencido conserva el saldo completo del documento con algún plazo atrasado, usando el calendario vigente en cada fecha histórica.

Cuando la referencia es cero y existe importe actual, se indica Sin base porcentual; cero frente a cero indica Sin cambios. Las variaciones menores al redondeo conservan su sentido. Los porcentajes usan el valor absoluto de la referencia cuando es negativa. No se atribuye automáticamente un color favorable o desfavorable a los cambios de saldo. Se mantiene la escala común, con fechas e importes de comparación legibles y sin gráficos, cajas ni separadores nuevos.

## Iconos de sección junto al título · 15 de septiembre de 2026

Por petición del usuario, las cabeceras PanelHeading con un icono de acción inmediato lo sitúan junto al título, con separación de 8 px, en lugar de enviarlo al extremo derecho. Se aplica al clip de Archivos originales en todas las fichas documentales mediante la cabecera común de sección. La regla común conserva los 44 px de pulsación, nombres accesibles, ayuda y foco de teclado; el título puede envolver en móvil y el icono no se comprime. No añade marcos ni modifica la tipografía.

## Ver plantilla · botón textual (16/09/2026)

Por petición del usuario, PDF y envío sustituye el icono de acceso a plantillas por «Ver plantilla», usando el botón primario negro y texto blanco del sistema común. El enlace conserva el destino a Configuración → Plantillas y el regreso contextual al documento. Se mantiene el icono de abrir el PDF en otra pestaña con su nombre accesible y tooltip. Se retira la línea de nombre de diseño y «PDF archivado» de los documentos confirmados; los borradores conservan el selector de plantilla.

## Acciones de plantilla del PDF · 15 de septiembre de 2026

Por petición del usuario, PDF y envío retira la frase «Diseño original. El PDF archivado conserva su aspecto» y su bloque descriptivo. Junto al título «Plantilla del PDF» se muestran dos acciones icónicas: LayoutTemplate abre Configuración → Plantillas y ExternalLink abre el PDF en otra pestaña. Reutilizan PanelHeading, icon-button y los tooltips comunes de React Aria, disponibles al pasar el cursor y con foco de teclado; cada enlace conserva su nombre accesible y el área táctil de 44 px. En borradores se mantiene el selector de plantilla y la acción se llama «Revisar PDF». No se añaden marcos ni una fila vacía de enlaces.

Verificación de las comparativas: 260 pruebas automáticas superadas y 12 comprobaciones de navegador en app:3000, a 1440, 390 y 320 px. Se comprueban ventas, compras, presupuestos, navegación por teclado, regreso, importes grandes, referencias cero y cambios inferiores al redondeo. Las pruebas de API usan PostgreSQL temporal para periodos parciales, años bisiestos, cobros y reversiones con fechas distintas, anticipos, abonos, calendarios históricos y aislamiento entre empresas. Capturas revisadas y huellas de los recursos en `test-results/kpi-comparisons-ui/verification.json`; prueba reproducible en `tests/kpi-comparisons.browser.cjs`. Imagen de app reconstruida y actualizada, con los archivos de cálculo del contenedor contrastados por SHA-256.

Verificado en app:3000 mediante 9 capturas de facturas, presupuestos y compras a 1440, 390 y 320 px: separación de 8 px entre título y botón, área de pulsación de 44 px y selector de archivos operativo. Sin errores de JavaScript ni desbordamiento horizontal. Capturas y SHA-256 de los recursos servidos en test-results/section-icon-spacing/verification.json.

## Exportación filtrada en la cabecera · 15 de septiembre de 2026

Por petición del usuario, «Exportar listado filtrado» se traslada del panel de filtros al menú de tres puntos de PageHeading en los listados de Facturas de venta, Presupuestos y Compras y gastos. Reutiliza ActionsMenu y el icono Download, junto a la acción de creación existente. Está disponible también en modo consulta y queda deshabilitada mientras el listado carga o tiene un error.

El enlace usa los criterios aplicados, el orden y la empresa activa; exporta todas las páginas del conjunto filtrado. La frase que se está escribiendo y los cambios sin aplicar del panel de filtros no modifican la exportación. El panel conserva Resumen del filtro aplicado. Se retira el enlace duplicado y su estilo exclusivo, sin añadir nuevas dimensiones ni reglas visuales.

Verificación de la exportación en cabecera: compilación correcta, 7 pruebas de exportación y filtros y 18 comprobaciones de navegador superadas. Se revisan las tres secciones a 1440, 390 y 320 px con permisos de administración y consulta, filtros aplicados frente a texto pendiente, paginación, empresa activa, descarga CSV, carga, error, Escape y foco. Capturas revisadas y recursos de app:3000 contrastados por SHA-256 con el contenedor. Evidencias: `test-results/export-header-ui/verification.json`.

## Filtros con contador circular · 15 de septiembre de 2026

Por petición del usuario y siguiendo la captura de El Corte Inglés aportada, ListToolbar muestra únicamente el icono SlidersHorizontal, sin «Filtros» ni marco visible, con un círculo negro y cifra blanca en la esquina superior derecha cuando existen filtros aplicados. Es una excepción expresa a radio cero para este contador. Conserva el área de pulsación común, el foco y un tooltip con la función y el número de filtros; el nombre accesible incluye ese mismo recuento.

El contador se calcula a partir de los criterios aplicados de cada listado y se actualiza al aplicar, limpiar o navegar desde un KPI, sin incluir cambios pendientes del panel. Cada intervalo de emisión, vencimiento o importe cuenta una vez, aunque tenga ambos límites. No cuenta el texto de búsqueda, la ordenación, la paginación ni la fecha de corte de un KPI como filtros independientes; sí recoge los criterios estructurados de búsquedas aplicadas. Sin filtros se oculta el círculo. Se mantienen el resumen de filtros del listado y el control de búsqueda existentes. Este criterio sustituye la etiqueta visible de Filtros aprobada anteriormente.

## Gestión documental en el menú de cabecera · 15 de septiembre de 2026

Por petición del usuario, Marcar como aceptado y Marcar como rechazado pasan al menú de tres puntos de la cabecera. El mismo criterio se aplica a Convertir en factura, Confirmar presupuesto, Emitir factura, Contabilizar compra, Emitir rectificativa y Registrar devolución. Se elimina la franja de botones de gestión sobre la hoja. Las acciones se ofrecen desde todas las secciones de la ficha, con las mismas condiciones de estado, permisos, caducidad y confirmación. Registrar devolución deja de duplicarse entre cabecera y cuerpo.

Se reutilizan PageHeading y ActionsMenu, sus iconos y navegación por teclado. El aviso de presupuesto caducado se conserva en el nombre accesible y la ayuda de la opción deshabilitada. Los errores de estas acciones se muestran en la sección activa, incluidos Archivos adjuntos, PDF y envío e Historial. Esta decisión sustituye la franja de gestión documental anterior.

## Nueva factura en el menú de Visión general · 15 de septiembre de 2026

Por petición del usuario, la cabecera «Hola» retira el botón blanco Nueva factura y ofrece esa acción como primera opción del menú de tres puntos, antes de Nuevo presupuesto y Nueva compra. Se reutilizan PageHeading y ActionsMenu, con el mismo icono FilePlus2 y el acceso al editor de factura. La acción continúa oculta para usuarios de consulta. Se conserva el buscador de la cabecera y las demás opciones del menú, sin cambios de estilos. Esta decisión sustituye el botón visible aprobado dentro de las cuatro mejoras de primera utilización únicamente en Visión general.

Verificación de gestión documental en cabecera: 14 pruebas de estados y presupuestos, comprobación TypeScript y compilación Docker correctas. En app:3000 se han revisado 30 capturas a 1440, 390 y 320 px con API y PostgreSQL temporal: aceptar, rechazar, convertir, abrir confirmaciones de emisión y devolución, caducidad, modo consulta, errores desde Adjuntos y restitución del foco. Sin errores de JavaScript ni desbordamiento horizontal. Los recursos servidos coinciden por SHA-256 con el contenedor. Evidencias: test-results/document-header-actions/verification.json.

Verificado Nueva factura en el menú de Visión general a 1440, 390 y 320 px, con administración y consulta: seis comprobaciones correctas, apertura del editor, Escape, retorno del foco y ausencia de desbordamiento horizontal o errores de JavaScript. Compilación correcta y recursos de app:3000 contrastados con la imagen activa mediante SHA-256. Evidencias: `test-results/overview-invoice-menu-ui/verification.json`.

## KPI con referencia mensual simple · 15 de septiembre de 2026

Por petición del usuario, los KPI conservan el importe actual y su etiqueta, con una única línea secundaria «Mes anterior: X €» cuando existe referencia mensual. Se retiran los porcentajes, las fechas, los avisos de variación y la comparación anual. La línea usa la escala y el color de texto secundario comunes, con el mismo formato de importe que el valor principal. Los indicadores sin referencia mensual mantienen únicamente su importe y etiqueta. Esta decisión sustituye la presentación de las comparativas aprobada anteriormente.

ModuleKpis aplica el criterio común en ventas, compras y los demás resúmenes que reciben comparativas. Se conservan el periodo de cálculo, el significado de cada indicador y su enlace al listado correspondiente.

## Anterior y siguiente sobre el documento · 15 de septiembre de 2026

Por petición del usuario, el recorrido anterior/siguiente de las fichas documentales pasa de la cabecera negra al extremo derecho de la zona blanca, encima del contenido y en el lugar que ocupaban las acciones de gestión. Se mantiene en todas las pestañas de facturas, presupuestos, compras y rectificativas, también al recorrer documentos desde Cobros y pagos. Cuando no existe recorrido del listado, no se reserva esta franja.

RecordNavigation incorpora la variante plain: solo muestra las dos flechas negras, sin fondo, borde, sombra ni contador visible. Conserva los nombres accesibles, la posición para lectores de pantalla, los 44 px de pulsación, el foco y los extremos deshabilitados. Los avisos de error y el contexto necesario para distinguir movimientos o plazos permanecen legibles sobre blanco. Se reutilizan los iconos Lucide y los tokens de los kits vigentes. Esta decisión sustituye el recorrido documental dentro de PageHeading; las acciones de gestión siguen en el menú de tres puntos.

## Finalización del editor en la cabecera · 15 de septiembre de 2026

Por petición del usuario, el último paso del editor de facturas y compras traslada su menú de finalización a los tres puntos de PageHeading, sin etiqueta visible. Conserva Guardar en borrador y Emitir factura o Contabilizar compra, sus validaciones y las restricciones de guardado, conflicto y reintento. Se elimina el pie de botones de ese paso, incluido Anterior. Los pasos superiores permiten volver a Cliente/Proveedor y Fecha. Los pasos previos conservan su navegación y los presupuestos y rectificativas mantienen sus acciones actuales. Reutiliza ActionsMenu, el foco y la escala comunes, sin estilos nuevos.

Verificado en app:3000 con 12 comprobaciones de ventas, compras y presupuestos a 1440, 390 y 320 px: referencia mensual única, importes cero y grandes, navegación por teclado y regreso. Sin porcentajes, fechas ni comparación anual; sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta, capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor actualizado. Evidencia: `test-results/kpi-simple-ui/verification.json`.

Verificado en app:3000 con 24 capturas a 1440, 390 y 320 px: posición sobre el contenido, flechas de 44 px negras sin superficie ni contador visible, navegación por teclado, extremos del listado, filtros y orden conservados, pestañas de la ficha, acceso desde Vencimientos y recuperación de errores. Sin desbordamiento ni errores de JavaScript. Comprobación TypeScript, compilación Docker y 4 pruebas de orden documental correctas. Recursos servidos contrastados por SHA-256 con el contenedor. Evidencias: test-results/document-navigation-placement/verification.json.

Verificado en app:3000 a 1440, 390 y 320 px: seis recorridos de facturas y compras con guardado, emisión o contabilización, validación de campos, navegación entre pasos, Escape y retorno del foco. Menú dentro de la pantalla, sin desbordamiento horizontal ni errores de JavaScript. Prueba de emisión directa, TypeScript y compilación correctos. Las operaciones de comprobación usan PostgreSQL temporal. Recursos servidos contrastados por SHA-256 con el contenedor; capturas e informe en `test-results/editor-header-menu/verification.json`.

## Cabeceras con estado y sin importes · 15 de septiembre de 2026

Por petición del usuario, los títulos enlazados de PageHeading se muestran sin subrayado en reposo y se subrayan al pasar el cursor. Conservan su enlace, la ayuda y el foco visible de teclado. Las fichas documentales retiran el primer concepto y el recuento de conceptos de la cabecera; sus descripciones completas siguen en la hoja del documento.

La parte derecha conserva únicamente el estado. Se retiran los importes y sus etiquetas Pendiente, Por devolver y Liquidado de facturas, compras, presupuestos y rectificativas, incluidos los accesos desde Cobros y pagos y todas las secciones de cada ficha. Catálogo aplica el mismo criterio: conserva Activo/Archivado y retira el precio de la cabecera. Se mantienen el número, las fechas y las acciones contextuales. Se reutilizan PageHeading, Badge y los tokens comunes, sin reservar las filas eliminadas. Esta decisión sustituye los criterios anteriores de subrayado permanente, concepto y saldo en cabecera.

## Edición sin lápices · 15 de septiembre de 2026

Por petición del usuario, se retiran los iconos de lápiz de toda la aplicación: editores, fichas documentales y de contactos, listados de ventas, compras y presupuestos y catálogo. Las acciones que ya tienen nombre conservan su texto. Los controles que solo mostraban el lápiz pasan a Editar mediante el botón de texto ghost común, con el nombre accesible específico del dato. Se conservan los callbacks, validaciones, permisos, foco y tamaño de pulsación, sin controles vacíos ni cambios en los datos.

## Cobros y pagos dentro del menú de cabecera · 15 de septiembre de 2026

Por petición del usuario, Registrar cobro y Registrar pago dejan de ser botones blancos de la cabecera documental. Se muestran como opciones del menú de tres puntos de PageHeading, con el icono Wallet y los mismos formularios, permisos, condiciones de saldo y bloqueo durante una operación. La ubicación se comparte en todas las pestañas de facturas de venta y compras; Registrar devolución conserva su opción del mismo menú. Las acciones de contactos, vencimientos y Cobros y pagos ya usan el menú contextual y siguen ese criterio. Esta decisión sustituye el acceso visible aprobado anteriormente para cobros y pagos. No se añaden estilos ni contenedores.

## Factura editable de un vistazo · 15 de septiembre de 2026

Por petición del usuario, Cumplimentar factura sitúa Emisor y Cliente en dos columnas, las fechas en una fila compacta y los conceptos de dos en dos. `DocumentSheetLayout.overview` reutiliza la hoja, los campos y los cálculos existentes; el ancho disponible sustituye al máximo de 860 px en este paso. Base, IVA, retención y Total se distribuyen en una banda horizontal. Datos adicionales e Historial del cliente comparten fila y crecen al abrirse. La cabecera común incorpora la variante compacta para este espacio de trabajo; el estado de guardado comparte fila con los pasos en escritorio. Los menús y avisos de emisión conservan su función y su contenido.

Se mantienen Inter, los pesos y tamaños del sistema, los controles de 44 px y las superficies planas. La disposición busca mostrar una factura habitual de dos conceptos completa en 1366 × 768 y pantallas mayores, sin recortar contenido ni bloquear el scroll. Con más conceptos, textos extensos o paneles abiertos, la hoja crece. En móvil se apilan los bloques y se conserva el desplazamiento necesario para editar con comodidad. Cliente y Fecha, las fichas guardadas, los otros tipos documentales y el PDF conservan su distribución.

Verificado en app:3000 con 24 vistas a 1440, 390 y 320 px: menú sin botón duplicado, apertura y cierre con retorno del foco, acceso desde todas las pestañas, cobros y pagos parciales/completos con actualización del saldo, devolución y modo consulta. Cinco pruebas de estados, TypeScript y compilación Docker correctos. Sin errores de JavaScript ni desbordamiento horizontal. Recursos servidos contrastados por SHA-256 con el contenedor. Evidencias: test-results/payment-header-menu/verification.json.

Verificado en app:3000 mediante 30 comprobaciones a 1440, 390 y 320 px: facturas parciales, borradores, vencidas, compras, presupuestos, rectificativas, acceso desde Cobros y pagos, Adjuntos, PDF y envío y Catálogo. Subrayado solo al pasar el cursor, foco y enlace por teclado correctos; conceptos e importes conservados en el contenido. Sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta, capturas revisadas y recursos contrastados por SHA-256 con el contenedor actualizado. Evidencia: `test-results/simple-headers/verification.json`.

Verificado en app:3000 mediante 60 capturas a 1440, 390 y 320 px: edición de cliente/proveedor, fechas y validez; menús de listados; edición de borradores, contactos y artículos. Los controles conservan teclado y retorno del foco. Sin lápices, desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos. Datos y API de prueba en PostgreSQL temporal; recursos servidos contrastados por SHA-256 con el contenedor. Evidencias: `test-results/no-pencil-icons/verification.json`.

## Compras sin referencia secundaria en el listado · 15 de septiembre de 2026

Por petición del usuario, la columna Documento de Compras y gastos muestra únicamente el número del documento o Borrador. Se retira la línea secundaria con la factura del proveedor o la referencia del abono, sin reservar su espacio. El componente DocumentTable aplica el criterio a todas las filas de compras y abonos del listado. Se mantienen las referencias guardadas y su consulta en la ficha; no cambian los datos, enlaces ni la tipografía.

Verificación del simulador: compilación Docker correcta y revisión en 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568. Con dos conceptos, correos de emisor/cliente y tipos de IVA distintos, la hoja completa cabe sin scroll vertical en los escritorios comprobados. Se verifican descuentos independientes, retención, añadir/eliminar/deshacer conceptos, vencimiento, notas, validación y guardado en una base temporal aislada. Sin errores de JavaScript ni desbordamiento horizontal. Los recursos de app:3000 coinciden mediante SHA-256 con la imagen activa. Capturas e informe: `test-results/invoice-overview-validation/verification.json`.
Verificado en app:3000 a 1440, 390 y 320 px con compras y abonos: una sola línea de identificación, enlace operativo y referencia conservada en la ficha. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript y compilación Docker correctos; recursos servidos contrastados por SHA-256 con el contenedor. Capturas e informe: test-results/purchase-reference-line/verification.json.

## Recorrido sin resumen visible de fecha e importe · 15 de septiembre de 2026

Por petición del usuario, se retira la línea secundaria de fecha e importe situada junto a las flechas sobre el documento. RecordNavigation mantiene ese contexto solo para lectores de pantalla mediante sr-only, sin reservar su fila ni su espacio. Se aplica a vencimientos y movimientos de Cobros y pagos en todas las secciones de la ficha. Conserva las flechas, sus destinos, el contexto de filtros y los avisos de error o registro fuera del listado. Las fechas e importes de la propia factura y de sus movimientos mantienen su presentación. Esta decisión sustituye el contexto visible aprobado anteriormente.

Verificado en app:3000 con 12 vistas de vencimientos y movimientos de facturas y compras a 1440, 390 y 320 px. La línea queda fuera de la presentación visual sin reservar altura; las flechas conservan teclado y destinos. Revisadas las secciones Resumen, Vencimientos, Archivos adjuntos, PDF y envío y Movimientos e historial. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos; API y datos de prueba en PostgreSQL temporal. Recursos servidos contrastados por SHA-256 con el contenedor. Capturas e informe: `test-results/navigation-without-summary/verification.json`.

## Referencia mensual en Visión general, Cobros y Presupuestos · 15 de septiembre de 2026

Por petición del usuario, los cuatro indicadores de Visión general y de Cobros y pagos, y los tres de Presupuestos, incorporan la línea común «Mes anterior: X €». Visión general reutiliza ModuleKpis; se mantienen los importes principales, las etiquetas y los destinos de cada indicador. Se conserva el formato aprobado en Facturas y Compras: importe secundario discreto, sin porcentajes ni referencia anual, con adaptación móvil e importes grandes.

El corte es el mismo día del mes anterior, limitado al último día cuando el mes es más corto. Facturación y gastos comparan bases del intervalo equivalente; los pendientes comparan el saldo a ese corte. Cobros reconstruye pagos, reversiones, anticipos, aplicaciones y devoluciones de abonos en sus fechas efectivas, y reparte el saldo por el calendario de vencimientos vigente entonces. Presupuestos usa la fecha de confirmación y los eventos de aceptación, rechazo y conversión anteriores al corte, conservando la validez histórica. Un presupuesto confirmado después de ese corte no se presenta como pendiente en el mes anterior. Los cálculos se realizan en una instantánea de lectura de la empresa activa.

Verificado con 13 pruebas de cálculos y navegación, ampliadas con saldos históricos, devoluciones, estados de presupuestos, límites de fecha e independencia entre negocios. Las 30 comprobaciones de navegador a 1440, 390 y 320 px cubren valores normales, cero, importes largos, reintento tras error y navegación por teclado; sin desbordamiento horizontal ni errores de JavaScript. Capturas revisadas y evidencia en `test-results/kpi-summary-comparisons/verification.json`. App reconstruido, saludable y archivos de cálculo contrastados por SHA-256 con la imagen activa.

## Barra de filtros sin resumen y contador completo · 15 de septiembre de 2026

Por petición del usuario, los listados de facturas, presupuestos y compras retiran la franja que repetía indicador, fecha de corte, criterios, recuento y Quitar. Se mantiene el filtrado aplicado; el icono permite abrir el panel con sus controles de limpieza y el resumen disponible. No se reserva espacio para el texto retirado. Esta decisión sustituye la franja DocumentListContext aprobada anteriormente.

El contador circular común se coloca dentro de la esquina superior derecha del botón, sin desplazamientos negativos que lo sacaban del área visible de table-panel. Conserva dimensiones, círculo negro, cifra blanca, nombre accesible, tooltip y recuento. Se aplica a todos los usos de ListToolbar y evita recortar el círculo sin alterar el desplazamiento de las tablas.

## Creación integrada en el menú de cabecera · 15 de septiembre de 2026

Por petición del usuario, todas las acciones de creación que se mostraban como botón blanco en PageHeading pasan al menú de tres puntos. Se aplica a los resúmenes y listados de ventas, presupuestos, compras, clientes y catálogo, incluidos los accesos desde cualquier KPI y los listados completos. Nueva factura, Nuevo presupuesto, Nueva compra, Añadir cliente o proveedor y Nuevo artículo conservan sus destinos o formularios y sus permisos. Se reutiliza primaryAction de PageHeading para situarlas primero en el mismo ActionsMenu y evitar duplicados. Los listados comerciales conservan Exportar listado filtrado. Se retira HeaderAction, ya sin usos, sin añadir estilos ni controles. Esta decisión sustituye los botones de creación visibles aprobados anteriormente.

Verificado en app:3000 mediante 33 comprobaciones a 1440, 390 y 320 px: contador contenido en el botón y dentro de todos sus ancestros con recorte, ausencia de la franja retirada, filtros sin aplicar/aplicados, cancelación, limpieza, recarga, tooltip y retorno del foco. Se revisan ventas, presupuestos, compras, contactos, actividad, catálogo, cobros/pagos y contabilidad. Cinco pruebas de recuento, TypeScript, formato y compilación correctos. Sin errores de JavaScript ni desbordamiento horizontal; recursos servidos contrastados por SHA-256 con el contenedor. Evidencias: test-results/filter-toolbar-cleanup/verification.json.

## Fechas y conceptos compactos en el simulador · 15 de septiembre de 2026

Por petición del usuario, la hoja editable de factura alinea las etiquetas y los valores de Emisión y Vencimiento en el mismo eje, con acciones Editar después de su fecha y áreas de pulsación de 44 px. Emisor y Cliente comparten también la altura de etiqueta. Se mantiene la disposición de dos conceptos por fila.

Producto o servicio conserva una etiqueta visible numerada y el campo indica «Busca en el catálogo o escribe». El contenido editable usa el cuerpo común de 13 px y las etiquetas el rol de 12 px, sin competir con los títulos de la factura. El campo de concepto conserva el fondo neutro y los campos numéricos emplean una superficie más suave; el marco exterior se atenúa. Se mantienen foco, estados, crecimiento de descripciones y desplegable del catálogo. No se añaden contenedores alrededor de cada concepto. Estas variantes se limitan al paso Cumplimentar factura.

Verificado en app:3000 mediante 87 comprobaciones en ventas, presupuestos, compras, clientes y catálogo, a 1440, 390 y 320 px, con administración y consulta. Se recorren todos los KPI en escritorio, accesos desde KPI en móvil, resúmenes y listados completos. Menú único sin botón blanco, creación como primera opción, exportación conservada, apertura de formularios, Escape y retorno del foco correctos. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript y compilación correctos; datos de prueba en PostgreSQL temporal y recursos servidos contrastados por SHA-256 con el contenedor. Capturas e informe: `test-results/header-creation-menu/verification.json`.

## Grupo Empresa en la navegación · 15 de septiembre de 2026

Por petición del usuario, Configuración queda bajo el título EMPRESA en la parte inferior de la barra lateral. Reutiliza sidebar-section-title, con la misma tipografía, color y alineación de GESTIÓN y ANÁLISIS. El título se muestra en escritorio desplegado y en el menú móvil; al contraer la barra permanece accesible sin ocupar espacio, igual que los demás grupos. Se conservan Configuración, la cuenta y Cerrar sesión.

Verificado en app:3000 con 26 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: fechas alineadas, etiquetas visibles, campos vacíos y descripciones largas, apertura del catálogo y foco de teclado, cálculos, validaciones y guardado. La factura de dos conceptos cabe sin scroll en los escritorios comprobados; el móvil conserva el crecimiento del texto sin desbordamiento horizontal. Compilación correcta y sin errores de JavaScript. Recursos servidos contrastados mediante SHA-256 con la imagen activa. Datos de comprobación aislados en PostgreSQL temporal. Capturas e informe: `test-results/invoice-fields-validation/verification.json`.

## Iconos completos en los menús de acciones · 15 de septiembre de 2026

Por petición del usuario, todas las opciones de ActionsMenu incluyen un icono Lucide coherente con su función. Se completan movimientos y anticipos, contactos, vencimientos, borradores, catálogo, contabilidad, plantillas y enlaces compartidos. History identifica movimientos; Wallet, fondos y cobros/pagos; Info, datos; FileText, documentos y borradores; Settings2, edición de artículos y plantillas; CalendarDays, periodo; ChartColumn, informes. Se mantienen los iconos existentes, los 17 px comunes y los nombres visibles; los símbolos son decorativos para lectores de pantalla. PageAction exige icon para impedir nuevas opciones sin símbolo. La edición usa símbolos de documento o ajustes sin recuperar los lápices retirados. No cambian acciones, permisos, destinos ni navegación por teclado.

Verificado en app:3000 mediante 48 menús a 1440, 390 y 320 px: cobros, movimientos, anticipos, vencimientos, contactos, catálogo, contabilidad, documentos, presupuestos, plantillas y enlaces compartidos. Cada opción muestra un solo icono de 17 px con aria-hidden; menú dentro de pantalla, sin errores de JavaScript ni desbordamiento horizontal. Se comprueban navegación a movimientos/fondos, apertura de formularios, Escape y retorno del foco, incluida consulta de plantillas. TypeScript verifica que todas las opciones de la aplicación tienen icono; compilación correcta. API y datos de prueba en PostgreSQL temporal; recursos servidos contrastados por SHA-256 con el contenedor. Capturas e informe: `test-results/complete-menu-icons/verification.json`.

## Fechas plegables y rango de importes · 15 de septiembre de 2026

Por petición del usuario, los paneles de filtros muestran Fecha de emisión como una sección plegada. FilterSection aplica el mismo patrón a Vencimiento/Validez, las fechas de documentos y movimientos en la actividad de contactos y Fecha del asiento en contabilidad. Se reutilizan details/summary, el chevrón, los 44 px de interacción y los tokens comunes, sin marcos ni separadores añadidos. Las fechas empiezan plegadas y se abren al detectar un error de validación, con foco en el campo correspondiente.

AmountRangeFilter sustituye los dos campos visibles de importe por una barra con dos tiradores en ventas, presupuestos, compras y actividad de contactos (documentos, cobros/pagos y anticipos). Usa el Slider accesible de React Aria ya instalado: línea neutra, tramo negro y tiradores rectos con zona táctil de 44 px, coherentes con el radio cero del sistema. La cifra seleccionada aparece encima. Importe exacto despliega los campos originales para céntimos, importes grandes y límites abiertos; se abre al detectar errores.

La escala inicial va de 0 a 10.000 euros; el extremo superior se identifica como «y más» y representa ausencia de máximo, sin excluir importes superiores. La escala se amplía para importes exactos mayores. Mover un extremo conserva el valor exacto del otro. Abrir el panel no cambia los filtros; Aplicar confirma el borrador y Cancelar lo descarta. Se conservan validaciones, recuentos, consultas y permisos existentes. Esta decisión sustituye los campos de importe siempre visibles y las fechas siempre desplegadas.

Verificado en app:3000 con 54 comprobaciones a 1440, 390 y 320 px: secciones plegadas, teclado, arrastre con ratón y táctil, filtrado real de importes, máximo sin límite, conservación de céntimos, cancelación y apertura con foco ante errores. Los tiradores avanzan en céntimos para conservar el otro extremo exacto. Diez pruebas unitarias, TypeScript y compilación correctos. Capturas de escritorio y móvil revisadas; recursos servidos contrastados por SHA-256 con el contenedor. API y PostgreSQL temporales para las pruebas. Evidencias: `test-results/filter-ranges/verification.json`.

## Simulador con campos blancos y sin historial · 15 de septiembre de 2026

Por petición del usuario, Cumplimentar factura retira Historial del cliente y la reutilización de conceptos desde ese panel. Se conservan los avisos contextuales de posible duplicado y precio cero, sin reservar espacio cuando no hay avisos.

La hoja, los campos y el total usan fondo blanco. Los controles llevan un único borde fino con los tokens comunes, etiquetas visibles y foco de teclado; se distinguen de los datos de lectura. Producto conserva el selector editable del catálogo e IVA su Select. Cantidad pasa a un ComboBox accesible con valores de 1 a 10, que permite escribir directamente decimales o cantidades superiores. Precio sin IVA, descuento, notas y demás datos editables conservan campos de texto blancos. Se mantienen las fechas alineadas y dos conceptos por fila en escritorio. Esta decisión sustituye las superficies grises aprobadas previamente en este simulador.

## Editor sin aviso permanente de emisión · 15 de septiembre de 2026

Por petición del usuario, se retira la nota inferior sobre numeración y rectificaciones del editor de facturas de venta y su equivalente sobre contabilización y abonos en compras, tanto al crear como al editar borradores. No se reserva espacio para el aviso eliminado. El estado inferior solo aparece durante el guardado, la emisión o la contabilización, o cuando hace falta reintentar una operación sin resultado confirmado. Se conservan las validaciones y las confirmaciones contextuales.

Verificado en app:3000 con diez comprobaciones a 1440 y 390 px: creación y edición de ventas y compras sin la nota ni un párrafo vacío; estados de emisión, error temporal y reintento conservados. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript y compilación correctos; capturas de escritorio y móvil revisadas y recursos servidos contrastados por SHA-256 con el contenedor. Datos de prueba en PostgreSQL temporal. Evidencias: `test-results/editor-without-note/verification.json`.

## Descartar borradores desde el menú · 15 de septiembre de 2026

Por petición del usuario, los borradores de facturas, presupuestos y compras, incluidas rectificativas y abonos, ofrecen «Descartar borrador» con Trash2 en el menú de tres puntos. Se aplica a filas, ficha y todos los pasos del editor, con ActionsMenu y el icono común de 17 px. Los documentos confirmados y las cuentas de consulta no ofrecen esta acción. Se conservan las confirmaciones y validaciones de borrado existentes.

Al descartar una copia de edición, la confirmación aclara que se conserva el documento guardado. El editor espera al autoguardado y cierra la copia de trabajo antes de eliminarla para que no reaparezca al salir. Los conflictos o las operaciones de emisión pendientes deben resolverse antes del descarte. No se añaden estilos ni contenedores.

Verificado en app:3000 mediante 38 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: historial ausente, hoja y campos blancos, bordes y foco visibles, selección de producto/cantidad/IVA, cantidades decimales y superiores a las sugeridas, teclado, validación y guardado. Se conservan los cálculos, las descripciones largas y la distribución sin scroll para dos conceptos en escritorio. Sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta, API y datos de prueba en PostgreSQL temporal y recursos contrastados mediante SHA-256 con la imagen activa. Capturas e informe: `test-results/white-invoice-validation/verification.json`.

## Simulador sin recuadros repetidos · 15 de septiembre de 2026

Por petición del usuario, la hoja editable elimina los marcos completos de los campos blancos. Una línea inferior tenue identifica cada control; las etiquetas usan el tono secundario y los valores se alinean a su izquierda. Se conservan las flechas de Producto, Cantidad e IVA, las unidades y los campos visibles, sin añadir cajas de agrupación. El campo gana contraste al pasar el ratón y mantiene el foco explícito de teclado y las señales de error. La hoja permanece blanca, con dos conceptos por fila y sin historial del cliente. Esta decisión sustituye los bordes completos de la versión anterior.

## Búsqueda global compacta y animada · 15 de septiembre de 2026

Por petición del usuario, la lupa de acciones y secciones abre un panel compacto inspirado en el despliegue del vídeo de Apple aportado: ancho máximo de 420 px, cerca de la parte superior, entrada de 220 ms con 8 px de descenso y escala del 99 al 100 %, resultados con un desfase de 35 ms y cierre de 160 ms. El fondo usa un oscurecimiento del 12 % y desenfoque de 2 px. Se reutilizan Modal, la curva del kit, Inter, la escala común, superficies neutras y esquinas rectas.

Esta variante conserva márgenes y altura según el contenido también en móvil, sustituyendo para este buscador la ventana a pantalla completa. Los resultados mantienen todas las acciones y desplazamiento interior. Conserva Ctrl/⌘ + K, flechas, Intro, Escape, cierre exterior, bloqueo de fondo y retorno de foco. Con movimiento reducido se omiten las animaciones y el cierre es inmediato. Los demás diálogos y las búsquedas de listados conservan su presentación.

Verificado en app:3000 mediante 95 comprobaciones de navegador a 1440, 390 y 320 px: borradores guardados y copias de trabajo, los tres pasos del editor, ficha y sus secciones, papelera, cancelación, descarte, foco y ausencia de desbordamiento. Se comprueba que los documentos confirmados no ofrecen el descarte, que una versión nueva sobrevive a una acción obsoleta y que el autoguardado en curso no recrea la copia descartada. Diecisiete pruebas de estados, permisos, borrado y adjuntos superadas. Sin errores de JavaScript; TypeScript y compilación correctos. Datos aislados en PostgreSQL temporal, capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor actualizado. Evidencias: test-results/discard-drafts/verification.json.

Verificado en app:3000 mediante 38 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: ausencia de bordes superiores y laterales, líneas inferiores discretas, fondo blanco, foco visible, selectores, cantidades decimales, validación y guardado. Dos conceptos caben sin scroll en los escritorios comprobados; sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta y recursos contrastados mediante SHA-256 con la imagen activa. API y datos de comprobación aislados en PostgreSQL temporal. Capturas e informe: `test-results/flat-invoice-validation/verification.json`.
Verificado en app:3000 a 1440 × 900, 390 × 844, 320 × 568 y 844 × 390, incluidos movimiento reducido y cuenta de consulta. Capturas de escritorio y móvil revisadas; panel de hasta 420 × 398 px, sin espacio vacío ni desbordamiento horizontal. Búsqueda, flechas, Intro, Ctrl/⌘ + K, Escape, cierre exterior, X y retorno de foco comprobados, sin errores de JavaScript. TypeScript, formato y compilación correctos. Recursos servidos contrastados por SHA-256 con el contenedor actualizado. Evidencias y datos simulados: `artifacts/search-motion/verification.json` y `served-assets.json` en la misma carpeta.

## Separación de los pasos de la factura · 15 de septiembre de 2026

Por petición del usuario, Cumplimentar factura separa los pasos de la cabecera con 24 px y deja 12 px entre la navegación y la hoja en escritorio. En contenidos estrechos se usan 16 px arriba y 12 px debajo de los pasos. Se reutilizan los tokens comunes y se conserva la altura táctil de 44 px. El ajuste añade aire a la navegación sin reducir textos ni campos y mantiene la factura habitual de dos conceptos visible sin scroll en escritorio; el contenido ampliado sigue creciendo de forma natural.

Verificado en app:3000 con diez comprobaciones: factura de dos conceptos sin scroll vertical ni horizontal a 1440 × 900, 1366 × 768 y 1471 × 825 en modo integrado; adaptación móvil a 390 y 320 px sin desbordamiento horizontal. Se comprueban separación, áreas táctiles, importes, menú por teclado y regreso entre pasos. Capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor. Compilación correcta y sin errores de JavaScript. Datos de prueba aislados en PostgreSQL temporal. Evidencias: `test-results/invoice-step-spacing/verification.json`.

## Conceptos agrupados con fondos de tabla · 15 de septiembre de 2026

Por petición del usuario, cada concepto de la hoja editable comparte una superficie con el mismo fondo de las filas impares de las tablas: mezcla del texto al 1,5 % sobre blanco. El grupo incluye producto, cantidad, precio, descuento, IVA y base, con espacio interior compacto y sin borde, sombra o recuadros adicionales. Los grupos de una misma fila tienen la misma altura visual. Hover y foco dentro del grupo emplean bg-muted, como las filas activas.

Los campos integran su fondo en el grupo, conservando la línea inferior, las flechas y el foco explícito. La hoja y los totales permanecen blancos. Se mantienen dos conceptos por fila en escritorio y una columna en móvil. Se ajusta el espacio de la hoja para conservar la visión completa de dos conceptos en portátil. Esta decisión añade estructura por superficies a la versión sin marcos individuales.

## Rangos ajustados al máximo de cada sección · 15 de septiembre de 2026

Por petición del usuario, la escala de Precio total e Importe del movimiento empieza en 0 y termina en el mayor importe real de la sección. Sustituye el máximo inicial de 10.000 euros y el texto «y más». El máximo se obtiene de todos los registros del apartado antes de filtros, búsqueda y paginación, con los mismos permisos y negocio activo. Ventas, presupuestos y compras tienen escalas independientes e incluyen los borradores de trabajo calculables del autor; en contactos se usa el total con impuestos de cada vista documental o el importe original de los cobros/pagos y anticipos. Cambiar la vista del panel carga su escala y volver a abrirlo actualiza el máximo.

La escala conserva los céntimos del máximo sin redondearlo ni ampliarlo por las cantidades escritas en Importe exacto. Los límites exactos guardados se conservan aunque queden fuera de la escala actual. Los extremos completos retiran las restricciones de importe. Una sección vacía muestra 0–0 con la barra desactivada. Durante la carga o un error no se ofrece un máximo inventado; el error permite reintentar.

Los tiradores rectos se reducen a 12 × 12 px con un trazo negro de 1 px. Mantienen el área transparente de agarre de 44 × 44 px, el foco visible y el manejo con teclado, ratón y pantalla táctil. Se conserva la barra monocroma, las fechas plegadas y la distribución del panel.

## Lupa de facturas en la cabecera · 15 de septiembre de 2026

Por petición del usuario, las cabeceras del resumen y de todos los listados de Facturas de venta muestran Buscar facturas junto al menú de tres puntos. Sustituye el acceso de búsqueda en la barra del listado de ventas. InvoiceSearch utiliza la misma lupa, SearchPanel y useSearchPanel que la búsqueda de acciones: 420 px como máximo, entrada suave, cierre animado, fondo ligero y formato compacto en móvil. Se conservan los tokens, tipografía y controles comunes.

Esta lupa busca exclusivamente documentos de ventas por NIF, nombre del cliente o una petición escrita, reutilizando useSalesSearch y los filtros del servidor. Intro o Buscar facturas abre el listado desde la primera página; las peticiones conservan su frase y criterios en la ruta. Un error de interpretación o un cliente ambiguo mantiene abierto el panel y exige resolver la consulta. Cerrar descarta el texto sin aplicar y conserva los resultados; Quitar búsqueda limpia la consulta aplicada. Ctrl/⌘ + K abre esta búsqueda dentro de Facturas. La búsqueda de acciones y las de otros listados conservan sus funciones.

Verificado en app:3000 mediante 38 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: fondos de grupo, estados hover/foco, altura uniforme por fila y campos integrados sin marcos. La reserva de espacio para flechas y € se conserva en reposo y al pasar el ratón, evitando solapamientos con las descripciones. Dos conceptos caben completos en escritorio. Selectores, cantidades decimales, validación, cálculos y guardado correctos; sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta, capturas revisadas y recursos contrastados mediante SHA-256 con la imagen activa. Datos de prueba aislados en PostgreSQL temporal. Evidencias: `test-results/grouped-invoice-validation/verification.json`.
Verificado en app:3000 con 39 comprobaciones a 1440, 390 y 320 px: máximos distintos por sección, cambio de vista, filtros sin alterar la escala, teclado, arrastre con ratón y táctil, conservación de céntimos, actualización tras nuevos registros, sección vacía y reintento. Tiradores de 12 px y área de agarre de 44 px comprobados. Dieciocho pruebas de cálculo, consultas, permisos, paginación y actividad superadas; TypeScript y compilación correctos. Capturas de escritorio y móvil revisadas; recursos servidos contrastados por SHA-256 con el contenedor. Datos de pruebas en PostgreSQL temporal. Evidencias: `test-results/section-amount-ranges/verification.json`.

Verificado en app:3000 con 16 recorridos a 1440, 390 y 320 px: resumen, listado, búsqueda por NIF y nombre, petición con cliente/estado/fecha/importe, reintento tras error, elección entre clientes coincidentes, consulta inválida, limpieza, recarga y foco. Los resultados se solicitan solo para ventas. La vista previa usa el contraste de texto sobre blanco del sistema. Sin errores de JavaScript ni desbordamiento horizontal. Dieciocho pruebas de búsqueda, TypeScript, formato y compilación correctos. También se verificaron las seis configuraciones del buscador de acciones tras compartir SearchPanel. App actualizado y recursos contrastados por SHA-256; datos de navegador simulados. Evidencias: `artifacts/invoice-header-search/verification.json` y `served-assets.json` en la misma carpeta.

## Resultados de búsqueda sin flechas diagonales · 15 de septiembre de 2026

Por petición del usuario, los resultados de CommandSearch y las acciones de InvoiceSearch omiten las flechas diagonales de la derecha. El cambio se aplica mediante ambos componentes compartidos a todas sus secciones. Cada fila conserva su texto, área de pulsación, destino, teclado y estados, con el mismo panel y animación. Se retiran los iconos y su regla de estilo sin reservar espacio para ellos.

Verificado en app:3000: flechas ausentes en los dos buscadores, capturas de escritorio y móvil revisadas, acciones y teclado conservados. Las comprobaciones existentes de ambos paneles pasan sin errores de JavaScript ni desbordamiento. TypeScript, formato y compilación correctos; recursos servidos contrastados por SHA-256 con el contenedor actualizado. Evidencia: `artifacts/search-motion/verification.json` y `artifacts/invoice-header-search/verification.json`.

## Buscador de facturas sin ejemplo ni fila de envío · 15 de septiembre de 2026

Por petición del usuario, InvoiceSearch retira el ejemplo inicial y la fila inferior Buscar facturas, incluida su flecha ya eliminada. Al abrirlo sin consulta muestra solo título, cierre y campo, sin reservar el espacio de resultados. Intro en el campo y la tecla de búsqueda móvil aplican la consulta; se conserva el envío aun cuando la petición muestre campos adicionales y se respeta la composición de texto. La vista previa, los errores y la elección de cliente solo aparecen cuando la consulta los necesita. Quitar búsqueda sigue disponible cuando existe una consulta aplicada. Se mantienen diseño, animación y foco.

Verificado en app:3000 con las 16 comprobaciones del buscador a 1440, 390 y 320 px: ejemplo y fila de envío ausentes, altura ajustada, Intro con NIF/nombre/petición y después de elegir cliente, errores, cierre y limpieza conservados. Capturas revisadas, sin desbordamiento ni errores de JavaScript. TypeScript, formato y compilación correctos; recursos contrastados por SHA-256 con el contenedor actualizado. Evidencia: `artifacts/invoice-header-search/verification.json`.

## Intervalo de precios sin campos duplicados · 15 de septiembre de 2026

Por petición del usuario, AmountRangeFilter muestra el título «Intervalo de precios» en ventas, presupuestos, compras y actividad de contactos. Se elimina «Importe exacto» y sus dos campos. La selección queda en la barra común, con euros enteros, sin decimales visibles y con pasos de 1 euro tanto por teclado como al arrastrar. Se conservan los tiradores de 12 px y su área de agarre de 44 px.

El origen sigue siendo 0 y el máximo se calcula por sección; se redondea al entero superior para incluir los registros cuyo total tiene céntimos. Las consultas y los importes de los documentos mantienen su precisión. Los intervalos anteriores con decimales se adaptan hacia fuera en el borrador del panel: mínimo inferior y máximo superior. Aplicar confirma los enteros mostrados; Cancelar conserva el filtro anterior. Los extremos completos retiran las restricciones, las fechas siguen plegadas y se mantienen validaciones, carga y reintento. Esta decisión sustituye la edición de importes exactos y los pasos de un céntimo de las versiones anteriores.

Verificado en app:3000 con 30 comprobaciones a 1440, 390 y 320 px: título común, ausencia de campos duplicados, pasos y valores enteros, máximos que incluyen los céntimos, cambio de vista, cancelación, aplicación de filtros anteriores, teclado, arrastre con ratón y táctil y sección vacía. Diez pruebas unitarias, TypeScript y compilación correctos. Capturas de escritorio y móvil revisadas y recursos servidos contrastados mediante SHA-256 con el contenedor. Evidencias: `test-results/integer-price-range/verification.json`.

## Resumen de factura sin fecha de emisión · 15 de septiembre de 2026

Por petición del usuario, el resumen interno de una factura omite la etiqueta Emisión y su fecha en la hoja maquetada. Vencimiento ocupa el espacio natural restante, sin columna ni hueco reservado. DocumentSheet y DocumentSheetLayout reciben showIssueDate, activado por defecto; la ficha de factura lo desactiva. La fecha guardada, el editor, otros tipos documentales, el portal y el PDF conservan su comportamiento.

## Filtros con limpieza persistente y acciones separadas · 15 de septiembre de 2026

Por petición del usuario, el panel de contabilidad elimina el texto del KPI activo junto a Limpiar filtros. La acción permanece visible tras limpiar y al cambiar criterios; retira el indicador, restablece el ejercicio actual y limpia los errores de fechas. Abrir y cancelar conserva los filtros aplicados. KpiFilter incorpora la variante persistent solo para los paneles que necesitan conservar la acción, incluidos los contactos. Los paneles de ventas, presupuestos, compras, catálogo y actividad también mantienen siempre Limpiar filtros.

El pie de todos los formularios laterales se aplica por su estructura común, con 24 px arriba y abajo, 20 px a los lados y 16 px entre acciones, respetando el área segura inferior del dispositivo. El contenido desplaza dentro del panel y el pie permanece accesible. Cobros y pagos añade Cancelar junto a Aplicar filtros; contactos conserva los márgenes del diálogo y usa la misma separación entre botones. Limpiar filtros mantiene un área de interacción de 44 px.

Verificado en app:3000 con 24 recorridos de contabilidad, ventas, presupuestos, compras, catálogo, contactos, actividad y cobros/pagos a 1440, 390 y 320 px. Limpiar permanece visible, habilitado y con foco tras usos repetidos y nuevos criterios; Cancelar conserva la consulta, Aplicar confirma los cambios y la acción sigue disponible al reabrir. Se comprueban errores de fechas, ausencia del texto del KPI en contabilidad, márgenes del pie, botones de al menos 44 px y acceso al contenido desplazable. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript, formato y compilación correctos; capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor activo. API y PostgreSQL temporales. Evidencias: `test-results/filter-panel-cleanup/verification.json`.

Verificado en app:3000 con 13 comprobaciones a 1440, 1366, 390 y 320 px: Emisión y su fecha ausentes del resumen de facturas, sin hueco reservado y con Vencimiento visible. Se comprueba la fecha guardada y su presencia en el editor, compras y presupuestos. Sin errores de JavaScript ni desbordamiento horizontal; capturas revisadas, compilación correcta y recursos contrastados mediante SHA-256 con la imagen activa. API y datos de prueba en PostgreSQL temporal. Evidencias: `test-results/invoice-summary-date-validation/verification.json`.

## Navegación de secciones sin barra de selección · 15 de septiembre de 2026

Por petición del usuario, SectionNavigation retira la marca vertical junto a la opción seleccionada en fichas documentales y Configuración. La selección conserva el texto oscuro con peso 600 y aria-current; se mantienen el foco de teclado, la señal de alto contraste y el selector móvil. Se eliminan la regla del pseudoelemento y su ajuste exclusivo en documentos, sin reservar espacio para la marca.

## Vencimientos en una fila por plazo · 15 de septiembre de 2026

Por petición del usuario, DocumentSchedule reduce el título a «Vencimientos» y sitúa «Modificar» como acción de texto junto a él, con nombre accesible «Modificar plazos» y área de 44 px. Desaparece el botón enmarcado bajo el listado. La fecha y el importe comparten una fila, en un ancho máximo de 32 rem para acercarlos en escritorio; en móvil se adaptan al espacio disponible. No se añaden divisores ni contenedores.

Un plazo sin aplicaciones muestra solo fecha e importe, sin repetir el total ni «Aplicado: 0,00 €». Los pagos parciales conservan el importe aplicado y el saldo pendiente; un plazo completamente liquidado muestra su importe original con «Liquidado». Se mantienen la precisión monetaria, los varios plazos, el historial plegado, el diálogo de edición y los permisos de consulta. La disposición usa la escala, pesos, colores y espacios comunes.

Verificado en app:3000 con 27 comprobaciones a 1440, 390 y 320 px: vencimiento único sin importes duplicados, pagos parciales y liquidados, varios plazos, historial, edición y guardado, teclado, retorno de foco y permisos de consulta. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript y compilación correctos; capturas de escritorio y móvil revisadas y recursos servidos contrastados mediante SHA-256 con el contenedor. Datos y cambios de calendario de prueba en PostgreSQL temporal. Evidencias: `test-results/simple-document-schedule/verification.json`.

## Más espacio interior en la cabecera de factura · 15 de septiembre de 2026

Por petición del usuario, la cabecera compacta de Cumplimentar factura pasa de 12 a 20 px de espacio vertical interior por lado. Conserva el título, el enlace de regreso y el menú de acciones en su misma disposición, con los controles comunes. En escritorio se redistribuyen los mismos 16 px: la separación exterior hasta los pasos pasa de 24 a 12 px y la separación entre pasos y hoja de 12 a 8 px. Así la cabecera gana aire sin aumentar la altura total del formulario habitual. Esta distribución actualiza la separación anterior de los pasos; no se recorta contenido ni se bloquea el desplazamiento de formularios ampliados o móviles.

## Lupas comunes en las cabeceras de sección · 15 de septiembre de 2026

Por petición del usuario, el buscador compacto de facturas se extiende a presupuestos, compras y gastos, cobros y pagos (pendientes, movimientos y fondos), clientes y proveedores, catálogo y contabilidad. También se unifican actividad de contactos, importaciones y auditoría. El acceso se sitúa en la cabecera, con una sola lupa por vista y sin duplicarla en la barra de filtros. Está disponible desde los resúmenes; al aplicar abre el listado correspondiente. En contabilidad busca asientos y abre el diario, conservando el periodo salvo que la petición indique otras fechas.

HeaderSearchField y useHeaderSearch comparten presentación, borrador, foco y atajo; HeaderListSearch reutiliza el intérprete de cada sección y DocumentSearch el de documentos comerciales. Todos usan SearchPanel: ancho máximo de 420 px, entrada de 220 ms, cierre de 160 ms y adaptación compacta a móvil y movimiento reducido. Se conservan las reglas y tokens existentes, sin nuevas escalas. Al abrir sin consulta solo aparecen el título, el cierre y el campo; no hay ejemplo, fila de envío ni flechas diagonales.

Intro o la tecla de búsqueda móvil aplica. La vista previa y las opciones para resolver la petición aparecen solo cuando hacen falta. Cerrar descarta el borrador sin alterar los resultados; los errores impiden aplicar y Quitar búsqueda limpia la consulta guardada. Ctrl/⌘ + K abre la búsqueda de la sección. Recargar conserva frase y criterios, incluidas las fechas ya interpretadas, sin abrir el panel automáticamente. Esta decisión sustituye la disposición anterior de búsquedas dentro de los listados.

Verificado en app:3000 con 64 recorridos de cabeceras a 1440, 390 y 320 px: resumen, listado, detalles, consultas literales y peticiones, ámbito, vista previa, errores, cierre, limpieza, teclado, recarga y fechas guardadas. Los 16 recorridos de facturas y las 46 pruebas de interpretación también pasan. Sin errores de JavaScript ni desbordamiento horizontal en las vistas comprobadas. TypeScript, formato y compilación correctos; capturas de escritorio y móvil revisadas. App actualizado mediante Docker Compose y recursos servidos contrastados por SHA-256. Datos de navegador simulados, sin escrituras de negocio. Evidencias: `artifacts/all-header-searches/results.json`, capturas y `served-assets.json`.

Verificado en app:3000 con 20 comprobaciones de creación y edición a 1440 × 900, 1366 × 768, 1471 × 825 en modo integrado, 390 × 844 y 320 × 568. La cabecera mide 84 px en escritorio y el formulario habitual de dos conceptos cabe sin scroll. Sin desbordamiento horizontal ni errores de JavaScript; menú y retorno de foco comprobados. Capturas de portátil y móvil revisadas, TypeScript y compilación correctos. Datos aislados en PostgreSQL temporal. Evidencias: test-results/invoice-header-spacing/verification.json.

## Facturas creadas en columnas · 15 de septiembre de 2026

Por petición del usuario, el resumen de facturas usa la cuadrícula compartida de DocumentSheetLayout: emisor a la izquierda y cliente a la derecha, con etiquetas, nombres y datos alineados. Los conceptos se leen de izquierda a derecha, dos por fila, agrupados mediante el mismo fondo suave que las tablas y con 16 px interiores. La hoja blanca elimina el marco exterior gris, separa sus bloques con 24 px y conserva una línea compacta para vencimiento y referencias. La fecha de emisión sigue omitida en este resumen.

Los importes de base, IVA, retención y total se distribuyen en columnas según el ancho disponible; el total mantiene la superficie y la jerarquía destacadas del sistema. Los nombres y conceptos emplean la escala común, sin truncar textos ni ocultar datos para reducir la altura. Con 540 px o menos de ancho de resumen, emisor, cliente y conceptos se apilan. La distribución se aplica por tipo de documento a borradores, facturas pendientes, parciales y cobradas. El editor y la presentación de los demás documentos conservan sus variantes; el PDF y el portal no usan esta variante interna.

## Vencimientos con estructura de tabla compacta · 15 de septiembre de 2026

Por petición del usuario, DocumentSchedule añade encabezados «Fecha» e «Importe» y usa una tabla semántica dentro de table-scroll. Las filas heredan el fondo alterno tenue y la única línea bajo el encabezado del patrón común de tablas; no se añaden marcos exteriores ni divisores entre filas. La fecha y el importe conservan su información útil sin repetir cifras.

El título y «Modificar» ocupan los extremos del mismo bloque de 32 rem que la tabla. Los valores numéricos se alinean a la derecha, con 16 px interiores en los extremos. La tabla usa dos columnas flexibles sin ancho mínimo en móvil; mantiene sus etiquetas visibles. El historial se ajusta al mismo ancho. Se conservan los estados parciales/liquidados, la edición, el foco y los permisos. Esta estructura sustituye la lista sin encabezados aprobada previamente.

Verificado en app:3000 con 27 comprobaciones a 1440, 390 y 320 px: columnas accesibles, fondos tenues, alineación de la acción, importes sin duplicar, pagos parciales y liquidados, varios plazos, historial, edición/guardado, foco y modo consulta. Sin errores de JavaScript ni desbordamiento horizontal. TypeScript y compilación correctos; capturas de escritorio y móvil revisadas y recursos contrastados mediante SHA-256 con el contenedor. Datos y calendarios de prueba aislados en PostgreSQL temporal. Evidencias: `test-results/structured-document-schedule/verification.json`.

Verificado en app:3000 con 66 comprobaciones a 1440 × 900, 1366 × 768, 1024 × 768, 390 × 844 y 320 × 568: borrador, pendiente y cobrada, uno y cuatro conceptos, textos largos, importes grandes, descuentos, varios tipos de IVA, exención y retención. Emisor y cliente alineados; conceptos de igual altura en dos columnas mientras el resumen supera 540 px. La factura habitual de dos conceptos cabe completa en portátil, incluidos los totales. Sin errores de JavaScript, desbordamientos horizontales ni texto recortado; editor, compras y presupuestos conservados. Capturas de escritorio y móvil revisadas. TypeScript y compilación correctos; imagen app actualizada y recursos contrastados por SHA-256. Datos de prueba aislados en PostgreSQL temporal. Evidencias: test-results/saved-invoice-columns/verification.json.

## Catálogo sin descripción en las filas · 15 de septiembre de 2026

Por petición del usuario, la tabla del catálogo muestra únicamente el nombre del artículo en su columna, sin la descripción secundaria ni espacio reservado para ella. Se aplica a todos los filtros y estados del listado, en escritorio y móvil. La descripción se conserva en Datos del artículo y en su formulario de edición; el nombre sigue abriendo la ficha. Se retira la regla móvil exclusiva del texto eliminado.

## Situación patrimonial sin aviso secundario · 15 de septiembre de 2026

Por petición del usuario, la cabecera de Situación patrimonial y resultados retira la frase «No son cuentas anuales oficiales». PanelHeading muestra solo el título, sin párrafo ni espacio reservado para la descripción. Se conservan los datos y controles del informe.

## Libro mayor sin saldo inicial bajo el título · 15 de septiembre de 2026

Por petición del usuario, Libro mayor retira la línea secundaria «Saldo inicial: …» de PanelHeading. La cabecera muestra solo el título, sin reservar el espacio del párrafo. Se mantienen el selector de cuenta, los movimientos y los cálculos del saldo.

## Cierre contable sin notas y con tabla adaptable · 15 de septiembre de 2026

Por petición expresa del usuario, Cerrar periodo contable retira las notas de borradores, archivo histórico, coincidencia de saldos y las consecuencias del cierre. Se conservan el periodo, las cuentas, sus tres importes y las acciones de cancelar/confirmar; los errores operativos y las diferencias que impiden cerrar siguen visibles. La validación del servidor y la reapertura mantienen su comportamiento.

El cierre usa la variante amplia de Modal (750 px en escritorio) y una tabla al ancho disponible, sin el mínimo que provocaba desplazamiento horizontal. En móvil cada cuenta agrupa sus tres valores con etiquetas visibles, manteniendo los encabezados semánticos para lectores de pantalla. La tabla conserva los fondos comunes y los importes completos, admite cifras largas sin recortarlas y no requiere scroll horizontal. No se añaden marcos ni escalas tipográficas locales.

Verificado en app:3000 con 17 comprobaciones a 1440, 1024, 390 y 320 px: notas ausentes, cuatro encabezados accesibles, dos cuentas completas, sin desbordamiento horizontal del modal o la tabla ni cifras recortadas. Capturas revisadas con importes habituales y largos; errores de consulta y bloqueos visibles. Cancelar devuelve el foco y se comprueban cierre y reapertura reales en PostgreSQL temporal. Los escenarios de importes largos, descuadre y error se simulan para revisar la presentación. TypeScript, formato y compilación correctos, sin errores de JavaScript y recursos servidos contrastados por SHA-256 con el contenedor activo. Evidencias: `test-results/period-close-modal/verification.json`.

## Nueva cuenta junto al filtro · 15 de septiembre de 2026

Por petición del usuario, Plan de cuentas sustituye el botón de texto Nueva cuenta junto al título por un icono + inmediatamente a la izquierda del filtro. Reutiliza ListToolbar.tools, list-tool-button, Plus y el tooltip común, con el nombre accesible Nueva cuenta y las dimensiones compartidas de escritorio y móvil. La acción abre el formulario existente y conserva los permisos de administrador, el cierre y el retorno del foco. No se duplica junto al título ni se añade a otras vistas contables.

## Cierre contable con acciones de icono · 15 de septiembre de 2026

Por elección expresa del usuario, el pie de Cerrar periodo contable sustituye Cancelar por X y Confirmar cierre por Check, ambos Lucide de 20 px y negros. La variante común icon-button-plain elimina fondo, borde y sombra también al pasar el cursor; conserva el foco visible, el nombre accesible y la ayuda de cada acción. Cada control mantiene 44 × 44 px y 16 px de separación. Los estados deshabilitados durante el envío se mantienen. No cambian las operaciones de cierre, la tabla ni la presentación de la reapertura.

Verificado en app:3000 a 1440, 1024, 390 y 320 px: iconos negros sin fondo, borde ni sombra incluso al pasar el cursor; controles de 44 px separados 16 px, nombres accesibles y foco de teclado visible. Cancelar devuelve el foco; cierre y reapertura comprobados en PostgreSQL temporal, con ambas acciones deshabilitadas durante el envío. Sin scroll horizontal ni errores de JavaScript. TypeScript y compilación correctos, capturas revisadas y recursos servidos contrastados con el contenedor activo. Evidencia: `test-results/period-close-icons/verification.json`.

### Guardar y crear otra factura · 15/09/2026

- En el último paso del editor de facturas, el menú de tres puntos incorpora «Guardar y crear otra factura» como acción directa. Sustituye la casilla inferior «Crear otra factura al guardar».
- Guarda en borrador y, tras confirmar el guardado, abre un trabajo nuevo con el mismo cliente y los conceptos vacíos. Mantiene las acciones independientes de guardar en borrador y emitir factura.
- Reutiliza el menú, los iconos, el foco de teclado y el bloqueo durante el guardado existentes. La validación y el reintento conservan el documento ante errores.
- Verificación: compilación de producción y recorrido en 1440, 390 y 320 px con la API real sobre una base temporal; acción accesible, casillas retiradas, campos nuevos vacíos, validación, guardado ordinario y reintento sin duplicar tras perder una respuesta. Evidencia en tests/save-create-invoice.browser.mjs y test-results/save-create-invoice/verification.json. Recursos comprobados contra la imagen de app servida en el puerto 3000.

## Proceso de creación común · 15 de septiembre de 2026

Por petición del usuario, presupuestos y compras/gastos adoptan el editor compacto de facturas: tres pasos, cabecera compacta al cumplimentar, emisor/proveedor y destinatario en paralelo, conceptos de dos en dos, los mismos selectores de cantidad, producto e IVA y los campos sin marcos repetidos. Se mantienen la validez del presupuesto, las fechas y el número de la factura del proveedor, los descuentos, impuestos y los datos adicionales. Guardar en borrador se sitúa en el menú de cabecera para los tres tipos; emitir y contabilizar conservan su alcance y el presupuesto se confirma desde su ficha. Crear otro documento y conservar cliente/proveedor siguen disponibles.

CreationSteps comparte navegación, pasos visitados, selección y estados deshabilitados entre el editor y PaymentCreation. El registro de cobros/pagos individual y agrupado usa Documento, Fecha y Cumplimentar movimiento, con acceso directo a Fecha si el documento ya estaba seleccionado. Se conservan importes y referencia al volver atrás. La selección presenta cinco documentos por página y conserva selecciones al buscar o paginar. El movimiento admite hasta cien documentos del mismo sentido, con los saldos originales, cantidades aplicadas y saldo posterior visibles. La última fase agrupa importes en dos columnas y finaliza desde el menú de cabecera, como la factura.

Los movimientos usan la ventana común con cabecera negra, campos blancos, conceptos sobre superficies suaves y totales compactos. El menú mantiene su portal dentro del diálogo nativo, reutilizando la capa de los selectores para conservar interacción y foco. Se validan fechas, importes parciales y límites de saldo antes del registro, con bloqueo durante el envío y la idempotencia existente. La API y sus validaciones permanecen como autoridad del saldo actual. En móvil los conceptos y movimientos se apilan. Los espacios específicos del resumen guardado se acotan para que no alteren los editores.

## Editar borrador en el menú de cabecera · 15/09/2026

Por petición del usuario, «Editar borrador» se muestra únicamente dentro del menú de tres puntos de la cabecera del documento. Se retira el botón independiente en facturas, presupuestos y compras. La acción conserva el destino de edición, el bloqueo durante operaciones y los permisos; no aparece en documentos confirmados ni para usuarios de consulta.

Verificado en app:3000 a 1440, 390 y 320 px: acceso al editor correcto desde el menú, disponibilidad desde las secciones del documento, foco de teclado, ausencia de duplicados y permisos. Compilación correcta y recursos contrastados con el contenedor. Evidencia: test-results/draft-edit-menu/verification.json.

## Referencias de facturas enlazadas · 15 de septiembre de 2026

Por petición del usuario, Factura del proveedor abre el original adjunto en otra pestaña. Un adjunto se abre directamente; varios ofrecen un selector de archivos con foco y cierre por Escape. Sin adjuntos o ante un error de consulta se conserva el número como texto. PDF, PNG y JPEG pueden visualizarse; los demás formatos mantienen su descarga. No se atribuye un archivo arbitrario a una factura ni se enlazan referencias libres por coincidencia de texto.

Rectifica a enlaza la factura identificada por original_id y conserva el regreso a la rectificativa. Los números dentro de los pasos del registro de cobros/pagos abren su factura en otra pestaña para preservar el formulario. La selección de documentos sigue siendo un control de selección. Los listados, movimientos, vencimientos y contactos conservan sus enlaces existentes.

InvoiceLink y OriginalInvoiceReference comparten invoice-reference: mismo color, fuente y peso del texto, sin marco ni subrayado permanente; hover y foco subrayan, y el teclado conserva un contorno visible. Se reutilizan Modal, la consulta autorizada de adjuntos y las rutas existentes. La opción de visualización conserva el aislamiento por empresa y la descarga predeterminada.
Verificado en app:3000 con 64 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: creación y guardado de factura, presupuesto y compra; retorno entre pasos; fechas y referencia del proveedor; dos conceptos en columnas; cobros y pagos parciales; registro agrupado, límites de saldo y fechas; conservación de importes y referencia al volver atrás y bloqueo de mezclas de cobros y pagos. Los formularios habituales caben completos en portátil. Sin desbordamientos horizontales ni errores de JavaScript; capturas de escritorio y móvil revisadas. Nueve pruebas existentes de borradores y usabilidad superadas, TypeScript y compilación correctos. Recursos servidos contrastados por SHA-256 con la imagen app actualizada. Datos y escrituras de comprobación en PostgreSQL temporal. Evidencias: test-results/shared-creation/verification.json.

## Creación de factura en una pantalla · 15 de septiembre de 2026

Por petición del usuario, la factura se crea directamente con cliente, emisión, vencimiento y conceptos en la misma pantalla. Se elimina la navegación por pasos tanto al crear como al editar el borrador. El cliente se busca junto al emisor y, tras seleccionarlo, muestra su ficha con la acción Editar. Las fechas permanecen editables; Plazo de pago conserva los atajos al contado, 15, 30 y 60 días en un selector común. Cambiar emisión conserva ese plazo; un vencimiento personalizado se mantiene y se valida al guardar.

Se reutiliza la composición compacta: emisor y cliente en paralelo, conceptos de dos en dos con fondos suaves, totales y datos adicionales. Los espacios distinguen los bloques sin añadir marcos. Guardar, emitir y guardar y crear otra factura permanecen en la cabecera. La validación enfoca los campos en la misma pantalla. Los borradores locales y del servidor se recuperan completos aunque procedan de un paso antiguo, conservando el guardado automático y los controles de concurrencia. En móvil los bloques se apilan y permiten desplazamiento natural.

Al añadir un cliente desde una búsqueda por nombre sin NIF conocido, el alta permite escribir su identificador fiscal. Si procede de una consulta por NIF, conserva el identificador consultado. Abrir una factura vacía no genera un borrador hasta que se cambian sus datos.

Verificado en app:3000 con 30 comprobaciones a 1440 × 900, 1366 × 768, 390 × 844 y 320 × 568: campos disponibles desde el inicio, alta y cambio de cliente sin perder conceptos, fechas y plazos, validación sin cambiar de pantalla, recarga, borradores de los cuatro pasos anteriores, acceso desde cliente y catálogo, guardado y emisión. La factura habitual de dos conceptos cabe en portátil, incluso con el aviso de coincidencia; sin desbordamiento horizontal ni errores de JavaScript. Se conservan los procesos de presupuesto y compra. Se verificó además guardar y crear otra factura con pérdida de respuesta y reintento sin duplicados, y pasaron 14 pruebas existentes de borradores, pasos y usabilidad. Formato, TypeScript y compilación correctos; capturas de escritorio y móvil revisadas, recursos servidos contrastados por SHA-256 con la imagen actualizada de app. Las escrituras de prueba se ejecutaron en PostgreSQL temporal. Evidencias: test-results/single-page-invoice/verification.json y test-results/save-create-invoice/verification.json.

## Acciones junto a los títulos de PDF y envío · 15 de septiembre de 2026

Por petición del usuario, Preparar correo y Crear enlace se muestran únicamente como iconos junto a Correo y Portal del cliente, con el mismo patrón de Plantilla del PDF. PanelHeading reutiliza su alineación contextual, separación de 8 px y controles de 44 px; Mail y Link mantienen 18 px. Las cuatro acciones de estas cabeceras usan icon-button-plain, sin fondo ni borde también al pasar el cursor. Los tooltips comunes conservan los nombres de las acciones y aparecen al pasar el cursor o enfocar con teclado. Se mantienen los nombres accesibles, el foco visible, los formularios existentes y los permisos, en todas las fichas que comparten DocumentDelivery.

Verificado en app:3000 con 12 vistas a 1440, 390 y 320 px, incluyendo facturas, presupuestos, compras y borradores. Iconos junto al título, tooltips con los nombres anteriores al pasar el cursor y con teclado, apertura de ambos formularios y retorno del foco correctos; enlaces de PDF y plantillas conservados. Sin desbordamientos ni errores de JavaScript; comprobaciones con API real y PostgreSQL temporal, sin enviar correos ni crear enlaces. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor. Evidencia: `test-results/delivery-heading-icons/verification.json`.

## Resumen documental común · 15/09/2026

Por petición del usuario, todos los resúmenes internos de documentos adoptan la composición aprobada de factura: datos de las partes en dos columnas, conceptos de dos en dos sobre fondo suave, hoja blanca sin marco exterior y desglose de importes con el total destacado. Se aplica a presupuestos, compras/gastos y rectificativas, tanto en borrador como confirmados, y a los documentos abiertos desde Cobros y pagos. Se reutilizan DocumentSheetLayout, DocumentSheetLines y los estilos compartidos, sin crear variantes por módulo.

En compras y abonos de proveedor se identifica Proveedor a la izquierda y Tu empresa a la derecha, igual que en su editor. Las fechas de emisión y operación, la validez de presupuestos, la referencia del proveedor, los enlaces a originales y el efecto económico de las rectificativas se conservan. La factura mantiene su decisión de omitir Emisión en el resumen. Los importes y el desglose no cambian. PDF y portal conservan su presentación independiente.

Verificado en app:3000 con 32 recorridos a 1440, 1366, 390 y 320 px: presupuestos y compras en borrador y confirmados, abonos de proveedor, referencias y conceptos largos, importes grandes, descuentos, varios tipos de IVA, exención, retención y apertura desde cobros y pagos registrados. Columnas alineadas en escritorio y apiladas en móvil, sin recortes ni desbordamiento horizontal. Compilación correcta y recursos contrastados con el contenedor activo. Datos de prueba en PostgreSQL temporal. Evidencia: test-results/shared-document-overview/verification.json.

## Cumplimentar movimiento simplificado · 15 de septiembre de 2026

Por petición del usuario, el último paso de cobros y pagos usa el mismo bloque central de hasta 720 px que Fecha. Una factura muestra una sola vez su número enlazado, cliente/proveedor y saldo pendiente. Debajo se alinean Importe y Medio de pago; Referencia (opcional) queda plegada. Se retiran la fecha repetida, los botones Editar duplicados, la caja del concepto y el total que repetía el importe. Los pasos anteriores mantienen el acceso a documento y fecha, y registrar permanece en el menú de cabecera.

Un importe parcial añade únicamente cuánto quedará pendiente; el pago completo no muestra un saldo cero adicional. Los movimientos agrupados conservan cada factura con su importe y el total conjunto necesario. Los errores, las cantidades, la referencia y la fecha se conservan al volver entre pasos. Se mantienen la tipografía, los campos y los enlaces comunes; en móvil los campos se apilan.

Verificado en app:3000 con nueve recorridos de cobro, pago y movimiento agrupado a 1440, 390 y 320 px: composición compacta, ausencia de duplicados, enlace de factura, referencia plegada con teclado, límites de saldo, importes parciales, conservación al volver y envío correcto. API simulada, sin escrituras de negocio; sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta, capturas revisadas y recursos contrastados por SHA-256 con la imagen activa. Evidencias: test-results/simple-payment/verification.json.

## Emisión automática en el editor de facturas · 15 de septiembre de 2026

Por petición del usuario, se retira el campo Emisión del formulario único de factura. Vencimiento y Plazo de pago quedan en dos columnas compactas, apiladas en móvil, sin texto sustitutorio ni espacio reservado. La fecha se obtiene del sistema local al recuperar el formulario y al guardar, emitir o guardar y crear otra factura, incluido el cambio de día con el formulario abierto. Los plazos habituales se mantienen respecto al día actual; un vencimiento personalizado se conserva y valida. Un reintento de una operación pendiente mantiene la fecha de la operación original para evitar duplicados. Presupuestos, compras y documentos ya emitidos conservan su comportamiento.

Verificado en app:3000 a 1440, 1366, 390 y 320 px: campo y etiqueta Emisión ausentes, vencimiento y plazo alineados, formulario habitual completo en portátil y sin desbordamiento horizontal en móvil. Guardado y emisión con la fecha local actual, cambio de día respecto a UTC, recuperación de borradores antiguos, conservación del vencimiento personalizado y del plazo habitual, validación de vencimientos pasados y reintento al día siguiente sin cambiar la operación original ni duplicarla. También se comprobó guardar y crear otra factura; nueve pruebas existentes superadas. Compilación y TypeScript correctos, capturas revisadas y recursos contrastados por SHA-256 con el contenedor app. Datos aislados en PostgreSQL temporal. Evidencia: test-results/invoice-system-date/verification.json.

## Referencia abierta al registrar cobros · 15 de septiembre de 2026

Por petición del usuario, Referencia (opcional) aparece desplegada al llegar a Cumplimentar movimiento en un cobro, individual o agrupado. Se conserva el desplegable nativo y se puede cerrar con ratón o teclado; al regresar a ese paso vuelve a mostrarse abierto con el texto conservado. Los pagos mantienen su estado inicial plegado. Se reutiliza el campo y el comportamiento de registro existentes.

Verificado en app:3000 con 12 recorridos a 1440, 1366, 390 y 320 px: referencia visible al iniciar cobros individuales y agrupados, apertura y cierre con teclado, conservación al volver a Fecha y envío con el texto escrito. Pagos mantienen la referencia plegada. Sin errores de JavaScript ni desbordamiento horizontal; capturas de escritorio y móvil revisadas. Compilación correcta y recursos contrastados con la imagen app activa. API simulada, sin escrituras de negocio. Evidencia: test-results/open-reference/verification.json.

## Adjuntos vacíos y navegación de documentos · 15 de septiembre de 2026

Por petición del usuario, Archivos originales pasa a Archivos adjuntos en la ficha y sus accesos relacionados. Cuando la consulta termina sin adjuntos, los usuarios con permiso de edición ven una única acción Subir archivos centrada en el ancho del contenido. Se reutiliza la carga existente, sus tipos y límite de 5 MB; durante el envío se bloquea la acción y se indica el progreso. Al añadir archivos reaparecen el listado y el clip junto al título, con retorno de foco. Se mantienen los errores, la eliminación y Deshacer; una consulta fallida no se presenta como una lista vacía.

Las flechas de las fichas documentales se distribuyen en los extremos izquierdo y derecho del contenido en todas sus secciones, conservando filtros, destinos y estados. SectionNavigation recupera la marca negra de 2 px junto a la sección activa, situada en el borde derecho del menú; cambia con aria-current sin añadir divisores completos. Documentos conserva su separación de 12 px y Configuración la común de 24 px; en móvil se mantiene el selector accesible.

Verificado en app:3000 a 1440, 390 y 320 px con facturas, presupuestos y compras: botón centrado sin duplicar el clip, carga con teclado, retorno del foco, eliminación, Deshacer y recuperación del estado vacío. Flechas en extremos opuestos en todas las secciones, destinos filtrados y límites conservados; marca activa correcta en fichas y Configuración. Error de carga y rol de consulta simulados para comprobar que no se muestran acciones indebidas. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos, capturas revisadas y recursos contrastados por SHA-256 con el contenedor app. Las cargas y eliminaciones de prueba se realizaron con API real y PostgreSQL temporal. Evidencia: `test-results/attachments-layout/verification.json`.

## Ficha de contacto con datos laterales y actividad · 15 de septiembre de 2026

Por elección expresa del usuario, al seleccionar un cliente o proveedor su ficha utiliza la composición de documentos: columna izquierda de 200 px con sus datos y área principal derecha con la actividad existente. El nombre y el estado permanecen en la cabecera. NIF, dirección, correo y teléfono aparecen en el lateral cuando están disponibles; el tipo mixto se identifica y las notas internas se pueden desplegar. No se añaden marcos ni divisores. Se conservan las acciones de la ficha y el acceso a todos sus datos y edición.

ContactActivityPanel mantiene indicadores, tabla, búsqueda, filtros, paginación y destinos de documentos. Su contenedor se ajusta al ancho de la columna para aplicar la adaptación móvil de tablas e importes. Por debajo de 760 px de contenido, los datos aparecen encima de la actividad y sus campos se distribuyen en dos columnas o una cuando el ancho baja de 380 px. El directorio de clientes y proveedores conserva su funcionamiento.

Verificado en app:3000 con 20 comprobaciones a 1440, 1024, 390 y 320 px: clientes, proveedores y fichas mixtas, nombres/direcciones/correos largos y campos opcionales vacíos. Datos laterales en escritorio y encima de la actividad al estrecharse, sin desbordamiento horizontal de página ni tabla. Notas accesibles por teclado, filtros, regreso desde documentos a la misma ficha y vista, acceso a edición y directorio conservados. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor activo. API real y PostgreSQL temporal, sin escrituras desde la interfaz. Evidencia: `test-results/contact-detail-layout/verification.json`.

## Referencia fija en el registro de movimientos · 15 de septiembre de 2026

Por petición del usuario, la referencia deja de ser un desplegable. El formulario común de cobros y pagos presenta un único campo fijo con la etiqueta Referencia (opcional), sin flecha ni título duplicado. Se retiran los estilos exclusivos del colapsador. Se conservan el texto al volver entre pasos, los límites del campo y su envío en movimientos individuales y agrupados.

Verificado en app:3000 con 12 recorridos de cobro, pago y movimiento agrupado a 1440, 1366, 390 y 320 px: campo fijo visible, una sola etiqueta, ausencia de details/summary, conservación al volver a Fecha y envío de la referencia escrita. Capturas revisadas; sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta y recursos contrastados con la imagen app activa. API simulada, sin escrituras de negocio. Evidencia: test-results/fixed-reference/verification.json.

## Edición de cliente con lápiz · 15 de septiembre de 2026

Por petición del usuario, la acción Editar junto a Cliente en el editor se representa con Pencil de Lucide, reducido a 14 px por petición posterior del usuario. Reutiliza icon-button e icon-button-plain, con el área de interacción adaptable y sin fondo ni borde. Conserva el nombre accesible y la ayuda Editar cliente, la apertura del selector y el retorno del foco. La misma acción compartida identifica Editar proveedor cuando corresponde.

## Clientes y proveedores sin KPI · 15 de septiembre de 2026

Por petición del usuario, Clientes y proveedores abre directamente el directorio y retira sus indicadores generales. Las fichas de clientes, proveedores y contactos mixtos eliminan también los KPI de actividad: la tabla y sus filtros comienzan junto a los datos laterales, sin reservar el espacio anterior. Se conserva la búsqueda, la paginación, las acciones y los accesos de retorno. Los enlaces existentes con kpis o metric siguen abriendo el directorio filtrado o la ficha correspondiente. Esta decisión sustituye la presencia de indicadores en la composición anterior; el resto de módulos mantiene sus KPI.

Verificado en app:3000 a 1440, 1024, 390 y 320 px: sin KPI en el directorio ni en fichas de clientes, proveedores o contactos mixtos, y sin peticiones al resumen de indicadores. Acceso directo desde contacts y compatibilidad con enlaces anteriores, filtros, regreso desde documentos, edición y adaptación móvil conservados. Compilación y TypeScript correctos, sin errores de JavaScript ni desbordamiento horizontal. Capturas revisadas y recursos servidos contrastados con el contenedor. API y datos temporales; sin escrituras desde la interfaz. Evidencia: `test-results/contacts-without-kpis/verification.json`.

Verificado en app:3000 a 1440, 390 y 320 px: lápiz visible, sin texto ni marco; apertura con teclado y retorno del foco al cancelar, sin desbordamiento ni errores de JavaScript. Formato, TypeScript y compilación correctos. Servicio app reconstruido y actualizado; recursos contrastados por SHA-256 con el contenedor activo. Datos simulados, sin escrituras de negocio. Evidencia: artifacts/edit-client-pencil/verification.json.

## Registrar movimiento con icono directo · 15 de septiembre de 2026

Por petición del usuario, el último paso de registro sustituye el menú de tres puntos con una sola opción por Check de Lucide de 20 px. Se sitúa junto a cerrar, con el botón común sin fondo ni borde, blanco sobre la cabecera negra. Conserva el nombre accesible y la ayuda Registrar cobro, Registrar pago o Registrar devolución según el movimiento. Activa directamente el envío existente con ratón o teclado, manteniendo validación, bloqueo durante el envío e idempotencia. La cabecera usa foco blanco visible. Se aplica al componente compartido para registros individuales y agrupados.

## Directorio de contactos solo con identidad · 15 de septiembre de 2026

Por petición del usuario, el listado de Clientes y proveedores muestra únicamente nombre y NIF. Se retira el bloque derecho de Por cobrar, Por pagar, importes vencidos, próximo vencimiento y última actividad. Se conservan la ordenación, los filtros, los datos contables y los importes de la actividad dentro de cada ficha. No se reserva una columna vacía ni se modifica el selector de documentos de cobros y pagos.

Verificado en app:3000 a 1440, 390 y 320 px con clientes, proveedores y fichas mixtas que tienen saldos pendientes y vencidos: cada fila muestra solo nombre y NIF, incluso al ordenar por vencimiento o actividad. Apertura por teclado, importes dentro de la ficha y regreso al listado conservados. TypeScript y compilación correctos, sin errores de JavaScript ni desbordamiento horizontal. Capturas revisadas y recursos contrastados con el contenedor activo. Datos temporales y sin escrituras desde la interfaz. Evidencia: `test-results/contact-directory-identity/verification.json`.

Verificado en app:3000 con 12 recorridos de cobro, pago y registro agrupado a 1440, 1366, 390 y 320 px: icono blanco de 20 px con área de 44 px, nombre y ayuda correctos, foco blanco visible y ausencia del menú intermedio. Registro directo con Enter, bloqueo ante importes inválidos y durante la respuesta, un único envío y referencia conservada. Capturas de escritorio y móvil revisadas; sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta y recursos contrastados por SHA-256 con la imagen activa. API simulada, sin escrituras de negocio. Evidencia: test-results/direct-payment-icon/verification.json.

## Ayuda de adjuntos en el tooltip · 15 de septiembre de 2026

Por petición del usuario, la frase de formatos admitidos y máximo de 5 MB por archivo deja de aparecer debajo de Seleccionar archivos. El botón usa TooltipTrigger, Button y ui-tooltip comunes, con ayuda al pasar el cursor y al enfocar con teclado. La zona de arrastre conserva la descripción accesible sin texto visible adicional. Se retiran las reglas exclusivas de la frase; no se reserva su fila.

Verificado en app:3000 con nueve recorridos de facturas, presupuestos y compras a 1440, 390 y 320 px: ausencia de la frase visible en reposo, tooltip por cursor y teclado, ocultación al retirar el cursor, selector múltiple, subida y retorno del foco. API simulada, sin archivos de negocio modificados; sin errores de JavaScript ni desbordamiento horizontal. Compilación correcta y capturas revisadas. Evidencias: test-results/file-hint-tooltip/verification.json.

## Zona de arrastre de adjuntos · 15/09/2026

Por petición del usuario, Archivos adjuntos sustituye el botón aislado por una zona de arrastre con fondo suave, un único contorno discontinuo tenue, clip y Seleccionar archivos. Se mantiene el estilo monocromo y la escala común de Kronjop; el contorno delimita el lugar donde soltar archivos, sin cajas anidadas ni sombras. La zona ocupa el ancho del contenido y permanece disponible al añadir archivos. Se adapta al móvil con el mismo control accesible.

DropZone de React Aria gestiona el arrastre y la señal de destino. El selector admite varios archivos; la carga es secuencial, anuncia su progreso y bloquea acciones simultáneas. Cada archivo conserva el límite real de 5 MB y las validaciones del servidor. Los errores identifican el archivo afectado y no eliminan las subidas correctas del lote. Los formatos y el límite se consultan en la ayuda del selector, conforme al ajuste posterior aprobado.

El foco vuelve a Seleccionar archivos al terminar o restaurar. Se conservan descarga, tamaño, huella, eliminación, Deshacer y permisos; la zona no se muestra ante una consulta fallida ni en modo lectura. Soltar durante una subida no abre el archivo fuera de la aplicación. El componente compartido aplica el mismo diseño a facturas, presupuestos, compras y demás fichas documentales.

Verificado en app:3000 a 1440, 390 y 320 px: selección múltiple por teclado, arrastre nativo de archivos del disco, estado de destino, bloqueo de una segunda subida, progreso, retorno del foco, descarga, eliminación, Deshacer, errores por archivo, límite de tamaño, consulta fallida y permisos de lectura. Sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta; capturas de escritorio y móvil revisadas y recursos contrastados con el contenedor. Datos en PostgreSQL temporal; 20 comprobaciones y 11 envíos de archivos de prueba. Evidencia: test-results/attachment-dropzone/verification.json.

## Cierre sin fondo al pasar el ratón · 15 de septiembre de 2026

Por petición del usuario, la X de cierre en el formulario de movimientos mantiene fondo transparente, sin borde ni sombra, también al pasar el ratón. Conserva el icono blanco, el área de interacción y el foco blanco de teclado. Verificado en app:3000 a 1366 y 390 px: estilos en reposo y hover iguales, cierre correcto y foco visible, sin errores de JavaScript. Capturas revisadas, compilación correcta e imagen app actualizada con recursos contrastados por SHA-256. Comprobación visual con datos simulados, sin escrituras de negocio. Evidencia: test-results/close-hover/verification.json.

## Datos laterales sin notas internas · 15 de septiembre de 2026

Por petición del usuario, la columna de datos de clientes y proveedores retira el desplegable Notas internas y sus estilos exclusivos. Se aplica también a las fichas mixtas y no reserva espacio. Los datos fiscales y de contacto y la tabla de actividad conservan su disposición. Se modifica la presentación señalada; las notas guardadas no se borran.

## Cierre con hover oscuro suave · 15 de septiembre de 2026

Por ajuste expreso del usuario, la X de cierre de los formularios de movimientos usa --on-dark-hover al pasar el ratón, el mismo tono de los controles de navegación oscura. Sobre negro produce un fondo negro suavemente aclarado y conserva el icono blanco. En reposo sigue transparente, sin borde ni sombra; mantiene su foco blanco y el cierre existente. Sustituye la decisión anterior de no mostrar fondo en hover. Verificado en app:3000 a 1366 y 390 px, con capturas revisadas, estilos correctos, cierre y foco de teclado conservados. Compilación correcta y recursos contrastados con la imagen activa. Sin errores de JavaScript ni escrituras de negocio. Evidencia: test-results/close-dark-hover/verification.json.

## Confirmar con el mismo hover oscuro · 15 de septiembre de 2026

Por petición del usuario, el tick de registrar movimiento comparte --on-dark-hover con la X. Mantiene el icono blanco y el foco visible; el fondo de hover solo aparece cuando el botón está habilitado. Verificado en app:3000 a 1366 y 390 px, incluidos reposo, hover y deshabilitado por importe inválido. Capturas revisadas, sin errores de JavaScript ni escrituras de negocio; compilación correcta y recursos contrastados con la imagen activa. Evidencia: test-results/confirm-dark-hover/verification.json.

## Ficha inicial y selector lateral de contactos · 15 de septiembre de 2026

Por petición del usuario, Clientes y proveedores abre la primera ficha disponible según los filtros y el orden del acceso. Los datos permanecen a la izquierda y la actividad a la derecha; el directorio deja de ocupar la pantalla de fondo. Clientes activos y Proveedores activos, en el menú de tres puntos, abren un selector lateral derecho con nombre y NIF. Todos los contactos conserva el acceso a fichas archivadas. Elegir una ficha cierra el selector; cancelarlo conserva la ficha y el recorrido anterior. Se mantienen búsqueda avanzada, filtros, paginación, estados vacíos y errores recuperables.

El recorrido utiliza la variante plana común a las facturas, debajo de la cabecera y con una flecha en cada extremo. La posición deja de verse y mantiene su anuncio accesible. No se recuperan los KPI ni las notas internas laterales. La selección reinicia los filtros de actividad del contacto anterior; los enlaces de retorno desde documentos conservan su contexto. En móvil, el selector ocupa el ancho disponible y los datos preceden a la actividad.

Verificado en app:3000 a 1440, 390 y 320 px con 30 comprobaciones: ficha inicial, selector lateral, paginación, búsqueda por NIF, filtros de archivados, cancelación y foco, navegación entre fichas, regreso desde documentos, errores recuperables y modo lectura. Sin KPI ni notas internas laterales, desbordamiento horizontal, errores de JavaScript ni escrituras desde la interfaz. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados con la imagen activa. Datos de prueba en PostgreSQL temporal. Evidencia: `test-results/contact-panel/verification.json`.

## Editar plazos con lápiz junto al importe · 15 de septiembre de 2026

Por petición del usuario, Vencimientos retira Modificar de la cabecera y sitúa un Pencil de Lucide de 14 px, negro y sin fondo ni borde, junto al importe de cada plazo. Reutiliza icon-button e icon-button-plain y conserva un área de interacción de 44 px y el foco visible. El icono se alinea con la cifra, dejando Liquidado o Pendiente debajo. La cabecera Importe se alinea con la cifra y la tabla mantiene su estructura compacta.

Cada lápiz abre el acuerdo de plazos existente y enfoca el importe del plazo seleccionado. Se conservan el motivo, las validaciones, el guardado, el historial y los permisos. El componente compartido aplica el cambio a facturas y compras; en modo consulta no se muestran lápices.

Verificado en app:3000 a 1440, 390 y 320 px: importes liquidados, pagos parciales y varios plazos; alineación del icono y la cabecera, tamaño y área de pulsación, apertura con teclado, foco del importe y retorno al cerrar, guardado real de un calendario de compra y rol de consulta. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos; capturas de escritorio y móvil revisadas y recursos contrastados por SHA-256 con el contenedor. Datos en PostgreSQL temporal y cierre limpio. Evidencia: test-results/schedule-edit-pencil/verification.json.

## Movimientos registrados sin flechas de dirección · 15 de septiembre de 2026

Por petición del usuario, la tabla de Movimientos registrados de Cobros y pagos retira las flechas anteriores al número de documento y su contenedor, sin reservar espacio. El número conserva su enlace; Estado y el signo del importe siguen identificando cobros y pagos. Se aplica en escritorio y móvil.

Verificado en app:3000 a 1440, 390 y 320 px: flechas y espacio reservado ausentes, enlaces, estados e importes conservados; sin desbordamiento horizontal ni errores de JavaScript. Compilación y formato correctos, capturas revisadas y servicio app actualizado con recursos contrastados por SHA-256. Datos simulados. Evidencia: artifacts/payment-history-no-arrows/verification.json.

## Lápiz de vencimientos ampliado y centrado · 15 de septiembre de 2026

Por ajuste expreso del usuario, el lápiz de Vencimientos pasa de 14 a 18 px y se centra verticalmente en la fila, al lado del bloque del importe. Conserva la posición a la derecha, el negro, la ausencia de fondo y borde y el área de pulsación de 44 px. Sustituye su alineación anterior con la primera línea del importe.

Verificado en app:3000 a 1440, 390 y 320 px: centrado de la fila, importes completos, foco y edición conservados. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor activo. Evidencia: test-results/schedule-pencil-centered/verification.json.

## Fondo desenfocado en ventanas de acción · 15 de septiembre de 2026

Por petición del usuario, Registrar cobro y las acciones similares aplican un desenfoque de 4 px al fondo mediante .modal::backdrop. El criterio se comparte con pagos, devoluciones, formularios, confirmaciones, selectores de contacto y paneles laterales que usan Modal. Se conserva el oscurecimiento propio de cada variante. La ventana activa, sus campos y sus menús permanecen nítidos; cerrar restaura la vista normal y el desplazamiento existente. No se añade animación ni se aplica filter al contenido de la página.

Verificado en app:3000 con doce recorridos de cobro, pago, nueva cuenta y filtros a 1440, 390 y 320 px: desenfoque del fondo, nitidez del contenido, uso de campos, avance de paso, cierre por Escape y recuperación del desplazamiento. Sin errores de JavaScript ni desbordamiento horizontal; compilación correcta, capturas revisadas y recursos contrastados por SHA-256 con la imagen activa. Datos simulados, sin escrituras de negocio. Evidencias: test-results/modal-backdrop-blur/verification.json.

## Entrada de contactos por KPI y lista preseleccionada · 15 de septiembre de 2026

Por corrección expresa del usuario, Clientes y proveedores vuelve a abrir su resumen de KPI: Clientes activos, Proveedores activos, Contactos por cobrar y Contactos por pagar, con los datos reales y el componente común del resto de módulos. Esta decisión sustituye la entrada directa a una ficha y la retirada de los indicadores generales. Los KPI de la actividad individual siguen retirados.

Al pulsar un KPI se abre el selector lateral correspondiente y se preselecciona su primera ficha, mostrando sus datos a la izquierda y su actividad a la derecha. Elegir una fila, incluida la preseleccionada, cierra la lista. Una flecha plana junto al título de los datos permite abrirla de nuevo y conserva el contacto elegido. La flecha de la cabecera vuelve al resumen de KPI; los retornos desde documentos respetan su origen. El recorrido anterior/siguiente mantiene las flechas en los extremos. Se conservan nombre y NIF como único contenido de las filas, filtros, búsqueda, paginación, permisos y errores recuperables.

Verificado en app:3000 a 1440, 390 y 320 px con 45 comprobaciones: cuatro KPI con valores reales, filtro de cada indicador, primera ficha preseleccionada, cierre al elegirla, flecha de reapertura, conservación de la nueva selección, regreso al resumen, búsqueda, paginación, archivados, errores recuperables, modo lectura y retorno desde documentos. Capturas revisadas; sin desbordamiento horizontal, errores de JavaScript ni escrituras desde la interfaz. TypeScript y compilación correctos y recursos contrastados con la imagen activa. Datos de prueba en PostgreSQL temporal. Evidencia: `test-results/contact-kpi-entry/verification.json`.

## Presupuestos y compras en una sola pantalla · 15 de septiembre de 2026

Por petición del usuario, la creación y edición de presupuestos y compras se unifican como las facturas de venta: contacto, fechas, conceptos, totales y datos adicionales están disponibles desde el inicio. Se retiran el indicador de pasos y los botones Anterior y Continuar. Cliente junto al emisor en presupuestos; proveedor junto a Tu empresa en compras. La selección, alta y cambio de contacto reutilizan ContactPicker y el lápiz de la hoja.

Se reutiliza la composición compacta de DocumentSheetLayout: conceptos en dos columnas con fondos suaves, sin marcos adicionales. Presupuestos muestra Fecha del presupuesto, Válido hasta y Plazo de validez (7, 15, 30 y 60 días). Compras muestra Fecha de la factura, Vencimiento, Plazo de pago y N.º de factura del proveedor, que sigue siendo obligatorio. Los plazos acompañan al cambio de fecha; una fecha final personalizada se conserva. La emisión automática de ventas mantiene su comportamiento. En móvil los bloques se apilan con desplazamiento vertical natural, sin desbordamiento horizontal.

Guardar en borrador y Contabilizar compra conservan sus acciones de cabecera. La opción de crear otro presupuesto o compra mantiene el contacto cuando se solicita. Los borradores locales y del servidor se abren completos desde cualquiera de los cuatro pasos históricos; los identificadores persistidos permanecen compatibles. Abrir un formulario vacío no crea un borrador. La validación enfoca el primer campo erróneo al guardar; corregir el contacto no roba el foco hacia otros campos ni cierra sus sugerencias.

Verificado en app:3000 con 30 comprobaciones a 1366 × 768, 1440 × 900, 390 × 844 y 320 × 568: selección y cancelación del contacto, conceptos, fechas y plazos, errores sin cambio de pantalla, recarga, borradores antiguos y locales, acceso desde contacto, guardar, editar, crear otro y contabilizar compras. Dos conceptos caben completos en portátil. Capturas de escritorio y móvil revisadas, sin errores de JavaScript ni desbordamiento horizontal. Doce pruebas de pasos y borradores superadas; TypeScript y compilación correctos. Recursos contrastados por SHA-256 con la imagen actualizada de app. Datos de prueba aislados en PostgreSQL temporal. Evidencia: test-results/single-page-quote-purchase/verification.json.

## Selector de contactos a la izquierda · 15 de septiembre de 2026

Por petición del usuario, el selector de clientes y proveedores se ancla al extremo izquierdo de la pantalla. Se reflejan su borde exterior y su sombra hacia la derecha y se conserva el desenfoque común del fondo de 4 px. Mantiene su anchura y adaptación móvil, la entrada desde los KPI, la preselección, la selección, el cierre y la flecha para abrirlo de nuevo. La posición de los demás paneles no cambia.

Verificado en app:3000 a 1440, 390 y 320 px: panel anclado a la izquierda, desenfoque de 4 px conservado, contenido nítido, primer contacto preseleccionado, selección, reapertura y cierre por teclado con retorno del foco. Sin desbordamiento horizontal, errores de JavaScript ni escrituras desde la interfaz. Compilación correcta, capturas revisadas y recursos contrastados con la imagen activa. Datos temporales. Evidencia: `test-results/contact-left-panel/verification.json`.

## Menú de contactos sin accesos duplicados · 15 de septiembre de 2026

Por petición del usuario, el menú de tres puntos de Clientes y proveedores y de sus fichas retira Clientes activos, Proveedores activos y Todos los contactos. Conserva Añadir cliente o proveedor y las acciones propias de cada ficha. La navegación entre contactos sigue disponible desde los KPI y la flecha que abre el selector izquierdo, con su desenfoque y selección actuales.

Verificado en app:3000 a 1440, 390 y 320 px: los tres accesos están ausentes del menú del resumen y de la ficha; Añadir cliente o proveedor y las acciones de la ficha siguen disponibles. Apertura de datos, selección desde KPI y reapertura mediante la flecha conservadas, con el panel izquierdo y su desenfoque. Sin desbordamiento horizontal, errores de JavaScript ni escrituras desde la interfaz. Compilación correcta, capturas revisadas y recursos contrastados con la imagen activa. Datos temporales. Evidencia: `test-results/contact-menu-trim/verification.json`.

## PDF y envío con estructura y regreso contextual · 15 de septiembre de 2026

La pestaña PDF y envío reúne Plantilla del PDF, Correo y Portal del cliente en tres superficies planas con --bg-subtle, separación de 16 px e inset común de 24 px (16 px en móvil). Mantiene los iconos contextuales junto al título, sus tooltips y las acciones existentes. La plantilla archivada muestra su nombre; el correo resume la preparación y descarga e incluye el acceso a configurar el envío. El portal explica el enlace privado cuando aún no hay registros. Los mensajes y enlaces existentes aparecen dentro de su sección, sin cajas anidadas, nuevas escalas tipográficas ni divisores.

Abrir Plantillas desde un documento conserva en la URL la ficha, PDF y envío y su origen anterior. Configuración muestra una flecha con Factura, Presupuesto, Compra o Rectificativa según el documento. Se conserva al recargar y al cambiar entre secciones de configuración. El acceso normal desde el menú no muestra esta flecha. Configurar envío desde la aplicación sigue el mismo recorrido. La pestaña del documento se conserva al recargar; el regreso nativo del navegador y los enlaces en otra pestaña mantienen el contexto. Solo se aceptan destinos internos de documentos con identificador válido.

Verificado en app:3000 con 18 recorridos a 1440, 390 y 320 px: factura, presupuesto, borrador, historial con destinatarios largos, modo lectura y error de carga. Comprobados apertura y cancelación de correo y enlace, acceso a PDF, retorno por flecha y navegador, recarga, navegación entre ajustes, acceso directo sin flecha y origen inválido. Sin desbordamiento horizontal ni errores de JavaScript. Datos simulados, sin envíos ni escrituras de negocio. Tres pruebas de rutas y compilación correctas. Capturas de escritorio y móvil revisadas. Evidencias: test-results/delivery-design/verification.json.

## Adjuntos existentes con clip junto al título · 15 de septiembre de 2026

Por petición del usuario, Archivos adjuntos muestra la zona de arrastre y selección únicamente cuando el documento no tiene archivos. Con uno o más adjuntos, la sustituye por un clip junto al título, sin fondo ni borde, que abre el mismo selector múltiple. Reutiliza PanelHeading y el icono contextual común con área de 44 px, foco visible, nombre accesible y tooltip. Al eliminar el último archivo reaparece la zona vacía; subir o restaurar devuelve el foco al control disponible. Se conservan progreso, errores, límites, descarga, eliminación, Deshacer y permisos en facturas, presupuestos y compras.

Verificado en app:3000 a 1440, 390 y 320 px con trece comprobaciones: facturas, presupuestos y compras; cambio de zona vacía a clip, selección múltiple por teclado, arrastre inicial, tooltip, foco, progreso, descarga, eliminación del último archivo y Deshacer. La ayuda del clip abre hacia arriba para no tapar las acciones de los archivos en móvil. Errores y permisos conservados, sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta, capturas revisadas y recursos servidos contrastados con el contenedor. Datos aislados en PostgreSQL temporal. Evidencia: `test-results/attachments-compact/verification.json`.

## Preferencias de facturación sin descripción · 15 de septiembre de 2026

Por petición del usuario, Preferencias de facturación retira «Solo para nuevos documentos» de PanelHeading, sin conservar su párrafo ni espacio reservado. Mantiene moneda, IBAN, condiciones de pago y guardado. Verificado en app:3000 a 1366 y 390 px: texto ausente, campos conservados y sin desbordamiento horizontal ni errores de JavaScript. Capturas revisadas, compilación correcta y recursos contrastados por SHA-256 con el contenedor activo. Datos simulados, sin escrituras de negocio. Evidencia: test-results/billing-description/verification.json.

## PDF y envío en acordeón · 15 de septiembre de 2026

Por petición del usuario y según su componente de referencia, PDF y envío sustituye las tres superficies por un acordeón de apertura única y cierre opcional. Plantilla del PDF, Correo y Portal del cliente empiezan plegados. La cabecera completa es pulsable, el título se subraya al pasar el cursor y el chevron de 16 px gira al abrir. Se utiliza un único separador inferior tenue por apartado, como en el ejemplo, sin marcos ni fondos adicionales. Esta decisión sustituye la composición de superficies anterior.

Accordion y AccordionItem reutilizan DisclosureGroup, Disclosure y DisclosurePanel de React Aria ya presentes en el proyecto. Conservan la escala de títulos y los tokens comunes; no se introduce otro sistema de estilos. Las acciones, sus tooltips, los datos y los formularios quedan dentro del apartado desplegado. En móvil las acciones preceden al contenido. Se mantienen los permisos y los errores de consulta visibles. Los contenidos plegados quedan fuera del recorrido de teclado; Enter y Espacio abren o cierran, con foco visible completo. La entrada del contenido y el giro duran 200 ms y respetan movimiento reducido.

La URL conserva qué apartado está abierto, incluso si todos están cerrados. Volver desde Plantillas o Correo de salida recupera la misma factura, su pestaña PDF y envío y el apartado correspondiente. Se mantiene la ausencia de flecha al entrar directamente en Configuración.

## Recorrido común entre registros · 15 de septiembre de 2026

Por petición del usuario, Catálogo adopta el mismo recorrido de facturas y contactos: flechas negras planas en los extremos del contenido, debajo de la cabecera, sin contador visible. RecordNavigation aplica esta presentación por defecto y mantiene la posición y el total para lectores de pantalla, nombres accesibles, foco y extremos deshabilitados. El mismo componente se incorpora a la consulta de asientos, las cuentas del Libro mayor y los lotes de importación. Los asientos conservan el listado filtrado; las cuentas, el intervalo; los lotes, búsqueda, indicador y página, incluido el paso entre páginas del historial. La selección del asiento y del lote queda en la URL para permitir recarga.

El recorrido documental conserva la pestaña abierta. Desde la actividad de un contacto recorre sus documentos o movimientos con los filtros y el orden de esa actividad, cruza páginas y distingue movimientos del mismo documento. Los accesos directos y desde informes ofrecen el recorrido de la sección documental correspondiente, conservando el intervalo disponible y la ruta de regreso al origen. Las operaciones de alta, edición y aplicación de fondos conservan sus formularios. Los errores permiten reintentar; un registro excluido por filtros mantiene la ficha y deshabilita el recorrido.

Verificado en app:3000 con 40 comprobaciones a 1440, 390 y 320 px: catálogo, clientes, facturas, presupuestos, compras, cobros, vencimientos, asientos, cuentas e importaciones. Comprobados filtros, pestaña, primer y último registro, salto entre páginas, movimientos repetidos, recarga, cierre con retorno del foco y recuperación tras errores. Sin desbordamiento horizontal de página ni errores de JavaScript. Cuatro pruebas de rutas y TypeScript correctos. Capturas revisadas y recursos servidos contrastados por SHA-256 con el contenedor app. API simulada, solo lecturas. Evidencia: [verificación del recorrido](../artifacts/record-navigation/verification.json).

## Facturación sin ayuda de numeración · 15 de septiembre de 2026

Por petición del usuario, Preferencias de facturación elimina el desplegable «Cómo funciona la numeración» y todo su contenido, sin reservar su espacio. Se conservan los campos y Guardar cambios. Revisado en app:3000 a 1366 y 390 px: bloque ausente, campos visibles y sin desbordamiento horizontal ni errores de JavaScript. Capturas revisadas, compilación correcta y recursos contrastados por SHA-256 con el contenedor activo. Datos simulados, sin escrituras de negocio. Evidencia: test-results/billing-numbering-help/verification.json.

Verificado en app:3000 con 18 recorridos a 1440, 390 y 320 px: factura, presupuesto, borrador, historial, modo lectura y error. Apertura única, cierre completo, Enter, Espacio, Tab, etiquetas y foco; formularios y retorno al cerrarlos; recarga y regreso desde Plantillas y Correo; acceso directo a Configuración sin flecha. Comprobadas animación y preferencia de movimiento reducido. Sin desbordamiento horizontal ni errores de JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados por SHA-256 con el contenedor activo. Datos simulados, sin envíos ni escrituras de negocio. Evidencia: test-results/delivery-accordion/verification.json.

## Interruptores de series de numeración · 15 de septiembre de 2026

Por petición del usuario y su referencia visual, Series de numeración sustituye Activar/Desactivar por ToggleSwitch: pista compacta de 44 × 24 px, botón blanco de 18 px, negro cuando está activa y gris cuando está inactiva. La pista y el botón son redondeados; esta excepción expresa queda limitada al interruptor. Se mantienen los tokens monocromos del kit y el resto de superficies rectas. Por petición del 16/09/2026, se retira el texto Activa/Inactiva junto al nombre: el interruptor ya indica el estado visualmente y mediante aria-checked.

El control común tiene un área de 44 × 44 px, role=switch, nombre de la serie, estado aria-checked y foco visible. Enter, Espacio y clic guardan el cambio; aria-disabled bloquea nuevos envíos conservando el foco durante la petición. La posición cambia después del guardado correcto. Los errores conservan el estado anterior y permiten reintentar. La lista mantiene su alineación vertical, ajusta los nombres largos y conserva la creación de series y el acceso de administrador.

Verificado en app:3000 a 1440, 390 y 320 px: estados y forma de la referencia, textos largos, centrado de filas, teclado, foco, bloqueo de duplicados, persistencia tras recargar, error recuperable, movimiento reducido y permisos. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos, capturas revisadas y recursos contrastados por SHA-256 con el contenedor activo. API real y PostgreSQL temporal. Evidencia: test-results/series-switch/verification.json.

## Indicadores animados en series de numeración · 16 de septiembre de 2026

Por petición del usuario y según su referencia en vídeo, los interruptores de Series de numeración incorporan una X negra al desactivar y un tic blanco al activar. El indicador cruza la pista en sentido opuesto al botón durante 300 ms con la curva cubic-bezier(0.16, 1, 0.3, 1). La pista se ajusta a 44 × 24 px, con círculo de 18 px y símbolos de 14 px, dentro de un área interactiva de 44 × 44 px para centrarla con el texto sin reducir su accesibilidad.

La animación queda limitada a Series de numeración mediante una opción del componente compartido. El estado visual solo cambia después de un guardado correcto; los errores mantienen el valor anterior. El nombre accesible, role=switch, aria-checked, foco visible, teclado, bloqueo durante la petición y movimiento reducido se conservan.

Verificado en app:3000 a 1440, 390 y 320 px: tamaño compacto, centrado con el texto, tic y X, transición de 300 ms, persistencia, teclado, foco, bloqueo durante el guardado, error recuperable, movimiento reducido y permisos. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript, compilación y 287 pruebas correctas; capturas revisadas y recursos contrastados con el contenedor activo. API real y PostgreSQL temporal. Evidencia: test-results/series-switch/verification.json.

## Eliminar adjuntos junto al nombre · 15 de septiembre de 2026

Por petición del usuario, cada archivo coloca la X negra inmediatamente después de su nombre, con el tooltip «Eliminar elemento». Reutiliza el icono plano común, sin fondo ni borde, con área de interacción de 44 px y nombre accesible que identifica el archivo. El nombre largo se adapta al ancho disponible, conservando la X a su lado. Se mantienen descarga, huella, permisos, bloqueo durante operaciones y Deshacer. La acción deja de ocupar una columna independiente en escritorio y móvil.

Verificado en app:3000 a 1440, 390 y 320 px: X junto a nombres cortos y largos, tooltip exacto, eliminación mediante ratón y teclado, Deshacer y permisos de consulta. Sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor actualizado. Datos de archivos aislados en PostgreSQL temporal. Evidencia: `test-results/attachment-remove/verification.json`.

## Vista de importaciones en el panel de filtros · 15 de septiembre de 2026

Por petición del usuario, Importaciones retira el selector Vista de la página y lo traslada al panel lateral de filtros. Reutiliza ListToolbar, su icono y ayuda, y Modal sidePanel con Field y Select. El botón se sitúa a la derecha debajo de los KPI, como en los demás listados. Preparar un archivo e Historial de importaciones se seleccionan dentro del panel; Aplicar filtros confirma y Cancelar o Escape conservan la vista anterior. El indicador del botón identifica una vista distinta de la predeterminada.

Se conservan la búsqueda de cabecera, los KPI, los criterios y la página del historial, el archivo y las columnas preparadas al cambiar de vista, la revisión de lotes y el acceso de consulta limitado al historial. El selector anterior y su estilo exclusivo se eliminan.

Verificado en app:3000 a 1440, 390 y 320 px: apertura por teclado, Aplicar, Cancelar, Escape, foco, selección de vista, recarga, preparación conservada y regreso desde un lote. Sin desbordamiento horizontal ni errores de JavaScript. TypeScript y compilación correctos; capturas revisadas y recursos contrastados por SHA-256 con el contenedor activo. Perfil temporal y datos de importación simulados, sin importar registros reales. Evidencia: test-results/import-view-filter/verification.json.

## Usuarios sin explicación de perfiles · 15 de septiembre de 2026

Por petición del usuario, Usuarios y permisos retira el desplegable Qué puede hacer cada perfil, sus descripciones y la nota sobre cuenta local y correo. Se conserva el listado y la creación de usuarios. Comprobado en app:3000 a 1440 y 390 px, sin hueco reservado, desbordamiento ni errores de JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor activo. Evidencia: test-results/remove-profile-help/verification.json.

## Flechas de paginación en auditoría · 15 de septiembre de 2026

Por petición del usuario, Registro de auditoría sustituye Anterior y Siguiente por ChevronLeft y ChevronRight de 18 px, negros y sin marco, usando icon-button e icon-button-plain. Conserva Página n, la ubicación en el pie, los límites deshabilitados, los filtros y la paginación condicional. Los controles mantienen sus nombres accesibles, ayuda y área de 36 px en escritorio y 44 px en móvil.

Verificado en app:3000 a 1440, 390 y 320 px: primera, segunda y última página, teclado, búsqueda conservada y ausencia del pie sin resultados. Sin desbordamiento ni errores de JavaScript. TypeScript y compilación correctos; capturas revisadas y recursos contrastados con el contenedor activo. Datos de auditoría en PostgreSQL temporal. Evidencia: test-results/audit-page-arrows/verification.json.

## Funciones pendientes con interfaces en diseño · 15 de septiembre de 2026

Por petición del usuario, se preparan 115 diseños en 15 áreas para revisar su aspecto antes de implementar operaciones. PageHeading conserva sus acciones y añade un acceso contextual señalado como En diseño y Herramientas en diseño. El buscador global permite localizar cada diseño por su nombre. La ventana se abre sobre la pantalla actual y conserva su ruta, filtros y contexto al cerrar; no se incorporan nuevas secciones permanentes al menú lateral.

El directorio usa filas planas, iconos Lucide y un selector de área; su búsqueda consulta todas las áreas. Los formularios, revisiones, tablas y vistas de ejemplo reutilizan Modal, Field, Select, SectionNavigation, ActionsMenu y los estados comunes. Preparación, Vista previa e Historial usan el aside aprobado y su selector móvil, sin divisor ni marca vertical. Se mantienen Inter 400/500/600, los tokens comunes, radio cero, foco visible y desenfoque de fondo de 4 px. Las tablas tienen desplazamiento local, cifras alineadas con sus cabeceras y casillas con área de 44 px. El selector de archivos muestra el nombre completo sin leer ni subir su contenido.

Los datos son ejemplos identificados. Los controles solo modifican el estado local de la ventana; las acciones abren una revisión visual con la confirmación final deshabilitada. No se conectan endpoints, almacenamiento, autoguardado, envíos, cálculos de negocio ni integraciones. Cerrar descarta los cambios del diseño. Las pantallas operativas y sus permisos se conservan; los ejemplos no otorgan permisos nuevos.

El inventario cruza los 278 requisitos históricos: 233 vinculados con diseños de ampliación, 12 con accesos existentes, 6 pendientes técnicos sin pantalla adicional y 27 exclusiones de CRM/MCP. El recuento no representa cobertura funcional. Se conservan las decisiones anteriores sobre paneles retirados y ambos puntos de restauración. Detalle y referencias en docs/FUNCIONES_EN_DISENO_2026-09-15.md; comprobaciones y capturas en artifacts/funciones-en-diseno/.
Verificación: 345 recorridos de las 115 ventanas a 1440, 390 y 320 px, con todas sus acciones; comprobación posterior de los últimos ajustes de tablas en 15 recorridos. Incluye búsqueda global, regreso a documento, campos, selectores, edición de ejemplos, estados vacíos/carga/error, consulta, archivo local y foco contenido. Sin errores JavaScript, escrituras ni peticiones desde los diseños. Diez pruebas de regresión y compilación correctas. Capturas revisadas y recursos servidos por app:3000 contrastados por SHA-256 con la imagen activa. Núcleo de 77 archivos de servidor/modelo/migraciones sin cambios desde el inventario. Evidencia final: artifacts/funciones-en-diseno/final-summary.json.

## Portal con accesos activos y correo sin aviso auxiliar · 16 de septiembre de 2026

Por petición del usuario, Portal del cliente muestra únicamente enlaces vigentes: sin revocación y con caducidad futura. Revocar retira la fila al completar la operación y devuelve el foco a Crear enlace. Los errores conservan la fila; recargar mantiene los accesos revocados fuera del listado. Si no quedan activos, se muestra el estado vacío existente. Se conserva la revocación y su historial en el servidor.

Correo elimina la frase «Prepara y descarga el mensaje para enviarlo desde tu correo» y su enlace «Configurar envío desde la aplicación», incluida la variante para usuarios sin permiso de configuración, sin reservar su espacio. Se aplica mediante DocumentDelivery a todos los documentos que comparten PDF y envío. Las acciones de correo, los estados y los errores se mantienen.

Verificado en app:3000 a 1440, 390 y 320 px en facturas, presupuestos y compras: solo accesos vigentes, revocación real, desaparición inmediata, foco, recarga, estado vacío, error recuperable y permisos de consulta. El enlace revocado deja de funcionar y conserva su registro de auditoría. Aviso de correo ausente y apertura de Preparar correo y Ver enlace conservadas. Sin desbordamiento horizontal ni errores de JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor actualizado. Datos aislados en PostgreSQL temporal; sin envíos de correo. Evidencia: `test-results/portal-active-mail-clean/verification.json`.

## Subida de adjuntos con progreso gradual · 16 de septiembre de 2026

Por petición del usuario y su referencia, DocumentFiles presenta cada archivo seleccionado en una fila de fondo suave con icono, nombre completo, tamaño, estado y barra de progreso. Conserva la identidad monocroma, las esquinas rectas y la escala compartida. La barra avanza durante al menos 1,8 segundos, incluso si la respuesta llega inmediatamente; espera como máximo en el 90 % mientras falta confirmación del servidor. Solo después de confirmarse llega al 100 %, muestra Completado brevemente y da paso al archivo guardado. El porcentaje es una presentación del proceso, no una medición de bytes; no se muestran bytes transferidos simulados.

Las peticiones de varios archivos siguen siendo secuenciales y sus animaciones pueden coincidir, para no añadir una espera artificial por cada archivo del lote. Los errores se identifican por nombre y nunca muestran finalización; se conservan los archivos correctos. Los temporizadores se limpian al abandonar la sección. La barra nativa tiene nombre accesible y los movimientos respetan la preferencia de animación reducida.

La zona grande se muestra únicamente antes de seleccionar archivos cuando no hay adjuntos. Durante la carga deja sitio a las filas de progreso; al terminar se conserva el clip junto al título para añadir más. Una carga fallida sin archivos recupera la zona inicial. Al quitar el último archivo también reaparece. Se mantienen ayuda de formatos y límite de 5 MB, selección múltiple, arrastre inicial, descarga, X junto al nombre, Deshacer, permisos y retorno del foco al control disponible. El componente compartido aplica este criterio a ventas, presupuestos, compras y gastos y rectificativas.

## Funciones nuevas con apariencia final · 16 de septiembre de 2026

Por petición del usuario, las 115 interfaces preparadas dejan de mostrar marcas de prototipo, estados de demostración, textos de ejemplo y avisos de implementación pendiente. Los accesos usan sus nombres de producto y «Más funciones». Cada directorio se limita al módulo de origen: facturas, presupuestos, compras, cobros y pagos y clientes y proveedores no mezclan herramientas de otras áreas ni muestran un selector global.

Las operaciones de cada función se reúnen en el menú de tres puntos de la cabecera. Se retiran las filas de botones repetidas; en Factura de anticipo, Preparar factura de anticipo y Aplicar a factura final aparecen únicamente en ese menú. La flecha, el menú y la X comparten altura y centrado. Las ventanas se reducen a un máximo de 920 px, usan separación compacta y muestran el contenido inicial completo a 1440 × 900. En móvil ocupan la pantalla y las tablas conservan desplazamiento local.

Datos, Vista previa e Historial reutilizan SectionNavigation. El historial comparte document-activity, document-history y document-history-row con las facturas de venta. Se conservan Field, Select, ToggleSwitch, ActionsMenu, PanelHeading, Inter 400/500/600, la paleta monocroma, las superficies planas, el foco visible, radio cero y el desenfoque de fondo de 4 px.

Las confirmaciones finales permanecen deshabilitadas y los controles solo modifican el estado local de la ventana. No se conectan endpoints, almacenamiento, envíos ni reglas de negocio. Verificado en app:3000: 115 vistas y todas sus acciones en escritorio; facturas, presupuestos, compras, cobros y pagos y contactos a 390 y 320 px. Sin desbordamiento horizontal, scroll inicial en escritorio, errores de JavaScript, escrituras ni peticiones desde estas interfaces. Compilación correcta, recursos contrastados con el contenedor y capturas revisadas. Evidencia: artifacts/funciones-en-diseno/refinado/verification.json.

Verificado en app:3000 con 19 recorridos a 1440, 390 y 320 px: facturas, presupuestos, compras y rectificativas, subida instantánea y lenta, arrastre nativo, varios archivos, resultado mixto, tamaño superior al límite, adjuntos existentes, modo lectura, fallo de consulta y salida durante la carga. Comprobados avance gradual, espera en 90 % sin confirmar, finalización, limpieza de la zona grande, selección por teclado, bloqueo durante carga, eliminación del último adjunto, Deshacer y retorno del foco. Sin desbordamiento horizontal ni errores de JavaScript. Tres pruebas de temporizadores, TypeScript y compilación correctos. Capturas de escritorio y móvil revisadas. Tras una actualización concurrente, dos recorridos adicionales contrastan los recursos actuales por SHA-256 y repiten subida, selección múltiple, eliminación y Deshacer. Datos simulados, sin archivos de negocio modificados. Evidencias: test-results/upload-animation/verification.json y verification-final.json.

## Correo de salida sin descripción inicial · 16 de septiembre de 2026

Por petición del usuario, Correo de salida retira «Configura el servidor SMTP de tu cuenta de correo.» y su párrafo, sin reservar espacio. Se mantienen el formulario y los avisos de configuración guardada y servidor verificado.

Comprobado en app:3000 a 1366 y 390 px, en los estados inicial, configurado y verificado. Capturas revisadas, sin desbordamiento horizontal ni errores de JavaScript; recursos servidos contrastados con el contenedor actualizado. Evidencia: test-results/mail-description/verification.json.

## Portal del cliente · crear enlace debajo del listado (16/09/2026)

La acción «Crear enlace» se coloca después del listado de enlaces vigentes, en una fila propia alineada a la izquierda. Conserva el icono plano, tooltip, nombre accesible y objetivo de 44 px. Ya no comparte la zona lateral de los tres puntos de un enlace. Mantiene esta ubicación con cero, uno o varios enlaces, en escritorio y móvil; el menú de cada enlace conserva sus acciones y el cierre o revocación devuelve el foco al mismo control.

## Portal del cliente sin textos auxiliares · 16 de septiembre de 2026

Por petición del usuario, la configuración del Portal del cliente elimina el párrafo sobre dirección pública y la ayuda «Deja vacío para utilizar la dirección local actual.», sin reservar espacio. Mantiene la etiqueta Dirección pública (opcional), el campo, Guardar dirección y los errores del formulario.

Compilación correcta y comprobación visual en app:3000 a 1366 y 390 px, sin desbordamiento horizontal ni errores de JavaScript. Recursos servidos contrastados con el contenedor actualizado. Evidencia: test-results/portal-settings-clean/verification.json.

## Eliminación directa de adjuntos · 16 de septiembre de 2026

Por petición del usuario, al eliminar un archivo su fila desaparece directamente. No se muestra el nombre con el estado «Eliminado» ni la acción «Deshacer», y no se reserva espacio para ese aviso. El foco pasa al clip para adjuntar más archivos o, cuando se elimina el último, a Seleccionar archivos dentro de la zona vacía. Esta decisión sustituye las referencias anteriores a Deshacer en Archivos adjuntos y se aplica al componente compartido por facturas, presupuestos, compras y gastos y rectificativas.

## Eliminación de plantillas de documentos · 16 de septiembre de 2026

Por petición posterior del usuario, «Eliminar plantilla» ejecuta la retirada directamente desde el menú de tres puntos, sin abrir una confirmación ni mostrar un mensaje de éxito. La retirada oculta la plantilla, desactiva su uso predeterminado y conserva sus versiones históricas; los PDF emitidos conservan la versión utilizada y los borradores pasan al diseño original. Los perfiles de consulta y operador no pueden eliminarla.

Durante la petición se deshabilita la acción para evitar duplicados. Después, el foco pasa al menú de la siguiente plantilla o al signo más si ya no queda ninguna. Un fallo se muestra en la propia sección para permitir reintentar.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px: el mismo clic del menú envía el borrado, la fila desaparece, no se abre ningún diálogo ni aviso de éxito, el foco vuelve al signo más y no hay desbordamiento horizontal. Las 16 pruebas de plantillas, versiones, PDF, auditoría y permisos también superan. Resultados y capturas: `artifacts/template-immediate-delete/`.

## Cabecera y navegación de las funciones nuevas · 16 de septiembre de 2026

Por petición del usuario, la flecha de regreso de las ventanas de Más funciones precede inmediatamente al título. Las acciones permanecen en el menú de tres puntos y la X cierra la ventana desde el extremo derecho. Los tres controles conservan 44 px de área interactiva, alineación vertical, foco y nombres accesibles.

Datos, Vista previa e Historial reutilizan exactamente la navegación de las fichas de factura: aside de 176 px, barra negra de 2 px a 12 px del botón activo y contenido situado 16 px después del menú. Comparten SectionNavigation, sus espacios y la misma relación entre menú, marca y datos. En móvil se conserva el selector único y se retiran la barra y el espacio lateral.

## Búsqueda en las funciones nuevas · 16 de septiembre de 2026

Cada función incorpora una lupa antes del menú de acciones. En escritorio forma parte de la cabecera; en móvil pasa a la barra de herramientas inmediatamente inferior para conservar el ancho del título y las áreas interactivas de 44 px. La lupa abre el panel compacto de búsqueda compartido: 420 px como máximo, entrada descendente de 220 ms, fondo atenuado con desenfoque de 2 px, foco directo en el campo y cierre animado de 160 ms. En móvil el panel conserva 16 px de margen lateral y no provoca desbordamiento. La búsqueda queda representada como interfaz y no realiza consultas ni escrituras de negocio.

## Adjuntos compactos en las funciones nuevas · 16 de septiembre de 2026

Los campos de archivo de las funciones nuevas reutilizan la presentación de subida de Archivos adjuntos sin realizar ninguna petición. Al elegir un archivo, el recuadro muestra una entrada de 200 ms, nombre, tamaño, porcentaje y barra de progreso. Al terminar la animación, conserva únicamente el nombre y una X de 44 px de área interactiva para quitarlo; desaparecen barra, iconos de estado, tamaño y texto de completado. Quitar el archivo recupera el selector y su foco. La variante conserva la tipografía del campo y reduce la composición durante la animación respecto a la factura: icono de 32 px, barra de 4 px y desplazamiento inicial de 3 px. El movimiento se desactiva cuando el sistema solicita reducir animaciones.

## Entrada animada de Evolución y actividad · 16 de septiembre de 2026

Por petición del usuario, al abrir Evolución y actividad desde el menú de Visión general, las barras de Ingresos y gastos crecen desde su base con un escalonado breve entre meses. Las cifras del eje y el resultado operativo avanzan desde cero hasta su valor real con formato monetario español y cifras tabulares. La entrada dura menos de un segundo y se ejecuta al cargar los datos. Con la preferencia de movimiento reducido, cifras y barras aparecen directamente en su estado final. Se mantienen la interacción de cada barra, la paleta monocroma, los importes y la disposición existentes en escritorio y móvil.

Verificado en app:3000 a 1440 y 390 px desde los tres puntos de Visión general: estado inicial, transición y resultado final exacto, crecimiento desde la base, movimiento reducido sin transición y ausencia de desbordamiento o errores de JavaScript. La prueba completa de la gráfica sigue pasando a 1440, 390 y 320 px, incluidos detalle, teclado, paginación, regreso y errores. Recursos servidos contrastados con el contenedor actualizado. Evidencias: `test-results/overview-analysis-animation/verification.json` y `test-results/monthly-chart/verification.json`.

## Filas persistentes para adjuntos cargados · 16 de septiembre de 2026

Por petición del usuario, al completar una subida el archivo conserva la misma fila de fondo suave utilizada durante el progreso, con icono de archivo, nombre descargable y tamaño. La acción de eliminación pasa al extremo derecho y usa una papelera con nombre accesible y tooltip «Eliminar archivo». La huella SHA-256 deja de mostrarse en la interfaz; el servidor conserva su cálculo para verificar y proteger los archivos. La composición compartida se aplica a facturas, presupuestos, compras y gastos y rectificativas, con adaptación para nombres largos y móvil.

## Detalle de las barras de ingresos y gastos · 16 de septiembre de 2026

Las barras de «Evolución y actividad» son botones accesibles. Ingresos y Gastos abren el panel lateral común de 380 px, a ancho completo en móvil, con mes, importe, base imponible y documentos que lo componen. Cada documento muestra número, cliente o proveedor, fecha e importe; las rectificativas restan y se identifican. El cálculo reutiliza el detalle del dashboard con el último día del mes, igual que el gráfico mensual, y excluye borradores. La lista usa paginación de 25 documentos y flechas comunes.

La selección de mes, serie y página se conserva en la ruta al abrir un documento y regresar o recargar. Escape y cerrar restauran el foco al botón de origen. Las barras muy pequeñas o vacías mantienen una zona de pulsación; sus nombres accesibles incluyen mes e importe. Se conserva la composición monocroma y los seis meses en escritorio. En anchos reducidos, el desplazamiento se limita al gráfico, con objetivos de 44 px y los meses recientes visibles inicialmente.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px, con API real y base temporal: concordancia de las 12 barras, rectificativas, fechas futuras del mes, borradores excluidos, paginación, regreso desde documentos, recarga, teclado, error y reintento, perfil de consulta y ausencia de desbordamiento de página. Capturas y resultados: `test-results/monthly-chart/`.

## Requisitos del comprador · acción y foco (16/09/2026)

- La acción de alta se presenta como un `+` contextual junto al título, con nombre accesible y área de interacción común de `icon-button`.
- El modal usa el mismo nombre de la sección, «Requisitos del comprador», sin texto explicativo redundante.
- Las casillas limitan su zona activa al control y a su texto; el espacio vacío de la fila no cambia la selección.
- Los clics de puntero no dejan el foco visual en el botón que abrió el modal. La apertura por teclado conserva la devolución de foco al cerrar.
- Los botones de esta sección muestran el estado pulsado mediante color, sin desplazamiento.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px: acción solo con icono, copia del modal, áreas clicables, estado pulsado, foco con ratón y teclado, cierre con Escape y ausencia de desbordamiento horizontal. Resultados y capturas: `artifacts/buyer-requirements/`.

## Registro de auditoría · regreso a Configuración (16/09/2026)

La cabecera de «Registro de auditoría» incorpora la navegación de regreso «Configuración» mediante el mismo `backLink` de las fichas y documentos. Esta excepción responde a la relación directa entre ambas pantallas y permite volver al apartado de origen sin usar el menú lateral.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px: enlace visible, nombre accesible «Volver a Configuración», destino correcto y ausencia de desbordamiento horizontal. Resultados y capturas: `artifacts/audit-back-navigation/`.

## Permisos del negocio · acciones del modal (16/09/2026)

La tabla de «Usuarios y permisos» representa «Modificar acceso» con un lápiz de 16 px, sin texto visible, mediante el botón de icono plano común. Mantiene el nombre del usuario en la etiqueta accesible, ayuda al pasar el cursor, área interactiva de al menos 44 px y foco de teclado. Abre el mismo modal de permisos.

- El modal omite el cierre duplicado de la cabecera y concentra sus acciones al pie.
- «Cancelar» se representa con una X y «Guardar permisos» con un visto; ambos conservan nombre accesible, ayuda al pasar el cursor y área de interacción común.
- Se elimina la explicación «Debe quedar un administrador activo…» de esta superficie.
- Escape y el fondo del modal conservan el cierre mediante la misma acción de cancelación.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px: ausencia del cierre superior y del texto retirado, acciones únicas con icono, cancelación, guardado, Escape y ausencia de desbordamiento horizontal. Resultados y capturas: `artifacts/access-permissions-modal/`.


## Guardar y crear otro documento · presupuestos y compras (16/09/2026)

Presupuestos y compras reutilizan la acción de Facturas en el menú de tres puntos: «Guardar y crear otro presupuesto» y «Guardar y crear otra compra». Se retiran las casillas «Crear otro… al guardar» y «Conservar cliente/proveedor». La acción guarda el borrador y abre un documento nuevo con el mismo cliente o proveedor y los conceptos vacíos. «Guardar en borrador» conserva el regreso al listado. Cobros no contiene la casilla de creación consecutiva.

Verificado en app:3000 para factura, presupuesto y compra a 1440, 390 y 320 px: menú y foco de teclado, ausencia de casillas, validación, guardado consecutivo, cliente/proveedor conservado, conceptos nuevos vacíos y guardado ordinario. Se simula una respuesta perdida para comprobar que el reintento no duplica el documento. Compilación correcta, sin desbordamientos ni errores JavaScript; recursos contrastados con el contenedor y capturas revisadas. API real sobre una base temporal. Evidencias: `test-results/save-create-invoice/`, `test-results/save-create-quote/` y `test-results/save-create-purchase/`.

## Configuración · acciones en la cabecera (16/09/2026)

Las secciones Datos de empresa y Facturación sitúan «Guardar cambios» en el menú de tres puntos de la cabecera. Usuarios y permisos incorpora «Nuevo usuario», Series de numeración incorpora «Nueva serie» y Mi seguridad incorpora «Actualizar contraseña». Se retiran sus botones visibles duplicados del contenido. Las acciones reutilizan ActionsMenu, respetan permisos y estados de guardado, y envían los formularios mediante requestSubmit para conservar su validación nativa y el uso del teclado.

Comprobado en app:3000 a 1440, 390 y 320 px con API y base temporal: guardado de empresa y facturación, apertura del alta de usuario, lápiz de permisos con ratón y teclado, creación de series, validación y actualización de contraseña. Sin desbordamiento de página ni errores JavaScript. Compilación y TypeScript correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Evidencias: `artifacts/settings-header-actions/`.

## Plantillas de documentos · acción de alta (16/09/2026)

La acción «Nueva plantilla» se presenta únicamente como un signo más negro junto al título de sección. Usa el botón de icono plano común, sin borde ni fondo, y conserva nombre accesible, ayuda al pasar el cursor y foco de teclado.

Verificado en la aplicación del puerto 3000 a 1440, 390 y 320 px: solo existe el icono, conserva color negro también al pasar el cursor, no muestra borde, fondo ni sombra, abre el editor y no causa desbordamiento horizontal. Resultados y capturas: `artifacts/template-plus-only/`.

## Adjuntos cargados compactos · 16 de septiembre de 2026

Por ajuste posterior del usuario, la fila persistente de cada archivo cargado usa un tamaño intermedio: relleno de 12 × 16 px, separación de 12 px, icono de archivo de 36 px y nombre con los 13 px comunes. Nombre y tamaño comparten una cuadrícula compacta, mientras la papelera mantiene un área interactiva mínima de 44 px en el extremo derecho. Las filas conservan fondo suave, foco visible y la misma composición en escritorio y móvil. Los nombres largos ocupan una línea con puntos suspensivos; el enlace, su título y el nombre accesible conservan el texto completo.

## Bandeja de trabajo solo dentro de Más funciones · 16 de septiembre de 2026

Por petición del usuario, Visión general retira del menú superior el acceso directo «Bandeja de trabajo e incidencias» para evitar duplicarlo. La función permanece disponible dentro de «Más funciones», en el grupo Visión general.

Compilación correcta y comprobación en app:3000 a 1366 y 390 px: el acceso directo no aparece, Más funciones se conserva y el directorio sigue mostrando Bandeja de trabajo e incidencias. Sin desbordamiento horizontal ni errores de JavaScript; recursos servidos contrastados con el contenedor actualizado. Evidencia: test-results/work-inbox-shortcut/verification.json.

## Regreso contextual desde vencimientos · 16 de septiembre de 2026

«Ver todos» y «Ver atrasados» de la tarjeta Vencimientos incluyen su origen al abrir Cobros y pagos. La cabecera reutiliza PageHeading.backLink con flecha y etiqueta «Vencimientos» para regresar a Evolución y actividad. El origen se conserva en búsqueda, filtros, orden, paginación, recarga y al abrir un documento o contacto y volver. La tarjeta recuerda posición y enlace pulsado durante el recorrido para recuperar desplazamiento y foco.

Entrar directamente a Cobros y pagos, incluido un listado sin origen, no muestra flecha. Los accesos desde sus propios indicadores o «Ver todos los vencimientos» identifican expresamente el resumen como origen y conservan el regreso interno existente. Sólo se aceptan orígenes internos conocidos; no se usa el historial genérico del navegador ni se modifica el estilo común de cabecera.

Comprobado en app:3000 a 1440, 390 y 320 px: ambos accesos, filtros, búsqueda, orden, dos páginas, documento y regreso, recarga, entrada directa sin flecha y origen externo ignorado. Diez pruebas existentes de vencimientos y TypeScript correctos. API y base temporal para revisión, sin modificar datos del usuario; recursos servidos contrastados con el contenedor. Evidencia: `test-results/due-return/verification.json`.

## Búsqueda animada en directorios de funciones · 16 de septiembre de 2026

Por petición del usuario, todos los directorios de Más funciones sustituyen el campo Buscar permanente por un botón con lupa y el texto «Buscar». En escritorio se sitúa en la cabecera; en móvil conserva la fila de herramientas de estos modales, sin ocultar el texto del botón. Las ventanas individuales de funciones reutilizan el mismo botón textual.

FeatureModalSearch reutiliza SearchPanel y useSearchPanel: apertura de 220 ms, cierre de 160 ms, desenfoque del fondo de 2 px y movimiento reducido. La búsqueda del directorio se aplica con Intro, conserva los resultados al volver desde una función y permite Quitar búsqueda. Escape y cerrar descartan el texto sin aplicar; el cierre del buscador mantiene abierto el modal de origen, su estado y el bloqueo de desplazamiento, y devuelve el foco al botón. Se retiran los estilos exclusivos de la barra fija, sin añadir escalas tipográficas ni modificar las operaciones de las funciones en diseño.

Verificado en app:3000 con 21 recorridos: los 11 apartados anfitriones en escritorio y facturas, presupuestos, compras, cobros y configuración a 390 y 320 px. Incluye filtro sin acentos, ausencia de resultados, quitar búsqueda, regreso desde funciones, cierre, foco, animación, desenfoque y movimiento reducido. Sin desbordamientos, errores JavaScript ni peticiones desde los modales. TypeScript y compilación correctos; capturas revisadas y recursos contrastados con el contenedor. Evidencia: `test-results/modal-search/verification.json`.

## Iconos representativos en Más funciones · 16 de septiembre de 2026

Por petición del usuario, las 115 funciones del directorio Más funciones usan un icono Lucide asociado a su finalidad. Se asignan 95 iconos distintos; solo se repiten cuando expresan el mismo concepto, como historial, comparación o transferencia. Los accesos contextuales reutilizan el mismo icono que el directorio.

Los iconos conservan 18 px, trazo de 1,6, paleta monocroma, alineación y texto visible; no sustituyen la etiqueta accesible. Comprobado en los 11 apartados a 1366 y 390 px: 115 asignaciones completas, sin entradas sobrantes, desbordamiento horizontal ni errores de JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: test-results/feature-icons/verification.json.

## Tablas comunes en Más funciones · 16 de septiembre de 2026

Por petición del usuario, las tablas de las funciones nuevas reutilizan el estilo de Facturas de venta mediante `table-scroll`, `numeric` y los tokens comunes: cabecera transparente de peso 400, un separador tenue, filas de al menos 64 px, alternancia al 1,5 %, márgenes exteriores de 24 px y separación de 20 px entre columnas. Se eliminan el fondo de cabecera, la alternancia más oscura y el espaciado exclusivos. Datos, Vista previa y la matriz de permisos comparten el criterio; los encabezados de fila reciben las dimensiones comunes de las celdas.

Las casillas y los menús conservan áreas de 44 px y columnas propias, sin imponer ese ancho a los datos de Permisos. La selección sigue visible; las cifras mantienen alineación derecha y formato tabular. En móvil se conserva el desplazamiento dentro de cada tabla, con foco de teclado y palabras y fechas sin cortes arbitrarios; la página y la ventana no desbordan.

Verificado en app:3000: 115 funciones a 1440 px y siete vistas representativas a 390 y 320 px (129 recorridos). Cabeceras, fondos, márgenes, alturas e importes contrastados con Facturas de venta; selección, menú de fila, detalle, vista previa, permisos, foco y desplazamiento local comprobados. Sin desbordamientos de página o ventana, errores JavaScript ni escrituras de negocio. Compilación y formato correctos, capturas revisadas y recursos servidos contrastados con el contenedor actualizado. Evidencia: `artifacts/feature-table-style/verification.json`.

## Búsqueda solo en los directorios de Más funciones · 16 de septiembre de 2026

Por ajuste posterior del usuario, la búsqueda se conserva únicamente en los directorios generales de Más funciones. Al abrir una función concreta se retira el buscador de la cabecera de escritorio y de la barra móvil. Se mantienen la flecha de regreso, el título, el menú de acciones y el cierre; el directorio conserva su búsqueda y sus filtros.

Verificado en app:3000 en los 11 apartados anfitriones, a 1366 y 390 px: los directorios conservan la búsqueda y las 115 funciones concretas carecen de ella. Sin desbordamientos horizontales ni errores de JavaScript; recursos servidos contrastados con el contenedor actualizado. Evidencia: `test-results/feature-search-scope/verification.json`.

## Menú único de clientes y proveedores · 16 de septiembre de 2026

La ficha reúne sus acciones y los accesos «Comprobar identidad fiscal e IBAN» y «Más funciones» en el único menú de tres puntos de PageHeading. ContactActions proporciona las opciones y conserva sus diálogos asociados al contacto seleccionado. Se mantienen las condiciones por tipo de contacto, estado y permisos, el foco de teclado y el estilo común.

## Navegación de funciones igual a la ficha de factura · 16 de septiembre de 2026

Las ventanas de funciones reutilizan las proporciones de la ficha de factura: navegación de 176 px, margen interior de 12 px y separación del contenido de 16 px. La selección hereda el indicador de 2 px de SectionNavigation. En móvil se mantiene el selector común y el contenido ocupa el ancho disponible.

## Ver mensaje como acción icónica · 16 de septiembre de 2026

Por petición del usuario, las filas de correo de PDF y envío sustituyen el botón textual «Ver mensaje» por el icono Eye de 18 px y trazo de 1,6. El ojo comparte el eje horizontal con el icono contextual de Preparar correo situado al extremo derecho. La acción conserva «Ver mensaje» como nombre accesible y tooltip, área interactiva de 44 px, foco de teclado y el comportamiento de apertura existente.

TypeScript correcto y recorrido completo de comunicaciones superado en app:3000 con 36 comprobaciones visuales y de interacción, incluida la alineación geométrica de ambos iconos y las variantes de 1440, 390 y 320 px, sin errores de JavaScript.

## Buscadores sin indicación del atajo · 16 de septiembre de 2026

Por petición del usuario, HeaderSearchField y CommandSearch eliminan la etiqueta «⌘ / Ctrl K» de sus botones y la mención del atajo en sus ayudas. El cambio se aplica al directorio de Clientes activos, a las búsquedas de módulos y al buscador general. Se conserva la lupa, Buscar donde corresponde y el comportamiento del teclado.

Verificado en app:3000 a 1440 y 390 px: Clientes activos, Facturas y Visión general, apertura y cierre del modal, ausencia de etiquetas y ayudas del atajo, sin desbordamiento ni errores. TypeScript y compilación correctos; capturas revisadas y recursos contrastados con el contenedor. Evidencia: `test-results/search-shortcut-label/verification.json`.
Comprobado en app:3000: menú único a 1440, 390 y 320 px para clientes, proveedores, fichas mixtas, archivados y usuarios de solo lectura. Apertura de las siete ventanas, enlaces de creación con contacto y origen, teclado y retorno de foco correctos. Sin desbordamientos, errores JavaScript ni escrituras de interfaz. Datos de prueba en una base temporal; capturas revisadas. Evidencia: test-results/contact-unified-menu/verification.json.

El ajuste de navegación de funciones queda comprobado en los 11 apartados y 115 vistas a 1366 y 390 px, con sus dimensiones contrastadas y recursos servidos verificados contra el contenedor. Evidencia: test-results/feature-search-scope/verification.json.

## Movimiento común al navegar · 16 de septiembre de 2026

Por petición del usuario, los cambios de pantalla comparten una transición de opacidad y desplazamiento corto, con desaceleración `cubic-bezier(.16,1,.3,1)`: 280 ms entre pantallas y 220 ms entre secciones internas. Entrar en una ficha desplaza el contenido desde la derecha; los enlaces de regreso y Atrás del navegador invierten el recorrido. Los cambios entre módulos usan un desplazamiento vertical de 8 px. El recorrido horizontal es de 24 px en páginas y 12 px en pestañas, sin rebotes ni cambios de escala del texto.

`navigation-motion.ts` y `navigation-motion.css` centralizan el comportamiento. App lo aplica a todos los módulos; SectionNavigation, las fichas, los pasos de edición y Más funciones lo reutilizan. Se mantiene estable la navegación lateral; en cambios internos también se conserva la cabecera. No se añaden animaciones a la escritura en campos ni a las operaciones de negocio. Los formularios conservan su estado y el foco mantiene su comportamiento existente.

Las transiciones usan capturas nativas de View Transitions y una entrada equivalente con Web Animations cuando no está disponible. La espera de un cargador tiene un límite de 180 ms; una navegación nueva sustituye la animación anterior y cada cambio de estado se ejecuta una sola vez. Se cancelan al cerrar sesión o cambiar de empresa. `prefers-reduced-motion` elimina el movimiento, también si la preferencia cambia durante la animación. La gráfica conserva su crecimiento progresivo independiente.

Comprobado en app:3000 a 1440, 390 y 320 px: módulos, avance y regreso, historial del navegador, pestañas, directorio de funciones, conservación de campos, menú móvil y foco, navegación rápida, respuesta lenta, alternativa sin View Transitions y movimiento reducido. Capturas durante y después de la transición en `test-results/navigation-motion/`; resultados y recursos contrastados con la imagen del contenedor en `verification.json`.

## Título y herramientas del directorio en la misma fila · 16 de septiembre de 2026

Por petición del usuario, el título de Clientes activos baja hasta la fila del filtro y la búsqueda. El directorio de contactos reutiliza headerActions de Modal y una cabecera de dos filas: cierre arriba a la derecha; título y herramientas alineados verticalmente debajo. El criterio se comparte con proveedores y el directorio completo, conservando la escala tipográfica, las etiquetas accesibles y el comportamiento de los controles.

Verificado en app:3000 a 1440, 390 y 320 px: nueve vistas, alineación sin solapamientos, apertura y cierre de búsqueda y filtros, sin desbordamiento ni errores JavaScript. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: test-results/contact-directory-heading/verification.json.

## Jerarquía común de cabeceras · 16 de septiembre de 2026

Por petición del usuario y tomando como referencia la cabecera de Facturas de venta, PageHeading muestra primero el título y debajo el enlace de navegación. El regreso conserva su flecha, destino, nombre accesible y comportamiento, pero reutiliza la escala de 13 px y la separación de 8 px del enlace de módulo. Las acciones permanecen a la derecha. En móvil se mantienen el área interactiva de 44 px y la adaptación común.

Se retira la variante que colocaba regreso y título en la misma línea al crear o editar facturas, presupuestos y compras. Estos editores recuperan la altura mínima y los márgenes de la cabecera de módulo: 130 px y 24/32 px en escritorio; 140 px y 20 px en móvil. Las fichas documentales comparten esa altura mínima y conservan fechas, número y estado. El orden se aplica también a los listados con regreso, contactos, cobros, catálogo, contabilidad, configuración y auditoría mediante el componente común.
Comprobado en app:3000 con 63 recorridos a 1440, 390 y 320 px: creación, edición, fichas y listados de facturas, presupuestos y compras, además de contactos, cobros, catálogo, contabilidad, configuración y auditoría. Título y enlaces en filas separadas, alineación, alturas, menús y regreso por teclado verificados, sin errores JavaScript ni desbordamiento horizontal. Compilación correcta, capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: artifacts/header-hierarchy/verification.json.

## Buscador de cliente sin etiquetas repetidas · 16 de septiembre de 2026

Al buscar cliente o proveedor en el editor de facturas, presupuestos y compras, el bloque muestra únicamente el campo con su lupa y «Nombre o NIF». Se retiran el encabezado repetido y la etiqueta visible del campo durante la búsqueda; la etiqueta accesible permanece mediante field-label-hidden. Al seleccionar una ficha se recupera su encabezado habitual.

La búsqueda empieza con tres caracteres útiles, descontando espacios, puntos y guiones del NIF. La escritura, el foco, la lupa y Enter respetan ese mínimo; volver a dos caracteres cancela las sugerencias pendientes. Se admiten coincidencias por principio, final y NIF completo, con normalización de formato y prioridad para el exacto. Se conserva la búsqueda por nombre desde tres caracteres. El servidor aplica el mismo mínimo y mantiene el aislamiento por negocio, los permisos y los comodines literales.
Verificado en app:3000 con 17 pruebas de contactos y nueve recorridos de navegador: facturas, presupuestos y compras a 1440, 390 y 320 px. Comprobados ausencia de consultas con dos caracteres, normalización, principio/final/NIF completo, búsqueda por nombre, teclado, selección y descarte de respuestas atrasadas al acortar la consulta. Sin errores JavaScript ni desbordamiento. Compilación correcta, capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: artifacts/contact-search/verification.json.


## Creación como documento con acciones laterales · 16 de septiembre de 2026

Por petición del usuario y tomando su referencia de editor de facturas, crear y editar borradores de facturas, presupuestos y compras comparten una hoja blanca sobre superficie neutra con un lateral de acciones y opciones. Sustituye la distribución compacta de conceptos en dos columnas de estos editores; las fichas guardadas mantienen su composición.

La cabecera negra y su regreso conservan el sistema común. La hoja identifica el tipo y el estado Borrador, alinea emisor y destinatario, reúne las fechas y muestra los conceptos en filas editables, seguidos por un único desglose de base, IVA, retención y total y las notas visibles. La fecha automática de las facturas permanece de consulta. Los campos usan superficies neutras, etiquetas persistentes, foco y errores visibles; las cifras mantienen precisión y formato. Inter, pesos 400/500/600, escala compartida y radio cero se conservan.

El lateral muestra Guardar en borrador, Emitir factura o Contabilizar compra cuando corresponde y Vista previa. Moneda identifica EUR, sin simular otras monedas. Plazo, retención y Datos adicionales reúnen las opciones existentes. Guardar y crear otro y Descartar borrador permanecen en el menú de cabecera. La vista previa reutiliza la hoja y los cálculos actuales, incluye notas y aclara que representa el contenido; no guarda ni emite y conserva los campos y el foco al volver. El PDF conserva su generación existente.

La composición adapta la referencia Documento e información de Ley IA (DocumentationReportPreview) con los controles de Kronjop 06-input y 05-button mediante DocumentSheetLayout y los tokens comunes. No importa estilos globales de los kits ni sus operaciones simuladas. El lateral pasa debajo con menos de 960 px de contenido; los conceptos agrupan sus campos en dos columnas cuando la hoja se estrecha. Se mantienen las áreas de 44 px, los campos de 16 px en móvil y la lectura completa de importes y errores.

En la composición final, las facturas reúnen Emisión y Vencimiento en la parte superior y las notas comparten el pie con los totales cuando hay espacio; en móvil se apilan. Los portátiles ajustan los márgenes sin reducir las áreas de control.

Verificado en app:3000 con 15 recorridos del editor y su vista previa a 1440, 1366 × 768, 1024, 390 y 320 px: tres tipos de documento, cálculos con IVA mixto, descuento y retención, notas, añadir/eliminar/deshacer conceptos, recuperación tras recargar, retorno de foco y guardado. Incluye importes y descripciones largos, emisión de facturas y contabilización de compras sobre una base temporal independiente. Sin desbordamiento horizontal ni errores de JavaScript. También pasan la recuperación de borradores antiguos y los reintentos de Guardar y crear otro sin duplicados; diez pruebas de precios, impuestos y pasos, TypeScript y formato correctos. Recursos servidos contrastados con el contenedor actualizado. Capturas y resultados: artifacts/document-composer/verification.json y verification-1366.json; pruebas complementarias en test-results/single-page-quote-purchase/ y test-results/save-create-invoice/, save-create-quote/ y save-create-purchase/.

## Hoja de edición con espacio y sin desplazamiento añadido · 16 de septiembre de 2026

La creación documental conserva la hoja blanca sobre la superficie neutra y separa sus columnas con 32 px. En facturas, Emisión y Vencimiento se agrupan junto al título de la hoja. Notas y desglose de importes comparten el pie en dos columnas; el estado de guardado se sitúa junto a sus acciones. Se elimina la altura reservada a acciones en las etiquetas que no las tienen.

En portátiles de hasta 820 px de alto se ajustan los márgenes exteriores y las separaciones verticales, conservando la tipografía común y los controles de 44 px. No se impone proporción A4, altura fija, recorte ni desplazamiento interno a la hoja. En móvil, el pie vuelve a una columna y los campos conservan su tamaño; el documento crece de forma natural al añadir conceptos, errores o contenido.

Verificado en app:3000 con 15 vistas de facturas, presupuestos y compras, a 1920, 1440, 1366, 390 y 320 px. La factura inicial cabe sin desplazamiento de página a 1920×1080, 1440×900 y 1366×768. Sin desplazamiento interior de la hoja, recortes ni desbordamiento horizontal; notas, vista previa y adición de conceptos conservan su comportamiento. El selector de IVA muestra el porcentaje completo y las acciones de la fila mantienen su alineación. TypeScript y compilación correctos, sin errores JavaScript; capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: artifacts/paper-layout/verification.json.


## Conceptos sin base ni campo de precio · 16 de septiembre de 2026

Por ajuste expreso del usuario, crear y editar facturas, presupuestos y compras retiran el importe Base repetido bajo cada concepto y también el campo completo Precio sin IVA. La base imponible permanece en el desglose final. Los precios almacenados y los que aporta la selección del catálogo se conservan en los cálculos y el guardado; no se sustituyen por cero al ocultar su edición. Cantidad, descuento e IVA mantienen sus controles y las columnas aprovechan el espacio liberado.

Las notas se trasladan desde la hoja a Datos adicionales, con su etiqueta, edición, validación y conservación en vista previa y documentos. El pie muestra solamente el desglose de importes. Una nota inválida abre Datos adicionales para facilitar su corrección. Un precio inválido recuperado señala el concepto y permite corregirlo seleccionando un producto válido del catálogo.

Comprobado en app:3000 para los tres documentos a 1440, 1024, 390 y 320 px: ausencia de los controles retirados, selección de catálogo con precio conservado, cálculo de IVA/descuentos/retención, edición y recuperación de notas desde Datos adicionales, vista previa y guardado. El resumen ocupa todo el ancho de la hoja en móvil. TypeScript y compilación correctos; datos de revisión aislados en una base temporal. Evidencia: artifacts/composer-simplify/.


## Vencimiento alineado con Emisión · 16 de septiembre de 2026

Por petición del usuario, el vencimiento situado junto a Emisión en la cabecera de creación de facturas pierde su fondo gris y el relleno horizontal. Ambas etiquetas comparten los 12 px, el peso 400 y la separación de 8 px respecto a su valor; las fechas comparten el tamaño común del control y una fila de 44 px. El texto editable queda alineado bajo su etiqueta y en la misma línea que la fecha de emisión, también en móvil. Se conservan el calendario nativo, el foco y los errores visibles, sin modificar el resto de campos.

Verificado en app:3000 a 1440, 1366, 390 y 320 px: diferencia vertical de 0 px entre etiquetas y entre valores, misma altura y tamaño de texto, fondo transparente en reposo y al pasar el cursor, foco visible y edición de fecha operativa. Sin desbordamiento ni errores JavaScript; recursos contrastados con el contenedor. Capturas y mediciones: artifacts/due-date-alignment/.

## Visualización de facturas como la hoja de creación · 16 de septiembre de 2026

La ficha de factura reutiliza la composición de Crear factura: tipo y número arriba, Emisión y Vencimiento juntos, emisor y cliente en dos columnas, conceptos en filas y un único desglose de importes a la derecha. Los datos se presentan como texto sobre blanco, sin fondos grises en conceptos, totales ni contenedores. Se conservan cantidad, precio unitario, descuento porcentual y monetario, IVA, importe neto y motivos de exención.

DocumentSheetLayout y DocumentSheetLines mantienen sus presentaciones existentes para los demás documentos y añaden una variante de lectura para las facturas del resumen. La jerarquía usa la escala común, sin controles simulados. En móvil se apilan las identidades, los campos de cada concepto y el desglose; se conserva la navegación y las acciones de la ficha.


Verificado en app:3000 con 15 vistas a 1440, 1366, 1024, 390 y 320 px: factura simple, IVA mixto, retención, exención, descuentos e importes y nombres largos. Totales e importes por línea coinciden con los guardados; no hay fondos grises en la hoja, controles de edición ni desbordamiento. Presupuestos, compras y Crear factura conservan su presentación. Compilación y TypeScript correctos, sin errores JavaScript ni escrituras desde la interfaz; API y base temporales. Capturas revisadas y recursos contrastados con el contenedor. Evidencia: artifacts/invoice-readonly/verification.json.

## Crear productos desde un concepto · 16 de septiembre de 2026

El desplegable de producto o servicio incluye siempre «Crear producto o servicio», también sin coincidencias. Abre ProductForm en una ventana de 640 px, con la estructura, campos y acciones comunes de la ficha de cliente. Conserva el texto escrito en nombre y descripción; «Guardar y usar» guarda en el catálogo y aplica descripción, precio, IVA y exención al concepto de origen, manteniendo cantidad, descuento y los demás datos del documento. El nuevo artículo queda disponible en los otros conceptos sin recargar.

Facturas, presupuestos y compras comparten el acceso. El catálogo reutiliza el mismo formulario al crear y editar. El modal valida los campos, bloquea envíos repetidos y mantiene los datos ante un error; Cancelar y Escape regresan al concepto sin cambiarlo. La acción es accesible con Tab y el foco vuelve al campo al cerrar. En móvil precio e IVA comparten fila y unidad ocupa la siguiente, sin añadir escalas ni contenedores.


## Emisor y destinatario alineados · 16 de septiembre de 2026

Por petición del usuario, las etiquetas de ambas partes comparten la misma fila de 44 px en la creación y edición de facturas, presupuestos y compras, tengan o no botón de edición. Se retira la excepción que reducía la altura de la etiqueta sin acciones: etiquetas, nombres y primera línea de datos quedan a la misma altura cuando comparten columnas. En móvil se conserva la misma separación interna al apilar los bloques.

Verificado en app:3000 para los tres tipos de documento a 1440, 390 y 320 px: diferencia vertical de 0 px entre etiquetas, nombres y primera línea de datos en escritorio; separaciones internas idénticas en móvil. Edición y cancelación operativas, sin desbordamiento ni errores JavaScript. Compilación y formato correctos, capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: artifacts/party-alignment/verification.json.

Verificado en app:3000 con nueve recorridos de alta contextual a 1440, 390 y 320 px, más el formulario del catálogo. Comprobados precompletado, teclado, foco inicial y de regreso, Cancelar/Escape, validación y corrección sin saltos de foco, cuatro decimales, IVA 0 % y motivo, doble envío sin duplicados, selección inmediata en otros conceptos y conservación de cantidad, descuento y notas. El código duplicado conserva la ficha y permite corregir y guardar. Sin envíos del documento padre, desbordamiento horizontal ni errores JavaScript. Compilación, TypeScript y formato correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Pruebas en base temporal, sin modificar datos del usuario. Evidencia: artifacts/product-create/verification.json.


## Eliminar conceptos sin aviso · 16 de septiembre de 2026

Por petición del usuario, eliminar un concepto en facturas, presupuestos y compras retira la fila directamente, sin mostrar «Concepto eliminado» ni «Deshacer». Se elimina el bloque y su estado; el foco pasa a Añadir concepto para mantener la navegación por teclado.

Verificado en app:3000 para los tres documentos a 1440 y 390 px: ausencia del aviso y su botón, eliminación de la fila, foco, cálculos, recuperación del borrador, vista previa y guardado. Compilación correcta, sin desbordamiento ni errores JavaScript. Capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: artifacts/remove-concept-notice/.

## Vencimientos con la tabla común de facturas · 16 de septiembre de 2026

Por petición del usuario, la pestaña Vencimientos de las fichas documentales ocupa todo el ancho disponible y reutiliza la tabla común de facturas: encabezado ligero, filas alternas, altura mínima de 64 px y márgenes laterales de 24 px. Se elimina el límite anterior de 32 rem. Los importes se alinean a la derecha y el lápiz pasa a una columna final de acciones, centrado en la fila y con un área de 44 px. La vista de solo lectura omite esa columna. Se conservan los estados de los plazos, la edición y el historial existentes.

Verificado en app:3000 con ocho vistas de facturas, compras y solo lectura a 1440, 390 y 320 px, sobre una base temporal: plazos pendientes, parciales y liquidados, alineación, ancho completo, ausencia de desbordamiento, apertura por teclado y retorno del foco. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados con la imagen del contenedor. Evidencia: test-results/schedule-invoice-table/verification.json.

## Marco de papel en la visualización de facturas · 16 de septiembre de 2026

Por aclaración del usuario, la visualización de facturas recupera el formato de papel de Crear factura: hoja blanca dentro de una superficie gris tenue, con 24 px de margen exterior, 16 px en anchuras intermedias y 8 px en móvil. Los datos, conceptos y totales permanecen sobre blanco, sin fondos de campo. La hoja crece con el contenido, sin altura fija, proporción A4 forzada ni desplazamiento interno.

Verificado en app:3000 con 15 vistas a 1440, 1366, 1024, 390 y 320 px: marco gris y márgenes adaptativos correctos, interior blanco, importes conservados y ausencia de desbordamiento. Compilación correcta, sin errores JavaScript ni escrituras desde la interfaz. Capturas revisadas y recursos contrastados con el contenedor. Evidencia: artifacts/invoice-paper-frame/verification.json.

## Descuento solo cuando está aplicado · 16 de septiembre de 2026

La visualización de facturas omite el apartado Descuento en cada concepto cuyo descuento sea cero. Cuando existe, conserva el porcentaje y el importe descontado. En escritorio, las filas sin descuento reparten el espacio entre Cantidad, IVA e Importe, sin dejar una columna vacía; en móvil mantienen la distribución de lectura existente.

## Desplazamiento bajo la cabecera del editor · 16 de septiembre de 2026

Cuando el documento requiere desplazamiento, la cabecera de Nueva factura permanece visible. El mismo comportamiento se aplica a los editores de presupuestos y compras. Su altura real se mide con ResizeObserver y se comparte con el espacio reservado al desplazamiento y las acciones laterales; los cambios de anchura o de contenido actualizan la medida.

Los campos conservan margen al recibir el foco, añadir conceptos o mostrar errores, de modo que sus etiquetas y controles quedan por debajo de la cabecera. En móvil se reserva el espacio del botón de navegación; en modo integrado ese espacio no se añade. La navegación se mantiene por encima de la cabecera y los desplegables del documento quedan en su propia capa. No se añaden áreas de desplazamiento internas ni altura mínima a la hoja. Al salir del editor se retira la medida y las demás pantallas mantienen su cabecera habitual.

## IVA según el descuento del concepto · 16 de septiembre de 2026

En la visualización de facturas, los conceptos sin descuento muestran «IVA 21 %» en una sola línea, con etiqueta y porcentaje alineados por su base. Si el concepto tiene descuento, IVA conserva la etiqueta arriba y el porcentaje debajo. La regla se aplica por concepto, también en facturas mixtas y en móvil.

## Correo y portal desde el menú documental · 16 de septiembre de 2026

Por petición del usuario, las fichas documentales retiran la pestaña PDF y envío y su selección de plantilla PDF. Las acciones Enviar correo y Portal del cliente se sitúan en el menú de tres puntos de la cabecera, con sus iconos, y abren ventanas comunes independientes. Correo conserva los mensajes y el ojo alineado con Preparar correo; Portal conserva los enlaces vigentes y Crear enlace debajo del listado. Los borradores no ofrecen envío ni portal, y los perfiles de consulta muestran Ver correos sin acciones de escritura. Ver o descargar PDF mantiene su acceso existente.

Los enlaces antiguos a la pestaña retirada muestran Resumen; si incluyen correo o portal, recuperan su ventana. Abrir y cerrar conserva la sección de origen y sus parámetros. Volver desde la configuración de correo recupera la ficha y su ventana. El selector móvil también omite la pestaña retirada. No se modifican las plantillas de Configuración ni los PDF archivados.

Verificado en app:3000 con 36 comprobaciones existentes de comunicaciones y recorridos específicos de facturas, presupuestos y compras a 1440, 390 y 320 px: menú, creación y consulta de mensajes, descarga del correo, enlaces del portal, teclado y retorno del foco, recarga, enlaces anteriores y permisos de consulta. Tres pruebas de rutas, TypeScript y compilación correctos. Sin desbordamiento ni errores JavaScript; capturas revisadas y recursos servidos contrastados con la imagen del contenedor. Datos aislados, sin enviar correos. Evidencias: artifacts/communications/browser-results.json y test-results/delivery-menu/verification.json.

Verificado en app:3000 con ocho recorridos de facturas, presupuestos y compras a 1440, 1366, 390 y 320 px, incluido modo integrado. Comprobados documentos de diez conceptos, desplazamiento directo, foco hacia delante y atrás, adición de conceptos, errores de validación, modales, menú de cabecera y navegación móvil, cambio de anchura y limpieza al salir del editor. La factura inicial conserva su altura sin desplazamiento a 1440×900 y 1366×768. Sin desbordamiento horizontal ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Base temporal independiente. Evidencia: artifacts/header-scroll/verification.json.

## Conceptos con guiones en la factura · 16 de septiembre de 2026

La visualización de facturas elimina las etiquetas numeradas «Producto o servicio». Cada concepto empieza directamente por su nombre, precedido de un guion. El nombre conserva los saltos de línea y el guion mantiene su posición cuando el texto ocupa varias líneas; se omite del nombre accesible del encabezado. Se retira el espacio superior que correspondía a la etiqueta.

## Guiones y valores en línea en los conceptos · 16 de septiembre de 2026

Por ampliación del usuario, los datos del concepto comparten el formato con guion: Cantidad, Descuento cuando está aplicado, IVA, Importe y Precio sin IVA. Las etiquetas se conservan junto al valor para identificar cada dato, sin una cabecera separada encima. La información se distribuye en líneas que se adaptan al espacio disponible; el importe monetario del descuento aparece entre paréntesis junto al porcentaje. Esta disposición unifica también el IVA en una línea. Los totales del documento mantienen su desglose.

## Movimientos con el ancho de la ficha · 16 de septiembre de 2026

Por petición del usuario, Movimientos e historial elimina el límite de 860 px y ocupa el mismo ancho del contenido que Resumen y Vencimientos. La tabla conserva la tipografía, los márgenes de 24 px, las filas alternas y la altura mínima del sistema común de facturas. Las referencias largas se ajustan a su columna y la vista móvil mantiene su distribución, sin imponer un ancho mínimo que genere desplazamiento horizontal. El historial permanece visible y simplificado.

Verificado en app:3000 en facturas y compras a 1920, 1440, 1024, 390 y 320 px: tabla y contenido con el mismo ancho, referencias largas legibles, importes conservados, sin desbordamiento ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Datos de revisión aislados. Evidencia: test-results/movement-table/verification.json.

## Espacio entre los datos de los conceptos · 16 de septiembre de 2026

Por ajuste del usuario, Cantidad, IVA e Importe se muestran sin guion. Las etiquetas se separan de sus valores con dos puntos: Cantidad: 7, IVA: 21 % e Importe: 455,00 €; Descuento y Precio sin IVA siguen el mismo criterio. La separación entre conceptos aumenta a 32 px y entre sus datos a 16 px verticales y 32 px horizontales; el nombre y el precio se separan 8 px. Cuando el detalle pasa debajo del concepto, conserva 24 px de separación. Se mantienen la adaptación al ancho disponible y el formato de papel.
## Archivos adjuntos sin fondos ni borde discontinuo · 16 de septiembre de 2026

Por petición del usuario, la zona de subida de Archivos adjuntos retira su borde discontinuo y fondo gris. Las filas durante la subida y los archivos guardados, incluidos sus iconos, pasan a fondo transparente sobre la superficie blanca. Se conservan la distribución, las acciones, la barra de progreso y el contorno visible al usar el teclado o arrastrar archivos; el estado de arrastre tampoco añade fondo gris.

Verificado en app:3000 a 1440, 390 y 320 px en facturas, presupuestos y compras, antes, durante y después de adjuntar un archivo: fondos transparentes, borde de zona ausente, foco visible, subida correcta y ausencia de desbordamiento o errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor. Archivos de prueba y base de datos aislados. Evidencia: test-results/attachment-surfaces/verification.json.

## Acciones de cabecera y descuento contextual · 16 de septiembre de 2026

Por petición del usuario, los editores de facturas, presupuestos y compras reúnen Guardar en borrador, Emitir factura o Contabilizar compra y Vista previa en el menú de tres puntos de PageHeading. Se conservan los permisos, bloqueos durante el envío y las opciones de guardar y crear otro y descartar. El lateral conserva Plazo, Retención, Datos adicionales y el estado de guardado; se retiran Moneda y EUR · Euro.

Cada concepto sustituye la papelera por un único menú de tres puntos. Abre un desplegable con Descuento % y Eliminar concepto; cantidad e IVA permanecen en la hoja y la descripción aprovecha la columna liberada. Se reutilizan Field, la superficie de ActionsMenu y los controles accesibles de React Aria, con área de 44 px y tipografía compartida. El porcentaje se aplica al concepto existente y se conserva al cerrar, recargar y guardar. Enter cierra el desplegable sin enviar el documento; Escape devuelve el foco. Un descuento inválido abre su campo al validar. Se mantiene la protección que impide eliminar el último concepto.

## Más separación junto a la navegación documental · 16 de septiembre de 2026

Por petición del usuario, el contenido de las fichas documentales aumenta su separación respecto a la barra lateral de secciones de 16 a 32 px mediante el token space-8. Resumen, Vencimientos, Archivos adjuntos y Movimientos e historial comparten este margen. En la vista móvil, donde la navegación pasa a selector, el margen lateral sigue siendo cero para aprovechar el ancho disponible.

Verificado en app:3000 en escritorio y móvil a 1440, 390 y 320 px: separación ampliada, tablas dentro del ancho disponible, importes y acciones alineados, teclado y modo consulta correctos. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: test-results/schedule-invoice-table/verification.json.

## Interruptores con geometría recta · 16 de septiembre de 2026

Por petición del usuario, ToggleSwitch recupera las esquinas rectas del componente 09-toggle del kit de Kronjop y el radio cero del kit combinado. Se retira la excepción redondeada de la pista y del botón interior; esta decisión sustituye la geometría descrita en Interruptores de series de numeración e Indicadores animados en series de numeración. El control compartido conserva sus dimensiones aprobadas (pista de 44 × 24 px, botón cuadrado de 18 × 18 px y área interactiva de 44 × 44 px), paleta neutra, tic/X, transición, estados y accesibilidad.

Verificado en app:3000 con ocho recorridos a 1440, 1366, 390 y 320 px: menús por teclado, alineación de cada botón con su campo, porcentaje decimal, Escape y Enter sin envío, alta y selección de conceptos, eliminación y retorno de foco, apertura del descuento inválido, recarga, vista previa y guardado con importes coincidentes. Comprobadas también emisión de factura y contabilización de compra desde la cabecera. Sin desbordamiento horizontal ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Datos de prueba en una base temporal independiente. Evidencia: artifacts/editor-context-options/verification.json.

Verificado en app:3000 a 1440, 390 y 320 px: esquinas rectas en ambos elementos, estados, centrado, textos largos, animación, teclado, foco, persistencia, bloqueo, errores y movimiento reducido. Sin desbordamientos ni errores de JavaScript; compilación correcta y recursos servidos contrastados con el contenedor. Capturas revisadas. Evidencia: test-results/series-square/verification.json.

## Año visible en documentos; omisión limitada a tablas · 16 de septiembre de 2026

Por aclaración del usuario, las fechas de las facturas incluyen siempre el año, también si coincide con el actual. Emisión y Vencimiento conservan el día y el mes abreviado, por ejemplo «15 sept 2026» y «14 nov 2026». El formato compartido shortDate incluye el año en documentos, creación, detalles y mensajes; tableDate conserva la omisión del año actual únicamente en celdas de tablas, incluidas las de vencimientos, movimientos y contabilidad. Las fechas de otros años mantienen el año también en tablas. Las vistas previas y el PDF conservan sus fechas completas.

Verificado en app:3000 con 21 comprobaciones a 1440, 390 y 320 px: facturas del año actual, anterior y con vencimiento al año siguiente, tablas, creación y vista previa. Verificada también la tabla de vencimientos y ambos formatos compartidos. Sin desbordamiento ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Base temporal independiente. Evidencia: artifacts/document-date-year/verification.json.

## Acciones directas en el modal de correo · 16 de septiembre de 2026

Por petición del usuario, Preparar correo se representa con un icono más en la cabecera del modal Correo, inmediatamente antes de cerrar. Cada mensaje agrupa el ojo y la papelera a su derecha, alineados y con controles comunes de 44 px, etiquetas accesibles y ayuda al pasar el ratón. Se elimina el sobre separado de la primera fila. La composición mantiene las acciones juntas y permite envolver direcciones largas en móvil.

La papelera retira el mensaje de forma persistente sin modificar la factura ni su PDF. Los mensajes pendientes se cancelan al retirarlos; durante un envío en curso se bloquea la eliminación. Se conservan internamente la trazabilidad y los intentos de envío. La operación respeta permisos, versiones, idempotencia y aislamiento entre empresas. Tras eliminar, el foco vuelve al más de la cabecera. Las cuentas de consulta conservan únicamente el ojo.

## Catálogo compacto con creación fija arriba · 16 de septiembre de 2026

Por petición del usuario, las opciones de ProductConceptInput muestran únicamente nombre y precio sin IVA. Se retiran de la lista la descripción secundaria y el porcentaje de IVA; ambos datos se conservan al seleccionar el artículo para completar el concepto. La búsqueda sigue admitiendo la descripción. El precio mantiene su precisión de hasta cuatro decimales y su etiqueta accesible.

«Crear producto o servicio» ocupa la primera posición y queda fuera de la zona desplazable de productos. Sólo la lista se desplaza, con altura limitada, contención del desplazamiento y opciones de al menos 44 px. Se conserva el acceso por Tab, la selección con flechas y Enter y el regreso desde el modal. El patrón es compartido por facturas, presupuestos y compras.

Verificado en app:3000 con nueve recorridos a 1440, 390 y 320 px y un catálogo temporal de 30 artículos: nombre/precio, ausencia de textos secundarios, precio con cuatro decimales, nombres largos, desplazamiento con rueda sin mover ni ocultar Crear, navegación por teclado, selección, búsqueda sin coincidencias y apertura/cierre del modal con retorno del foco. Sin desbordamiento horizontal ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: artifacts/product-menu-compact/verification.json.

Verificado el modal en app:3000 a 1440, 390 y 320 px: iconos alineados, controles de 44 px, creación y visualización, eliminación persistente, retorno de foco, conflicto de versión y permisos de consulta. Sin desbordamiento dentro del modal ni errores JavaScript. Pasan las 21 pruebas de integración de comunicaciones y eliminación. Compilación correcta y recursos contrastados con el contenedor saludable. Evidencia: artifacts/message-actions/verification.json.

## Catálogo ajustado al espacio de la factura · 16 de septiembre de 2026

Por petición del usuario, el desplegable del catálogo reduce su altura máxima de 320 a 224 px. La altura se limita además al espacio disponible dentro de la hoja y de la ventana, dejando 12 px de margen. Si debajo no cabe y hay más espacio arriba, se abre sobre el campo. La posición se actualiza al cambiar el tamaño de la ventana, la altura del campo o el desplazamiento, teniendo en cuenta la cabecera fija y el área visible del navegador.

Crear producto o servicio permanece arriba, fuera de la lista desplazable. Los productos mantienen nombre, precio y áreas de pulsación de 44 px. La navegación con flechas desplaza únicamente los productos, conservando la posición de la página. Se comparten estas reglas en facturas, presupuestos y compras.

Verificado en app:3000 con doce recorridos a 1440×900, 1366×768, 390×844 y 320×568, más un cambio a 1440×640: límites de papel y ventana con margen, altura máxima, apertura hacia arriba, desplazamiento de 30 productos, acceso fijo a crear, teclado, selección y modal sin coincidencias. Sin desbordamiento horizontal ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor actualizado. Base temporal independiente. Evidencia: artifacts/product-menu-fit/verification.json.

## Menú de acciones por correo · 16 de septiembre de 2026

Por petición del usuario, cada fila del modal Correo sustituye los botones separados de ojo y papelera por un único ActionsMenu de tres puntos al final. El desplegable contiene Ver mensaje y Eliminar mensaje con sus iconos representativos. Esta decisión sustituye la presentación de acciones directas anterior; el más continúa junto a la X en la cabecera. Se conservan los permisos, la eliminación persistente, el bloqueo durante el envío y el regreso del foco. El menú compartido conserva navegación por teclado, Escape y posición dentro del modal.

## Regreso desde la factura · 16 de septiembre de 2026

El enlace de regreso que mostraba «Factura» pasa a «Atrás», acompañado de la flecha izquierda existente, en la ficha, el listado de Facturas de venta y el editor de factura. Su nombre accesible es «Atrás» y conserva el destino y los filtros de la navegación de origen.

Verificado el menú en app:3000 a 1440, 390 y 320 px: apertura por teclado, iconos, Escape con retorno de foco, consulta del mensaje, eliminación persistente, conflicto de versión y permisos. Sin desbordamiento dentro del modal ni errores JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/message-actions-menu/verification.json.

## Descuento contextual más pequeño · 16 de septiembre de 2026

Por petición del usuario, el desplegable de opciones de cada concepto se reduce a 200 px de ancho y unos 94 px de alto. El campo Descuento % y la papelera comparten una fila, con 12 px de margen y sombra tenue. Se elimina el texto visible Eliminar concepto; el icono conserva ese nombre accesible y su ayuda al pasar el ratón. La etiqueta utiliza el color secundario y la tipografía común. Los controles mantienen 44 px y el foco visible.

El patrón compartido se aplica a facturas, presupuestos y compras. Los errores se muestran debajo de ambos controles, sin desalinearlos. Se conservan la edición del porcentaje, Enter y Escape, la devolución del foco y la protección del último concepto.

Verificado en app:3000 con seis recorridos a 1440, 1366, 390 y 320 px: desplegable de 200 × 93,5 px dentro de la ventana, campo y papelera alineados, teclado, errores, eliminación y bloqueo del último concepto. Sin desbordamiento ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor saludable. Base temporal independiente. Evidencia: artifacts/line-options-compact/verification.json.

## Regreso con icono al registrar cobros y pagos · 16 de septiembre de 2026

El paso Fecha de PaymentCreation sustituye el botón con texto Anterior por una flecha izquierda sin recuadro, usando icon-button-plain. Conserva el nombre accesible y la ayuda «Anterior», el foco visible, el área pulsable común y el regreso al paso Documento. Cancelar en el primer paso y Continuar mantienen su presentación.
## Recorrido de foco al rellenar una factura · 16 de septiembre de 2026

Por petición del usuario, el editor de facturas comienza en el buscador del cliente. Al seleccionar un cliente, reconocer su NIF completo o guardar una ficha nueva, el foco pasa a Vencimiento, también al cambiar de cliente. Si la factura ya tiene cliente, comienza en Vencimiento. Cancelar un cambio devuelve el foco al lápiz; la escritura y los errores conservan su comportamiento habitual.

Se retira Emisión de la cabecera del formulario de factura. La fecha sigue asignándose automáticamente en los datos del documento. Vencimiento conserva el año y ocupa una sola columna en móvil.

Verificado en app:3000 a 1440, 390 y 320 px: foco inicial, selección con ratón y teclado, NIF completo, creación en modal, cancelación, escritura de conceptos, recuperación del borrador y fecha automática conservada. El vencimiento queda visible bajo la cabecera fija, sin desbordamiento ni errores JavaScript. Compilación correcta y recursos contrastados con el contenedor saludable; capturas revisadas. Datos temporales aislados. Evidencia: artifacts/invoice-focus/verification.json.

## Pasos sin fondo gris · 16 de septiembre de 2026

CreationSteps elimina el fondo gris del paso activo y el cuadrado negro del número. El número se muestra sin fondo y el título del paso actual se distingue en negro con el peso activo del sistema; los otros pasos conservan el texto secundario. Se mantienen las marcas de pasos completados, el foco de teclado y la navegación.
## Confirmación al pie del movimiento · 16 de septiembre de 2026

El último paso de PaymentCreation incorpora la misma flecha de regreso que el paso Fecha. La confirmación sale de la cabecera y pasa al extremo derecho del pie: botón primario negro «Confirmar» con un tic a su derecha, siguiendo Continuar. Conserva el envío del formulario, la validación del importe y el bloqueo durante el registro; volver a Fecha conserva los datos introducidos.
## Marco blanco del modal de movimientos · 16 de septiembre de 2026

Registrar cobro y Registrar pago presentan la cabecera negra y el cuerpo dentro de una única superficie blanca, con 24 px de margen interior exterior en escritorio y 16 px en móvil. El formulario conserva 24/16 px de separación superior, sin duplicar márgenes laterales. Se mantiene la adaptación de altura y desplazamiento del modal común, el fondo desenfocado y las acciones al pie.
## Iconos de actividad sin fondo · 16 de septiembre de 2026

Por petición del usuario, los iconos de documento de Actividad reciente eliminan el fondo gris. El contenedor compartido activity-icon pasa a transparente y conserva sus dimensiones, color y alineación en escritorio y móvil.

## Retirada de Correo de salida · 16 de septiembre de 2026

Por petición del usuario, Configuración elimina Correo de salida y su formulario SMTP. Correo retira el enlace a esa sección; si el envío no está disponible, informa de la opción de descargar el mensaje. Los accesos antiguos a settings/mail muestran Datos de empresa mediante la selección predeterminada. Se conservan los mensajes y la infraestructura de envío existente. La conexión automática con Google al iniciar sesión queda pendiente de implementación.
## Directorio de clientes visible desde el primer fotograma · 16 de septiembre de 2026

Al entrar en una ruta de Clientes con directory=1, el directorio y su desenfoque aparecen juntos, sin la transición de página que podía cubrir temporalmente el backdrop. El diálogo común se abre con useLayoutEffect, antes de pintar el contenido; conserva el bloqueo de desplazamiento, el foco y el apilamiento de ventanas. La lista puede cargar dentro del directorio ya abierto. El resto de rutas mantiene su transición.

Verificado en app:3000 a 1440, 390 y 320 px, con carga de contactos ralentizada y movimiento normal o reducido: 166 fotogramas observados con directorio modal y desenfoque activos desde el primero, sin transición de página superpuesta. Selección, reapertura, filtros anidados, Escape, foco y acceso directo correctos. Sin errores JavaScript ni desbordamientos. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: artifacts/contact-directory-first/verification.json.

## Creación desde la cabecera de Configuración · 16 de septiembre de 2026

Plantillas y Requisitos del comprador retiran el más junto al título. Nueva plantilla y Añadir requisito del comprador pasan al menú de tres puntos de la cabecera de Configuración, visibles únicamente para administradores y en la sección correspondiente. Se conservan los formularios, la edición de registros, la validación y el retorno del foco al menú al cerrar. Estudios, Series y Usuarios mantienen sus acciones ya ubicadas en esa cabecera.

## Emisión oculta al visualizar facturas · 16 de septiembre de 2026

Por petición del usuario, Resumen oculta la etiqueta Emisión y su fecha en las facturas guardadas, incluidos borradores, pendientes y cobradas. La cabecera de la hoja conserva Factura, número y Vencimiento con su año. Se reutiliza showIssueDate del componente compartido; la fecha almacenada y los documentos PDF conservan su comportamiento. Esta decisión sustituye la presencia de Emisión en la visualización interna descrita en Año visible en documentos.

Verificado en app:3000 con diez comprobaciones a 1440, 390 y 320 px: emisión ausente, vencimiento visible, datos guardados conservados y otros documentos sin cambios. Sin desbordamiento horizontal ni errores JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/invoice-hidden-issue-date/verification.json.

## Icono de contactos para abrir el directorio · 16 de septiembre de 2026

El usuario elige la primera propuesta: ContactRound sustituye a la flecha izquierda junto a Datos del cliente o proveedor. Conserva el tamaño de 18 px, el trazo, la alineación y el botón común de 44 px sin fondo ni borde. La etiqueta accesible y la ayuda son «Abrir clientes y proveedores», acorde al directorio compartido que abre. Se mantienen el desenfoque inmediato, Escape y el regreso del foco.

## Emisor y cliente más arriba · 16 de septiembre de 2026

Por petición del usuario, los bloques de emisor y cliente de la factura guardada suben 16 px y conservan su alineación. La separación respecto a la cabecera se reduce de 24 a 8 px; antes de los conceptos pasa de 24 a 40 px. Los conceptos y totales conservan su posición, sin aumentar la altura de la hoja. En móvil se conserva el apilado y la separación entre emisor y cliente. El ajuste utiliza space-4 y afecta únicamente a la visualización de facturas.

Verificado en app:3000 con diez comprobaciones a 1440, 390 y 320 px: separación de 8 px tras la cabecera y 40 px antes de conceptos, emisor y cliente alineados en escritorio, adaptación móvil y fechas conservadas. Sin desbordamiento horizontal ni errores JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/invoice-party-spacing/verification.json.

## DNI: solo formato · 16 de septiembre de 2026

Por petición del usuario, el DNI solo exige ocho números y una letra A-Z, sin comprobar su correspondencia matemática. Se aplica a búsquedas, altas y edición mediante el validador compartido, también en servidor. Se conserva la normalización y el límite de entrada. NIE y NIF de entidades mantienen sus formatos y validación existentes. Esta decisión sustituye la comprobación de la letra de control del DNI descrita anteriormente.

## Vencimientos como lista compacta · 16 de septiembre de 2026

El usuario elige la primera propuesta y pide texto negro sobre blanco, sin fondos grises. DocumentSchedule sustituye la tabla por una lista semántica: fecha e importe juntos, estado a la derecha y lápiz al final. Se eliminan las cabeceras y las franjas de fila; fecha, importe, estado y cantidades aplicadas usan el negro común del sistema. Liquidado conserva un tic y los plazos abiertos muestran Pendiente. En móvil el estado pasa debajo de los datos.

La fecha usa shortDate con año, ya que deja de ser una celda de tabla. Se mantienen los saldos parciales, el importe aplicado, la edición del plazo correspondiente, los permisos y el historial existente.

Verificado en app:3000 en ocho vistas de facturas, compras y modo consulta a 1440, 390 y 320 px: ausencia de tabla y fondos grises, texto negro, año visible, importes y estados conservados, lápiz accesible, apertura por teclado y retorno del foco. Sin desbordamientos ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/schedule-compact/verification.json.

## Adjuntos alineados con Vencimientos · 16 de septiembre de 2026

Por petición del usuario, Archivos adjuntos iguala la posición de su título y el inicio de sus filas a Vencimientos. El clip conserva su área de 44 px sin aumentar la altura de la cabecera, y la separación inferior pasa a 16 px. Las filas eliminan el relleno lateral y vertical; el icono ocupa 18 px de ancho y la fila conserva 44 px de altura mínima. Nombre, tamaño y papelera mantienen su disposición y sus acciones. La misma geometría se aplica durante la subida, conservando la animación.

Verificado en app:3000 a 1440, 390 y 320 px: posición y altura de cabecera, comienzo de fila e icono y eje de la papelera coincidentes con Vencimientos, con una tolerancia de 1 px. Nombre y tamaño conservados, sin desbordamientos ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/files-schedule-alignment/verification.json.

## Paginación con flechas en Actividad de clientes · 16 de septiembre de 2026

Por petición del usuario, la actividad de clientes presenta Página X de Y entre dos botones cuadrados con ChevronLeft y ChevronRight, alineados a la derecha. Usa los controles comunes de 44 px, con nombres accesibles Página anterior y Página siguiente; deshabilita la flecha correspondiente en cada extremo. Se muestra únicamente cuando hay más de una página. La variante iconControls de ContactPagination conserva la presentación existente del directorio de contactos.

Verificado en app:3000 a 1440, 390 y 320 px con once documentos: navegación en ambos sentidos, teclado, contador, estados deshabilitados y ausencia del control con una sola página. Sin desbordamientos ni errores JavaScript. Compilación y formato correctos; capturas revisadas y recursos contrastados con el contenedor actualizado. Evidencia: artifacts/contact-activity-pagination/verification.json.

## Exportación PDF minimalista · 16 de septiembre de 2026

La exportación adopta la referencia aportada por el usuario: A4 blanco, título centrado, emisor y cliente en dos columnas, número y fechas en una fila, tabla sin fondo gris y separadores finos. Los importes se alinean a la derecha; el total concentra el énfasis. La retención solo aparece cuando existe y el IVA se desglosa por tipo. Se conservan logo, idioma, color configurado, descuentos, exenciones, notas, datos del comprador y condiciones de pago. Los precios mantienen hasta cuatro decimales; las fechas usan el formato local con año.

Ver PDF y Descargar PDF solicitan layout=current para aplicar el diseño a documentos existentes sin modificar los bytes archivados. Las facturas confirmadas conservan la instantánea de empresa y los ajustes de plantilla guardados. La ruta sin parámetro, los envíos y el portal mantienen el original archivado; las nuevas emisiones usan pdf-v5. Los conceptos repiten encabezados al paginar, las notas fluyen en nuevas páginas y el pie queda reservado.

## Cierre de Registrar cobro y pago · 16 de septiembre de 2026

El primer paso omite Cancelar: la X de cabecera cierra el modal. Continuar permanece a la derecha. Los pasos siguientes conservan la flecha Anterior y el cierre con X o Escape.

## Portal solo en Configuración · 16 de septiembre de 2026

Portal del cliente se retira del menú de todas las fichas de documentos. Los enlaces antiguos con delivery=portal muestran la ficha sin abrir el modal. Se conserva Configuración → Portal del cliente, con sus permisos actuales, y no se revocan enlaces existentes.

## Consistencia documental y vista previa PDF · 16 de septiembre de 2026

Por petición del usuario, Presupuestos, Compras y gastos y Cobros y pagos heredan la presentación vigente de Facturas de venta. DocumentSheet usa la misma variante de lectura para todos los resúmenes: hoja blanca con marco neutro, identidades alineadas, conceptos sin cajas, descuento únicamente cuando existe y un único desglose de totales. Las rectificativas conservan referencia, signo e importes. Las fechas propias de presupuestos y compras y la referencia del proveedor mantienen su significado.

Los editores comparten cabecera de hoja con fechas, campos, conceptos, opciones y menú. El regreso se denomina Atrás. Las fichas comparten Vista previa, Descargar PDF y la acción de crear otro documento, con las acciones propias de cada tipo y los permisos existentes. No se recupera Portal del cliente en esas fichas.

Los listados de presupuestos, compras, vencimientos, movimientos y anticipos usan la tabla documental de cinco columnas, incluidos estados, fechas, cifras y adaptación móvil. Las acciones de documentos se encuentran en su ficha. Al abrir un movimiento desde el historial, Revertir movimiento está en el menú de la ficha y actúa sobre ese movimiento. Los anticipos conservan importe y disponible y abren Aplicar o devolver desde su referencia.

Vista previa muestra los bytes del generador PDF vigente mediante un visor compartido que dibuja sus páginas y expone el texto a lectores de pantalla. Se carga únicamente al abrir el visor, admite varias páginas, se ajusta al ancho, permite abrir el PDF y conserva Escape y el regreso. Se aplica en editores, fichas y plantillas. El editor solicita una instantánea validada sin guardar, numerar, emitir ni archivar; cerrar cancela la solicitud y libera el archivo temporal. Las fichas usan layout=current, igual que Descargar PDF. Se conservan los PDF archivados, instantáneas de empresa y ajustes de plantilla.

La propuesta para Configuración está en [PROPUESTA_CONFIGURACION_2026-09-16.md](PROPUESTA_CONFIGURACION_2026-09-16.md) y no se ha implementado.

Verificado en app:3000 mediante 62 recorridos a 1440, 1024, 390 y 320 px: tablas, fichas, editores, vista previa guardada y sin guardar, varias páginas, errores y reintento, Escape, retorno del foco, anticipos y formularios de cobro y pago. Al abrir un plazo desde Cobros y pagos, el importe inicial se obtiene de su saldo actualizado, sin sustituirlo por el saldo total del documento. Sin errores JavaScript, desbordamientos de página ni columnas recortadas dentro de las tablas. Comparación de páginas PDF idéntica entre vista previa y descarga para los tres tipos, con IVA mixto, descuento y retención; verificados permisos, aislamiento y ausencia de escrituras. Se conservan los PDF archivados. Compilación, tipos y formato correctos; recursos y código de servidor contrastados con la imagen saludable de app. Datos de pruebas aislados. Evidencias: artifacts/document-consistency/verification.json, server-verification.json y pdf/.

## Editor documental blanco y cliente a la derecha · 16 de septiembre de 2026

Por petición del usuario, el editor compartido elimina los fondos grises del lienzo, campos y total. Mantiene las etiquetas, controles y señales de foco y error. El bloque del destinatario ocupa hasta 300 px y se alinea al extremo derecho de la hoja, dejando espacio respecto al emisor; en móvil ocupa el ancho disponible y conserva el apilado. Se aplica a los editores que comparten DocumentComposer.

Verificado en app:3000 a 1440, 1024, 390 y 320 px: superficies blancas, total sin fondo gris, destinatario alineado a la derecha y adaptación móvil sin desbordamientos. Compilación y formato correctos, sin errores JavaScript; recursos servidos contrastados con la imagen saludable. Evidencia: artifacts/editor-white/verification.json.

## Importe sin IVA en los conceptos · 16 de septiembre de 2026

La vista compartida de documentos guardados denomina Importe sin IVA al neto de cada concepto y elimina la segunda línea Precio sin IVA. Se conservan cantidad, tipo de IVA, descuento cuando existe e importes calculados.

## Vacíos de requisitos y plantillas · 16 de septiembre de 2026

Requisitos del comprador y Plantillas muestran, cuando la carga termina sin registros ni error, un icono lineal de 24 px, una frase y una acción centrados con el espacio y los controles de Archivos adjuntos. SectionEmpty comparte esta composición sin contenedor ni fondo. Añadir requisito y Crear plantilla abren los formularios existentes; Plantillas respeta los permisos de consulta. Al existir registros desaparece el estado vacío. Las acciones de cabecera se conservan.

## Cliente hacia el margen derecho · 16 de septiembre de 2026

En la hoja de documentos guardados, el bloque del cliente ajusta su ancho al contenido y se sitúa al extremo derecho de su columna. Sus textos conservan alineación izquierda y queda espacio libre entre emisor y cliente. Los nombres y direcciones largos envuelven dentro de la columna; en móvil se conserva el apilado existente.

Ajuste posterior: el bloque del cliente deja 24 px adicionales respecto al margen derecho en escritorio, para reducir ligeramente el espacio central. En móvil se conserva la disposición apilada.

## Campos delimitados en creación de facturas · 16 de septiembre de 2026

Los campos de entrada de nueva factura incorporan un borde de 1 px con el token border y esquinas rectas, manteniendo el fondo blanco. Incluye cliente, vencimiento, conceptos, cantidad, IVA y campos de opciones. El foco y los errores conservan mayor contraste. No se enmarcan totales, datos de lectura ni botones de acciones. Se limita al editor de facturas mediante data-document-kind.

## Marco de papel en nueva factura · 16 de septiembre de 2026

Se recupera el fondo gris neutro del lienzo exterior en creación de facturas para distinguir la hoja blanca. Se conservan blancos los campos y el total, con los bordes sutiles aprobados únicamente en las entradas.

## Configuración por categorías y subsecciones · 16 de septiembre de 2026

El usuario aprueba la propuesta de navegación por niveles inspirada en Ajustes: Configuración abre Empresa, Documentos, Operativa y Cuenta y seguridad; cada categoría muestra sus subsecciones y cada ajuste ofrece regreso a su categoría. SettingsNavigation conserva los iconos lineales, sin fondo gris, recuadros ni superficies de selección. Se mantiene la cabecera negra y se elimina el segundo menú lateral únicamente en Configuración. Esta decisión sustituye para este módulo el aside anterior y autoriza los controles de regreso dentro del contenido.

Las categorías se guardan en las rutas settings/business, settings/documents, settings/operations y settings/account. Las once subsecciones conservan sus rutas directas; Datos de empresa usa settings/company y settings pasa a ser la portada. Auditoría conserva audit y ofrece regreso a Cuenta y seguridad. Los enlaces antiguos a importaciones y los contextos de documentos siguen funcionando. La navegación filtra subsecciones según los permisos y restituye el foco al regresar. Los formularios de empresa conservan sus valores mientras se navega entre niveles; Identidad fiscal y Contacto agrupan sus campos con la escala y controles comunes.

Verificado en app:3000 con 58 comprobaciones a 1440, 1024, 390 y 320 px: categorías, once subsecciones, regreso, recarga, historial del navegador, teclado, formularios de creación, guardado, conservación de valores, contexto documental, modo integrado y permisos de consulta. Sin errores JavaScript ni desbordamientos. Seis pruebas de rutas y transiciones, compilación y formato correctos. Iconos y filas sin fondo gris contrastados mediante estilos calculados y capturas. Actualizado únicamente el servicio app; recursos servidos contrastados con la imagen saludable. Datos de prueba aislados. Evidencia: artifacts/settings-hierarchy/verification.json.

## Sangría de subsecciones de Configuración · 16 de septiembre de 2026

Por petición del usuario, las subsecciones se desplazan 24 px hacia la derecha respecto al encabezado de su categoría, mediante space-6. Se aplica a las cuatro categorías en escritorio y móvil; la portada conserva su alineación. Los iconos siguen sin fondo gris y las flechas conservan su posición al extremo derecho.

## Configuración compacta y hover · 16 de septiembre de 2026

La navegación de Configuración limita su ancho a 760 px, reduce las filas de 80 a 56 px como mínimo y usa texto de cuerpo e iconos de 18 px en los apartados. Encabezados y formularios de empresa reducen sus separaciones con los tokens comunes, sin reducir los controles táctiles. Al pasar el ratón o enfocar con teclado, texto y flecha se desplazan 4 px en 160 ms y la flecha gana contraste; sin fondos ni recuadros nuevos. Movimiento reducido desactiva el desplazamiento. Se conserva la sangría aprobada de subsecciones.

## Conceptos en tabla · 16 de septiembre de 2026

Por petición del usuario, productos y servicios se presentan con encabezados compartidos y una fila por concepto en la visualización de documentos y en el editor. DocumentLinesTable unifica Producto o servicio, Cantidad, Precio unitario, Descuento, IVA e Importe sin IVA. En lectura, Descuento se omite si ninguna línea lo utiliza; conserva porcentaje y reducción monetaria. Los motivos de exención permanecen bajo el concepto y los precios conservan hasta cuatro decimales.

El editor compartido de facturas, presupuestos y compras reutiliza catálogo, cantidades sugeridas, selector de IVA, validaciones y opciones de eliminación. Precio y descuento se editan directamente en sus columnas. Se conserva el cálculo existente y la actualización de los totales. La hoja ocupa todo el ancho y las opciones pasan debajo; las tablas tienen desplazamiento horizontal local cuando el espacio es insuficiente. El catálogo se posiciona fuera del recorte del área desplazable. El PDF y sus cálculos no cambian.

Verificado en app:3000 con 16 escenarios a 1440, 1024, 390 y 320 px: visualización de facturas, presupuestos y compras, edición de cantidad, precio y descuento, catálogo y alta y eliminación de líneas. Sin errores JavaScript ni desbordamiento horizontal de la página. Nueve pruebas de cálculos e impuestos correctas. Compilación y despliegue del servicio app completados; recursos servidos contrastados con dist del contenedor saludable. Datos de prueba aislados. Evidencia: artifacts/concept-tables/verification.json.

## Separación superior de Configuración · 16 de septiembre de 2026

La portada añade 24 px de espacio superior al bloque completo del estudio y las categorías. Conserva sus separaciones internas, tamaños y hover; las subsecciones mantienen su posición.


## Tabla sin importe por línea · 16 de septiembre de 2026

Por petición del usuario, se retira la columna Importe sin IVA de las tablas compartidas de visualización y creación de documentos. Se conserva Precio unitario y la base imponible en el resumen de totales, con los mismos cálculos. El ancho mínimo de la tabla editable se ajusta a 680 px al quitar la columna.


## Descuento compacto y separación de campos · 16 de septiembre de 2026

La tabla editable limita el campo de descuento a 72 px y aumenta la separación entre campos a 32 px mediante space-4 a cada lado de las celdas. Se conservan altura, foco y desplazamiento horizontal en móvil.


## Plazo junto al vencimiento · 16 de septiembre de 2026

El selector de plazo se mueve desde Opciones a la cabecera, junto al vencimiento (o la fecha de validez del presupuesto). Ambos controles comparten fila en escritorio y se apilan en móvil. Se conserva la actualización automática de la fecha al elegir un plazo y el foco en la fecha al elegir Personalizado.

## Configuración con barra horizontal y desplegables · 16 de septiembre de 2026

Se sustituye la portada por niveles por una barra horizontal persistente con Empresa, Documentos, Operativa y Cuenta y seguridad. El hover abre el menú contextual de cada categoría; solo seleccionar un apartado navega. Admite clic, toque, teclado, Escape y cierre exterior. Una demora de 180 ms permite cruzar del botón al menú. Se reutilizan MenuTrigger, Popover y Menu de los menús de acciones, con esquinas rectas, posicionamiento adaptable y permisos filtrados. La categoría actual se señala con un subrayado. Configuración abre Datos de empresa y las rutas antiguas de categorías resuelven su primer apartado permitido. Auditoría incluye la misma barra. Se conservan contextos documentales y valores del formulario entre secciones.


## Conceptos blancos con separadores · 16 de septiembre de 2026

Se sustituye el fondo alterno de las filas de conceptos por fondo blanco y una línea horizontal de 1 px con el token border entre filas. Se aplica a las tablas compartidas de lectura y edición, conservando espacios y cabecera. Sin líneas verticales ni marco exterior. Esta decisión sustituye las franjas alternas anteriores en estas tablas.

## Configuración sin rótulo de estudio · 16 de septiembre de 2026

La barra de categorías de Configuración elimina el nombre del estudio a su derecha, también en Registro de auditoría. Los datos de empresa y la gestión de Estudios permanecen en sus apartados.

Verificado en app:3000 con 47 recorridos a 1440, 1024, 390 y 320 px: once apartados, hover sin navegación, selección, apertura táctil, teclado y Escape, regreso del foco, cierre al salir, conservación del formulario, contexto documental y permisos. Sin errores JavaScript ni desbordamientos; tipos, compilación y recursos de la imagen actualizados. Evidencia: artifacts/settings-navbar/verification.json.


## Eliminación directa de conceptos · 16 de septiembre de 2026

La tabla editable sustituye el menú de tres puntos por una cruz de eliminación directa, con etiqueta accesible por fila y foco posterior en Añadir concepto. Conserva la protección de la última fila y el bloqueo durante el guardado.

## Emisión oculta en todos los visualizadores · 16 de septiembre de 2026

Por ampliación del usuario, DocumentSheet y DocumentSheetLayout ocultan Emisión por defecto para todos los tipos de documento. Se retira la excepción por tipo en la ficha. La decisión se aplica a facturas, presupuestos, compras y gastos, rectificativas, documentos abiertos desde cobros y pagos y portal del cliente. Se conservan Vencimiento o Válido hasta, las fechas de operación y movimiento y la fecha almacenada del documento; no cambia el PDF archivado.

Verificado en app:3000 con 21 recorridos a 1440, 390 y 320 px: cuatro tipos de documento, portal y accesos desde cobros y pagos. Emisión ausente, vencimiento y fechas guardadas conservados. Sin desbordamiento ni errores JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/documents-hidden-issue-date/verification.json.

## Opciones del documento en modal · 16 de septiembre de 2026

Opciones se sitúa al pie izquierdo de la hoja, junto a los totales en escritorio y debajo en móvil. Sustituye al bloque exterior de retención y datos adicionales. El modal común muestra las tasas de retención directamente (Sin retención, 7 %, 15 % y 19 %), y Datos adicionales permanece plegado cada vez que se abre manualmente. Los valores actualizan el borrador y se conservan al cerrar; los errores en campos adicionales abren el modal y despliegan sus campos. Se mantiene el cierre con X y Escape y el regreso del foco.


## Separación de contraseñas · 16 de septiembre de 2026

El formulario Cambiar contraseña añade space-6 (24 px) entre los campos de contraseña actual y nueva, tanto en escritorio como en móvil.

## Líneas inferiores y concepto activo · 16 de septiembre de 2026

En creación de facturas, los recuadros de los campos se sustituyen por una línea inferior sutil y esquinas rectas. La cabecera de conceptos queda blanca y las filas no añaden separadores. Solo el concepto activo muestra las líneas de sus campos: añadir uno lo activa, y pulsar o enfocar otro con teclado traslada la señal a esa fila. Salir de la fila conserva su estado hasta seleccionar otra; eliminar un concepto reajusta la selección. Se mantienen las etiquetas, foco accesible, errores, controles existentes, hoja blanca, marco exterior gris y totales sin marco. Esta decisión sustituye los bordes completos anteriores únicamente en el editor de facturas.


## Cabecera gris de conceptos · 16 de septiembre de 2026

La cabecera de la tabla de conceptos usa bg-muted para que el gris se distinga claramente de las filas blancas. Se conserva en lectura y edición; sustituye la excepción de cabecera blanca del editor de facturas sin alterar el estilo de sus campos.

## Descuentos en Opciones y líneas por foco · 16 de septiembre de 2026

Opciones incorpora Descuentos por concepto, plegado en cada apertura manual. Cada concepto conserva su porcentaje independiente y los cálculos existentes; la tabla editable elimina la columna Descuento y muestra solo el porcentaje aplicado bajo su descripción. Los errores de descuento abren el modal y el apartado correspondiente. Los documentos guardados conservan su presentación.

En creación de facturas, la línea inferior solo aparece mientras el control tiene el foco; desaparece al salir o pulsar otra zona. Los errores y el foco accesible se conservan. Esta decisión sustituye la selección persistente de fila aprobada anteriormente.

## Descuentos individuales en Opciones · 16 de septiembre de 2026

Opciones contiene Descuentos por concepto, plegado inicialmente: una fila con nombre y porcentaje por línea, inicialmente 0 en conceptos nuevos. Actualiza los totales mediante el cálculo existente. Las tablas de edición y de documentos guardados omiten la columna Descuento; solo las líneas con descuento muestran −n % junto al concepto. Se conserva la validación 0–100 y la apertura del apartado al corregir un error.


En Descuentos por concepto, el símbolo % se coloca tras el valor dentro del control y se elimina de la etiqueta. El nombre y el campo comparten centro vertical, sin margen inferior en la etiqueta; una única línea inferior agrupa número y símbolo.


## Columnas de conceptos con espacio para eliminar · 16 de septiembre de 2026

La tabla editable redistribuye el ancho liberado por Descuento. Producto o servicio absorbe el espacio restante; Cantidad, Precio unitario e IVA tienen anchos estables de 148, 180 y 148 px. La X conserva una columna propia de 84 px y un control de 44 px, separado 40 px del selector de IVA. Las cabeceras se alinean con los valores de los controles, teniendo en cuenta sus flechas y su margen interior. Se mantienen la cabecera gris y los estilos aprobados de los campos.

La composición se comparte en facturas, presupuestos y compras. En anchos pequeños, el mínimo de tabla de 800 px conserva la legibilidad de los controles mediante desplazamiento local, sin ensanchar la página.

Verificado en app:3000 con 12 recorridos de facturas, presupuestos y compras a 1440, 1024, 390 y 320 px: 40 px entre IVA y X, control de 44 px, cambio de IVA, eliminación y bloqueo del último concepto. Sin desbordamiento de página ni errores JavaScript. Compilación correcta, capturas revisadas y recursos contrastados con el contenedor saludable. Evidencia: artifacts/concept-column-spacing/verification.json.

## Cantidad con escritura directa · 16 de septiembre de 2026

Por petición del usuario, QuantityInput sustituye el desplegable de cantidades habituales por una entrada de texto con teclado decimal y línea inferior. Se eliminan la flecha y la lista, conservando números decimales, normalización de coma, validación, deshabilitado y etiquetas accesibles. La línea permanece visible y se refuerza al enfocar. La cabecera y el valor se realinean al desaparecer el espacio reservado para la flecha. Se aplica a los editores que comparten el control, incluidas facturas, presupuestos y compras.

Verificado en app:3000 con nueve recorridos de facturas, presupuestos y compras a 1440, 390 y 320 px: ausencia de desplegable, escritura con coma decimal, recálculo, conservación tras recargar, línea inferior visible y separación respecto a IVA y eliminar. Sin desbordamiento de página ni errores JavaScript. Compilación correcta y recursos contrastados con el contenedor saludable. Evidencia: artifacts/quantity-direct-input/verification.json.

## Menú de nueva factura · 17 de septiembre de 2026

El editor de facturas retira Guardar y crear otra factura. Facturación recurrente queda dentro de Más funciones, sin acceso duplicado en el menú principal. Opciones de la factura abre el modal existente y conserva descuentos y datos adicionales plegados. Los editores de presupuestos y compras conservan sus acciones.


## Configuración con menú lateral de dos niveles · 17 de septiembre de 2026

La barra horizontal desplegable se sustituye por un menú lateral blanco de 224 px. Empresa, Documentos, Operativa y Cuenta y seguridad actúan como títulos discretos; todas las opciones autorizadas permanecen visibles, indentadas y sin iconos ni cajas. La selección usa texto oscuro, peso medio y una pequeña marca izquierda. Configuración y Auditoría comparten el menú. Por debajo de 900 px de contenido se usa el selector común, con categoría y apartado en cada opción. Se mantienen rutas directas, contexto de retorno a documentos, permisos y acciones de cabecera.

## Campos de factura sin líneas y hover tenue · 17 de septiembre de 2026

Los campos del editor de facturas eliminan el subrayado incluso al enfocar. Sobre el fondo blanco, el hover usa bg-subtle (#fafafa), más claro que bg-muted de la cabecera de conceptos. Se conservan el foco de teclado y los mensajes de validación. Sustituye las líneas por foco y la excepción de cantidad en este editor; las demás pantallas mantienen sus controles.


## Menú lateral compacto · 17 de septiembre de 2026

Por petición del usuario, el menú interno de Configuración pasa de 224 a 192 px. Las opciones usan el token text-caption, filas de 36 px y menor sangría; los grupos se separan 16 px. Conserva foco y selección. En dispositivos táctiles las filas mantienen el área de control habitual; el selector móvil conserva su tamaño. Las categorías y opciones solo muestran texto, sin iconos.


## Dos separadores en nueva factura · 17 de septiembre de 2026

Por petición del usuario, se añade una línea sutil de 1 px entre los datos de empresa/cliente y la tabla de productos, y otra entre los productos y el bloque de importes. Se conserva espacio de 24 px tras cada línea. No se añade una tercera línea. Opciones al pie de la factura conserva su texto y acción y elimina el icono.


## Menú de Configuración sin líneas · 17 de septiembre de 2026

Se retira la marca lateral de selección. Las opciones mantienen texto oscuro cuando están activas y un fondo gris muy sutil al pasar el ratón, sin separadores ni bordes. El foco de teclado conserva su contorno accesible.

En nueva factura se retira el botón Opciones del pie de la hoja. El acceso permanece en el menú de cabecera como Opciones de la factura. Los totales conservan su alineación derecha y el separador superior.


## Configuración en una sola lista · 17 de septiembre de 2026

El menú elimina los títulos y agrupaciones de categorías y muestra todas las opciones autorizadas en una lista continua. Ancho de 176 px, filas de 32 px y menor sangría; se mantienen el texto de 12 px, el hover gris sutil y el foco de teclado. En móvil el selector muestra solo el nombre del apartado y conserva su área táctil.

El foco de un campo en nueva factura se indica con una única línea inferior negra reforzada (borde y sombra de 1 px), en sustitución del recuadro de foco. Se aplica también con teclado; al desenfocar desaparece, conservando el hover gris tenue y los dos separadores de sección.


## Contenido compacto de Configuración · 17 de septiembre de 2026

El contenido se limita a 800 px, separado 64 px del menú en escritorio. Los títulos de apartado usan text-subtitle (16 px), los controles la altura compacta de 36 px y las filas de tabla 56 px. Se reducen los espacios internos de formularios y cabeceras sin reducir el texto de lectura. El selector móvil conserva la separación de 16 px y los controles mantienen 44 px en móvil y dispositivos táctiles. Estos ajustes solo afectan al contenido de Configuración.


En nueva factura, las flechas de catálogo e IVA solo se muestran en la fila que contiene el foco o mantiene un desplegable abierto. Al salir se ocultan sin desplazar valores ni reducir el área de los controles. El hover por sí solo no muestra las flechas.


## Franjas alternas en nueva factura · 17 de septiembre de 2026

La cabecera de conceptos pasa a bg-table-head (#ececed). Las filas alternan blanco y bg-subtle (#fafafa), empezando en blanco. Los campos toman el fondo de su fila para no generar recuadros blancos sobre la franja; el hover usa bg-muted, más claro que la cabecera. Se conservan el foco negro, las flechas contextuales y los dos separadores de sección. Se limita al editor de facturas.


### Menú lateral por hover · 17/09/2026
En escritorio, el menú principal comienza contraído y se expande al entrar el puntero; al salir vuelve a la barra de iconos. Se elimina la flecha de expansión y no se persiste el estado de hover. El foco de teclado mantiene el menú abierto mientras permanece dentro. En móvil se conserva el botón Menú, el cierre y Escape. Verificado en el puerto 3000 a 1440, 390 y 320 px; evidencias en artifacts/sidebar-hover/.

### Precio unitario · dos decimales
Los visualizadores de documentos, el selector de productos y el campo del editor sin foco muestran el precio unitario con dos decimales. Al editar se conserva la precisión del dato original y no se alteran los cálculos por el formato visual.

## Etiqueta Cliente y alineación del lápiz · 17 de septiembre de 2026

El buscador de nueva factura incorpora Cliente encima. Las etiquetas de emisor y cliente comparten altura de 44 px, centrado vertical y margen inferior de 8 px. El lápiz conserva un área de 44 px sin relleno adicional y los párrafos de etiqueta no añaden margen, evitando desplazar el nombre del cliente respecto al emisor.


El despliegue por hover conserva la geometría interior de 272 px: iconos, cabecera y títulos de sección mantienen su posición; las etiquetas se ocultan sin retirar su espacio. Se unifica el espaciado entre ambos estados para evitar saltos durante la transición de ancho. Comprobado con animación activa, teclado y móvil en artifacts/sidebar-hover/.

Al seleccionar un producto o servicio del catálogo, el editor usa su nombre como texto del concepto, en lugar de su descripción comercial. Se aplica también a productos recién creados. Las líneas ya guardadas conservan su texto y el concepto sigue siendo editable.


El editor de facturas añade 16 px entre Precio unitario e IVA mediante el relleno derecho de Precio unitario, compensando su ancho de columna. Cabecera y valor conservan su alineación, al igual que IVA y la X.


Vencimiento conserva el mismo relleno en reposo y hover: una regla antigua reiniciaba el padding al pasar el cursor y desplazaba el texto. Se unifica la geometría de ambos estados manteniendo fondo y foco.


Tras revisar el vídeo, el grupo de Vencimiento y Plazo de pago fija su ancho en 392 px en escritorio y 100 % en móvil. Su tamaño deja de depender del ancho intrínseco del input de fecha o del selector. Se mantienen columnas iguales y relleno estable durante hover y foco.


### Campos de Configuración · subrayado contextual
Los campos de texto, áreas de texto y selectores de Configuración, incluidos sus modales, ocultan la línea en reposo y muestran un subrayado gris en hover. El foco conserva la línea oscura y su señal de teclado; los controles deshabilitados no responden al hover. Casillas, archivos y selectores de color mantienen sus señales propias. El espacio del borde se conserva para evitar saltos.

## Espacio en Identidad fiscal · 17 de septiembre de 2026

Datos de empresa separa su cabecera de Identidad fiscal mediante space-8 (32 px), y el título Identidad fiscal de sus campos mediante space-6 (24 px). Se aplica también en móvil y se limita a este apartado.


Configuración: el hover de los campos pasa a una superficie rectangular gris suave (bg-muted), con esquinas rectas, sustituyendo el subrayado gris. El estado de foco conserva su señal y el tamaño del campo no cambia.

## Datos de empresa sin subtítulo fiscal · 17 de septiembre de 2026

Se elimina el título Identidad fiscal. Los campos de razón social, NIF y dirección permanecen bajo Datos de empresa, conservando los 32 px de separación respecto a la cabecera.


## Foco de formularios sin recuadro · 17 de septiembre de 2026

Los campos de texto, áreas de texto y selectores de todos los formularios eliminan el fondo y el recuadro al recibir foco, incluso cuando coincide con hover. Una línea negra reforzada mantiene la señal de foco también con teclado. Se conservan etiquetas, errores y las señales propias de casillas, radios y otros controles especializados.

## Contraseñas con fondo gris · 17 de septiembre de 2026

En Mi seguridad, Contraseña actual y Nueva contraseña muestran un fondo bg-muted permanente, también al enfocar, con 12 px de margen interior horizontal y 44 px de altura mínima. Es una excepción expresa al foco transparente de los formularios; se conserva la línea negra de foco y el espaciado entre ambos campos.

## Estados con iconos en facturas · 17 de septiembre de 2026

La columna Estado de las tablas de ventas muestra iconos monocromos de 18 px: documento con lápiz (Borrador), reloj (Pendiente), círculo dividido (Parcial), alerta circular (Vencida), check circular (Cobrada) y retorno (Devuelta). Conserva el nombre accesible y el título al pasar el cursor. Los filtros siguen mostrando los nombres; las fichas y otros módulos conservan sus estados de texto.


### Clientes · directorio en tabla
El directorio de clientes y proveedores se muestra en la página, con las mismas clases de tabla y navegación por fila que los demás listados. Columnas: nombre, NIF, correo, teléfono, tipo y estado. Conserva búsqueda, filtros y paginación; elimina la selección automática del primer contacto. La fila abre la ficha existente y su enlace de retorno conserva los filtros. La cabecera, los indicadores y los datos de la ficha mantienen su diseño. En móvil se conserva la adaptación compacta existente de las filas de contactos, sin desbordar la página.

## Salida de foco en factura · 17 de septiembre de 2026

Los controles de factura sin foco ni desplegable abierto no muestran líneas residuales. Cantidad elimina su borde auxiliar. Pulsar una zona no interactiva del documento retira el foco del campo activo; los controles y opciones desplegables conservan su gestión normal de foco, al igual que la navegación con teclado.

Verificado en app:3000 a 1440 y 390 px: listado, clic de fila, apertura con teclado, ficha, retorno y apertura/cierre de filtros. Recursos servidos contrastados con el contenedor. Evidencias en artifacts/contacts-table/.

Clientes: por petición del usuario, el listado se simplifica a nombre y NIF. Se retiran correo, teléfono, tipo y estado del listado; siguen disponibles en la ficha. Se conserva el acceso por toda la fila, filtros, búsqueda y paginación, sin ancho mínimo de tabla en escritorio.

## Estados documentales con cuadrado y texto · 17 de septiembre de 2026

Las tablas de facturas, rectificativas, presupuestos y compras comparten DocumentStatusLabel con las fichas y la actividad documental de contactos. Se muestra un cuadrado de 8 px junto al nombre del estado, sin iconos, bordes ni fondo. El cuadrado es gris para estados ordinarios y oscuro para cerrados o vencidos; sobre cabecera negra hereda el color de texto. Se conservan las etiquetas y reglas de estado existentes.


## Acciones de listados en sus fichas · 17 de septiembre de 2026

Se extiende el patrón de ventas a los listados documentales, Catálogo, vencimientos y diario contable: se retiran los menús y columnas de acciones de las filas. La fila abre su ficha; las acciones se encuentran en la cabecera del documento, artículo o detalle del asiento. Eliminar artículo se incorpora al menú de su ficha y devuelve al listado al completar la eliminación; Revertir asiento pasa al menú de la cabecera de su detalle. Se conservan permisos, confirmaciones y regreso contextual.

Series de numeración: se sustituyen los interruptores gráficos por botones de texto Activar / Desactivar. El texto indica la acción disponible, se bloquea durante el guardado y se conserva la gestión de errores.

## Vista de factura compartida con creación · 17 de septiembre de 2026

La factura guardada reutiliza la variante invoice de DocumentLinesTable y DocumentSheetLayout. Comparte cabecera gris, filas alternas sin separadores, columnas y alineación del editor, así como los dos separadores de hoja y totales a la derecha. Los valores se muestran como texto y mantienen descuentos y exenciones. El hueco de acciones conserva las proporciones sin ofrecer controles de edición. La cabecera muestra vencimiento y el plazo calculado con las mismas reglas del editor. En móvil la tabla conserva desplazamiento local.

### Movimiento · 17/09/2026
Las animaciones se reservan al cambio entre secciones principales del menú. Los modales, búsquedas, pasos, pestañas internas, acordeones y controles aparecen y cambian al instante. Se conserva el desenfoque del fondo de los modales. Las cargas muestran su estado sin prolongarlo artificialmente; el fondo decorativo permanece estático. La preferencia de movimiento reducido también desactiva las transiciones principales.

Series de numeración: el control definitivo es una casilla simple. Marcada indica serie activa; desmarcada, inactiva. Conserva etiqueta accesible, guardado inmediato, bloqueo durante el guardado y gestión de errores.

### Barra lateral estable durante la navegación · 17/09/2026
El cambio de sección utiliza un fundido de opacidad sobre el contenido real de main. No se capturan ni se desplazan capas de la página: la barra lateral permanece fuera de la animación para evitar cortes y superposiciones, tanto expandida como contraída. Se mantiene la apertura inmediata de modales y el respeto al movimiento reducido.

## Diseño documental común · 17 de septiembre de 2026

Se extiende el diseño vigente de Facturas a presupuestos y compras, tanto en edición como en resumen: hoja blanca sobre marco gris, tabla con cabecera gris y filas alternas, separación entre precio e IVA, etiquetas de las partes alineadas y dos separadores de sección. Se mantienen las fechas, referencias, denominaciones y reglas propias de cada documento.

Los editores comparten campos sin borde en reposo, hover tenue, línea negra de foco y flechas de selección visibles únicamente mientras se edita su fila. Pulsar una zona no interactiva retira el foco. Las opciones de cada documento se abren desde su menú de cabecera; no se repite el botón al pie.

Clientes, catálogo y creación de cobros comparten los campos contextuales y la señal de foco. Sus listados conservan los componentes comunes de filas, navegación, filtros y paginación. Los estados de fichas de clientes y artículos y los movimientos de cobros, incluida la actividad de contactos, usan el cuadrado y texto de DocumentStatusLabel, sin cápsulas. No se añaden columnas al listado simplificado de clientes.
Verificado en app:3000 a 1440 y 390 px: 30 comprobaciones de editores, resúmenes, listados con datos y modales, sin errores de JavaScript ni desbordamiento de página. Evidencias en artifacts/design-unification/. Compilación correcta y recursos servidos contrastados con el contenedor.

### Expansión suave del menú · 17/09/2026
La barra lateral conserva una transición de 220 ms al expandirse y contraerse. Su ancho y el margen del contenido usan la misma duración y curva para evitar saltos. Es una excepción explícita a los controles instantáneos; el cambio de sección mantiene el fundido del contenido, y los modales siguen apareciendo directamente. Movimiento reducido desactiva ambos efectos.

## PDF sin pie técnico · 17 de septiembre de 2026

El PDF actual elimina el texto de desarrollo y la numeración del pie inferior. Conserva las notas, condiciones de pago y texto personalizado de la plantilla. Los archivos históricos ya archivados mantienen sus bytes; Ver PDF y Descargar PDF usan la representación actual.


## Datos de pago alineados con Cliente · 17 de septiembre de 2026

La factura guardada sitúa Vencimiento y Plazo de pago junto a Cliente, en la misma fila de datos y con las etiquetas a la misma altura en escritorio. Se retiran de la fila del título. DocumentSheet reutiliza el espacio de metadatos del componente común y conserva la fecha de emisión opcional, el cálculo del plazo y las referencias. Por debajo de 900 px de contenido, los datos de pago pasan debajo de Cliente, alineados con su margen izquierdo; en móvil ocupan el ancho disponible. Se mantiene la escala tipográfica común, las superficies y los separadores existentes.

Verificado en app:3000 con ocho vistas a 1440, 1024, 390 y 320 px: factura emitida, borrador con nombre largo, fechas y plazos, alineación exacta de etiquetas y ausencia de desbordamiento. TypeScript y compilación correctos, sin errores JavaScript; capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: test-results/invoice-payment-alignment/verification.json.

## Acceso fiscal dentro de Más funciones · 17 de septiembre de 2026

El menú principal de Clientes y proveedores retira el acceso duplicado Comprobar identidad fiscal e IBAN, tanto en el listado como en la ficha. La función permanece en el directorio Más funciones. Se conserva el resto de acciones y permisos.

## Datos de pago arriba y descuento explícito · 17 de septiembre de 2026

Esta revisión sustituye la ubicación de los datos de pago junto a Cliente: vencimiento y plazo vuelven a la cabecera, arriba a la derecha, en columnas iguales y con el mismo margen derecho que Cliente. El grupo comparte ancho de 392 px con Cliente, entre lectura y edición, adaptado al ancho disponible en móvil. Presupuestos y compras conservan sus fechas y denominaciones propias.

Los descuentos positivos se indican como «Descuento: −20 %» en gris y tamaño caption después del IVA, dentro de la misma fila. Se elimina el porcentaje aislado bajo el nombre del producto. Las filas sin descuento no muestran texto; la columna de anotación solo existe si algún concepto tiene descuento. Se aplica en lectura y edición con los componentes comunes, sin cambiar cálculos.

## Reproducción de la espiral de acceso · 17 de septiembre de 2026

La animación de inicio de sesión consulta prefers-reduced-motion en lugar de forzar el modo estático. Se reproduce cuando el usuario permite movimiento, se pausa al ocultar la página y conserva una imagen estática con movimiento reducido. Los cambios de preferencia se aplican sin recargar.

Verificado en app:3000 a 1440 y 390 px: datos de pago arriba con márgenes alineados, descuentos explícitos en su fila, foco y modales. Compilación correcta y recursos servidos verificados. Evidencias en artifacts/payment-heading-discount/.

## Descuento junto al producto · corrección del 17 de septiembre de 2026

El descuento se muestra debajo del nombre del producto como «Descuento: −15 %», pequeño y gris, alineado con el texto del concepto. Sustituye la anotación después del IVA. Se elimina esa columna adicional y la columna vacía de acciones en lectura; IVA ocupa 112 px y las acciones de edición 64 px, cediendo espacio al producto. La tabla vuelve a su ancho mínimo de 800 px, conservando scroll local en móvil, descuentos individuales y cálculos.

## Descargar extracto en Más funciones · 17 de septiembre de 2026

La ficha de cliente o proveedor mueve Descargar extracto del menú principal al directorio Más funciones. El directorio admite acciones reales contextuales suministradas por la ficha, con su icono y búsqueda comunes; estas acciones no forman parte de las maquetas de funciones. Descargar extracto abre el formulario operativo existente para el contacto seleccionado, con fechas, PDF y Excel. Cerrar vuelve al directorio y conserva búsqueda y foco. Sin contacto seleccionado no se ofrece una descarga sin contexto.

Verificado en app:3000 a 1440, 390 y 320 px con API y base temporales: acceso único, búsqueda, seis descargas válidas de PDF/Excel, regreso y foco, sin desbordamiento ni errores JavaScript. TypeScript y compilación correctos; capturas revisadas y recursos servidos contrastados con el contenedor. Evidencia: test-results/contact-statement-functions/verification.json.

### Transición completa de sección · 17/09/2026
La sección anterior se desvanece durante 120 ms antes de actualizar el contenido. El nuevo contenido permanece oculto mientras prepara su primera carga (hasta 1200 ms) y aparece con un fundido de 320 ms. Si la respuesta tarda más, se muestra su estado de carga. Los resúmenes de Facturas, Presupuestos y Compras renderizan cabecera e indicadores juntos, también al entrar directamente. La barra conserva su propia expansión suave y los modales siguen siendo inmediatos.
Verificado en app:3000: descuento bajo el título en edición y lectura, sin columna tras IVA, gris y tamaño caption, con filas sin descuento limpias. Comprobado a 1440 y 390 px; recursos servidos verificados. Evidencias en artifacts/product-discount-position/.

### Nombre de Empresa en Configuración · 17/09/2026
El apartado antes llamado Estudios se llama Empresa. El formulario y sus acciones usan Añadir empresa, Nombre de la empresa y Crear empresa y entrar; la selección indica Empresa actual. Se conservan los nombres registrados de las empresas.

## Adjuntos con visor integrado · 17 de septiembre de 2026

Archivos adjuntos usa tamaño body y peso 500. El clip conserva su área interactiva y queda al extremo derecho de la cabecera cuando hay archivos o una subida activa. Pulsar el nombre abre FilePreview y cerrar devuelve el foco al archivo. Descargar queda como acción opcional del visor.

PDF usa el renderizador de páginas común, las imágenes se muestran dentro de la ventana y CSV/XLSX se presentan como tablas paginadas de 50 filas. Excel permite elegir hoja y muestra resultados guardados de fórmulas, sin calcularlas. CSV admite detección del separador, selección manual y codificación. Se conservan permisos por espacio de trabajo y límites del lector. El endpoint de importaciones existente mantiene su muestra de diez filas.
Verificado en app:3000 a 1440 y 390 px: subida, clip a la derecha, título reducido, ocho aperturas PDF/PNG/CSV/XLSX sin descargas, paginación, cambio de hoja y retorno de foco. Tres pruebas del lector y comprobaciones de autorización y compatibilidad de importaciones correctas. Recursos servidos contrastados con el contenedor. Evidencias en artifacts/attachment-viewer/.
El visor de adjuntos reduce su ancho máximo a 1120 px y su altura al menor de 840 px y 84dvh. En móvil deja 12 px de margen lateral y ocupa 90dvh, centrado. Conserva la tipografía y el desplazamiento interno para leer el archivo.

## Cabecera de factura sin nombre · 17 de septiembre de 2026

La cabecera de visualización de factura oculta el título visible y conserva Atrás, número, vencimiento, estado y acciones. El título permanece disponible para lectores de pantalla, sin enlace invisible enfocable. Los datos de la hoja se mantienen.


### Campos de Configuración al salir del foco · 17/09/2026
Los campos de Configuración y sus modales eliminan explícitamente el borde inferior y la sombra al perder el foco. La línea negra solo se mantiene durante la edición o mientras el selector está abierto.

## Actividad y cambios de estado · 17 de septiembre de 2026

La navegación de documentos sustituye Movimientos e historial por Actividad. La tabla de movimientos usa Método de pago y estados explícitos: Cobro recibido, Pago realizado, sus anulaciones y las devoluciones según el sentido de la operación. Conserva la referencia del movimiento cuando existe.

Cambios de estado presenta únicamente el estado anterior, el nuevo y la fecha. Incluye creación, emisión, liquidaciones parciales o completas, anulaciones, anticipos, rectificativas, vencimiento y decisiones de presupuestos; omite operaciones sin cambio de estado y datos técnicos de auditoría. Reutiliza la tabla y la lista adaptables existentes.

Verificado en app:3000 a 1440, 390 y 320 px con base temporal: quince vistas, transiciones financieras y de presupuestos, ausencia de eventos técnicos y desbordamientos. Cinco pruebas de cálculo, TypeScript y compilación correctos. Capturas revisadas y recursos del contenedor comprobados. Evidencia: test-results/document-activity-states/verification.json.
El título del visor de adjuntos usa tamaño section (18 px) y peso 600, manteniendo el tamaño reducido de la ventana.

## Corrección de cabecera de factura · 17 de septiembre de 2026

La petición anterior se refería al número de factura, no al cliente. Se restaura el nombre del cliente y su enlace en la cabecera; únicamente se oculta el número de factura de esa cabecera. Se conservan vencimiento, estado y el número dentro de la hoja.

Corrección: el título de sección «Archivos adjuntos» usa tamaño subtitle (16 px) y peso 600. El clip continúa alineado al extremo derecho.

### Perfil personal · 17/09/2026
Configuración incluye Perfil en lugar de Mi seguridad; la ruta anterior abre Perfil. Permite editar el nombre y la foto de la cuenta y consultar el rol y sus permisos en la empresa actual. La foto se normaliza a 256 × 256 px y se muestra también en la barra lateral. Los permisos no son editables desde Perfil.
Cambiar contraseña abre el modal común con fondo desenfocado y cierre en la esquina superior derecha. Los campos grises se limitan a 360 px, incluyen un ojo accesible y aviso de Bloq Mayús. Se solicitan contraseña actual, nueva y confirmación; cliente y servidor exigen 8 caracteres, mayúscula, número y carácter especial. Los campos se limpian al cerrar y la actualización revoca las demás sesiones.

## Movimientos separado de Actividad · 17 de septiembre de 2026

La navegación común de documentos añade Movimientos, con la tabla de cobros, pagos y devoluciones antes incluida en Actividad. Actividad conserva únicamente Cambios de estado. Se reutilizan la tabla adaptable y la navegación lateral con selector móvil, sin cambios de estilo ni de datos.

Verificado en app:3000 mediante quince recorridos a 1440, 390 y 320 px: navegación entre ambas secciones, ausencia de la tabla en Actividad y ausencia del historial en Movimientos, sin desbordamientos ni errores JavaScript. TypeScript y compilación correctos; recursos servidos comprobados y capturas revisadas. Evidencia: test-results/document-movements-section/verification.json.
Los títulos de contenido de los apartados del documento (Resumen, Vencimientos, Archivos adjuntos, Movimientos y Actividad) comparten tamaño subtitle de 16 px y peso 600. Se aplica a PanelHeading y al título de la hoja en Resumen.


## Cierre único de modales · 17 de septiembre de 2026

Todos los modales comunes sitúan su X en el extremo superior derecho de la cabecera. Se retiran los botones Cancelar que duplican el cierre y las cruces de pie en permisos y periodos contables. Se conservan Cancelar envío pendiente y Cancelar cambio cuando son acciones de proceso fuera de este patrón, así como Escape, retorno del foco, confirmaciones y bloqueo de cierre durante operaciones.
Actividad: el título «Cambios de estado» mantiene 16 px y peso 600. Solo el contenido de los cambios de estado usa peso 400, sin negrita.

### Edición contextual de Perfil · 17/09/2026
Perfil muestra foto, nombre · rol y correo en lectura, sin lista de permisos ni guardar en la página. El lápiz junto al título abre Editar perfil con nombre y foto. El icono Guardar de la cabecera del modal solo aparece si hay cambios; desaparece al revertirlos. Cerrar sin guardar descarta el borrador, y al guardar se actualiza también la barra lateral.

### Nueva plantilla por pasos · 17/09/2026
La creación de plantillas usa tres pasos: Datos (nombre, tipo e idioma), Diseño (espaciado, color, logotipo y pie) y Revisar (resumen y PDF de prueba). Continuar valida el paso, la flecha permite volver sin perder valores y solo la revisión permite guardar. El asistente conserva los pasos sin fondos ni animaciones y el desenfoque del modal. Las plantillas existentes mantienen la edición y sus versiones.

### Indicador de sección en Configuración · 17/09/2026
El apartado activo del menú de Configuración usa la misma barra vertical negra que los visores de documentos: 2 px de grosor y separación de 24 px respecto al menú. El selector móvil mantiene su presentación compacta.


## Buscador global en la barra lateral · 17 de septiembre de 2026

La barra principal incorpora un cuadro Buscar acciones bajo el logotipo. Al contraerse conserva la lupa; en móvil cierra la navegación y abre el buscador común. Una única instancia global sirve al cuadro lateral, las cabeceras y Ctrl/Cmd+K, incluso en apartados con búsqueda propia. Conserva acciones de creación y navegación filtradas por permisos, teclado y Escape.

El menú lateral de Configuración usa tamaño body (13 px), un nivel por encima de caption, para mejorar su lectura sin alterar espacios ni el indicador activo.
Perfil incorpora Apellidos, opcionales y separados del nombre. Editar perfil muestra Guardar cambios con icono en la esquina inferior derecha del formulario solo cuando hay cambios.

El buscador lateral respeta los mismos márgenes horizontales de 16 px que las secciones del menú, tanto expandido como contraído y en móvil. Su ancho se adapta al espacio disponible.
Permisos del negocio confirma con un tick negro sin fondo, usando icon-button-plain y conservando el nombre accesible y el foco de teclado.

### Espaciado de Series de numeración · 17/09/2026
La lista de series separa el título con 32 px y añade 12 px de relleno vertical a cada fila, con 24 px entre filas y un mínimo de 32 px entre nombre y casilla. Se reutilizan los tokens comunes y se conservan la alineación derecha de las casillas y el ajuste de nombres largos en móvil. El cambio se limita a esta sección.
Configuración usa el icono de engranaje Settings de Lucide en la barra lateral, con el tamaño y grosor de navegación existentes.

### Jerarquía de Datos de empresa · 17/09/2026
Datos de empresa usa el título section (18 px). Datos fiscales agrupa Razón social, NIF / identificador fiscal y Dirección fiscal; Contacto agrupa Correo de facturación, Teléfono y Sitio web. Ambos títulos usan subtitle (16 px) y peso 600, por encima de las etiquetas body de 13 px y peso 500. Los campos se sangran 24 px bajo cada título, reducidos a 16 px en contenido de hasta 600 px. Se dejan 16 px bajo cada subtítulo y 32 px entre grupos, con los tokens comunes y sin añadir bordes. Se mantienen los campos de 16 px en móvil y el guardado existente.

## Cabeceras de detalle sin búsqueda · 17 de septiembre de 2026

La visualización de facturas, presupuestos, compras y rectificativas, también al abrir documentos desde cobros y pagos, no muestra el icono de búsqueda en la cabecera. La ficha de artículo del catálogo sigue la misma regla. Se conservan las búsquedas de listados y sus acciones contextuales.

Verificado en app:3000 en escritorio y móvil: cabeceras de detalle sin búsqueda y buscadores disponibles en los listados de facturas, presupuestos, compras, cobros y pagos y catálogo. TypeScript y compilación correctos; recursos servidos contrastados con el contenedor. Evidencias en test-results/detail-no-search/.
Nueva plantilla presenta Nombre y Texto al pie como campos rectangulares con fondo gris bg-muted y relleno space-3, también durante la edición.
Nueva plantilla: los campos grises de escritura no muestran línea inferior ni sombra al enfocarlos o salir del campo.

### IBAN con espaciado automático · 17/09/2026
El IBAN de Configuración → Facturación añade espacios en grupos de cuatro caracteres al escribir o pegar y convierte las letras a mayúsculas. La edición mantiene el cursor en su posición y permite atravesar los separadores al borrar. No recorta caracteres sobrantes ni elimina caracteres inválidos: conserva la validación del formato español antes de guardar. El servidor mantiene su contrato existente y el campo puede quedar vacío.
El menú lateral de Configuración aumenta a tamaño subtitle (16 px), por petición del usuario, conservando pesos, espacios e indicador activo.

## Recorrido de estados en facturas · 17 de septiembre de 2026

Solo el listado de facturas de venta muestra una línea de tres puntos para Borrador, Emitida y Cobrada, con el estado actual como texto. Hover, foco de teclado o toque abren el recorrido. El historial se carga al abrir desde el documento y muestra las transiciones reales en orden cronológico, con fechas y distinción entre completado, actual y pendiente. Cobros parciales y vencimientos aparecen únicamente si ocurrieron; no son etapas obligatorias futuras. Las anulaciones conservan los estados anteriores y muestran el cobro pendiente de nuevo. Presupuestos, compras, rectificativas y las fichas conservan sus indicadores anteriores.
Ajuste solicitado: el menú lateral de Configuración usa 14 px (0.875 rem), en lugar de 16 px.
Configuración: menú lateral a 12 px (caption), con 4 px adicionales entre opciones.
Configuración: Plantillas y Requisitos del comprador ocultan la acción de crear de la cabecera cuando están vacíos; se utiliza el botón del estado vacío. Al existir elementos, la creación se ofrece en los tres puntos.
Configuración: tamaño final solicitado de 13 px (body) en las opciones del menú, manteniendo los 4 px de separación adicional.
Datos de empresa elimina bordes y sombras de todos sus campos en reposo, foco y tras salir. El foco se reconoce por un fondo gris temporal, sin líneas.
Condiciones de pago aplica el mismo tratamiento sin bordes ni sombras que Datos de empresa, antes, durante y después del foco.

El recorrido también aparece en las cabeceras de visualización de facturas, presupuestos, compras y rectificativas, incluidos documentos abiertos desde cobros y pagos. Reutiliza el historial cargado y adapta los pasos pendientes a cada tipo. En presupuestos, la decisión del cliente no presupone aceptación; rechazados y caducados no muestran pasos obligatorios futuros. La línea contrasta en blanco sobre la cabecera negra; el detalle mantiene superficie blanca. Los listados ajenos a facturas conservan sus estados actuales.

La tabla de facturas muestra únicamente los puntos del recorrido, sin el texto del estado debajo. Conserva el nombre accesible y las etiquetas del detalle desplegable; las cabeceras mantienen el texto.


## Menús de acciones por grupos · 17 de septiembre de 2026

Los menús «…» con cinco o más opciones visibles agrupan las acciones por función. Solo se dibuja una línea de 1 px con el token border entre grupos, acompañada de 4 px a cada lado; las opciones del mismo grupo permanecen juntas, sin divisores individuales ni títulos visibles adicionales. Los menús cortos conservan una lista continua.

Clientes y proveedores separa Contacto, Crear documentos, Cobros y pagos y Más funciones. El mismo criterio se aplica a Visión general, documentos y editores, Catálogo, Cobros y pagos y Contabilidad. ActionsMenu reúne las acciones del mismo grupo, conserva su orden interno y elimina grupos vacíos al filtrar por estado y permisos. MenuSection mantiene los nombres de grupo accesibles y la navegación por teclado; los separadores no son elementos enfocables.

El detalle del timeline se compacta a 260 px de ancho, con 12 px de relleno y 8 px entre etapas. Limita su altura con scroll para historiales largos. Se cierra al salir del área en 80 ms, al pulsar fuera, con Escape o al volver a pulsar el indicador; permite mantener el cursor sobre el detalle para leerlo.
La ficha de cliente o proveedor incluye Primer apellido y Segundo apellido como campos opcionales independientes en el formulario común. Se conservan los nombres existentes sin dividirlos automáticamente.

Verificado en app:3000: 34 menús a 1440, 390 y 320 px, agrupación según opciones visibles, líneas de 1 px, navegación por teclado, Escape y retorno del foco, apertura de Ver datos y permisos de lectura simulados. Sin errores JavaScript ni desbordamientos. TypeScript y compilación correctos; recursos servidos contrastados con el contenedor. Evidencias en artifacts/action-menu-groups/.

En las tablas, el detalle del timeline se abre siempre por encima del indicador de la fila consultada, sin invertir la posición hacia abajo. Las cabeceras conservan su colocación actual.
Corrección: Primer apellido y Segundo apellido pertenecen a Editar perfil, no a Clientes. El formulario de clientes retira ambos controles. Perfil conserva el apellido existente en el primer campo y añade el segundo por separado; Nombre y apellidos tienen fondo gris fijo y no muestran subrayado.
Requisitos del comprador: Identificador fiscal y Origen o explicación usan campos rectangulares con fondo gris fijo (field-filled), sin línea inferior en reposo ni durante el foco.

### Cliente en Requisitos del comprador · 17/09/2026
El formulario sustituye Nombre del comprador por Cliente, con Select común y búsqueda por nombre o NIF sobre todos los clientes activos, incluidos los contactos de tipo ambos. Seleccionar completa el identificador fiscal, que queda en lectura. Si el cliente ya tiene requisitos se recuperan sus datos y versión; al editar se conserva su identidad, también para requisitos históricos sin ficha activa. No crea contactos ni cambia su tipo. Cliente e Identificador fiscal usan el fondo gris bg-muted y el relleno común de Cambiar contraseña, con foco visible. Verificado en app:3000 a 1440, 390 y 320 px: selección, filtrado, NIF automático, recuperación de requisitos, guardado y recursos del contenedor. Capturas y resultados en artifacts/buyer-client-selector/.

Las cabeceras de documentos colocan el timeline a la izquierda, 12 px debajo del vencimiento. A la derecha se muestra el número de días naturales restantes, Vence hoy o los días de retraso. Los documentos liquidados y presupuestos con decisión final muestran su estado en lugar de un plazo de pago pendiente. El cálculo usa fechas de calendario sin cambios por horario de verano.

La fecha de vencimiento en cabeceras se sitúa a la derecha, encima de «Quedan N días para pagar». El mensaje usa caption, peso regular y gris legible sobre negro. Las facturas cobradas ocultan esa fecha en la cabecera; el timeline permanece a la izquierda.

### Alta desde el selector de requisitos · 17/09/2026
El selector de Requisitos del comprador añade Crear cliente y Crear proveedor en un pie de acciones persistente, también cuando la búsqueda no tiene coincidencias. Ambas acciones reutilizan ContactForm con el tipo elegido y Guardar y usar. Al guardar, incorporan la ficha al desplegable, seleccionan su nombre y NIF y conservan los requisitos en edición. Cerrar el alta vuelve al selector y conserva el borrador. El listado incluye ahora clientes, proveedores y contactos de ambos tipos activos, sin convertir sus tipos. Select admite acciones contextuales fuera de las opciones de datos, con teclado y estilo común; el resto de selectores mantiene su comportamiento.

### Alta unificada desde requisitos · 17/09/2026
El desplegable reúne las acciones anteriores en Crear cliente o proveedor. Abre el formulario común con el campo Tipo de ficha para elegir Cliente o Proveedor; conserva también la opción existente Cliente y proveedor. Guardar y usar mantiene la selección automática del nombre y NIF y el borrador de requisitos.

El timeline de cabecera incorpora 12 px de margen superior adicional. En facturas cobradas se oculta todo el bloque derecho de plazo, incluido el texto Cobrada; el estado se conserva en el timeline.

El margen superior adicional del timeline de cabecera aumenta a 24 px por petición del usuario.

Tipo de ficha en el formulario de contactos usa la variante común field-filled: fondo gris bg-muted, relleno space-3 y esquinas rectas. El selector conserva la flecha y la señal de foco, también abierto.
Contabilidad: Plan de cuentas y Situación patrimonial agrupan sus tablas en acordeones por Activo, Pasivo, Patrimonio, Ingresos y Gastos. Inicialmente cerrados, permiten abrir varios grupos; muestran recuentos y los totales del informe con el grupo cerrado. Se conservan filtros y enlaces al mayor. La apertura tiene una transición breve y respeta movimiento reducido.

Ajuste final solicitado: margen superior del timeline de cabecera de 18 px (6 px menos).
Se revierte el fondo gris general del formulario de clientes o proveedores: conserva la presentación anterior, incluido el gris que ya tenía Tipo de ficha.

### Requisitos y Plantillas con marco de Cobros · 17/09/2026
Los modales de Requisitos del comprador y de creación, edición y consulta de Plantillas reutilizan creation-dialog, la misma composición de Registrar cobro: ancho de 1040 px en escritorio, relleno de 24 px, cabecera negra, título de página y cierre blanco a la derecha. El contenido se centra con un máximo de 720 px y las acciones se mantienen al pie. En móvil usan el ancho disponible y márgenes de 16 px. Plantillas conserva Datos, Diseño y Revisar; Requisitos mantiene una pantalla. Se conservan los campos grises, los datos, el guardado y el desenfoque del fondo. Verificado en app:3000 en quince vistas a 1440, 390 y 320 px, incluidos pasos, edición y guardado, sin desbordamientos ni errores JavaScript. Recursos servidos contrastados con el contenedor. Evidencias en artifacts/settings-creation-style/.
Por petición del usuario, se restablece el fondo gris fijo en todos los campos del formulario de clientes o proveedores, sin línea inferior.


## Explorar historial de contactos · 17 de septiembre de 2026

Actividad incorpora Explorar historial junto a los filtros para clientes y proveedores con resultados. Abre un panel contextual con un rail de capítulos adaptado de la referencia ChapterScrubber: onda de marcas al recorrerlas, previsualización con fecha, importe y estado real y apertura del documento. Reutiliza los diez resultados por página, el orden, los permisos y filtros actuales; su contador y paginación permiten recorrer todo el resultado sin cargar el historial completo.

Documentos y cobros/pagos abren su documento conservando página, filtros y entrada seleccionada en el regreso. Los anticipos muestran importe y saldo disponible y permiten localizar su fila. En móvil cada marca tiene 44 px de área táctil: tocar previsualiza y Abrir documento navega. Flechas, Inicio y Fin recorren las marcas con teclado; Escape cierra y devuelve el foco. La onda es una excepción expresa de movimiento para esta interacción solicitada; movimiento reducido la desactiva. Se conserva el kit común, sin nuevas dependencias visuales.

## Contabilidad sin acordeones · corrección del 17 de septiembre de 2026

Por petición del usuario se revierte la agrupación plegable de Plan de cuentas y Situación patrimonial y resultados. Ambas vuelven a mostrar una tabla continua con la columna Grupo y todas sus filas visibles. Se conservan los filtros, indicadores, importes y enlaces al Libro mayor. Se eliminan los estilos específicos de los acordeones de Contabilidad.

Verificado en app:3000 a 1440 y 390 px: filas contrastadas con la API, sin controles plegables ni desbordamiento de página, enlaces al mayor y capturas revisadas. TypeScript, compilación y recursos servidos correctos. Evidencia: test-results/accounting-flat/verification.json.

Verificado en app:3000 a 1440, 390 y 320 px: clientes y proveedores, previsualización, teclado y toque, paginación de doce documentos, apertura y regreso a la entrada seleccionada, movimientos revertidos, localización de anticipos, resultados vacíos, reintento de carga y movimiento reducido. Sin errores JavaScript ni desbordamientos. TypeScript y compilación correctos; recursos servidos contrastados con el contenedor. Evidencias en artifacts/contact-history-explorer/.

## Vista previa con icono PDF · 17 de septiembre de 2026

DocumentPreview elimina el botón de regreso y conserva el cierre de la ventana. Abrir PDF se representa mediante un icono de documento con las letras PDF, en el negro del sistema, sin borde y alineado a la derecha. Conserva la etiqueta accesible y el título Abrir PDF, y abre el recurso en otra pestaña.

Verificado en app:3000 a 1440 y 390 px: PDF renderizado, icono y enlace accesible, ausencia del botón de regreso, cierre con X y sin desbordamiento. TypeScript y compilación correctos; recursos servidos verificados. Evidencias: test-results/preview-pdf-icon/.

## Vista previa con marco de Registrar cobro · 17 de septiembre de 2026

Únicamente la vista previa abierta desde la ficha documental adopta creation-dialog: cabecera negra, título y cierre claros, ancho de 1040 px y márgenes comunes con Registrar cobro. Conserva el área desplazable del PDF y el icono negro de apertura. El cambio es optativo en DocumentPreview y no se aplica al editor, plantillas ni visor de adjuntos.

Verificado en app:3000 a 1440 y 390 px: cabecera, dimensiones, PDF renderizado, cierre e icono; sin desbordamiento. TypeScript y compilación correctos, recursos servidos contrastados y capturas revisadas. Evidencia: test-results/preview-modal-style/.

## Etiquetas de fechas compactas · 17 de septiembre de 2026

En el resumen documental, Vencimiento y Plazo de pago separan etiqueta y valor mediante space-1 (4 px). Los valores de lectura eliminan la altura mínima de los campos editables. Verificado en app:3000 a 1440 y 390 px, sin desbordamientos; compilación correcta y recursos servidos contrastados. Evidencias: test-results/compact-date-values/.

## Emisor y cliente compactos · 17 de septiembre de 2026

Las etiquetas de Emisor y Cliente en el resumen documental quedan a 4 px del nombre, igual que las fechas. Se elimina su altura reservada para controles y el margen superior del nombre, manteniendo tipografía y datos. Verificado en app:3000 a 1440 y 390 px mediante medición, capturas y recursos servidos. Compilación correcta. Evidencias: test-results/compact-parties/.

## Nombre de producto más pequeño · 17 de septiembre de 2026

El nombre del producto en las tablas del resumen documental usa text-body (13 px en la escala vigente), en lugar de text-subtitle. Conserva peso, alineación y el tamaño de las columnas numéricas. Verificado en app:3000 a 1440 y 390 px; compilación y recursos servidos correctos. Evidencias: test-results/product-text-size/.

## Márgenes del total alineados · 17 de septiembre de 2026

En el resumen documental, Total elimina el relleno lateral para compartir margen izquierdo con Base imponible e IVA y margen derecho con sus importes. Conserva separación vertical y jerarquía. Verificado en app:3000 a 1440 y 390 px mediante mediciones y capturas; compilación correcta y recursos contrastados. Evidencias: test-results/aligned-totals/.

## Tablas comunes en las secciones documentales · 17 de septiembre de 2026

Actividad, Archivos adjuntos y Vencimientos adoptan las tablas planas de Movimientos: encabezados discretos, separación bajo la cabecera y filas alternas. Actividad muestra cambio de estado y fecha; adjuntos, archivo, tamaño y eliminación; vencimientos, fecha, estado, importe y edición. Se conservan carga de archivos, visor, permisos y formulario de plazos. La tabla de Actividad no incorpora auditoría técnica.

Verificadas nueve vistas en app:3000 a 1440, 390 y 320 px, apertura de adjuntos y edición de plazos, sin errores JavaScript ni desbordamiento de página. Compilación correcta y recursos servidos contrastados. Evidencias: test-results/document-section-tables/.

## Cabecera documental sin timeline · 17 de septiembre de 2026

Se retira InvoiceStatusPipeline de la cabecera de visualización y se conserva el estado mediante Badge. El timeline de los listados permanece fuera de este cambio. Verificadas diez cabeceras a 1440 y 390 px en app:3000, con estado visible y sin timeline. Compilación y recursos servidos correctos. Evidencias: test-results/no-header-timeline/.

## Valores centrados bajo sus encabezados · 17 de septiembre de 2026

En la tabla de lectura documental, Cantidad, Precio unitario e IVA usan alineación central y relleno lateral simétrico, tanto en encabezados como en valores. El producto conserva su alineación izquierda. Verificado en app:3000 a 1440 y 390 px: centros de los textos coincidentes, compilación correcta y recursos servidos contrastados. Evidencias: test-results/centered-line-values/.

## Número de factura en cabecera · 17 de septiembre de 2026

Se recupera el número de factura en el contexto de la cabecera, en la zona antes ocupada por el timeline. Conserva el nombre del cliente y el estado textual. Verificado en app:3000 a 1440 y 390 px, incluidos documentos sin numerar; compilación y recursos servidos correctos. Evidencias: test-results/invoice-header-number/.

## Valores de producto con tamaño uniforme · 17 de septiembre de 2026

Cantidad, Precio unitario e IVA en lectura usan text-body (13 px), igual que el nombre del producto, conservando el centrado bajo sus encabezados. Verificado en app:3000 a 1440 y 390 px: tamaño y centros medidos, capturas revisadas y recursos servidos contrastados. Compilación correcta. Evidencias: test-results/line-values-size/.

## Separador inferior de conceptos compacto · 17 de septiembre de 2026

La línea anterior a los totales elimina los 24 px de separación adicional tras la tabla de productos en lectura. Mantiene el relleno de las filas y los descuentos sin solapamientos. Verificado en app:3000 a 1440 y 390 px con mediciones y capturas; compilación y recursos servidos correctos. Evidencias: test-results/line-bottom-spacing/.

## Total con la misma jerarquía que el importe · 17 de septiembre de 2026

La etiqueta Total del resumen documental usa text-amount y peso 600, igual que el importe final. Conserva los márgenes alineados con el desglose. Verificado en app:3000 a 1440 y 390 px: tamaños iguales, márgenes, capturas y recursos servidos. Compilación correcta. Evidencias: test-results/total-label-size/.

## Datos de pago más próximos a la derecha · 17 de septiembre de 2026

El bloque de vencimiento y plazo de pago en lectura reduce su ancho de 392 a 320 px en escritorio, anclado al margen derecho, y usa 16 px entre columnas. En móvil conserva el ancho disponible. Verificado en app:3000 a 1440 y 390 px: dimensiones, separación, capturas y recursos servidos. Compilación correcta. Evidencias: test-results/payment-dates-position/.

## Estados separados en Actividad · 17 de septiembre de 2026

Actividad muestra Estado anterior, Estado actual y Fecha en columnas independientes. El estado inicial sin antecedente usa una raya; la fecha mantiene su formato. Verificado en app:3000 a 1440, 390 y 320 px, con estados contrastados con la API y sin desbordamiento. Compilación y recursos servidos correctos. Evidencias: test-results/activity-state-columns/.

## Cliente alineado con las fechas compactas · 17 de septiembre de 2026

Todo el bloque de Cliente en lectura usa 320 px de ancho en escritorio y se alinea al margen derecho, con el mismo inicio que Vencimiento. Incluye etiqueta, nombre, identificación y dirección. Mantiene su adaptación móvil. Verificado en app:3000 a 1440 y 390 px: alineación medida, sin desbordamiento, compilación y recursos correctos. Evidencias: test-results/client-dates-alignment/.
