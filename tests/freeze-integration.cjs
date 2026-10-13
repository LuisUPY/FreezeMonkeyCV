const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const files = ['comboRules', 'menuData', 'orderCore', 'combos', 'orders', 'history', 'cash', 'legacyStorage', 'migration', 'storage', 'printing'];
const stored = new Map();
global.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
for (const file of files) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js', `${file}.js`), 'utf8'), { filename: file });
const P = FreezeMonkeyPOS, C = FreezeMonkeyCombos, O = FreezeMonkeyOrders, Cash = FreezeMonkeyCash, S = FreezeMonkeyStorage;
const line = (id, sabor = 'BBQ', nota = '') => P.crearPartida(id, id === 'snack-monkey-tenders' || id === 'snack-monkey-boneless' ? { sabor } : {}, nota);
const total = partidas => P.totalPedido(partidas);
assert.equal(P.catalogo.length, 31);
assert.deepEqual(Object.keys(menuDB), ['Bebidas', 'Snacks', 'Combos']);
assert.throws(() => P.crearPartida('combo-viral'), /Selecciona/);
assert.throws(() => P.crearPartida('snack-monkey-boneless'), /Selecciona/);
for (const d of FreezeMonkeyMenu.DRINKS) for (const s of FreezeMonkeyMenu.SNACKS) {
  const result = C.combinar([line(d.id), line(s.id)]);
  assert.equal(result[0].productoId, 'combo-viral');
  assert.equal(total(result), 9500);
  assert.deepEqual(C.combinar(result), result);
  assert.deepEqual(C.restaurarPartida(JSON.parse(JSON.stringify(result[0]))), result[0]);
}
let partidas = C.combinar([line('limonada-azul', 'BBQ', 'Sin hielo'), line('snack-dedos-de-queso')]);
partidas = C.combinar([...partidas, line('smoothie-mango'), line('snack-papas-gajo')]);
assert.equal(partidas[0].productoId, 'combo-ozaru');
assert.equal(partidas[0].componentes.find(p => p.productoId === 'limonada-azul').nota, 'Sin hielo');
assert.equal(total(partidas), 18000);
assert.deepEqual(C.combinar(partidas), partidas);
const double = C.combinar([{ ...line('smoothie-mango'), cantidad: 99 }, { ...line('snack-papas-gajo'), cantidad: 99 }]);
assert.equal(total(double), 891500);
assert.equal(double.reduce((n,p) => n + p.cantidad * p.componentes.length, 0), 198);
const grande = C.combinar([{ ...partidas[0], cantidad: 99 }, { ...line('smoothie-mango'), cantidad: 99 }, { ...line('snack-papas-gajo'), cantidad: 99 }]);
assert.equal(new Set(grande.map(p => p.clave)).size, grande.length, 'Cada control de cantidad debe identificar una sola partida');
assert.equal(grande.reduce((n,p) => n + p.cantidad * (p.componentes?.length || 1), 0), 594);
assert.deepEqual(C.combinar(grande.map(p => C.restaurarPartida(JSON.parse(JSON.stringify(p))))), grande, 'Recargar no debe truncar selecciones que superan 99 unidades en varios combos');
for (const sabor of ['Naturales', 'BBQ', 'Búfalo']) {
  const result = C.combinar([line('smoothie-fresa'), line('snack-monkey-tenders', sabor, 'Bien dorados')]);
  assert.equal(result[0].productoId, 'combo-tenders');
  const rutas = FreezeMonkeyPrinting.separarComandas({ partidas: result });
  assert.equal(rutas.comandaBebidas.length, 1);
  assert.equal(rutas.comandaAlimentos.length, 1);
  assert.equal(rutas.comandaAlimentos[0].opciones.sabor, sabor);
  assert.equal(rutas.comandaAlimentos[0].nota, 'Bien dorados');
}
assert.equal(line('snack-monkey-boneless').precioUnitarioCentavos, 9000);
for (const drink of FreezeMonkeyMenu.DRINKS) for (const sabor of ['Naturales', 'BBQ', 'Búfalo']) {
  const auto = C.combinar([line(drink.id), line('snack-monkey-boneless', sabor, 'Salsa aparte')])[0];
  const manualBoneless = P.crearPartida('combo-boneless', { 'bebida-1': drink.id, sabor });
  for (const combo of [auto, manualBoneless]) {
    assert.equal(combo.productoId, 'combo-boneless'); assert.equal(total([combo]), 14000);
    const areas = FreezeMonkeyPrinting.separarComandas({ partidas: [combo] });
    assert.equal(areas.comandaBebidas[0].productoId, drink.id);
    assert.equal(areas.comandaAlimentos[0].productoId, 'snack-monkey-boneless');
    assert.equal(areas.comandaAlimentos[0].opciones.sabor, sabor);
    assert.deepEqual(C.restaurarPartida(JSON.parse(JSON.stringify(combo))), combo);
  }
  assert.equal(auto.componentes.find(p => p.productoId === 'snack-monkey-boneless').nota, 'Salsa aparte');
}
assert.throws(() => P.crearPartida('combo-boneless', { sabor: 'BBQ' }), /Selecciona/);
assert.throws(() => P.crearPartida('combo-boneless', { 'bebida-1': 'limonada-azul' }), /Selecciona/);
const manual = P.crearPartida('combo-manada', { 'bebida-1': 'smoothie-mango', 'bebida-2': 'smoothie-fresa' }, 'Para llevar');
assert.equal(C.combinar([manual, line('snack-dedos-de-queso')])[0].automatico, undefined);
const routes = FreezeMonkeyPrinting.separarComandas({ partidas: [{ ...manual, cantidad: 2 }] });
assert.equal(routes.comandaBebidas.reduce((n,p) => n + p.cantidad, 0), 4);
assert.equal(routes.comandaAlimentos[0].cantidad, 2);
assert.equal(routes.comandaAlimentos[0].productoId, 'caja-salvaje');
assert.equal(routes.comandaAlimentos[0].nota, 'Para llevar');
let state = S.vacio(); state.borrador.partidas = partidas; state = S.guardarExpediente(state);
assert.deepEqual(S.cargarExpediente().borrador.partidas.map(C.restaurarPartida), partidas);
assert.throws(() => S.guardarExpediente({ ...state, revision: 0 }), /otra pestaña/);
const date = '2026-10-12T16:00:00.000Z';
let pedido = O.nuevoPedido([...partidas, P.crearExtra('Aderezo', '5,50')], 'Mesa 1', 1, date);
let caja = Cash.abrirCaja(Cash.cajaVacia(), '100', date);
const paid = Cash.cobrarPartidas(pedido, pedido.partidas[0].id, caja, { efectivoRecibido: '100', montoTarjeta: '80' }, date);
pedido = paid.pedido; caja = paid.caja;
assert.equal(pedido.partidas[0].pagado, true);
assert.equal(pedido.partidas[1].pagado, false);
assert.equal(Cash.resumirCaja(caja, [pedido]).ventasEfectivoCentavos, 10000);
const history = FreezeMonkeyHistory.resumirDia([pedido], '2026-10-12');
assert.equal(history.totalCentavos, 18000); assert.equal(history.productos, 4);
assert.equal(history.categorias.Bebidas, 2); assert.equal(history.categorias.Snacks, 2); assert.equal(history.categorias.Combos, 1);
const original = JSON.stringify(pedido.partidas[0]);
const addition = O.agregarPartidas(pedido, C.combinar([line('smoothie-fresa'), line('snack-papas-gajo')]));
assert.equal(JSON.stringify(addition.partidas[0]), original);
assert.throws(() => O.eliminarPartida(pedido, pedido.partidas[0].id, date), /cobrados/);
state.pedidos = [pedido]; state.borrador.partidas = []; state.caja = caja;
state = S.guardarExpediente(state);
assert.equal(S.cargarExpediente().pedidos[0].totalCentavos, 18550);
caja = Cash.registrarPropina(caja, '10.01', 'efectivo', date);
caja = Cash.configurarRepartoPropinas(caja, { tipo: 'igual', personas: 3 });
const tips = Cash.resumirPropinas(caja);
assert.equal(tips.reparto.reduce((n,p) => n + p.montoCentavos, 0), 1001);
const cut = Cash.cerrarCaja(caja, date, [pedido]);
assert.equal(cut.caja.abierta, false);
const legacy = { version: 1, nextNumber: 8, orders: [{ number: 7, id: 'pedido-7', status: 'PAGADO', createdAt: date, paidAt: date, label: 'Mesa 2',
  items: [{ uid: 'antiguo', productId: 'combo-manada', name: 'Combo Manada anterior', price: 279,
    components: [{ id: 'platon', name: 'Platón de snacks', price: 169 }, { id: 'smoothie-mango', name: 'Smoothie Mango', price: 60 }, { id: 'smoothie-fresa', name: 'Smoothie Fresa', price: 60 }] }],
  extras: [{ uid: 'e1', description: 'Extra antiguo', amount: 10 }] }], draft: { items: [FreezeMonkeyMenu.buildLine(FreezeMonkeyMenu.findProduct('limonada-azul'))], extras: [], label: 'Ana' } };
const migrated = S.normalizar(FreezeMonkeyMigration.desdeAnterior(legacy));
assert.equal(migrated.pedidos[0].totalCentavos, 28900);
assert.equal(migrated.pedidos[0].partidas[0].precioUnitarioCentavos, 27900);
assert.equal(migrated.pedidos[0].partidas[0].componentes[0].nombre, 'Platón de snacks');
assert.equal(migrated.siguienteNumero, 8);
const legacyBoneless = JSON.parse(JSON.stringify(legacy));
legacyBoneless.orders[0].items = [{ uid: 'boneless-anterior', productId: 'snack-monkey-boneless', name: 'Boneless', price: 100, components: [] }];
legacyBoneless.orders[0].extras = [];
assert.equal(S.normalizar(FreezeMonkeyMigration.desdeAnterior(legacyBoneless)).pedidos[0].totalCentavos, 10000, 'Las ventas anteriores mantienen su precio');
assert.equal(migrated.borrador.partidas[0].productoId, 'limonada-azul');
stored.delete(S.KEY); stored.set('freeze-monkey-pos-v1', JSON.stringify(legacy));
assert.deepEqual(S.cargarExpediente().pedidos, migrated.pedidos);
assert.equal(stored.get('freeze-monkey-pos-v1'), JSON.stringify(legacy));
const reimported = S.reemplazarExpediente(migrated, 0);
assert.equal(reimported.revision, 1);
assert.throws(() => S.reemplazarExpediente(migrated, 0), /otra pestaña/);
let cases = 0;
for (let drinks = 0; drinks <= 6; drinks++) for (let snacks = 0; snacks <= 4; snacks++)
for (let tenders = 0; tenders <= 2; tenders++) for (let boxes = 0; boxes <= 2; boxes++) for (let boneless = 0; boneless <= 2; boneless++) {
  const raw = [...Array.from({length:drinks}, () => line('smoothie-mango')), ...Array.from({length:snacks}, (_,i) => line(i % 2 ? 'snack-papas-gajo' : 'snack-dedos-de-queso')),
    ...Array.from({length:tenders}, () => line('snack-monkey-tenders')), ...Array.from({length:boxes}, () => line('caja-salvaje')), ...Array.from({length:boneless}, () => line('snack-monkey-boneless'))];
  const reference = FreezeMonkeyMenu.combineAutomaticCombos(raw.map((p,i) => ({ uid:String(i), productId:p.productoId, name:p.nombre, price:p.precioUnitario, components:[], selections:{tenderFlavor:p.opciones.sabor,bonelessFlavor:p.opciones.sabor} })));
  const result = C.combinar(raw);
  assert.equal(total(result), reference.reduce((n,p) => n + p.price*100,0));
  assert.deepEqual(C.combinar(result),result);
  assert.equal(result.reduce((n,p) => n + p.cantidad*(p.origenes?.length || 1),0),raw.length);
  cases++;
}
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/menu.json'), 'utf8')), menuDB);
const quote = value => `"${String(value).replaceAll('"', '""')}"`;
const legacyOrder = legacy.orders[0];
const csv = '\uFEFF' + [
  ['numero', 'estado', 'creado', 'pagado', 'subtotal', 'extras_total', 'total', 'items_json', 'extras_json', 'etiqueta_json'],
  [7, 'PAGADO', date, date, 279, 10, 289, JSON.stringify(legacyOrder.items), JSON.stringify(legacyOrder.extras), JSON.stringify(legacyOrder.label)]
].map(row => row.map(quote).join(';')).join('\r\n');
(async () => {
  const importedLegacy = await S.leerRespaldo({ name: 'anterior.json', text: async () => JSON.stringify(legacy) });
  const importedNew = await S.leerRespaldo({ name: 'nuevo.json', text: async () => JSON.stringify(migrated) });
  const importedCSV = await S.leerRespaldo({ name: 'anterior.csv', text: async () => csv });
  for (const imported of [importedLegacy, importedNew, importedCSV]) assert.deepEqual(imported.pedidos, migrated.pedidos);
  await assert.rejects(S.leerRespaldo({ name: 'otro.txt', text: async () => '' }), /Selecciona un expediente/);
  for (const producto of P.catalogo) if (producto.imagen) assert.ok(fs.existsSync(path.join(__dirname, '..', producto.imagen)));
  console.log(`Integración OK: catálogo, opciones, persistencia, migración, respaldos JSON/CSV, cocina/barra, pagos mixtos, cortes, propinas y ${cases} escenarios de promociones.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
