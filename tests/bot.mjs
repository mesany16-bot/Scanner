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
  const ctx = { dc: null, client: null, run: new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '') };

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
    'wms_scans.html', 'wms_exceptions.html', 'wms_locations.html', 'wms_inventura.html', 'wms_temp.html'];
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
  const type = async code => { await s.fill('#manual-code', code); await s.press('#manual-code', 'Enter'); await sleep(900); };
  const sheetOk = async (qty) => { await s.waitForSelector('#tk-sheet', { state: 'visible', timeout: 8000 }); if (qty != null) await s.fill('#tkf-qty', String(qty)); await s.click('#tk-ok'); await sleep(1200); };
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
      const i = await supa.from('receipt_items').insert([{ receipt_id: r.data.id, sku: 'BOT-A', quantity: 10 }, { receipt_id: r.data.id, sku: 'BOT-B', quantity: 5 }]);
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
    await type('2999000000011'); await sheetOk(10);
    await type('2999000000028'); await sheetOk(5);
    const st = await db(id => supa.from('receipts').select('status').eq('id', id).single().then(r => r.data && r.data.status), rc.id);
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

  // ---- výdej ----
  let dl = null;
  await step('Výdej: založení a uvolnění (jako z webu)', async () => {
    dl = await db(async a => {
      const num = 'BOT-VYD-' + a.run;
      const r = await supa.from('deliveries').insert({ delivery_number: num, client_id: a.client, warehouse_id: a.dc, status: 'new', note: 'automaticky test', created_by: currentUserId }).select().single();
      if (r.error) return { e: r.error.message };
      const i = await supa.from('delivery_items').insert([{ delivery_id: r.data.id, sku: 'BOT-A', quantity: 4 }]);
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
    await type(cur.l); await type('2999000000011'); await sheetOk(4);
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

  await step('Scanner: bez chyb v prohlížeči', async () => { must(!serr.length, serr.slice(0, 4).join(' | ')); }, s);

  // úklid: zbylé zboží z testu vyskladnit, ať DC 99 neroste
  await step('Úklid testovacích zásob', async () => {
    await db(async () => { try { await supa.rpc('wms_bot_cleanup'); } catch (e) {} });
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
