/* Una sola fuente local para borrador, numeración y expediente de ventas. */
globalThis.FreezeMonkeyStorage = (() => {
  'use strict';
  const KEY = 'freeze-monkey-pos:expediente:v2';
  const LEGACY_KEY = 'freeze-monkey-pos-v1';
  const vacio = () => ({ version: 2, revision: 0, siguienteNumero: 1, siguienteDelivery: 1, pedidos: [], borrador: { etiqueta: '', partidas: [] }, adicion: null, caja: FreezeMonkeyCash.cajaVacia(), historialCortes: [], colaOculta: false, guardadoEn: null });
  const copia = value => JSON.parse(JSON.stringify(value));
  const fechaValida = valor => typeof valor === 'string' && Number.isFinite(Date.parse(valor));
  function validarPartida(partida, profundidad = 0) {
    if (!partida || typeof partida.nombre !== 'string' || !partida.nombre.trim() || partida.nombre.length > 200 ||
      !Number.isInteger(partida.cantidad) || partida.cantidad < 1 || partida.cantidad > 99 ||
      !Number.isSafeInteger(partida.precioUnitarioCentavos) || partida.precioUnitarioCentavos < 0 ||
      !Array.isArray(partida.selecciones) || typeof partida.nota !== 'string' || partida.nota.length > 200 ||
      !(partida.macroCategoria === null || FreezeMonkeyHistory.macros.includes(partida.macroCategoria))) throw new Error('Partida inválida en el expediente.');
    if (partida.tipo === 'extra' && (partida.macroCategoria !== null || partida.productoId !== null)) throw new Error('Extra inválido.');
    for (const seleccion of partida.selecciones) {
      if (!seleccion || typeof seleccion.grupoNombre !== 'string' || !Array.isArray(seleccion.valores) ||
        seleccion.valores.some(valor => !valor || typeof valor.nombre !== 'string' || !Number.isFinite(valor.precioExtra) || valor.precioExtra < 0) ||
        (seleccion.texto != null && typeof seleccion.texto !== 'string')) throw new Error('Opciones inválidas en el expediente.');
    }
    if (partida.componentes != null) {
      if (!Array.isArray(partida.componentes) || partida.componentes.length > 4 ||
        (profundidad > 0 && partida.componentes.length)) throw new Error('Componentes inválidos.');
      for (const componente of partida.componentes) validarPartida(componente, profundidad + 1);
    }
    if (partida.automatico) {
      if (profundidad > 0 || !Array.isArray(partida.origenes) || !partida.origenes.length || partida.origenes.length > 4) throw new Error('Combo automático inválido.');
      for (const origen of partida.origenes) validarPartida(origen, profundidad + 1);
    }
  }
  function normalizar(raw) {
    if (!raw || raw.version !== 2 || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || !Array.isArray(raw.pedidos) || !raw.borrador || !Array.isArray(raw.borrador.partidas)) throw new Error('El expediente local no es válido.');
    const state = copia(raw);
    const numeros = new Set();
    for (const pedido of state.pedidos) {
      if (!pedido || !Number.isSafeInteger(pedido.numero) || pedido.numero < 1 || numeros.has(pedido.numero) ||
        pedido.id !== `pedido-${pedido.numero}` || !fechaValida(pedido.creadoEn) || typeof pedido.etiqueta !== 'string' || pedido.etiqueta.length > 60 ||
        !Array.isArray(pedido.partidas) || (!pedido.partidas.length && !pedido.partidasEliminadas?.length)) throw new Error('Pedido inválido en el expediente.');
      numeros.add(pedido.numero);
      const ids = new Set();
      for (const partida of pedido.partidas) {
        validarPartida(partida);
        if (typeof partida.id !== 'string' || ids.has(partida.id) || typeof partida.pagado !== 'boolean' || typeof partida.preparado !== 'boolean' ||
          (partida.pagado && !fechaValida(partida.pagadoEn)) || (partida.preparado && !fechaValida(partida.preparadoEn))) throw new Error('Estado de producto inválido.');
        ids.add(partida.id);
      }
      if (pedido.partidasEliminadas !== undefined) {
        if (!Array.isArray(pedido.partidasEliminadas)) throw new Error('Registro de productos eliminados inválido.');
        for (const partida of pedido.partidasEliminadas) {
          validarPartida(partida);
          if (typeof partida.id !== 'string' || ids.has(partida.id) || partida.pagado !== false || partida.pagadoEn !== null ||
            typeof partida.preparado !== 'boolean' || (partida.preparado && !fechaValida(partida.preparadoEn)) ||
            !fechaValida(partida.eliminadoEn) || Date.parse(partida.eliminadoEn) < Date.parse(pedido.creadoEn) ||
            (partida.preparado && Date.parse(partida.eliminadoEn) < Date.parse(partida.preparadoEn)) ||
            ['montoEfectivo', 'montoTarjeta', 'metodoPago', 'turnoId'].some(key => Object.hasOwn(partida, key))) throw new Error('Producto eliminado inválido.');
          ids.add(partida.id);
        }
      }
      const total = FreezeMonkeyPOS.totalPedido(pedido.partidas);
      if (pedido.totalCentavos !== total) throw new Error('Total inconsistente en el expediente.');
      pedido.estado = FreezeMonkeyOrders.estadoPedido(pedido);
    }
    state.pedidos = state.pedidos.map(FreezeMonkeyCash.normalizarPedidoPagos);
    for (const partida of state.borrador.partidas) validarPartida(partida);
    if (typeof state.borrador.etiqueta !== 'string' || state.borrador.etiqueta.length > 60) throw new Error('Etiqueta de borrador inválida.');
    if (state.adicion == null) state.adicion = null;
    else {
      if (!state.adicion || !state.pedidos.some(pedido => pedido.id === state.adicion.pedidoId) || !Array.isArray(state.adicion.partidas)) throw new Error('Selección para añadir inválida.');
      for (const partida of state.adicion.partidas) validarPartida(partida);
    }
    state.siguienteNumero = Math.max(1, ...numeros) + (numeros.size ? 1 : 0);
    if (Number.isSafeInteger(raw.siguienteNumero)) state.siguienteNumero = Math.max(state.siguienteNumero, raw.siguienteNumero);
    state.siguienteDelivery = FreezeMonkeyOrders.siguienteDelivery(state.pedidos, raw.siguienteDelivery === undefined ? 1 : raw.siguienteDelivery);
    state.colaOculta = !!state.colaOculta;
    // Los expedientes anteriores conservan sus ventas; empiezan sin turno activo.
    state.caja = FreezeMonkeyCash.normalizarCaja(state.caja);
    if (state.historialCortes === undefined) state.historialCortes = [];
    if (!Array.isArray(state.historialCortes)) throw new Error('Historial de cortes inválido.');
    state.historialCortes = state.historialCortes.map(FreezeMonkeyCash.normalizarCorte);
    FreezeMonkeyCash.validarVinculos(state.pedidos, state.caja, state.historialCortes);
    return state;
  }
  function cargarExpediente() {
    const text = localStorage.getItem(KEY);
    if (text != null) return normalizar(JSON.parse(text));
    const state = vacio();
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrado = normalizar(FreezeMonkeyMigration.desdeAnterior(JSON.parse(legacy)));
      migrado.colaOculta = localStorage.getItem('freeze-monkey-pos-queue-collapsed') === 'true';
      localStorage.setItem(KEY, JSON.stringify(migrado));
      return migrado;
    }
    return state;
  }
  function guardarExpediente(state) {
    const existing = localStorage.getItem(KEY);
    const previo = existing === null ? vacio() : normalizar(JSON.parse(existing));
    if (previo.revision !== state.revision) throw new Error('El expediente cambió en otra pestaña. Recarga para continuar.');
    const next = normalizar(state);
    next.siguienteDelivery = Math.max(next.siguienteDelivery, previo.siguienteDelivery);
    const anteriores = new Map(previo.pedidos.map(pedido => [pedido.id, pedido]));
    for (const pedido of next.pedidos) {
      const anterior = anteriores.get(pedido.id);
      // Las etiquetas antiguas repetidas siguen siendo legibles y guardables.
      const reabreMesa = anterior && FreezeMonkeyOrders.claveEtiqueta(pedido.etiqueta).startsWith('mesa:') &&
        !FreezeMonkeyOrders.cuentaPendiente(anterior) && FreezeMonkeyOrders.cuentaPendiente(pedido);
      if (anterior && anterior.etiqueta === pedido.etiqueta && !reabreMesa) continue;
      const ocupado = FreezeMonkeyOrders.pedidoConEtiqueta(previo.pedidos, pedido.etiqueta, pedido.id) ||
        FreezeMonkeyOrders.pedidoConEtiqueta(next.pedidos, pedido.etiqueta, pedido.id);
      if (ocupado) throw new Error(`La etiqueta ${pedido.etiqueta} ya tiene un pedido abierto (N° ${ocupado.numero}).`);
      const delivery = FreezeMonkeyOrders.numeroDelivery(pedido.etiqueta);
      if (delivery !== null) {
        const repetido = [...previo.pedidos, ...next.pedidos].some(item => item.id !== pedido.id && FreezeMonkeyOrders.numeroDelivery(item.etiqueta) === delivery);
        if (repetido || (!anterior && delivery < previo.siguienteDelivery)) {
          throw new Error(`Delivery #${delivery} ya fue utilizado. Selecciona Delivery para asignar el siguiente número.`);
        }
      }
    }
    next.revision++;
    next.guardadoEn = new Date().toISOString();
    // Si setItem falla, el estado anterior permanece íntegro y la venta no se confirma.
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }
  function reemplazarExpediente(raw, revision) {
    const previo = cargarExpediente();
    if (previo.revision !== revision) throw new Error('El expediente cambió en otra pestaña. Vuelve a cargar el respaldo.');
    const next = normalizar(raw);
    next.revision = previo.revision + 1;
    next.guardadoEn = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(next));
    return next;
  }
  function exportarJSON(state) {
    const contenido = JSON.stringify(normalizar(state), null, 2);
    const url = URL.createObjectURL(new Blob([contenido], { type: 'application/json;charset=utf-8' }));
    const enlace = document.createElement('a');
    enlace.href = url; enlace.download = `freeze-monkey-expediente-${FreezeMonkeyHistory.fechaLocal()}.json`;
    document.body.append(enlace); enlace.click(); enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function leerRespaldo(file) {
    if (file.name.toLowerCase().endsWith('.csv')) return normalizar(FreezeMonkeyMigration.desdeAnterior(await FreezeMonkeyLegacyStorage.importExpediente(file)));
    if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Selecciona un expediente JSON o un CSV de la versión anterior.');
    const raw = JSON.parse((await file.text()).replace(/^\uFEFF/, ''));
    return normalizar(Array.isArray(raw.orders) ? FreezeMonkeyMigration.desdeAnterior(raw) : raw);
  }
  return Object.freeze({ KEY, vacio, normalizar, cargarExpediente, guardarExpediente, reemplazarExpediente, exportarJSON, leerRespaldo });
})();
