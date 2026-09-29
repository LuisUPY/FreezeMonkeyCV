// Scripts clásicos para permitir abrir index.html directamente desde file://.
globalThis.FreezeMonkeyMenu = (() => {
'use strict';

// Catálogo basado en las fotografías entregadas. Todos los importes están en MXN.
const image = file => file ? `./assets/img/productos/${file}.webp` : null;
let idSequence = 0;
function createId() {
  return globalThis.crypto?.randomUUID?.() || `fm-${Date.now().toString(36)}-${++idSequence}-${Math.random().toString(36).slice(2)}`;
}

const DRINKS = [
  ['frappe-albino-kong', 'Frappé Albino Kong', 'frappes'],
  ['frappe-dk-oreo', 'Frappé DK Oreo', 'frappes'],
  ['frappe-kranfiky', 'Frappé Kranfiky', 'frappes'],
  ['frappe-lotus-de-george', 'Frappé El Lotus de George', 'frappes'],
  ['frappe-mandril-mamut', 'Frappé Mandril Mamut', 'frappes'],
  ['frappe-mojo-choco', 'Frappé Mojo Choco', 'frappes'],
  ['frappe-mono-capuccino', 'Frappé Mono Capuccino', 'frappes'],
  ['frappe-mono-real', 'Frappé Mono Real', 'frappes'],
  ['smoothie-fresa', 'Smoothie Fresa', 'smoothies'],
  ['smoothie-fresa-salvaje', 'Smoothie Fresa Salvaje', 'smoothies'],
  ['smoothie-mango', 'Smoothie Mango', 'smoothies'],
  ['smoothie-mango-salvaje', 'Smoothie Mango Salvaje', 'smoothies'],
  ['smoothie-mono-sandillero', 'Smoothie Mono Sandillero', 'smoothies'],
  ['smoothie-pina', 'Smoothie Piña', 'smoothies'],
  ['smoothie-pina-tropical', 'Smoothie Piña Tropical', 'smoothies'],
  ['smoothie-sandia', 'Smoothie Sandía', 'smoothies'],
  ['limonada-fresa', 'Limonada de Fresa', 'limonadas'],
  ['limonada-azul', 'Limonada Azul', 'limonadas']
].map(([id, name, category]) => ({ id, name, category, kind: 'drink', price: 60, image: image(category === 'limonadas' ? null : id) }));

const SNACKS = [
  ['snack-papas-francesas', 'Papas francesas', 40],
  ['snack-papas-gajo', 'Papas gajo', 40],
  ['snack-aros-de-cebolla', 'Aros de cebolla', 40],
  ['snack-salchipulpos', 'Salchipulpos', 40],
  ['snack-dedos-de-queso', 'Dedos de queso', 50]
].map(([id, name, price]) => ({ id, name, category: 'snacks', kind: 'snack', price, image: image(id) }));

const TENDER_FLAVORS = ['Naturales', 'BBQ', 'Búfalo'];
const TENDER = {
  id: 'snack-monkey-tenders', name: 'Tenders', category: 'snacks', kind: 'tender',
  price: 70, image: image('snack-monkey-tenders')
};

const COMBOS = [
  { id: 'combo-viral', name: 'Combo Viral', category: 'combos', kind: 'combo', price: 95, image: image('combo-viral'), requirements: { drink: 1, snack: 1 }, note: '1 bebida + 1 snack' },
  { id: 'combo-ozaru', name: 'Combo Ozaru', category: 'combos', kind: 'combo', price: 180, image: image('combo-ozaru'), requirements: { drink: 2, snack: 2 }, note: '2 bebidas + 2 snacks' },
  { id: 'combo-manada', name: 'Combo Manada', category: 'combos', kind: 'combo', price: 289, image: image('combo-manada'), requirements: { drink: 2 }, included: [{ name: 'Platón de snacks', price: 169 }], note: 'Platón de snacks + 2 bebidas' },
  { id: 'combo-tenders', name: 'Combo Tender', category: 'combos', kind: 'combo', price: 120, image: image('combo-tenders'), requirements: { drink: 1, tender: 1 }, note: 'Tenders + 1 bebida' }
];

const CAJA = { id: 'caja-salvaje', name: 'Caja Salvaje', category: 'snacks', kind: 'product', price: 179, image: image('caja-salvaje') };

// Combos intercalados para que estén visibles durante el recorrido del catálogo.
const byId = new Map([...DRINKS, ...SNACKS, TENDER, ...COMBOS, CAJA].map(product => [product.id, product]));
const order = [
  'combo-viral', 'frappe-albino-kong', 'smoothie-fresa', 'snack-papas-francesas',
  'combo-ozaru', 'frappe-dk-oreo', 'smoothie-mango', 'snack-dedos-de-queso',
  'combo-manada', 'frappe-kranfiky', 'smoothie-sandia', 'snack-aros-de-cebolla',
  'combo-tenders', 'snack-monkey-tenders', 'frappe-lotus-de-george', 'smoothie-pina',
  'caja-salvaje', 'frappe-mandril-mamut', 'smoothie-fresa-salvaje', 'snack-papas-gajo',
  'frappe-mojo-choco', 'smoothie-mango-salvaje', 'snack-salchipulpos',
  'frappe-mono-capuccino', 'smoothie-mono-sandillero', 'limonada-fresa', 'limonada-azul',
  'frappe-mono-real', 'smoothie-pina-tropical'
];
const MENU = order.map(id => byId.get(id));
const findProduct = id => byId.get(id);

function buildLine(product, selections = {}) {
  if (!product) throw new Error('Producto desconocido');
  if (product.kind === 'combo') {
    const drinks = selections.drinks || [];
    const snacks = selections.snacks || [];
    const flavor = selections.tenderFlavor;
    const req = product.requirements;
    if (drinks.length !== (req.drink || 0) || snacks.length !== (req.snack || 0) || (req.tender && !TENDER_FLAVORS.includes(flavor))) {
      throw new Error('Completa todas las elecciones del combo');
    }
    const chosen = [...drinks.map(id => findProduct(id)), ...snacks.map(id => findProduct(id))];
    if (chosen.some((item, index) => !item || (index < drinks.length ? item.kind !== 'drink' : item.kind !== 'snack'))) {
      throw new Error('Selección de combo inválida');
    }
    const components = [
      ...(product.included || []).map(item => ({ ...item })),
      ...chosen.map(item => ({ id: item.id, name: item.name, price: item.price })),
      ...(req.tender ? [{ id: TENDER.id, name: `Tenders ${flavor}`, price: TENDER.price }] : [])
    ];
    return { uid: createId(), productId: product.id, name: product.name, price: product.price, image: product.image, components, selections: { drinks, snacks, tenderFlavor: flavor || null } };
  }
  if (product.kind === 'tender' && !TENDER_FLAVORS.includes(selections.tenderFlavor)) throw new Error('Elige el sabor de tenders');
  return {
    uid: createId(), productId: product.id,
    name: product.kind === 'tender' ? `Tenders ${selections.tenderFlavor}` : product.name,
    price: product.price, image: product.image,
    components: [], selections: product.kind === 'tender' ? { tenderFlavor: selections.tenderFlavor } : {}
  };
}

const money = value => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

return { DRINKS, SNACKS, TENDER_FLAVORS, TENDER, COMBOS, CAJA, MENU, findProduct, buildLine, money, createId };
})();
