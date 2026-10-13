/* Lectura de expedientes anteriores sin reescribir sus importes ni su respaldo. */
globalThis.FreezeMonkeyMigration = (() => {
  'use strict';
  function opcionesAnteriores(linea) {
    const opciones = {};
    (linea.selections?.drinks || []).forEach((id, i) => { opciones[`bebida-${i + 1}`] = id; });
    (linea.selections?.snacks || []).forEach((id, i) => { opciones[`snack-${i + 1}`] = id; });
    if (linea.selections?.tenderFlavor) opciones.sabor = linea.selections.tenderFlavor;
    if (linea.selections?.bonelessFlavor) opciones.sabor = linea.selections.bonelessFlavor;
    if (linea.productId === 'snack-monkey-boneless') opciones.sabor = linea.selections?.bonelessFlavor || 'Naturales';
    return opciones;
  }
  function snapshot(linea) {
    const id = linea.productId || linea.id || null;
    const producto = FreezeMonkeyPOS.porId.get(id);
    const precioUnitarioCentavos = FreezeMonkeyPOS.centavos(linea.price);
    const nombre = linea.name;
    return { clave: JSON.stringify(['anterior', id, nombre, precioUnitarioCentavos]), productoId: id, nombre,
      macroCategoria: producto?.macroCategoria || ({ frappes: 'Bebidas', smoothies: 'Bebidas', limonadas: 'Bebidas', snacks: 'Snacks', combos: 'Combos' })[linea.category] || null,
      subCategoria: producto?.subCategoria || 'Catálogo anterior',
      precioBase: linea.price, extras: 0, precioUnitario: linea.price, precioUnitarioCentavos,
      opciones: {}, selecciones: [], nota: '', cantidad: 1, imagen: producto?.imagen || null,
      componentes: (linea.components || []).map(snapshot) };
  }
  function partidaAnterior(linea, borrador = false) {
    if (borrador) {
      if (linea.automaticCombo && linea.sourceItems?.length) {
        const resultado = FreezeMonkeyCombos.combinar(linea.sourceItems.map(p => partidaAnterior(p, true)));
        if (resultado.length === 1) return resultado[0];
      }
      try { return FreezeMonkeyPOS.crearPartida(linea.productId, opcionesAnteriores(linea)); }
      catch { return snapshot(linea); }
    }
    let partida = snapshot(linea);
    try {
      const actual = FreezeMonkeyPOS.crearPartida(linea.productId, opcionesAnteriores(linea));
      partida.opciones = actual.opciones;
      partida.selecciones = actual.selecciones;
    } catch { /* Las selecciones antiguas quedan visibles en sus componentes. */ }
    if (partida.componentes.length && !partida.selecciones.length) {
      partida.selecciones = [{ grupoId: 'contenido-anterior', grupoNombre: 'Incluye',
        valores: partida.componentes.map(p => ({ id: p.productoId, nombre: p.nombre, precioExtra: 0 })) }];
    }
    return partida;
  }
  function desdeAnterior(raw) {
    const anterior = FreezeMonkeyLegacyStorage.normalizeState(raw);
    const estado = { version: 2, revision: 0, siguienteNumero: anterior.nextNumber, siguienteDelivery: 1,
      pedidos: [], borrador: { etiqueta: anterior.draft.label, partidas: [] }, adicion: null,
      caja: FreezeMonkeyCash.cajaVacia(), historialCortes: [], colaOculta: false, guardadoEn: null };
    estado.pedidos = anterior.orders.map(pedido => {
      const partidas = [
        ...pedido.items.map(p => partidaAnterior(p)),
        ...pedido.extras.map(p => FreezeMonkeyPOS.crearExtra(p.description, p.amount))
      ].map((p, i) => ({ ...p, id: `partida-${pedido.number}-${i + 1}`, preparado: pedido.status !== 'ABIERTO',
        preparadoEn: pedido.status !== 'ABIERTO' ? pedido.createdAt : null,
        pagado: pedido.status === 'PAGADO', pagadoEn: pedido.status === 'PAGADO' ? pedido.paidAt || pedido.createdAt : null }));
      return { id: `pedido-${pedido.number}`, numero: pedido.number, etiqueta: pedido.label, creadoEn: pedido.createdAt,
        estado: pedido.status === 'LISTO' ? 'PREPARADO' : pedido.status,
        totalCentavos: FreezeMonkeyPOS.totalPedido(partidas), partidas };
    });
    estado.borrador.partidas = FreezeMonkeyCombos.combinar([
      ...anterior.draft.items.map(p => partidaAnterior(p, true)),
      ...anterior.draft.extras.map(p => FreezeMonkeyPOS.crearExtra(p.description, p.amount))
    ]);
    return estado;
  }
  return Object.freeze({ desdeAnterior });
})();
