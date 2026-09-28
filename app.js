const prices = {
  'combo-viral':95,'combo-ozaru':180,'combo-manada':289,'caja-salvaje':179,'combo-tenders':120
};
const corrections = {'combo-viral':'Combo Viral','combo-ozaru':'Combo Ozaru','combo-manada':'Combo Manada','caja-salvaje':'Caja Salvaje','combo-tenders':'Combo Tenders','frappe-albino-kong':'Albino Kong','frappe-mandril-mamut':'Mandril Mamut','frappe-mojo-choco':'Mojo Choco','frappe-mono-real':'Mono Real','frappe-kranfiky':'Kranfiky','frappe-mono-capuccino':'Mono Capuccino','frappe-dk-oreo':'DK Oreo','frappe-lotus-de-george':'El Lotus de George','smoothie-mango-salvaje':'Mango Salvaje','smoothie-fresa-salvaje':'Fresa Salvaje','smoothie-mono-sandillero':'Mono Sandillero','smoothie-pina-tropical':'Piña Tropical','smoothie-fresa':'Fresa','smoothie-mango':'Mango','smoothie-sandia':'Sandía','smoothie-pina':'Piña'};
const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:0}).format(n);
let products = [], category = 'todos';
let cart = {};
try { cart = JSON.parse(localStorage.getItem('freeze-monkey-demo-cart') || '{}') || {}; } catch {}
const $ = id => document.getElementById(id);
const safe = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderProducts(){
  const query = $('search').value.trim().toLocaleLowerCase('es');
  const shown = products.filter(p=>(category==='todos'||p.category===category) && p.name.toLocaleLowerCase('es').includes(query));
  $('result-count').textContent = `${shown.length} ${shown.length===1?'producto':'productos'}`;
  $('empty').hidden = shown.length!==0;
  $('products').innerHTML = shown.map(p=>`<article class="card"><div class="photo"><img src="${p.image}" alt="${safe(p.name)}" width="${p.width}" height="${p.height}" loading="lazy" decoding="async"></div><div class="details"><p class="kind">${p.category==='frappes'?'Frappé':p.category==='smoothies'?'Smoothie':'Combo'}</p><h3>${safe(p.name)}</h3><div class="buyline"><span class="price">${money(p.price)}</span><button class="add" type="button" data-add="${p.id}" aria-label="Agregar ${safe(p.name)}">Agregar</button></div></div></article>`).join('');
}
function renderCart(){
  const items = products.filter(p=>cart[p.id]>0);
  $('cart-count').textContent = items.reduce((n,p)=>n+cart[p.id],0);
  $('cart-items').innerHTML = items.length ? items.map(p=>`<div class="cart-row"><div><b>${safe(p.name)}</b><small>${money(p.price)} c/u</small></div><div class="qty"><button type="button" data-change="${p.id}" data-by="-1" aria-label="Quitar un ${safe(p.name)}">−</button><span>${cart[p.id]}</span><button type="button" data-change="${p.id}" data-by="1" aria-label="Agregar un ${safe(p.name)}">+</button></div></div>`).join('') : '<p class="cart-empty">Todavía no agregas productos.</p>';
  $('total').textContent = money(items.reduce((n,p)=>n+cart[p.id]*p.price,0));
  try { localStorage.setItem('freeze-monkey-demo-cart',JSON.stringify(cart)); } catch {}
}
document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add]'),change=e.target.closest('[data-change]'),filter=e.target.closest('[data-filter]');
  if(add){cart[add.dataset.add]=(cart[add.dataset.add]||0)+1;renderCart();}
  if(change){const id=change.dataset.change;cart[id]=Math.max(0,(cart[id]||0)+Number(change.dataset.by));renderCart();}
  if(filter){category=filter.dataset.filter;document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===filter));renderProducts();}
});
$('search').addEventListener('input',renderProducts);
$('clear').addEventListener('click',()=>{cart={};renderCart();});
$('cart-toggle').addEventListener('click',()=>{$('cart').classList.add('open');$('cart-toggle').setAttribute('aria-expanded','true');});
$('cart-close').addEventListener('click',()=>{$('cart').classList.remove('open');$('cart-toggle').setAttribute('aria-expanded','false');});
fetch('products.json').then(r=>{if(!r.ok)throw Error('No se pudo abrir el catálogo');return r.json();}).then(data=>{products=data.map(p=>({...p,name:corrections[p.id]||p.name,price:prices[p.id]??60}));renderProducts();renderCart();}).catch(()=>{$('products').textContent='No se pudo cargar el catálogo. Abre el sitio desde un servidor web.';});
