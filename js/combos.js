/* Adaptador de promociones: únicamente transforma borradores y nuevas adiciones. */
globalThis.FreezeMonkeyCombos = (() => {
  'use strict';
  const copia = value => JSON.parse(JSON.stringify(value));
  function combinar(partidas) {
    const originales = new Map();
    let siguiente = 0;
    const unidades = [];
    const convertir = partida => {
      const uid = `unidad-${++siguiente}`;
      const unidad = { ...copia(partida), cantidad: 1 };
      if (unidad.claveAgrupacion) {
        unidad.clave = unidad.claveAgrupacion;
        delete unidad.claveAgrupacion;
      }
      originales.set(uid, unidad);
      const producto = FreezeMonkeyMenu.findProduct(partida.productoId);
      return { uid, productId: partida.productoId, name: partida.nombre, price: partida.precioUnitarioCentavos / 100,
        components: partida.tipo === 'extra' || producto?.kind === 'combo' ? [{ name: partida.nombre }] : [],
        selections: { tenderFlavor: partida.opciones?.sabor, bonelessFlavor: partida.opciones?.sabor } };
    };
    for (const partida of partidas) {
      FreezeMonkeyPOS.totalPedido([partida]);
      for (let i = 0; i < partida.cantidad; i++) {
        if (partida.automatico) {
          if (!Array.isArray(partida.origenes) || !partida.origenes.length) throw new Error('El combo automático no tiene sus productos originales.');
          for (const origen of partida.origenes) unidades.push(convertir(origen));
        } else unidades.push(convertir(partida));
      }
    }
    const resultado = FreezeMonkeyMenu.combineAutomaticCombos(unidades).map(linea => {
      if (!linea.automaticCombo) return originales.get(linea.uid);
      const origenes = linea.sourceItems.map(origen => originales.get(origen.uid));
      const opciones = {};
      linea.selections.drinks.forEach((id, i) => { opciones[`bebida-${i + 1}`] = id; });
      linea.selections.snacks.forEach((id, i) => { opciones[`snack-${i + 1}`] = id; });
      if (linea.selections.tenderFlavor) opciones.sabor = linea.selections.tenderFlavor;
      if (linea.selections.bonelessFlavor) opciones.sabor = linea.selections.bonelessFlavor;
      const combo = FreezeMonkeyPOS.crearPartida(linea.productId, opciones);
      combo.automatico = true;
      combo.origenes = origenes;
      combo.componentes = origenes.map(origen => copia(origen));
      combo.clave = JSON.stringify(['automatico', combo.productoId, origenes.map(origen => origen.clave)]);
      return combo;
    });
    const agrupadas = [];
    for (const partida of resultado) {
      const clave = partida.clave;
      const anteriores = agrupadas.filter(item => (item.claveAgrupacion || item.clave) === clave);
      const anterior = anteriores.find(item => item.cantidad < 99);
      if (anterior) anterior.cantidad++;
      else {
        if (anteriores.length) {
          partida.claveAgrupacion = clave;
          partida.clave = JSON.stringify(['lote', clave, anteriores.length]);
        }
        agrupadas.push(partida);
      }
    }
    return agrupadas;
  }
  function restaurarPartida(stored) {
    if (!Number.isInteger(stored.cantidad) || stored.cantidad < 1 || stored.cantidad > 99) throw new Error('Cantidad inválida.');
    let partida;
    if (stored.automatico) {
      if (!Array.isArray(stored.origenes) || !stored.origenes.length || stored.origenes.length > 4 ||
        stored.origenes.some(p => p.automatico || p.cantidad !== 1)) throw new Error('Productos originales del combo inválidos.');
      const combos = combinar(stored.origenes.map(restaurarPartida));
      if (combos.length !== 1 || combos[0].productoId !== stored.productoId || !combos[0].automatico) throw new Error('Combo automático inválido.');
      partida = combos[0];
    } else partida = stored.tipo === 'extra'
      ? FreezeMonkeyPOS.crearExtra(stored.nombre, stored.precioUnitarioCentavos / 100)
      : FreezeMonkeyPOS.crearPartida(stored.productoId, stored.opciones, stored.nota);
    return { ...partida, cantidad: stored.cantidad };
  }
  return Object.freeze({ combinar, restaurarPartida });
})();
