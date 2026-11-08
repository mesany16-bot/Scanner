// PRG Systems – testovací robot
// Projde web (Dashboard) a scanner jako skutečný uživatel v testovacím DC 99 a ověří hlavní procesy.
// Spuštění:  BASE_URL=https://mesany16-bot.github.io/Scanner/ BOT_EMAIL=... BOT_PASSWORD=... node tests/bot.mjs
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = (process.env.BASE_URL || 'https://mesany16-bot.github.io/Scanner/').replace(/\/?$/, '/');
const EMAIL = process.env.BOT_EMAIL || 'test.bot@prg.test';
const PASS = process.env.BOT_PASSWORD || '';
const LOCAL_BRIDGE = process.env.LOCAL_BRIDGE || '';      // jen pro vývoj (náhrada Supabase)
const OUT = process.env.OUT_DIR || 'bot-report';
fs.mkdirSync(OUT, { recursive: true });

const results = [];
let shotNo = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function log(...a) { console.log(...a); }

async function step(name, fn, page) {
  const t0 = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t0 });
    log('OK   ' + name);
  } catch (e) {
    let shot = '';
    if (page) { shot = `${OUT}/${String(++shotNo).padStart(2, '0')}-chyba.png`; try { await page.screenshot({ path: shot, fullPage: true }); } catch (_) { shot = ''; } }
    results.push({ name, ok: false, ms: Date.now() - t0, err: String(e && e.message || e).slice(0, 500), shot });
    log('FAIL ' + name + ' :: ' + String(e && e.message || e).slice(0, 300));
  }
}
function must(c, msg) { if (!c) throw new Error(msg); }

async function newCtx(browser, mobile) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'cs-CZ' }
    : { viewport: { width: 1366, height: 860 }, locale: 'cs-CZ' });
  if (LOCAL_BRIDGE) {
    await ctx.route(/cdnjs|jsdelivr|unpkg|googleapis|gstatic/, r => r.fulfill({ body: '', contentType: 'text/javascript' }));
    await ctx.route(/supabase-js/, r => r.fulfill({ body: fs.readFileSync(LOCAL_BRIDGE), contentType: 'text/javascript' }));
  }
  await ctx.addInitScript(() => { try { localStorage.setItem('prg_lang', 'cs'); localStorage.setItem('prg_scn_input', 'reader'); } catch (e) {} });
  return ctx;
}
function watch(page, bag) {
  page.on('pageerror', e => bag.push('JS chyba: ' + e.message));
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('response', r => {
    const u = r.url();
    if (/supabase\.co\/(rest|functions)\//.test(u) && r.status() >= 400 && r.status() !== 406) bag.push(`Server ${r.status()}: ${u.replace(/^https?:\/\/[^/]+/, '').slice(0, 140)}`);
  });
}

(async () => {
  must(PASS || LOCAL_BRIDGE, 'Chybí BOT_PASSWORD');
  const browser = await chromium.launch();
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const ctx = { dc: null, client: null, run: new Date().toISOString().slice(2, 19).replace(/[-:T]/g, ''), qa: rnd(2, 12), qb: rnd(5, 8) };
  ctx.qd = rnd(1, ctx.qa - 1); // vzdy necha zasobu pro blokaci a inventuru
  log(`Množství tohoto běhu: A ${ctx.qa}, B ${ctx.qb}, výdej A ${ctx.qd}`);

  // ================= WEB =================
  const wctx = await newCtx(browser, false);
  const web = await wctx.newPage(); const werr = []; watch(web, werr);

  await step('Web: přihlášení', async () => {
    await web.goto(BASE + 'wms_dashboard.html', { waitUntil: 'domcontentloaded' });
    const need = await web.waitForFunction(() => { const l = document.getElementById('login-email'); const a = document.getElementById('auth-screen'); if (l && l.offsetParent) return 'login'; if (a && getComputedStyle(a).display === 'none' && document.getElementById('mode-select-screen')) return 'in'; return false; }, null, { timeout: 25000 }).then(h => h.jsonValue());
    if (need === 'in') return;
    await web.fill('#login-email', EMAIL); await web.fill('#login-pass', PASS);
    await web.click('#login-form button[type=submit]');
    await web.waitForFunction(() => { const a = document.getElementById('auth-screen'); return !a || getComputedStyle(a).display === 'none'; }, null, { timeout: 20000 });
  }, web);

  const PAGES = ['wms_dashboard.html?app=wms', 'wms_kpi.html', 'wms_stock.html', 'wms_balances.html', 'wms_occupancy.html', 'wms_accuracy.html',
    'wms_adjustments.html', 'wms_history.html', 'wms_clients.html', 'wms_receipts.html', 'wms_deliveries.html', 'wms_yard.html',
    'wms_scans.html', 'wms_exceptions.html', 'wms_locations.html', 'wms_inventura.html', 'wms_temp.html', 'wms_reports.html', 'wms_returns.html', 'wms_eod.html'];
  for (const p of PAGES) {
    await step('Web: stránka ' + p, async () => {
      werr.length = 0;
      await web.goto(BASE + p, { waitUntil: 'domcontentloaded' });
      await sleep(3500);
      const login = await web.$('#login-email');
      must(!login || !(await login.isVisible()), 'stránka chce znovu přihlásit');
      const toast = await web.evaluate(() => [...document.querySelectorAll('.toast,#toast')].map(t => t.textContent).join(' '));
      must(!/❌/.test(toast), 'chybová hláška: ' + toast.slice(0, 160));
      must(!werr.length, werr.slice(0, 3).join(' | '));
    }, web);
  }

  await step('Web: reporty (všech 31 přehledů) a log skenů', async () => {
    await web.goto(BASE + 'wms_reports.html', { waitUntil: 'domcontentloaded' }); await sleep(3000);
    const bad = await web.evaluate(async () => { const out = []; const cl = await supa.from('clients').select('id').eq('name', 'TEST robot').limit(1); const cid = cl.data && cl.data[0] && cl.data[0].id; for (const r of REPORTS) { const p = { from: '2026-01-01', q: 'LPN', days: 0 }; if (r.needClient) p.client = cid; const x = await supa.rpc('wms_report', { p_code: r.c, p }); if (x.error) out.push(r.c + ': ' + x.error.message); } const sl = await supa.rpc('wms_scan_log', { p: { from: '2026-01-01', limit: 50 } }); if (sl.error) out.push('skeny: ' + sl.error.message); return out; });
    must(!bad.length, bad.slice(0, 4).join(' | '));
  }, web);

  await step('Web: přepnutí jazyka EN → CS', async () => {
    await web.goto(BASE + 'wms_dashboard.html?app=wms', { waitUntil: 'domcontentloaded' }); await sleep(2500);
    const cs = await web.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    await web.evaluate(() => PRG_I18N.setLang('en')); await sleep(400);
    const en = await web.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    must(en !== cs, 'angličtina se neprojevila');
    await web.evaluate(() => PRG_I18N.setLang('cs')); await sleep(400);
    const cs2 = await web.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    must(cs2 === cs, 'po návratu do češtiny zůstal jiný text');
  }, web);

  // ================= SCANNER =================
  const sctx = await newCtx(browser, true);
  const s = await sctx.newPage(); const serr = []; watch(s, serr);
  const status = () => s.evaluate(() => (typeof LAST_STATUS !== 'undefined' && LAST_STATUS) || document.getElementById('status-bar').textContent);
  let lastCode = null;
  const type = async code => { lastCode = code; await s.fill('#manual-code', code); await s.press('#manual-code', 'Enter'); await sleep(900); };
  const sheetOk = async (qty) => { try { await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 5000 }); } catch (e0) { if (lastCode && /naskenuj/i.test(await status())) { await type(lastCode); } } try { await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 8000 }); } catch (e) { throw new Error('formulář množství se neotevřel · stav: ' + await status() + ' · panel: ' + (await s.textContent('#task-panel')).replace(/\s+/g, ' ').slice(0, 160)); } if (qty != null) await s.fill('#tkf-qty', String(qty)); await s.click('#tk-ok'); await sleep(1200); };
  const db = (fn, arg) => s.evaluate(fn, arg);

  await step('Scanner: přihlášení', async () => {
    await s.goto(BASE + 'prg_scanner_v5.html', { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    const need = await s.waitForFunction(() => { if (typeof currentUserId !== 'undefined' && currentUserId) return 'in'; const m = document.getElementById('modal-login'); if (m && getComputedStyle(m).display !== 'none') return 'login'; return false; }, null, { timeout: 25000 }).then(h => h.jsonValue());
    if (need === 'in') return;
    await s.fill('#login-email', EMAIL); await s.fill('#login-password', PASS);
    await s.click('#login-form button[type=submit]');
    await s.waitForFunction(() => typeof currentUserId !== 'undefined' && currentUserId, null, { timeout: 20000 });
    await sleep(1500);
  }, s);

  await step('Scanner: testovací DC 99 a klient', async () => {
    const r = await db(async () => {
      const w = await supa.from('warehouses').select('id,code').in('code', ['99', 'DC99']).limit(1);
      const c = await supa.from('clients').select('id').eq('name', 'TEST robot').limit(1);
      return { w: w.data && w.data[0], c: c.data && c.data[0], e: (w.error || c.error || {}).message };
    });
    must(r.w && r.c, 'chybí DC 99 nebo klient TEST robot (spusť bot_setup SQL) ' + (r.e || ''));
    ctx.dc = r.w.id; ctx.client = r.c.id;
    await db(dc => { try { localStorage.setItem('prg_dc', String(dc)); sessionStorage.setItem('prg_scanner_dc', String(dc)); } catch (e) {} currentDcId = dc; ['modal-dc', 'mode-select-screen'].forEach(id => { const e = document.getElementById(id); if (e) e.style.display = 'none'; }); if (typeof hubClose === 'function') hubClose(); selectAppMode('wms'); }, ctx.dc);
    await sleep(800);
  }, s);

  // ---- příjem ----
  let rc = null;
  await step('Příjem: založení dokladu (jako z webu)', async () => {
    rc = await db(async a => {
      const num = 'BOT-PRI-' + a.run;
      const r = await supa.from('receipts').insert({ receipt_number: num, client_id: a.client, warehouse_id: a.dc, status: 'new', supplier: 'Robot', note: 'automaticky test', created_by: currentUserId }).select().single();
      if (r.error) return { e: r.error.message };
      const i = await supa.from('receipt_items').insert([{ receipt_id: r.data.id, sku: 'BOT-A', quantity: a.qa }, { receipt_id: r.data.id, sku: 'BOT-B', quantity: a.qb }]);
      if (i.error) return { e: i.error.message };
      return { id: r.data.id, num };
    }, ctx);
    must(rc && rc.id, 'nelze založit příjem: ' + (rc && rc.e));
  }, s);

  await step('Příjem: naskenování na scanneru', async () => {
    must(rc && rc.id, 'příjem neexistuje');
    await s.evaluate(() => tkOpenList('receipt')); await sleep(1500);
    must((await s.textContent('#task-panel')).includes(rc.num), 'příjem není v seznamu úkolů');
    await type(rc.num);
    await type('2999000000011'); await sheetOk(ctx.qa);
    // BOT-B přes jednotky balení: outer (karton 4 ks) + volné kusy
    await type('3999000000029'); await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 8000 });
    if (await s.$('#tkf-uom')) { await s.selectOption('#tkf-uom', 'outer'); await s.fill('#tkf-cnt', String(Math.floor(ctx.qb / 4))); await s.fill('#tkf-loose', String(ctx.qb % 4)); await s.click('#tk-ok'); await sleep(1200); }
    else await sheetOk(ctx.qb);
    const st = await db(id => supa.from('receipts').select('status').eq('id', id).single().then(r => r.data && r.data.status), rc.id);
    const uomRow = await db(id => supa.from('receipt_scans').select('sku,qty,uom,uom_count,loose_qty').eq('receipt_id', id).eq('sku', 'BOT-B').then(r => r.data && r.data[0]), rc.id);
    must(uomRow && Number(uomRow.qty) === ctx.qb && (ctx.qb < 4 || uomRow.uom === 'outer'), 'jednotky balení se neuložily: ' + JSON.stringify(uomRow));
    must(st === 'receiving', 'stav příjmu je ' + st + ' (čekáno receiving) · ' + await status());
  }, s);

  await step('Příjem: dokončení', async () => {
    await s.evaluate(() => tkReceiptFinish()); await sleep(2500);
    const st = await db(id => supa.from('receipts').select('status,problem').eq('id', id).single().then(r => r.data), rc.id);
    must(st && /received|putaway|done/.test(st.status), 'stav po dokončení: ' + JSON.stringify(st));
  }, s);

  await step('Zaskladnění: obě palety na lokace', async () => {
    const lpns = await db(id => supa.from('receipt_scans').select('lpn,sku').eq('receipt_id', id).then(r => r.data || []), rc.id);
    must(lpns.length >= 2 && lpns.every(x => x.lpn), 'chybí LPN palet: ' + JSON.stringify(lpns));
    const locs = ['BOT-01-01', 'BOT-01-02'];
    for (let i = 0; i < 2; i++) { await type(lpns[i].lpn); await type(locs[i]); await sleep(800); }
    const st = await db(id => supa.from('receipts').select('status').eq('id', id).single().then(r => r.data && r.data.status), rc.id);
    must(st === 'done', 'stav příjmu po zaskladnění: ' + st + ' · ' + await status());
    const bal = await db(a => supa.from('stock_balances').select('location_code,units_total').in('lpn', a).then(r => r.data || []), lpns.map(x => x.lpn));
    must(bal.length === 2 && bal.every(b => /^BOT-/.test(b.location_code)), 'zásoby nejsou na lokacích: ' + JSON.stringify(bal));
  }, s);

  await step('Doplnění pick lokace: úloha a přesun části palety', async () => {
    const t = await db(async a => {
      const u = await supa.from('stock_items').update({ primary_location: 'BOT-02-01', pick_min: 1, pick_max: 1 }).eq('sku', 'BOT-A').eq('client_id', a.client);
      if (u.error) return { e: 'SKU: ' + u.error.message };
      await supa.from('repl_tasks').update({ status: 'cancelled' }).eq('dc_id', a.dc).eq('status', 'open');
      const g = await supa.rpc('wms_repl_generate', { p_dc: a.dc, p_user: currentUserId });
      if (g.error) return { e: 'generování: ' + g.error.message };
      const r = await supa.from('repl_tasks').select('*').eq('dc_id', a.dc).eq('sku', 'BOT-A').eq('status', 'open');
      return { n: g.data, t: r.data && r.data[0] };
    }, ctx);
    must(t && !t.e, t && t.e);
    must(t.t && Number(t.t.qty) === 1 && t.t.priority === 1, 'úloha doplnění: ' + JSON.stringify(t));
    await s.evaluate(() => tkStartRepl()); await sleep(2500);
    await type(t.t.lpn); await type('BOT-02-01'); await sleep(1500);
    const r = await db(async a => {
      const d = await supa.from('repl_tasks').select('status').eq('id', a.id).single();
      const b = await supa.from('stock_balances').select('location_code,units_total').eq('dc_id', a.dc).eq('sku', 'BOT-A').gt('units_total', 0);
      await supa.from('stock_items').update({ primary_location: null, pick_min: null, pick_max: null }).eq('sku', 'BOT-A').eq('client_id', a.client);
      return { st: d.data && d.data.status, b: b.data };
    }, { id: t.t.id, dc: ctx.dc, client: ctx.client });
    must(r.st === 'done', 'úloha není hotová: ' + r.st + ' · ' + await status());
    const pick = (r.b || []).filter(x => x.location_code === 'BOT-02-01').reduce((a, x) => a + Number(x.units_total), 0);
    const all = (r.b || []).reduce((a, x) => a + Number(x.units_total), 0);
    must(pick === 1 && all === ctx.qa, 'po doplnění: pick ' + pick + ', celkem ' + all + ' (čekáno 1 / ' + ctx.qa + ') ' + JSON.stringify(r.b));
    await s.evaluate(() => tkClose && tkClose()); await sleep(500);
  }, s);

  await step('Příjem: kontrola dokladu a jména na dokladu', async () => {
    const r = await db(id => supa.rpc('wms_doc_check', { p_type: 'receipt', p_id: id }).then(x => x.error ? { e: x.error.message } : x.data), rc.id);
    must(r && !r.e, 'kontrolu nelze potvrdit: ' + (r && r.e));
    must(r.checked && r.received && r.putaway, 'chybí jména: ' + JSON.stringify(r));
  }, s);

  // ---- výdej ----
  let dl = null;
  await step('Výdej: založení a uvolnění (jako z webu)', async () => {
    dl = await db(async a => {
      const num = 'BOT-VYD-' + a.run;
      const r = await supa.from('deliveries').insert({ delivery_number: num, client_id: a.client, warehouse_id: a.dc, status: 'new', note: 'automaticky test', created_by: currentUserId }).select().single();
      if (r.error) return { e: r.error.message };
      const i = await supa.from('delivery_items').insert([{ delivery_id: r.data.id, sku: 'BOT-A', quantity: a.qd }, { delivery_id: r.data.id, sku: 'BOT-B', quantity: 4 }]);
      if (i.error) return { e: i.error.message };
      const al = await supa.rpc('wms_delivery_allocate', { p_id: r.data.id, p_user: currentUserId });
      if (al.error) return { e: 'alokace: ' + al.error.message };
      const rl = await supa.rpc('wms_delivery_release', { p_id: r.data.id, p_user: currentUserId });
      if (rl.error) return { e: 'uvolnění: ' + rl.error.message };
      return { id: r.data.id, num };
    }, ctx);
    must(dl && dl.id, 'nelze založit výdej: ' + (dl && dl.e));
  }, s);

  await step('Výdej: vychystání na scanneru', async () => {
    must(dl && dl.id, 'výdej neexistuje');
    await s.evaluate(() => tkOpenList('delivery')); await sleep(1500);
    await type(dl.num); await sleep(800);
    const cur = await s.evaluate(() => task && task.cur && { l: task.cur.location_code });
    must(cur && cur.l, 'scanner neukázal lokaci k vychystání · ' + await status());
    // BOT-A po kusech, BOT-B přes kód kartonu (1 × outer = 4 ks)
    for (let n = 0; n < 4; n++) {
      const c = await s.evaluate(() => task && task.cur && { l: task.cur.location_code, sku: task.cur.sku, q: Number(task.cur.qty) - Number(task.cur.picked_qty || 0) });
      if (!c || !c.l) break;
      await type(c.l); await type(c.sku === 'BOT-B' ? '3999000000029' : '2999000000011');
      if (c.sku === 'BOT-B') {
        await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 8000 });
        must(await s.$('#tkf-uom'), 'vychystání BOT-B nenabídlo jednotky balení');
        must(await s.inputValue('#tkf-uom') === 'outer' && await s.inputValue('#tkf-cnt') === '1', 'předvyplněno ' + await s.inputValue('#tkf-uom') + ' × ' + await s.inputValue('#tkf-cnt') + ' (čekáno 1 × outer)');
        await s.click('#tk-ok'); await sleep(1200);
      } else await sheetOk(c.q > 0 ? c.q : ctx.qd);
    }
    const pk = await db(id => supa.from('delivery_allocations').select('sku,picked_qty').eq('delivery_id', id).then(r => r.data || []), dl.id);
    must(pk.filter(x => x.sku === 'BOT-B').reduce((t, x) => t + Number(x.picked_qty || 0), 0) === 4, 'BOT-B vychystáno: ' + JSON.stringify(pk));
    const st = await db(id => supa.from('deliveries').select('status').eq('id', id).single().then(r => r.data && r.data.status), dl.id);
    must(/picked|packed|packing/.test(st), 'stav výdeje po vychystání: ' + st + ' · ' + await status());
  }, s);

  await step('Výdej: odeslání', async () => {
    const flow = await db(id => supa.from('deliveries').select('status,clients(delivery_flow)').eq('id', id).single().then(r => r.data), dl.id);
    if (await s.evaluate(() => typeof tkPackAll === 'function') && /pack/.test(JSON.stringify(flow))) { await s.evaluate(() => tkPackAll()); await sleep(1500); }
    await s.evaluate(() => tkShip()); await sleep(2500);
    const st = await db(id => supa.from('deliveries').select('status').eq('id', id).single().then(r => r.data && r.data.status), dl.id);
    must(st === 'shipped', 'stav výdeje: ' + st + ' (flow ' + JSON.stringify(flow) + ') · ' + await status());
  }, s);

  await step('Výdej: kontrola dokladu a jména na dokladu', async () => {
    const r = await db(id => supa.rpc('wms_doc_check', { p_type: 'delivery', p_id: id }).then(x => x.error ? { e: x.error.message } : x.data), dl.id);
    must(r && !r.e, 'kontrolu nelze potvrdit: ' + (r && r.e));
    must(r.checked && r.picked && r.shipped, 'chybí jména: ' + JSON.stringify(r));
  }, s);

  // ---- vratka ----
  await step('Vratka: ohlášení k výdejce a příjem do karantény', async () => {
    const r = await db(async id => {
      const l = await supa.rpc('wms_return_lines', { p_delivery: id });
      if (l.error) return { e: 'řádky: ' + l.error.message };
      const a = (l.data || []).find(x => x.sku === 'BOT-A');
      if (!a) return { e: 'BOT-A není mezi vydanými: ' + JSON.stringify(l.data) };
      const c = await supa.rpc('wms_return_create', { p_delivery: id, p_lines: [{ sku: 'BOT-A', lot: a.lot, qty: 1 }], p_reason: 'Robot test', p_note: null });
      if (c.error) return { e: 'založení: ' + c.error.message };
      const over = await supa.rpc('wms_return_create', { p_delivery: id, p_lines: [{ sku: 'BOT-A', lot: a.lot, qty: 999 }], p_reason: 'Robot test', p_note: null });
      return { rma: c.data, overBlocked: !!over.error };
    }, dl.id);
    must(r && !r.e, r && r.e);
    must(r.overBlocked, 'vratka nad vydané množství nebyla zablokována');
    await sleep(500); for (let i = serr.length - 1; i >= 0; i--) if (/wms_return_create/.test(serr[i])) serr.splice(i, 1);   // zámerne odmítnutá vratka
    ctx.rma = r.rma;
    await s.evaluate(() => tkOpenList('receipt')); await sleep(1500);
    must((await s.textContent('#task-panel')).includes(r.rma.number), 'vratka není v seznamu příjmů');
    await type(r.rma.number);
    must((await s.textContent('#task-panel')).includes('VRATKA'), 'scanner neoznačil doklad jako vratku');
    await type('2999000000011'); await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 8000 });
    must(await s.inputValue('#tkf-cond') === 'QUARANTINE', 'výchozí stav vratky není karanténa: ' + await s.inputValue('#tkf-cond'));
    await sheetOk(1);
    await s.evaluate(() => tkReceiptFinish()); await sleep(2500);
    const b = await db(async id => {
      const sc = await supa.from('receipt_scans').select('balance_id').eq('receipt_id', id);
      const ids = (sc.data || []).map(x => x.balance_id).filter(Boolean);
      const bb = ids.length ? await supa.from('stock_balances').select('condition_code,units_total').in('id', ids) : { data: [] };
      const st = await supa.from('receipts').select('status').eq('id', id).single();
      return { st: st.data && st.data.status, b: bb.data };
    }, r.rma.id);
    must(/received|putaway|done/.test(b.st || ''), 'stav vratky: ' + b.st + ' · ' + await status());
    must(b.b && b.b.length && b.b.every(x => x.condition_code === 'QUARANTINE'), 'vrácené zboží není v karanténě: ' + JSON.stringify(b.b));
  }, s);

  // ---- uzávěrka dne ----
  await step('Uzávěrka dne: manifest dopravce', async () => {
    const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Prague' });
    const r = await db(async a => {
      const d = await supa.from('deliveries').select('carrier').eq('id', a.id).single();
      const m = await supa.rpc('wms_manifest_close', { p_dc: a.dc, p_carrier: (d.data && d.data.carrier) || null, p_date: a.day });
      if (m.error) return { e: m.error.message };
      const chk = await supa.from('deliveries').select('manifest_id').eq('id', a.id).single();
      return { m: m.data, mid: chk.data && chk.data.manifest_id };
    }, { id: dl.id, dc: ctx.dc, day });
    must(r && !r.e, 'manifest: ' + (r && r.e));
    must(r.mid === r.m.id && r.m.deliveries >= 1, 'výdejka není na manifestu: ' + JSON.stringify(r));
  }, s);

  // ---- blokace / karanténa ----
  await step('Blokace: karanténa a uvolnění palety', async () => {
    const r = await db(async a => {
      const b = await supa.from('stock_balances').select('id,lpn,units_total').eq('dc_id', a.dc).in('sku', ['BOT-A', 'BOT-B']).gt('units_available', 0).or('condition_code.is.null,condition_code.eq.OK').limit(1);
      const bal = b.data && b.data[0]; if (!bal) return { e: 'BOT-A ani BOT-B nemá volnou zásobu' };
      const q = await supa.rpc('wms_adjust_param', { p_balance_id: bal.id, p_field: 'condition_code', p_value: 'QUARANTINE', p_reason: 'block', p_note: 'robot', p_user: currentUserId });
      if (q.error) return { e: 'blokace: ' + q.error.message };
      const c1 = await supa.from('stock_balances').select('condition_code').eq('id', bal.id).single();
      const al = await supa.rpc('wms_is_allocatable', { p_code: c1.data && c1.data.condition_code });
      const o = await supa.rpc('wms_adjust_param', { p_balance_id: bal.id, p_field: 'condition_code', p_value: 'OK', p_reason: 'release', p_note: 'robot', p_user: currentUserId });
      if (o.error) return { e: 'uvolnění: ' + o.error.message };
      const c2 = await supa.from('stock_balances').select('condition_code').eq('id', bal.id).single();
      return { c1: c1.data && c1.data.condition_code, al: al.data, c2: c2.data && c2.data.condition_code };
    }, ctx);
    must(r && !r.e, r && r.e);
    must(r.c1 === 'QUARANTINE' && r.al === false && (r.c2 || 'OK') === 'OK', 'stavy: ' + JSON.stringify(r));
  }, s);

  // ---- inventura s přepočítáním ----
  await step('Inventura: rozdíl → přepočítání → sedí', async () => {
    const ct = await db(async a => {
      const b0 = await supa.from('stock_balances').select('id,sku,lpn,lot,units_total,location_code').eq('dc_id', a.dc).in('location_code', ['BOT-01-01', 'BOT-01-02']).gt('units_total', 0).order('location_code');
      if (b0.error || !b0.data || !b0.data.length) return { e: 'lokace BOT-01-01/02 jsou prázdné ' + ((b0.error || {}).message || '') };
      const loc = b0.data[0].location_code, b = { data: b0.data.filter(x => x.location_code === loc) };
      const t = await supa.from('count_tasks').insert({ dc_id: a.dc, location_code: loc, reason: 'robot', created_by: currentUserId }).select().single();
      if (t.error) return { e: t.error.message };
      const l = await supa.from('count_lines').insert(b.data.map(x => ({ task_id: t.data.id, balance_id: x.id, sku: x.sku, lpn: x.lpn, lot: x.lot, expected: x.units_total })));
      if (l.error) return { e: l.error.message };
      return { id: t.data.id, bal: b.data, loc };
    }, ctx);
    must(ct && ct.id, 'nelze založit inventuru: ' + (ct && ct.e));
    ctx.cc = ct.id;
    await s.evaluate(() => tkOpenCounts()); await sleep(2000);
    const i = await s.evaluate(id => task.list.findIndex(t => t.id === id), ct.id);
    must(i >= 0, 'inventura není v seznamu na scanneru');
    await s.evaluate(i => tkOpenCount(i), i); await sleep(1500);
    await type(ct.loc);
    const countAll = async (plus) => {
      for (const b of ct.bal) {
        await type(b.lpn);
        await s.waitForSelector('#tkf-sku', { state: 'visible', timeout: 8000 }); await s.fill('#tkf-sku', b.sku); await s.click('#tk-ok'); await sleep(800);
        await sheetOk(Number(b.units_total) + plus);
      }
    };
    await countAll(1);
    s.evaluate(() => tkCountSubmit()); await sleep(3000);
    must(await s.evaluate(() => task && task.kind === 'count' && task.recount === true), 'po rozdílu scanner nechtěl přepočítat · ' + await status());
    await countAll(0);
    s.evaluate(() => tkCountSubmit()); await sleep(3000);
    const st = await db(id => supa.from('count_tasks').select('status,diff_lines').eq('id', id).single().then(r => r.data), ct.id);
    must(st && st.status === 'approved', 'stav inventury: ' + JSON.stringify(st) + ' · ' + await status());
  }, s);

  await step('Scanner: bez chyb v prohlížeči', async () => { must(!serr.length, serr.slice(0, 4).join(' | ')); }, s);

  // úklid: zbylé zboží z testu vyskladnit, ať DC 99 neroste
  await step('Úklid testovacích zásob', async () => {
    await db(async id => { try { if (id) { await supa.from('count_lines').delete().eq('task_id', id); await supa.from('count_tasks').delete().eq('id', id); } await supa.rpc('wms_bot_cleanup'); } catch (e) {} }, ctx.cc || null);
  }, null);

  await browser.close();

  // ================= REPORT =================
  const bad = results.filter(r => !r.ok);
  const rows = results.map(r => `<tr class="${r.ok ? 'ok' : 'bad'}"><td>${r.ok ? '✅' : '❌'}</td><td>${r.name}</td><td>${r.ok ? '' : (r.err || '').replace(/</g, '&lt;')}${r.shot ? `<br><img src="${r.shot.split('/').pop()}">` : ''}</td><td>${(r.ms / 1000).toFixed(1)} s</td></tr>`).join('');
  fs.writeFileSync(`${OUT}/index.html`, `<!doctype html><meta charset="utf-8"><title>PRG robot ${ctx.run}</title><style>body{font-family:system-ui;margin:20px}td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}.bad{background:#fff3f2}img{max-width:420px;border:1px solid #ddd;margin-top:6px}</style><h2>PRG testovací robot – ${bad.length ? bad.length + ' chyb' : 'vše v pořádku'}</h2><p>${new Date().toLocaleString('cs-CZ')} · ${BASE}</p><table>${rows}</table>`);
  fs.writeFileSync(`${OUT}/summary.md`, `### PRG testovací robot – ${bad.length ? '❌ ' + bad.length + ' chyb' : '✅ vše v pořádku'}\n\n| | Krok | Detail |\n|---|---|---|\n` + results.map(r => `| ${r.ok ? '✅' : '❌'} | ${r.name} | ${r.ok ? '' : (r.err || '').replace(/\|/g, '/').replace(/\n/g, ' ')} |`).join('\n') + '\n');
  log(`\n${results.length - bad.length}/${results.length} kroků v pořádku`);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
