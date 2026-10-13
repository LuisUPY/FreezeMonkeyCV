/* Catálogo Freeze Monkey sobre el modelo de opciones del proyecto Template. */
const menuDB = (() => {
  const { DRINKS, SNACKS, TENDER, TENDER_FLAVORS, COMBOS, CAJA, findProduct } = FreezeMonkeyMenu;
  const BONELESS = findProduct('snack-monkey-boneless');
  const opcion = (id, nombre, productos) => ({ id, nombre, tipo: 'unica', requerido: true,
    valores: productos.map(p => ({ id: p.id, nombre: p.name, precioExtra: 0 })) });
  const sabor = () => ({ id: 'sabor', nombre: 'Sabor', tipo: 'unica', requerido: true,
    valores: TENDER_FLAVORS.map(nombre => ({ id: nombre, nombre, precioExtra: 0 })) });
  const producto = (p, descripcion = '') => ({ id: p.id, nombre: p.name, precio: p.price,
    descripcion, imagen: p.image, tipo: p.kind, opciones: [] });
  const bebidas = categoria => DRINKS.filter(p => p.category === categoria).map(p => producto(p, 'Bebida fría a tu elección.'));
  return {
    Bebidas: { 'Frappés': bebidas('frappes'), Smoothies: bebidas('smoothies'), Limonadas: bebidas('limonadas') },
    Snacks: {
      'Para picar': SNACKS.map(p => producto(p, 'Recién preparado para acompañar tu bebida.')),
      'Tenders y boneless': [TENDER, BONELESS].map(p => ({ ...producto(p, 'Elige Naturales, BBQ o Búfalo.'), opciones: [sabor()] })),
      'Caja Salvaje': [producto(CAJA, 'La caja para compartir. También incluida en Combo Manada.')]
    },
    Combos: { 'A tu elección': COMBOS.map(p => {
      const opciones = [];
      for (let i = 1; i <= (p.requirements.drink || 0); i++) opciones.push(opcion(`bebida-${i}`, `Bebida ${i}`, DRINKS));
      for (let i = 1; i <= (p.requirements.snack || 0); i++) opciones.push(opcion(`snack-${i}`, `Snack ${i}`, SNACKS));
      if (p.requirements.tender || p.requirements.boneless) opciones.push(sabor());
      return { ...producto(p, `${p.note}. Precio fijo con cualquier selección.`), opciones,
        componentesFijos: (p.included || []).map(item => item.id), incluyeTenders: !!p.requirements.tender,
        incluyeBoneless: !!p.requirements.boneless };
    }) }
  };
})();
globalThis.menuDB = menuDB;
