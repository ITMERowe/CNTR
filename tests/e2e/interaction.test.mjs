// Colour picker fit and drag, the undo/+ tap areas, Android back (through a simulated native bridge), About.
import { URL, checks, launch, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

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
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
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

  await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
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
  await page.evaluate(() => document.querySelector('.content').scrollTo(0, 99999)); // About sits at the bottom of Settings; pages scroll inside .content
  const scrolled = await page.evaluate(() => document.querySelector('.content').scrollTop);
  await page.click('#openAboutMenuBtn');
  await sleep(300);
  const about = await page.evaluate(() => ({ screen: document.querySelector('.screen.active').id, version: document.querySelector('#aboutVersion').textContent, tab: document.querySelector('.tabbar .tab.active').dataset.tab, top: document.querySelector('.content').scrollTop }));
  check('About opens from Settings, shows the version, keeps Settings highlighted', about.screen === 'aboutScreen' && /\d+\.\d+\.\d+/.test(about.version) && about.tab === 'settingsScreen', about);
  check('a new page opens at its top, not at the previous page\'s scroll position', scrolled > 0 && about.top === 0, { scrolled, top: about.top });
  const privacy = await page.evaluate(() => document.querySelector('#aboutScreen .about-text').textContent);
  check('the privacy text mentions the phone\'s own Google account backup', /Google account/.test(privacy) && !/stays on this phone/.test(privacy), privacy.slice(0, 120));
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
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
  await page.reload();
  await sleep(800);
  const back = async () => {
    await page.evaluate(() => window.__calls.find((c) => c.methodName === 'addListener' && (c.options?.eventName ?? c.options) === 'backButton').cb({ canGoBack: false }));
    await sleep(350);
  };
  const where = () => page.evaluate(() => {
    const extra = [document.querySelector('.sheet-overlay.open')?.id, document.querySelector('#colorPickerMenu.open') && 'picker', document.querySelector('#optionsMenu.open') && 'menu', !document.querySelector('#sellMenu').hidden && 'sellMenu'].filter(Boolean);
    return document.querySelector('.screen.active').id + (extra.length ? '+' + extra.join(',') : '') + (window.__calls.some((c) => c.methodName === 'minimizeApp') ? ' [minimized]' : '');
  });
  const tab = (t) => page.click(`.tabbar .tab[data-tab="${t}"]`);
  const cases = [
    ['Sell ⋮ menu closes, the app stays open', async () => { await page.click('#sellMenuBtn'); }, 'salesScreen'],
    ['colour picker closes first', async () => { await tab('productHistoryScreen'); await page.click('.product-edit-btn'); await page.click('#colorField'); }, 'productEditScreen'],
    ['product editor -> Products', async () => {}, 'productHistoryScreen'],
    ['Products -> Sell', async () => {}, 'salesScreen'],
    ['About -> Settings', async () => { await tab('settingsScreen'); await page.click('#openAboutMenuBtn'); }, 'settingsScreen'],
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
    ['a past-event edit with a change asks Keep editing / Discard', async () => { await page.click('#pastEventList .event-row'); await page.click('#pastEventEditBtn'); await page.click('#pastEventCard [data-adjust][data-delta="1"]:visible >> nth=0'); }, 'pastEventScreen+confirmModalOverlay'],
    ['back on that question keeps editing', async () => {}, 'pastEventScreen'],
    ['after Discard the edit is gone; back -> History', async () => {
      await back(); await page.click('#confirmModalConfirmBtn');
      const editing = await page.evaluate(() => !document.getElementById('pastEventEditBar').hidden);
      if (editing) throw new Error('still editing after Discard');
    }, 'historyScreen'],
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

// Sell: hold-and-drag reordering, and the ⋮ menu (Sort by best sellers, Compact tiles).
{
  const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
  await page.goto(URL);
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
  await page.reload();
  await sleep(900);
  const names = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((tile) => tile.dataset.product));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.cntrProducts).map((p) => p.name));
  const sales = async () => (await sleep(150), page.evaluate(() => JSON.parse(localStorage.cntrSales ?? '[]').length));
  const centre = (selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
  const hold = async (from, toY) => {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await sleep(550);
    for (let i = 1; i <= 10; i++) await page.mouse.move(from.x, from.y + ((toY - from.y) * i) / 10);
    await page.mouse.up();
    await sleep(300);
  };

  const before = await names();
  // Drag the first tile's middle 20px past the third tile's middle.
  const [first, third, grab] = [await centre('.tile:nth-child(1)'), await centre('.tile:nth-child(3)'), await centre('.tile:nth-child(1) .pay-add')];
  await hold(grab, grab.y + third.y - first.y + 20);
  const after = await names();
  check('holding a tile and dragging it down moves it (and the order is saved)', after[2] === before[0] && after[0] === before[1] && (await stored()).join() === after.join(), { before, after });
  check('the hold that moves a tile does not sell', (await sales()) === 0);
  await page.reload();
  await sleep(900);
  check('the new order is still there after a restart', (await names()).join() === after.join(), await names());
  const still = await centre('.tile:nth-child(1) .pay-add');
  await hold(still, still.y);
  check('a hold without moving does not sell either', (await sales()) === 0 && (await names()).join() === after.join());
  await page.click('.tile:nth-child(1) .pay-add');
  check('a plain tap still sells', (await sales()) === 1);

  // Compact tiles: shorter, no price.
  const tall = await page.evaluate(() => document.querySelector('.tile').getBoundingClientRect().height);
  await page.click('#sellMenuBtn');
  await page.click('label[for="compactTilesToggle"]');
  const compact = await page.evaluate(() => ({ height: document.querySelector('.tile').getBoundingClientRect().height, price: getComputedStyle(document.querySelector('.product-price')).display }));
  check('Compact tiles makes tiles shorter and hides the price', compact.height < tall * 0.85 && compact.price === 'none', { tall, compact });
  await page.keyboard.press('Escape');
  check('Escape closes the ⋮ menu', await page.evaluate(() => document.getElementById('sellMenu').hidden));
  const handMade = await names();

  // Sort by best sellers: sorts at once, then stays put while selling on Sell; re-sorts on the next visit.
  const last = (await names()).at(-1);
  await page.evaluate((name) => { for (let i = 0; i < 3; i++) document.querySelector(`.tile[data-product="${name}"] .pay-add`).click(); }, last);
  await page.click('#sellMenuBtn');
  await page.click('label[for="autoSortToggle"]');
  await page.keyboard.press('Escape');
  check('turning on Sort by best sellers puts the best seller first', (await names())[0] === last, await names());
  const second = (await names())[3];
  await page.evaluate((name) => { for (let i = 0; i < 5; i++) document.querySelector(`.tile[data-product="${name}"] .pay-add`).click(); }, second);
  check('while on Sell, selling does not move tiles', (await names())[0] === last);
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('.tabbar .tab[data-tab="salesScreen"]');
  check('coming back to Sell re-sorts', (await names())[0] === second, await names());
  const sorted = await names();
  await hold(await centre('.tile:nth-child(1) .pay-add'), (await centre('.tile:nth-child(3)')).y + 20);
  check('dragging is off while sorting by best sellers', (await names()).join() === sorted.join());
  // Renaming a tile (its pencil) while sorted keeps it where it was, under its new name.
  await page.click('.tile:nth-child(3) .tile-edit');
  await page.fill('#editName', 'Renamed one');
  await page.click('#saveProductBtn');
  await sleep(300);
  const renamed = await names();
  check('renaming a product while sorting by best sellers keeps its tile in place', renamed[2] === 'Renamed one' && renamed.filter((n, i) => i !== 2).join() === sorted.filter((n, i) => i !== 2).join(), { sorted, renamed });

  // A tap outside the menu only closes it.
  await page.click('#sellMenuBtn');
  const count = await sales();
  await page.click('.tile:nth-child(2) .pay-add');
  check('a tap outside the open menu closes it without selling', (await page.evaluate(() => document.getElementById('sellMenu').hidden)) && (await sales()) === count);

  // The ⋮ button is on Sell only; leaving Sell closes the menu.
  const shown = [];
  for (const tab of ['eventScreen', 'productHistoryScreen', 'historyScreen', 'settingsScreen']) {
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    await page.click('#sellMenuBtn');
    await page.click(`.tabbar .tab[data-tab="${tab}"]`); // the first tap outside only closes the menu
    await page.click(`.tabbar .tab[data-tab="${tab}"]`);
    const state = await page.evaluate(() => ({ screen: document.querySelector('.screen.active').id, open: !document.getElementById('sellMenu').hidden, button: Boolean(document.getElementById('sellMenuBtn').offsetParent) }));
    if (state.screen !== tab || state.open || state.button) shown.push({ tab, ...state });
  }
  check('the ⋮ menu is only on Sell and never stays open on another tab', !shown.length, shown);

  // Turning Sort by best sellers off brings back the hand-made order (with the rename in it).
  await page.click('.tabbar .tab[data-tab="salesScreen"]');
  await page.click('#sellMenuBtn');
  await page.click('label[for="autoSortToggle"]');
  await page.keyboard.press('Escape');
  const back = await names();
  check('turning Sort by best sellers off brings back the hand-made order', back.join() === handMade.map((n) => (n === sorted[2] ? 'Renamed one' : n)).join() && back.join() === (await stored()).join(), { handMade, back });
  await page.close();
}

// The same on a touch screen (real touch events), on a small phone: with a hidden product, compact tiles of every kind, one tile.
{
  const page = await browser.newPage({ viewport: { width: 360, height: 780 }, hasTouch: true, isMobile: true });
  await page.goto(URL);
  const products = JSON.parse(SAMPLE_PRODUCTS).concat(
    { name: 'Freebie', price: 0, cost: 0, color: '#4d8df0' },
    { name: 'Cash only', price: 1000, cost: 0, color: '#199e70', payments: ['Cash'] },
    { name: 'A really very long product name', price: 1000, cost: 0, color: '#9085e9', payments: ['Card', 'E-wallet'] },
  );
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, JSON.stringify(products));
  await page.reload();
  await sleep(900);
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  const names = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((tile) => tile.dataset.product));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.cntrProducts).map((p) => p.name));
  const sales = async () => (await sleep(150), page.evaluate(() => JSON.parse(localStorage.cntrSales ?? '[]').length));
  const centre = (selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
  // Hold the first tile, then drag it just past the middle of tile n.
  const dragFirstPast = async (n) => {
    const [from, mid1, midN] = [await centre('.tile:nth-child(1) .pay-add'), await centre('.tile:nth-child(1)'), await centre(`.tile:nth-child(${n})`)];
    await touch('touchStart', from.x, from.y);
    await sleep(550);
    for (let i = 1; i <= 10; i++) await touch('touchMove', from.x, from.y + ((midN.y - mid1.y + 15) * i) / 10);
    await touch('touchEnd');
    await sleep(350);
  };

  let before = await names();
  await dragFirstPast(3);
  let after = await names();
  check('touch: hold and drag moves a tile, saves the order, does not sell, does not scroll the page', after[2] === before[0] && after.join() === (await stored()).join() && (await sales()) === 0 && (await page.evaluate(() => document.querySelector('.content').scrollTop)) === 0, { before, after });
  const swipe = await centre('.tile:nth-child(2) .pay-add');
  await touch('touchStart', swipe.x, swipe.y);
  for (let i = 1; i <= 5; i++) await touch('touchMove', swipe.x, swipe.y - i * 10);
  await sleep(550); // past the hold time, but the finger already moved: it was a scroll
  await touch('touchEnd');
  await sleep(300);
  check('touch: a quick swipe is a scroll, it neither picks up a tile nor sells', (await names()).join() === after.join() && (await sales()) === 0);
  await page.tap('.tile:nth-child(1) .pay-add');
  check('touch: a tap still sells', (await sales()) === 1);

  // A hidden product: dragging moves the tiles on the counter; the hidden one stays hidden and in Products.
  const hide = after[1];
  await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
  await page.click(`.product-toggle-btn[data-name="${hide}"]`);
  await page.click('.tabbar .tab[data-tab="salesScreen"]');
  before = await names();
  await dragFirstPast(2);
  after = await names();
  const history = await page.evaluate(() => JSON.parse(localStorage.cntrProductHistory).map((p) => p.name));
  check('touch: with a product hidden, dragging still moves tiles and the hidden one stays hidden', after[1] === before[0] && !after.includes(hide) && history.includes(hide) && after.join() === (await stored()).join(), { before, after });

  // Compact tiles, every kind: two methods, one method, Free, a long name. Each sells and undoes; nothing pokes out.
  await page.click('#sellMenuBtn');
  await page.click('label[for="compactTilesToggle"]');
  await page.click('#sellMenuBtn');
  const fit = await page.evaluate(() => {
    const out = [];
    for (const tile of document.querySelectorAll('.tile')) {
      const t = tile.getBoundingClientRect();
      for (const node of tile.querySelectorAll('.pay-add, .pay-undo, .tile-edit, .product-name')) {
        const r = node.getBoundingClientRect();
        if (r.left < t.left - 1 || r.right > t.right + 1 || r.top < t.top - 1 || r.bottom > t.bottom + 1) out.push(`${tile.dataset.product} ${node.className}`);
      }
    }
    return { out, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  check('compact tiles at 360px: every button and name stays inside its tile, no sideways scroll', !fit.out.length && !fit.overflow, fit);
  const kinds = [];
  for (const name of ['Gacha', 'Cash only', 'Freebie', 'A really very long product name']) {
    const add = page.locator(`.tile[data-product="${name}"] .pay-add`).first();
    await add.scrollIntoViewIfNeeded();
    const start = await sales();
    await add.tap();
    const sold = await sales();
    // The − keeps its 44px hit area in a compact half: tap it near its edge, not its middle.
    const undo = await page.locator(`.tile[data-product="${name}"] .pay-undo`).first().boundingBox();
    await page.touchscreen.tap(undo.x - 6, undo.y + undo.height / 2);
    const undone = await sales();
    if (sold !== start + 1 || undone !== start) kinds.push({ name, start, sold, undone });
  }
  check('compact tiles (2 methods, 1 method, Free, long name): a tap sells and the − takes it back', !kinds.length, kinds);
  check('a Free product has one Free counter, in compact too', (await page.evaluate(() => [...document.querySelectorAll('.tile[data-product="Freebie"] .pay')].map((p) => p.dataset.payment).join())) === 'Free');
  await page.evaluate(() => document.querySelector('.content').scrollTo(0, 0));
  before = await names();
  await dragFirstPast(2);
  after = await names();
  check('compact tiles: hold and drag still moves a tile', after[1] === before[0] && after.join() === (await stored()).join(), { before, after });

  // One tile only: a drag goes nowhere, leaves nothing half-moved and sells nothing.
  await page.evaluate(() => { localStorage.cntrProducts = JSON.stringify([{ name: 'Only', price: 5000, cost: 1000, color: '#c8070b' }]); localStorage.cntrSales = '[]'; });
  await page.reload();
  await sleep(900);
  const only = await centre('.tile .pay-add');
  await touch('touchStart', only.x, only.y);
  await sleep(550);
  for (let i = 1; i <= 10; i++) await touch('touchMove', only.x, only.y + i * 30);
  await touch('touchEnd');
  await sleep(350);
  const one = await page.evaluate(() => ({ names: JSON.parse(localStorage.cntrProducts).map((p) => p.name).join(), transform: document.querySelector('.tile').style.transform, grid: document.getElementById('grid').className }));
  check('with one tile, a drag leaves it in place and sells nothing', one.names === 'Only' && !one.transform && !/is-reordering/.test(one.grid) && (await sales()) === 0, one);
  await page.close();
}

// Tablet: with 2 columns, a held tile moves sideways and down to the slot under it.
{
  const page = await browser.newPage({ viewport: { width: 800, height: 1280 } });
  await page.goto(URL);
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
  await page.reload();
  await sleep(900);
  const names = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((tile) => tile.dataset.product));
  const centre = (selector) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, selector);
  const before = await names();
  // Tile 1 (row 1, left) onto tile 4 (row 2, right).
  const [grab, first, fourth] = [await centre('.tile:nth-child(1) .pay-add'), await centre('.tile:nth-child(1)'), await centre('.tile:nth-child(4)')];
  await page.mouse.move(grab.x, grab.y);
  await page.mouse.down();
  await sleep(550);
  for (let i = 1; i <= 10; i++) await page.mouse.move(grab.x + ((fourth.x - first.x) * i) / 10, grab.y + ((fourth.y - first.y) * i) / 10);
  await page.mouse.up();
  await sleep(300);
  const after = await names();
  const sold = await page.evaluate(() => JSON.parse(localStorage.cntrSales ?? '[]').length);
  check('2 columns: dragging a tile diagonally drops it in that slot, in reading order, without selling', after[3] === before[0] && after.slice(0, 3).join() === before.slice(1, 4).join() && sold === 0, { before, after });
  await page.close();
}

await browser.close();
done();
