// Data safety: persistence, migration to SQLite, backup/restore, malformed files, failures, offline.
// Part A: browser build (localStorage). Part B: a fake Android bridge with an in-memory SQLite stand-in
// (kept in sessionStorage so it survives reloads), fake Filesystem/Share, and switchable failures.
import { readFileSync } from 'node:fs';
import { URL, checks, launch, playTour, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const b = await launch();

const SALE = (i) => ({ product: 'Gacha', price: 25000, cost: 12000, payment: i % 2 ? 'QRIS' : 'Cash', timestamp: new Date(Date.UTC(2026, 9, 26, 10, i)).toISOString() });
const legacySales = JSON.stringify([SALE(1), SALE(2), SALE(3)]);

async function newPage(native) {
  const ctx = await b.newContext({ viewport: { width: 412, height: 892 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => requests.push(r.url()));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (native) await page.addInitScript(fakeNative);
  // Records anything the Content-Security-Policy blocks (A12).
  await page.addInitScript(() => {
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
  });
  return { ctx, page, requests, errors };
}

const heroSales = async (page) => { await page.click('.tabbar .tab[data-tab="salesScreen"]'); return page.evaluate(() => document.querySelector('.hero-meta span')?.textContent?.match(/^(\d+) sales?$/)?.[1]); };
const sell = async (page, n = 1) => { for (let i = 0; i < n; i++) await page.click('.tile .pay-add'); await page.waitForTimeout(150); };
const message = (page) => page.evaluate(() => ({ open: document.querySelector('#confirmModalOverlay').classList.contains('open'), title: document.querySelector('#confirmModalTitle').textContent, text: document.querySelector('#confirmModalMessage').textContent }));
const closeMessage = (page) => page.click('#confirmModalConfirmBtn');
const toSettings = (page) => page.click('.tabbar .tab[data-tab="settingsScreen"]').then(() => page.waitForTimeout(300));

async function restoreWith(page, buffer, confirm = true) {
  await toSettings(page);
  const chooser = page.waitForEvent('filechooser');
  await page.click('#restoreBackupBtn');
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(buffer) });
  await page.waitForTimeout(400);
  const m = await message(page);
  if (confirm && m.title === 'Restore backup?') { await page.click('#confirmModalConfirmBtn'); await page.waitForLoadState('load'); await page.waitForTimeout(900); }
  return m;
}

// ---------------- Part A: browser (localStorage) ----------------
{
  const { ctx, page, requests, errors } = await newPage(false);
  await page.goto(URL); await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS); await page.reload(); await page.waitForTimeout(700);
  await sell(page, 3);
  await page.reload(); await page.waitForTimeout(700);
  check('A1 sales persist across restart', (await heroSales(page)) === '3', `hero shows ${await heroSales(page)}`);

  await toSettings(page);
  const dl = page.waitForEvent('download');
  await page.click('#exportBackupBtn');
  const download = await dl;
  const backupText = readFileSync(await download.path(), 'utf8');
  const backup = JSON.parse(backupText);
  check('A2 export backup file is a CNTR backup with the 3 sales', backup.app === 'CNTR' && backup.data.cntrSales.length === 3, download.suggestedFilename());
  await closeMessage(page);
  check('A3 last backup date shown', /\d{4}/.test(await page.textContent('#lastBackupText')), await page.textContent('#lastBackupText'));

  const dlCsv = page.waitForEvent('download');
  await page.click('#exportCsvBtn');
  const csv = readFileSync(await (await dlCsv).path(), 'utf8');
  check('A4 CSV export has header + 3 rows', csv.trim().split(/\r?\n/).length === 4 && csv.includes('Event,Day'), `${csv.trim().split(/\r?\n/).length} lines`);
  await closeMessage(page);

  await page.click('.tabbar .tab[data-tab="salesScreen"]'); await sell(page, 2);
  const before = await page.evaluate(() => localStorage.cntrSales);
  for (const [label, bad] of [['garbage', 'not json'], ['truncated', backupText.slice(0, backupText.length / 2)], ['foreign JSON', '{"a":1}'], ['damaged record', backupText.replace('"price": 25000', '"price": "x"')]]) {
    const m = await restoreWith(page, bad, false);
    check(`A5 malformed backup (${label}) rejected, data untouched`, m.title === 'Cannot restore this file' && (await page.evaluate(() => localStorage.cntrSales)) === before, m.text.slice(0, 70));
    await closeMessage(page);
  }

  const m = await restoreWith(page, backupText);
  check('A6 restore asks first and states what will be replaced', m.title === 'Restore backup?' && /3 current sales/.test(m.text), m.text.slice(0, 90));
  check('A7 after restore the app shows the backup (3 sales, not 5)', (await heroSales(page)) === '3', `hero ${await heroSales(page)}`);

  // Save failure: storage full. The change stays in memory, a warning shows, and it is written once space frees up.
  await page.evaluate(() => { window.__realSet = Storage.prototype.setItem; Storage.prototype.setItem = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await sell(page, 1); await page.waitForTimeout(300);
  const alertShown = await page.evaluate(() => !document.querySelector('#storageAlert').hidden && document.querySelector('#storageAlert').textContent);
  check('A8 storage full shows a clear warning', Boolean(alertShown) && /could not be saved/.test(alertShown), String(alertShown).slice(0, 80));
  check('A9 the unsaved sale is still on screen', (await heroSales(page)) === '4');
  await page.evaluate(() => { Storage.prototype.setItem = window.__realSet; });
  await page.waitForTimeout(5600);
  const cleared = await page.evaluate(() => document.querySelector('#storageAlert').hidden);
  await page.reload(); await page.waitForTimeout(700);
  check('A10 retry saves it once space is back; warning clears', cleared && (await heroSales(page)) === '4', `hero after reload ${await heroSales(page)}`);

  // Offline: cut the network and use every feature; nothing may leave the machine.
  await ctx.setOffline(true);
  await sell(page, 2);
  for (const tab of ['eventScreen', 'historyScreen', 'settingsScreen', 'salesScreen']) await page.click(`.tabbar .tab[data-tab="${tab}"]`);
  await toSettings(page); const dl2 = page.waitForEvent('download'); await page.click('#exportBackupBtn'); await dl2; await closeMessage(page);
  const foreign = requests.filter((u) => !u.startsWith(URL) && !u.startsWith('blob:') && !u.startsWith('data:'));
  check('A11 offline: everything works and no request leaves localhost', foreign.length === 0 && errors.length === 0, foreign.join(' ') || `${requests.length} local requests, ${errors.length} errors`);
  const csp = await page.evaluate(() => ({ policy: document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content ?? '', blocked: window.__csp }));
  check('A12 the page has a Content-Security-Policy and nothing the app does breaks it', /default-src 'self'/.test(csp.policy) && csp.blocked.length === 0, csp.blocked.join(' | ') || csp.policy.slice(0, 60));
  await ctx.close();
}

// ---------------- Part B: fake native (SQLite) ----------------
function fakeNative() {
  const ss = sessionStorage;
  const get = (k, d) => JSON.parse(ss.getItem(k) ?? JSON.stringify(d));
  const put = (k, v) => ss.setItem(k, JSON.stringify(v));
  const fail = (what) => get('__fail', {})[what];
  window.__log = [];
  window.androidBridge = { postMessage() {} };
  const methods = (names) => names.map((name) => ({ name, rtype: 'promise' }));
  window.Capacitor = {
    PluginHeaders: [
      { name: 'CapacitorSQLite', methods: methods(['createConnection', 'checkConnectionsConsistency', 'open', 'isDBOpen', 'execute', 'query', 'executeSet', 'closeConnection']) },
      { name: 'Filesystem', methods: methods(['writeFile', 'requestPermissions', 'checkPermissions', 'readdir', 'deleteFile']) },
      { name: 'Share', methods: methods(['share']) },
      { name: 'Haptics', methods: methods(['impact', 'notification']) },
      { name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, ...methods(['minimizeApp', 'removeListener'])] },
    ],
    nativeCallback: () => 'cb',
    nativePromise: async (plugin, method, options) => {
      window.__log.push(`${plugin}.${method}`);
      if (plugin === 'CapacitorSQLite') {
        if (fail('open') && (method === 'createConnection' || method === 'open')) throw new Error('database locked');
        const db = get('__db', {});
        if (method === 'checkConnectionsConsistency') return { result: false };
        if (method === 'isDBOpen') return { result: false };
        if (method === 'query') return { values: Object.entries(db).map(([key, value]) => ({ key, value })) };
        if (method === 'executeSet') {
          const delay = get('__sqlDelayMs', 0); // a slow database write (B35)
          if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
          if (fail('executeSet')) throw new Error('disk I/O error (disk full)');
          const next = { ...get('__db', {}) }; // read after the wait, so the write never drops data stored meanwhile; all-or-nothing
          for (const { statement, values } of options.set) {
            if (statement.startsWith('DELETE')) delete next[values[0]];
            else next[values[0]] = values[1];
          }
          put('__db', next);
          put('__sets', [...get('__sets', []), options.set.map(({ values }) => values[0])]); // keys per write, to check batching
          return { changes: { changes: options.set.length } };
        }
        return { changes: { changes: 0 } };
      }
      if (plugin === 'Filesystem') {
        if (method === 'writeFile') {
          await new Promise((resolve) => setTimeout(resolve, get('__delayMs', 0))); // a slow phone (B30)
          if (fail(`fs:${options.directory}`)) throw new Error('not allowed');
          const files = get('__files', []); files.push({ dir: options.directory, path: options.path, data: options.data }); put('__files', files);
          return { uri: `file:///${options.directory}/${options.path}` };
        }
        if (method === 'readdir') return { files: get('__files', []).filter((f) => f.dir === options.directory && f.path.startsWith(`${options.path}/`)).map((f) => ({ name: f.path.slice(options.path.length + 1) })) };
        if (method === 'deleteFile') { put('__files', get('__files', []).filter((f) => !(f.dir === options.directory && f.path === options.path))); return {}; }
        return { publicStorage: 'granted' };
      }
      if (plugin === 'Share') { if (fail('share')) throw new Error('Share canceled'); return { activityType: 'files' }; }
      return {};
    },
  };
}

{
  const { ctx, page, requests, errors } = await newPage(true);
  const db = () => page.evaluate(() => JSON.parse(sessionStorage.__db ?? '{}'));
  const setFail = (f) => page.evaluate((f) => { sessionStorage.__fail = JSON.stringify(f); }, f);
  await page.goto(URL);
  // An existing user from before this update: data only in localStorage.
  await page.evaluate(([s, p]) => { localStorage.clear(); sessionStorage.clear(); localStorage.cntrSales = s; localStorage.cntrProducts = p; }, [legacySales, SAMPLE_PRODUCTS]);
  await page.reload(); await page.waitForTimeout(900);
  let d = await db();
  check('B1 first launch migrates localStorage into SQLite and verifies it', d.cntrSales === legacySales && Boolean(d['cntrMeta.migratedFromLocalStorage']), Object.keys(d).join(','));
  check('B2 migrated sales show in the app', (await heroSales(page)) === '3');
  check('B3 legacy localStorage left untouched', (await page.evaluate(() => localStorage.cntrSales)) === legacySales);

  await sell(page, 2);
  await page.reload(); await page.waitForTimeout(900);
  d = await db();
  check('B4 restart: new sales come from SQLite (5), not the stale legacy copy (3)', (await heroSales(page)) === '5' && JSON.parse(d.cntrSales).length === 5);
  await page.reload(); await page.waitForTimeout(900);
  check('B5 migration does not rerun or duplicate on later launches', (await heroSales(page)) === '5' && JSON.parse((await db()).cntrSales).length === 5);

  // Database write fails (disk full): warning, sale kept, written after recovery.
  await setFail({ executeSet: true });
  await sell(page, 1); await page.waitForTimeout(300);
  const alert = await page.evaluate(() => !document.querySelector('#storageAlert').hidden && document.querySelector('#storageAlert').textContent);
  check('B6 database write failure shows a warning', /disk full/.test(String(alert)), String(alert).slice(0, 80));
  await setFail({}); await page.waitForTimeout(5600);
  check('B7 retry writes the pending sale; warning clears', JSON.parse((await db()).cntrSales).length === 6 && (await page.evaluate(() => document.querySelector('#storageAlert').hidden)));

  // Export on the phone: Documents/CNTR + share sheet.
  await toSettings(page);
  await page.click('#exportBackupBtn'); await page.waitForTimeout(500);
  let m = await message(page);
  const files = await page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]'));
  const backupText = files.at(-1)?.data ?? '';
  check('B8 export writes Documents/CNTR/cntr-backup-*.json and says where', files.at(-1)?.dir === 'DOCUMENTS' && /^CNTR\/cntr-backup-/.test(files.at(-1)?.path) && /Documents\/CNTR/.test(m.text), `${files.at(-1)?.dir}/${files.at(-1)?.path}`);
  await closeMessage(page);

  // Documents refused (old Android) and share sheet closed: must not claim success.
  await setFail({ 'fs:DOCUMENTS': true, share: true });
  await page.click('#exportBackupBtn'); await page.waitForTimeout(500);
  m = await message(page);
  check('B9 export that could not be kept anywhere says "not saved"', /not saved/.test(m.title), m.title);
  await closeMessage(page); await setFail({});

  // Restore fails mid-way (disk full): all-or-nothing.
  await page.click('.tabbar .tab[data-tab="salesScreen"]'); await sell(page, 1);
  const beforeRestore = (await db()).cntrSales;
  await setFail({ executeSet: true });
  const small = JSON.stringify({ app: 'CNTR', format: 1, exportedAt: new Date().toISOString(), data: { cntrSales: [SALE(9)] } });
  await restoreWith(page, small);
  m = await message(page);
  check('B10 interrupted restore changes nothing and says so', m.title === 'Restore failed' && (await db()).cntrSales === beforeRestore, m.text.slice(0, 70));
  await closeMessage(page); await setFail({}); await page.waitForTimeout(5600);

  // Restore works: safety copy first, then replace everything.
  await restoreWith(page, backupText);
  const safety = (await page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]'))).find((f) => f.path.includes('before-restore'));
  check('B11 restore saves a safety copy of the current data first', Boolean(safety) && JSON.parse(safety.data).data.cntrSales.length === 7, safety?.path);
  check('B12 restore replaces the data with the backup (6 sales)', (await heroSales(page)) === '6' && JSON.parse((await db()).cntrSales).length === 6);

  // Database cannot open after it has been used: never fall back to the stale localStorage copy.
  await setFail({ open: true });
  await page.reload(); await page.waitForTimeout(900);
  const startup = await page.evaluate(() => document.querySelector('.startup-error')?.textContent ?? '');
  check('B13 database failure after migration blocks with "Try again", data untouched', /could not open its data/.test(startup) && JSON.parse((await db()).cntrSales).length === 6, startup.slice(0, 70));
  await setFail({}); await page.click('.startup-error .btn'); await page.waitForTimeout(900);
  check('B14 "Try again" recovers once the database opens', (await heroSales(page)) === '6');

  // Automatic backups before destructive actions (End event).
  const autoFiles = () => page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]').filter((f) => f.path.startsWith('CNTR/auto/')));
  const endEvent = async () => {
    await page.click('.tabbar .tab[data-tab="eventScreen"]');
    await page.click('#endEventBtn'); await page.click('#saveModalSaveBtn'); await page.click('#confirmModalConfirmBtn'); await page.waitForTimeout(500);
  };
  const salesBeforeEnd = JSON.parse((await db()).cntrSales).length;
  await page.evaluate(() => { sessionStorage.__sets = '[]'; });
  await endEvent();
  const auto = (await autoFiles()).at(-1);
  const after = await db();
  check('B18 End event first writes an automatic backup holding the sales, then moves them to History', auto?.dir === 'DOCUMENTS' && JSON.parse(auto.data).data.cntrSales.length === salesBeforeEnd && JSON.parse(after.cntrSales).length === 0 && JSON.parse(after.cntrEvents)[0].sales.length === salesBeforeEnd, `${auto?.path} (${salesBeforeEnd} sales)`);
  const sets = await page.evaluate(() => JSON.parse(sessionStorage.__sets ?? '[]'));
  const together = sets.some((keys) => ['cntrEvents', 'cntrSales', 'cntrEventCosts', 'cntrLiveEvent'].every((key) => keys.includes(key)));
  check('B22 End event is saved in one all-or-nothing write (never half moved)', together, JSON.stringify(sets));
  await page.click('.tabbar .tab[data-tab="salesScreen"]');
  await sell(page, 2);
  await setFail({ 'fs:DOCUMENTS': true, 'fs:DATA': true });
  await endEvent();
  m = await message(page);
  check('B19 if the automatic backup fails, it asks before ending the event', m.title === 'Backup failed' && /Continue anyway/.test(m.text), m.text.slice(0, 60));
  await page.click('#confirmModalCancelBtn'); await page.waitForTimeout(300);
  check('B20 cancelling then keeps the sales', JSON.parse((await db()).cntrSales).length === 2);
  await setFail({});
  await page.evaluate(() => { const files = JSON.parse(sessionStorage.__files ?? '[]'); for (let i = 0; i < 25; i++) files.push({ dir: 'DOCUMENTS', path: `CNTR/auto/cntr-auto-2000-01-01-0000${String(i).padStart(2, '0')}.json`, data: '{}' }); sessionStorage.__files = JSON.stringify(files); });
  await endEvent();
  const kept = (await autoFiles()).filter((f) => f.dir === 'DOCUMENTS');
  check('B21 only the newest 20 automatic backups are kept', kept.length === 20 && !kept.some((f) => f.path.includes('2000-01-01-000000')), `${kept.length} kept`);

  const foreign = requests.filter((u) => !u.startsWith(URL) && !u.startsWith('blob:') && !u.startsWith('data:'));
  check('B15 no network requests and no page errors in native mode', foreign.length === 0 && errors.length === 0, foreign.join(' ') || errors.join(' | '));
  await ctx.close();
}

{
  // A user whose database never opened (never migrated): keeps working on localStorage, with a warning.
  const { ctx, page } = await newPage(true);
  await page.goto(URL);
  await page.evaluate(([s, p]) => { localStorage.clear(); sessionStorage.clear(); localStorage.cntrSales = s; localStorage.cntrProducts = p; sessionStorage.__fail = JSON.stringify({ open: true }); }, [legacySales, SAMPLE_PRODUCTS]);
  await page.reload(); await page.waitForTimeout(900);
  const alert = await page.evaluate(() => !document.querySelector('#storageAlert').hidden && document.querySelector('#storageAlert').textContent);
  check('B16 first migration failing keeps the app usable on the old data, with a warning', (await heroSales(page)) === '3' && /could not be moved/.test(String(alert)), String(alert).slice(0, 60));
  await sell(page, 1);
  await page.evaluate(() => { localStorage.cntrSettings = JSON.stringify({ language: 'id' }); });
  await page.reload(); await page.waitForTimeout(900);
  const translated = await page.evaluate(() => document.querySelector('#storageAlert').textContent);
  check('B36 that warning is in the saved language (Indonesian here), not always English', /belum bisa dipindahkan/.test(translated), translated.slice(0, 60));
  await page.evaluate(() => { sessionStorage.__fail = '{}'; localStorage.cntrSettings = JSON.stringify({ language: 'en' }); });
  await page.reload(); await page.waitForTimeout(900);
  check('B17 next launch migrates the up-to-date data (4 sales) into SQLite', (await heroSales(page)) === '4' && JSON.parse((await page.evaluate(() => JSON.parse(sessionStorage.__db))).cntrSales).length === 4);
  await ctx.close();
}

{
  // Updating from a version with saved reports: they are no longer shown or exported, so the first launch keeps a copy.
  const { ctx, page } = await newPage(true);
  await page.goto(URL);
  const reports = JSON.stringify([{ id: 'r1', name: 'Old report', createdAt: '2026-10-25T10:00:00.000Z', type: 'sales', products: [], sales: [SALE(1)], eventCosts: [] }]);
  // A 1.0.21 user: data already in SQLite (migrated earlier), including saved reports.
  await page.evaluate(([s, r]) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage['cntrMeta.usingDatabase'] = '1';
    sessionStorage.__db = JSON.stringify({ cntrSales: s, cntrSavedReports: r, 'cntrMeta.migratedFromLocalStorage': '2026-10-26T00:00:00.000Z' });
  }, [legacySales, reports]);
  await page.reload(); await page.waitForTimeout(1200);
  const files = await page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]').filter((f) => f.path.startsWith('CNTR/auto/')));
  const kept = files.map((f) => JSON.parse(f.data).data).find((data) => data.cntrSavedReports);
  check('B23 first launch with events backs up the old saved reports before they stop being exported', Boolean(kept) && kept.cntrSavedReports[0].name === 'Old report' && kept.cntrSales.length === 3, files.map((f) => f.path).join(' '));
  await page.reload(); await page.waitForTimeout(900);
  const again = await page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]').filter((f) => f.path.startsWith('CNTR/auto/')).length);
  check('B24 that backup is taken once, not on every launch', again === files.length, `${files.length} then ${again}`);
  await ctx.close();
}

{
  // Tutorial on the phone: practice data swaps in and out of SQLite in one write each; no automatic backups.
  const { ctx, page, errors } = await newPage(true);
  await page.goto(URL);
  await page.evaluate(([s, p]) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage['cntrMeta.usingDatabase'] = '1';
    sessionStorage.__db = JSON.stringify({ cntrSales: s, cntrProducts: p, 'cntrMeta.migratedFromLocalStorage': '2026-10-26T00:00:00.000Z', 'cntrMeta.tutorialOffered': 'test' });
  }, [legacySales, SAMPLE_PRODUCTS]);
  await page.reload(); await page.waitForTimeout(1200);
  const dataOnly = (d) => JSON.stringify(Object.fromEntries(Object.entries(d).filter(([key]) => !key.startsWith('cntrMeta.')).sort()));
  const before = dataOnly(await page.evaluate(() => JSON.parse(sessionStorage.__db)));
  await toSettings(page);
  await page.evaluate(() => { sessionStorage.__sqlDelayMs = '800'; });
  await page.click('#startTutorialBtn'); await page.click('#confirmModalConfirmBtn');
  await page.waitForTimeout(200);
  const swapping = await page.evaluate(() => document.body.inert && document.body.style.pointerEvents === 'none');
  check('B35 while the practice data is being swapped in, the screen takes no taps (no sale can land in the wrong data)', swapping);
  await page.waitForTimeout(2000); // two delayed writes (offer seen, then the swap) before the reload
  await page.waitForLoadState('load'); await page.waitForTimeout(1200);
  await page.evaluate(() => { sessionStorage.__sqlDelayMs = '0'; });
  const during = await page.evaluate(() => JSON.parse(sessionStorage.__db));
  check('B25 starting the tour puts practice data in SQLite and keeps the real data aside', JSON.parse(during.cntrProducts)[0].name === 'Sticker' && JSON.parse(during['cntrMeta.tutorialSavedData']).length > 0);
  const stuck = await playTour(page, 'history-tab'); // on rails up to and including End event
  await page.waitForTimeout(500);
  check('B29 the tour runs on the phone up to End event', !stuck, stuck ?? '');
  const autoDuring = await page.evaluate(() => JSON.parse(sessionStorage.__files ?? '[]').filter((f) => f.path.startsWith('CNTR/auto/')).length);
  check('B26 ending a practice event writes no automatic backup', autoDuring === 0, `${autoDuring} files`);
  await page.click('#tourQuitBtn');
  await page.waitForLoadState('load'); await page.waitForTimeout(1200);
  const after = await page.evaluate(() => JSON.parse(sessionStorage.__db));
  check('B27 Quit tour puts the real SQLite data back exactly and drops the saved copy', dataOnly(after) === before && !after['cntrMeta.tutorialSavedData'] && (await heroSales(page)) === '3');
  check('B28 no page errors during the tour on the phone', errors.length === 0, errors.join(' | '));

  // Putting the real data back fails: the app must not keep running on practice data (sales there would be lost).
  await toSettings(page);
  await page.click('#startTutorialBtn'); await page.click('#confirmModalConfirmBtn');
  await page.waitForLoadState('load'); await page.waitForTimeout(1200);
  await page.evaluate(() => { sessionStorage.__fail = JSON.stringify({ executeSet: true }); });
  await page.click('#tourQuitBtn'); await page.waitForTimeout(800);
  const blocked = await page.evaluate(() => ({ error: document.querySelector('.startup-error')?.textContent ?? '', tiles: document.querySelectorAll('.tile').length }));
  check('B33 if the real data cannot be put back, the app blocks (no selling on practice data) and says why', /practice data/i.test(blocked.error) && blocked.tiles === 0, blocked);
  await page.evaluate(() => { sessionStorage.__fail = '{}'; });
  await page.click('.startup-error .btn');
  await page.waitForLoadState('load'); await page.waitForTimeout(1500);
  const recovered = await page.evaluate(() => JSON.parse(sessionStorage.__db));
  check('B34 "Try again" then puts the real data back', dataOnly(recovered) === before && !recovered['cntrMeta.tutorialSavedData'] && (await heroSales(page)) === '3');
  await ctx.close();
}

{
  // Saving an edited past event waits for the automatic backup; Cancel must not interfere meanwhile.
  const { ctx, page, errors } = await newPage(true);
  await page.goto(URL);
  const event = { id: 'e1', name: 'Fair', startedAt: '2026-10-20T03:00:00.000Z', endedAt: '2026-10-20T11:00:00.000Z', dayBreaks: [], products: [{ name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' }], sales: [SALE(1)], expenses: [] };
  await page.evaluate((events) => {
    localStorage.clear(); sessionStorage.clear();
    localStorage['cntrMeta.usingDatabase'] = '1';
    sessionStorage.__db = JSON.stringify({ cntrEvents: events, 'cntrMeta.migratedFromLocalStorage': '2026-10-26T00:00:00.000Z', 'cntrMeta.tutorialOffered': 'test' });
  }, JSON.stringify([event]));
  await page.reload(); await page.waitForTimeout(1200);
  const storedSales = () => page.evaluate(() => JSON.parse(JSON.parse(sessionStorage.__db).cntrEvents)[0].sales.length);
  const editPlusOne = async () => {
    await page.click('#pastEventEditBtn');
    await page.click('#pastEventCard [data-adjust][data-delta="1"]:visible >> nth=0');
  };
  await page.click('.tabbar .tab[data-tab="historyScreen"]');
  await page.click('#pastEventList .event-row >> nth=0');

  await editPlusOne();
  await page.click('#pastEventCancelBtn'); await page.waitForTimeout(300);
  check('B31 Cancel without Save leaves the past event unchanged', (await storedSales()) === 1);

  await editPlusOne();
  await page.evaluate(() => { sessionStorage.__delayMs = '1500'; });
  await page.click('#pastEventSaveBtn'); await page.waitForTimeout(200);
  const during = await page.evaluate(() => ({ text: document.getElementById('pastEventSaveBtn').textContent, save: document.getElementById('pastEventSaveBtn').disabled, cancel: document.getElementById('pastEventCancelBtn').disabled }));
  await page.dispatchEvent('#pastEventCancelBtn', 'click');
  await page.waitForTimeout(2000);
  await page.evaluate(() => { sessionStorage.__delayMs = '0'; });
  check('B30 while the save waits for its backup, Save shows "Saving…" and Save and Cancel are disabled', during.text === 'Saving…' && during.save && during.cancel, during);
  const after = { sales: await storedSales(), editing: await page.evaluate(() => !document.getElementById('pastEventEditBar').hidden), saveText: await page.evaluate(() => document.getElementById('pastEventSaveBtn').textContent) };
  check('B30 Cancel pressed during the save cannot undo or block it: the edit is saved once and the editor closes', after.sales === 2 && !after.editing && after.saveText !== 'Saving…', after);
  check('B32 no page errors around a slow save', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

await b.close();
done();
