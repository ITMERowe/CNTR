// Colour picker fit and drag, the undo/+ tap areas, Android back (through a simulated native bridge), About.
import { URL, checks, launch, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();

// Colour picker presets stay inside the panel on narrow phones.
for (const width of [320, 360, 393, 412]) {
  const page = await browser.newPage({ viewport: { width, height: 860 }, isMobile: true });
  await page.goto(URL);
  await sleep(900);
  await page.click('#openProductEdit');
  await page.click('#colorField');
  const r = await page.evaluate(() => {
    const panel = document.getElementById('colorPickerMenu').getBoundingClientRect();
    const swatches = [...document.querySelectorAll('.color-preset')].map((s) => s.getBoundingClientRect());
    const last = swatches.at(-1);
    return {
      swatch: `${Math.round(last.width)}x${Math.round(last.height)}`,
      allInside: swatches.every((s) => s.left >= panel.left && s.right <= panel.right),
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
  const [sw, sh] = r.swatch.split('x');
  check(`colour presets fit at ${width}px`, r.allInside && !r.pageOverflow && sw === sh, r);
  await page.close();
}

{
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await sleep(600);
  await page.click('.tile .pay-add');
  await sleep(400);
  const hits = await page.evaluate(() => {
    const half = document.querySelector('.tile .pay-add');
    const undo = document.querySelector('.tile .pay-undo');
    const plus = [...half.querySelectorAll('*')].find((e) => e.getBoundingClientRect().width >= 20 && e.getBoundingClientRect().width <= 30) || half;
    const r = plus.getBoundingClientRect();
    return [[r.left + r.width / 2, r.bottom - 1], [r.left + 1, r.bottom - 1], [r.right - 1, r.bottom - 1], [r.left + r.width / 2, r.top + r.height / 2]].map(([x, y]) => (undo.contains(document.elementFromPoint(x, y)) ? 'UNDO' : 'add'));
  });
  check('taps on the + circle add a sale, never undo', hits.every((h) => h === 'add'), hits.join());

  await page.click('.tabbar .tab[data-tab="settingsScreen"]');
  await page.click('#openProductsMenuBtn');
  await page.click('.product-edit-btn');
  await page.click('#colorField');
  const drag = await page.evaluate(() => {
    const area = document.querySelector('#pickerSurface');
    const r = area.getBoundingClientRect();
    const ev = (type, target, x, y) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId: 1 }));
    const color = () => document.querySelector('#editColorHex').textContent;
    ev('pointerdown', area, r.left + 10, r.top + 10);
    const before = color();
    ev('pointercancel', window, r.left + 10, r.top + 10);
    ev('pointermove', window, r.right - 10, r.bottom - 10);
    return { before, after: color() };
  });
  check('colour drag stops when Android cancels the pointer', drag.before === drag.after, drag);

  await page.keyboard.press('Escape');
  await page.click('.tabbar .tab[data-tab="settingsScreen"]');
  await page.click('#openAboutMenuBtn');
  await sleep(300);
  const about = await page.evaluate(() => ({ screen: document.querySelector('.screen.active').id, version: document.querySelector('#aboutVersion').textContent, tab: document.querySelector('.tabbar .tab.active').dataset.tab }));
  check('About opens from Settings, shows the version, keeps Settings highlighted', about.screen === 'aboutScreen' && /\d+\.\d+\.\d+/.test(about.version) && about.tab === 'settingsScreen', about);
  await page.click('#aboutBackBtn');
  check('About back arrow returns to Settings', (await page.evaluate(() => document.querySelector('.screen.active').id)) === 'settingsScreen');
  await page.close();
}

// Android back, through a fake Capacitor bridge that captures the backButton listener.
{
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  await page.addInitScript(() => {
    window.__calls = [];
    window.androidBridge = { postMessage: () => {} };
    window.Capacitor = {
      PluginHeaders: [{ name: 'App', methods: [{ name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }, { name: 'minimizeApp', rtype: 'promise' }, { name: 'getInfo', rtype: 'promise' }] }],
      nativeCallback: (pluginId, methodName, options, cb) => { window.__calls.push({ pluginId, methodName, options, cb }); return 'cb'; },
      nativePromise: async (pluginId, methodName) => { window.__calls.push({ pluginId, methodName }); return methodName === 'getInfo' ? { version: '9.9.9' } : {}; },
    };
  });
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await sleep(800);
  const back = async () => {
    await page.evaluate(() => window.__calls.find((c) => c.methodName === 'addListener' && (c.options?.eventName ?? c.options) === 'backButton').cb({ canGoBack: false }));
    await sleep(350);
  };
  const where = () => page.evaluate(() => {
    const extra = [document.querySelector('.sheet-overlay.open')?.id, document.querySelector('#colorPickerMenu.open') && 'picker', document.querySelector('#optionsMenu.open') && 'menu'].filter(Boolean);
    return document.querySelector('.screen.active').id + (extra.length ? '+' + extra.join(',') : '') + (window.__calls.some((c) => c.methodName === 'minimizeApp') ? ' [minimized]' : '');
  });
  const tab = (t) => page.click(`.tabbar .tab[data-tab="${t}"]`);
  const cases = [
    ['colour picker closes first', async () => { await tab('settingsScreen'); await page.click('#openProductsMenuBtn'); await page.click('.product-edit-btn'); await page.click('#colorField'); }, 'productEditScreen'],
    ['product editor -> Products', async () => {}, 'productHistoryScreen'],
    ['Products -> Settings', async () => {}, 'settingsScreen'],
    ['About -> Settings', async () => { await page.click('#openAboutMenuBtn'); }, 'settingsScreen'],
    ['open sheet closes', async () => { await tab('eventScreen'); await page.click('#openAddExpenseBtn'); }, 'eventScreen'],
    ['name sheet closes', async () => { await page.click('#eventNameBtn'); }, 'eventScreen'],
    ['past event -> History', async () => {
      await tab('salesScreen'); await page.click('.tile .pay-add'); await tab('eventScreen');
      await page.click('#endEventBtn'); await page.click('#saveModalSaveBtn'); await page.click('#confirmModalConfirmBtn'); await sleep(300);
      // No Filesystem plugin in this fake bridge, so the automatic backup fails and asks; continue.
      if (await page.evaluate(() => document.querySelector('#confirmModalTitle').textContent === 'Backup failed')) await page.click('#confirmModalConfirmBtn');
      await sleep(200); await tab('historyScreen'); await page.click('#pastEventList .event-row');
    }, 'historyScreen'],
    ['editing a past event -> cancels the edit, stays on the event', async () => { await page.click('#pastEventList .event-row'); await page.click('#pastEventEditBtn'); }, 'pastEventScreen'],
    ['past event (after cancel) -> History', async () => {}, 'historyScreen'],
    ['other tab -> Sell', async () => {}, 'salesScreen'],
    ['Sell -> app goes to the background', async () => {}, 'salesScreen [minimized]'],
  ];
  for (const [name, setup, expected] of cases) {
    await setup();
    await sleep(250);
    await back();
    const now = await where();
    check(`Android back: ${name}`, now === expected, now);
  }
  check('About shows the installed app version on the phone', (await page.evaluate(() => document.querySelector('#aboutVersion').textContent)) === '9.9.9');
  await page.close();
}

await browser.close();
done();
