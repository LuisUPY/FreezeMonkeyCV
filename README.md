# Freeze Monkey · Punto de venta

Freeze Monkey utiliza la base completa de `Template`: catálogo, opciones, pedidos por producto, adiciones a cuentas abiertas, mesas y Delivery, historial, caja, pagos mixtos/parciales, gastos, propinas, reparto, cortes e impresión térmica. `Template/` y `OldFreezeMonkeyCV/` se conservan como referencias sin modificar.

## Abrir

Abre `index.html` en un navegador. También funciona con `python3 -m http.server 8000` desde esta carpeta y en alojamiento estático como GitHub Pages. No necesita instalaciones, frameworks ni servicios externos. Los archivos de la aplicación están en la raíz, `js/`, `css/` y `assets/`.

## Catálogo Freeze Monkey

Hay 31 productos, con las 27 fotografías originales. Las dos limonadas aún no tienen fotografía; se muestra su información sin una imagen rota.

- 18 bebidas a $60: 8 frappés, 8 smoothies y 2 limonadas.
- Papas francesas, papas gajo, aros de cebolla y salchipulpos: $40. Dedos de queso: $50.
- Tenders: $70. Boneless: $90. Ambos requieren elegir Naturales, BBQ o Búfalo.
- Caja Salvaje: $179.
- Viral: 1 bebida + 1 snack por $95.
- Ozaru: 2 bebidas + 2 snacks por $180.
- Tender: 1 bebida + tenders del sabor elegido por $120.
- Boneless: 1 bebida de libre elección + boneless del sabor elegido por $140.
- Manada: 2 bebidas + 1 Caja Salvaje por $289.

Todos los combos tienen precio fijo. Viral y Ozaru admiten los cinco snacks individuales; boneless, tenders y Caja Salvaje no sustituyen esos snacks. Todas las bebidas participan, incluidas las limonadas.

`js/comboRules.js` conserva las reglas de precios del Freeze Monkey anterior. `js/menuData.js` las adapta al modelo de opciones del Template y `assets/menu.json` es su copia JSON. La apariencia conserva la distribución del Template con tonos beige, arena y café.

## Combos automáticos

Agregar o cambiar cantidades de bebidas y snacks calcula la combinación de menor precio. Un Viral automático puede convertirse en Ozaru cuando completas dos bebidas y dos snacks. También se detectan Tender, Boneless y Manada, conservando sabores, notas, extras y productos sobrantes. Los combos elegidos desde su selector conservan sus selecciones.

La regla se aplica al borrador y a los productos nuevos que vas a añadir a una cuenta. Las partidas ya confirmadas conservan su precio, preparación, pagos y fechas. Los controles de cantidad de un combo cambian el combo completo; Quitar elimina esa selección completa.

El historial suma el importe fijo del combo y cuenta sus bebidas y snacks como productos. El indicador Combos cuenta los combos vendidos por separado, por lo que no se suma a Bebidas y Snacks para obtener el número de productos. Los extras personalizados conservan el conteo separado del Template.

## Operación

1. Selecciona productos, sabores y combos. Puedes buscar en todo el catálogo, añadir extras por concepto e importe, y usar una etiqueta libre, Mesa 1–8 o Delivery.
2. Crear pedido abre una revisión. Confirmar pedido guarda la orden y abre la impresión para Cocina y Barra. Cada combo envía sus bebidas a Barra y sus snacks, tenders o Caja Salvaje a Cocina, con las cantidades, sabores y notas.
3. Abre una orden en Pedidos abiertos para marcar sus partidas preparadas, cobrar productos individuales o todos los pendientes, añadir productos, retirar partidas sin cobrar y reimprimir comandas o cuenta. La orden continúa en la cola hasta que todos sus productos estén preparados y pagados. Un combo se prepara y cobra como una partida completa.
4. Para cobrar, abre primero un turno de caja con un fondo de cero o más. Captura efectivo y tarjeta/transferencia; el sistema valida faltantes y calcula el cambio. Las cantidades se calculan en centavos.
5. Las opciones de caja permiten gastos, propinas por método, reparto igual o porcentual, vista previa del corte, cierre del turno y reimpresión de cortes anteriores. Los pagos de tickets aún abiertos también entran en el corte de su turno.
6. Historial agrupa por la fecha de pago de cada partida en America/Merida. Cargar expediente abre días ya guardados en este navegador. Reiniciar aplicación guarda el borrador y recarga conservando la información.

Las mesas pendientes quedan deshabilitadas y Delivery usa su propio consecutivo. Los pagos, las eliminaciones y las adiciones mantienen la protección contra cambios simultáneos desde otra pestaña de la base avanzada.

## Persistencia y respaldos

El expediente nuevo se guarda en `freeze-monkey-pos:expediente:v2`. Si existe `freeze-monkey-pos-v1` en el mismo navegador y origen, se migra automáticamente al abrir, preservando precios históricos, etiquetas, fechas y numeración. La clave anterior permanece intacta. Los pagos anteriores sin método siguen identificados como tales y no se suman al turno nuevo.

Opciones ofrece Guardar expediente, Descargar respaldo JSON e Importar respaldo. Importar admite los respaldos JSON nuevos y los JSON/CSV del Freeze Monkey anterior; muestra una confirmación antes de reemplazar los datos y permite descargar el estado actual primero. El respaldo nuevo incluye pedidos, caja, cortes, propinas, borrador y adición en curso.

Los datos son locales al navegador y origen. Para cambiar entre file://, localhost o un alojamiento, descarga el respaldo en el origen anterior e impórtalo en el nuevo. No hay sincronización ni cobro bancario integrado.

## Verificación

- `node tests/combo-regression.cjs`: reglas originales y 945 asignaciones de precio mínimo.
- `node tests/freeze-integration.cjs`: catálogo, opciones, combos progresivos, cantidades, notas, persistencia, migración, comandas por área, pagos mixtos, propinas, cortes e inmutabilidad de partidas confirmadas; 945 escenarios adicionales del adaptador.

Los módulos `orderCore`, `orders`, `history`, `cash`, `storage`, `media`, `salesUI`, `cashUI`, `printing` y `app` proceden del Template. Los módulos `combos` y `migration` conectan las funciones de Freeze Monkey con esa base.
