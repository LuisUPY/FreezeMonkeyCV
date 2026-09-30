// Ejecutar con Node y Playwright instalado: node tests/pos-regression.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium, webkit } = require('playwright');
const root = path.resolve(__dirname, '..');
const key = 'freeze-monkey-pos-v1';
const server = http.createServer(async (req, res) => {
  try {
    const file = path.join(root, decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) throw new Error('invalid path');
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404).end(); }
});
async function run(browserType) {
  const browser = await browserType.launch(browserType.name() === 'chromium' ? {channel:'chromium'} : {});
  try {
    const context = await browser.newContext();
    // El POS debe funcionar también sin los CDN de fuente/Tailwind.
    await context.route('https://**/*', route => route.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.goto(base);
    for (const [width, height] of [[1440,900],[1192,589],[768,1024],[390,844],[844,390]]) {
      await page.setViewportSize({ width, height });
      for (const count of [1,3,9,24]) {
        await page.evaluate(({ key, count }) => {
          const data = FreezeMonkeyStorage.emptyState();
          const product = FreezeMonkeyMenu.MENU.find(item => item.kind === 'product' && item.image);
          data.draft.items = Array.from({length:count}, () => FreezeMonkeyMenu.buildLine(product));
          localStorage.setItem(key, JSON.stringify(data));
        }, {key, count});
        await page.reload();
        await page.locator('#create-order').click();
        await page.locator('#order-gallery img').first().waitFor();
        const layout = await page.evaluate(() => {
          const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}; };
          return {modal:rect('#order-dialog'),body:rect('.order-modal-body'),image:rect('#order-gallery img'),button:rect('#confirm-order'), overflow:document.querySelector('.order-modal-body').scrollWidth > document.querySelector('.order-modal-body').clientWidth + 1};
        });
        assert(layout.body.height >= 100, `${browserType.name()} ${width}x${height} count${count}: collapsed body ${JSON.stringify(layout)}`);
        assert(layout.image.height >= 79, 'Product preview collapsed');
        assert(layout.button.bottom <= height && layout.button.y >= 0, 'Confirm action outside viewport');
        assert(layout.modal.y >= 0 && layout.modal.bottom <= height + 1, 'Modal outside viewport');
        assert(!layout.overflow, 'Horizontal overflow');
        assert.equal(await page.locator('#order-gallery figure').count(), count);
        if (width === 390 && count === 3 || width === 1192 && count === 9) {
          await page.screenshot({path: path.join('/private/tmp', `freeze-monkey-${browserType.name()}-${width}.png`)});
        }
        await page.locator('#order-dialog [data-close-dialog]').click();
      }
    }
    await page.setViewportSize({width:1192,height:800});
    const label = 'A domicilio · Ana <VIP> "1"';
    await page.locator('#draft-label').fill(label);
    await page.reload();
    assert.equal(await page.locator('#draft-label').inputValue(), label);
    await page.locator('#create-order').click();
    assert.equal(await page.locator('#order-label').inputValue(), label);
    await page.locator('#confirm-order').click();
    assert.equal(await page.locator('.queue-label').textContent(), label);
    await page.locator('[data-open-order]').click();
    await page.locator('#order-label').fill('Mesa 2');
    await page.locator('#mark-ready').click();
    await page.locator('#mark-paid').click();
    await page.locator('#order-dialog [data-close-dialog]').click();
    await page.reload();
    assert.equal(await page.locator('#sales-count').textContent(), '1');
    await page.locator('#history-button').click();
    assert.equal(await page.locator('.history-label').textContent(), 'Mesa 2');
    await page.locator('#history-dialog [data-close-dialog]').click();
    const roundtrip = await page.evaluate(async key => {
      const api = FreezeMonkeyStorage, state = api.loadState();
      let content;
      const oldCreate = URL.createObjectURL;
      URL.createObjectURL = blob => { content = blob; return oldCreate(blob); };
      api.exportExcelCSV(state);
      URL.createObjectURL = oldCreate;
      const csv = await content.text();
      const imported = await api.importExpediente(new File([csv], 'test.csv'));
      const json = await api.importExpediente(new File([JSON.stringify(state)], 'test.json'));
      // Expedientes anteriores sin etiqueta siguen siendo válidos.
      const oldState = structuredClone(state); delete oldState.orders[0].label;
      const legacy = api.normalizeState(oldState);
      const legacyCSV = csv.split('\r\n').map(row => row.slice(0, row.lastIndexOf(';'))).join('\r\n');
      const oldCSV = await api.importExpediente(new File([legacyCSV], 'legacy.csv'));
      return [imported.orders[0].label, json.orders[0].label, legacy.orders[0].label, oldCSV.orders[0].label];
    }, key);
    assert.deepEqual(roundtrip, ['Mesa 2','Mesa 2','','']);
    await page.evaluate(key => {
      const data = FreezeMonkeyStorage.loadState();
      data.orders.push({...structuredClone(data.orders[0]), id:'open-test', number:2, status:'ABIERTO', paidAt:null});
      data.nextNumber = 3;
      data.draft = {items:[structuredClone(data.orders[0].items[0])], extras:[], label:'Pendiente'};
      localStorage.setItem(key, JSON.stringify(data));
    }, key);
    await page.reload();
    await page.locator('#options-button').click(); await page.locator('#reset-day').click();
    await page.getByRole('button', {name:'Cancelar',exact:true}).click();
    assert.equal(await page.locator('#sales-count').textContent(), '1');
    await page.locator('#options-button').click(); await page.locator('#reset-day').click();
    await page.locator('#confirm-reset').click(); await page.reload();
    const reset = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    assert.equal(reset.orders.length,0); assert.equal(reset.nextNumber,1); assert.equal(reset.draft.label,''); assert.equal(reset.draft.items.length,0);
    assert.equal(await page.locator('#sales-total').textContent(), '$0.00');
    assert.deepEqual(errors, []);
    console.log(`${browserType.name()}: 20 pruebas de tamaño/contenido + etiquetas, JSON/CSV, compatibilidad anterior y reinicio OK`);
    await context.close();
  } finally { await browser.close(); }
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  try { for (const engine of (process.env.POS_TEST_BROWSER === 'chromium' ? [chromium] : [webkit,chromium])) await run(engine); }
  finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
