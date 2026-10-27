// Tutorial: offered once on an empty first launch, the whole hands-on tour on rails, and the real data coming back
// exactly as it was after finishing, quitting or a crash mid-tour. Real clicks, so a bubble covering a target fails.
import { URL, TOUR_ACTIONS, checks, launch, playTour, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch({ welcome: true });
const errors = [];
const DATA_KEYS = ['cntrProducts', 'cntrProductHistory', 'cntrSales', 'cntrEventCosts', 'cntrLiveEvent', 'cntrEvents', 'cntrSettings'];

async function freshPage(locale = 'en-US') {
  const context = await browser.newContext({ viewport: { width: 412, height: 892 }, acceptDownloads: true, locale });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await sleep(1200);
  return { context, page };
}
const snapshot = (page) => page.evaluate((keys) => JSON.stringify(Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)]))), DATA_KEYS);
const stepId = (page) => page.evaluate(() => document.querySelector('.tour-bubble')?.dataset.step ?? null);
const afterReload = async (page) => {
  await page.waitForLoadState('load');
  await sleep(1200);
};

// 1. First launch on an empty app: the offer appears once; Skip leaves an empty app
{
  const { context, page } = await freshPage();
  const offer = await page.evaluate(() => ({
    open: document.getElementById('confirmModalOverlay').classList.contains('open'),
    title: document.getElementById('confirmModalTitle').textContent,
    skip: document.getElementById('confirmModalCancelBtn').textContent,
  }));
  check('an empty first launch offers the tour, with Start tour and Skip', offer.open && offer.title === 'New to CNTR?' && offer.skip === 'Skip', offer);
  await page.click('#confirmModalCancelBtn');
  await sleep(300);
  await page.reload();
  await afterReload(page);
  const after = await page.evaluate(() => ({ open: document.getElementById('confirmModalOverlay').classList.contains('open'), bubble: !!document.querySelector('.tour-bubble'), products: localStorage.getItem('cntrProducts') }));
  check('after Skip the offer never comes back, and no practice data was made', !after.open && !after.bubble && after.products === null, after);
  await context.close();
}

// 2. The whole tour from the first-launch offer; afterwards the data is exactly as before
{
  const { context, page } = await freshPage();
  let downloads = 0;
  page.on('download', () => downloads++);
  const before = await snapshot(page);
  await page.click('#confirmModalConfirmBtn');
  await afterReload(page);
  const practice = await page.evaluate(() => ({ products: JSON.parse(localStorage.cntrProducts).map((p) => p.name), events: JSON.parse(localStorage.cntrEvents).length }));
  check('Start tour loads practice products and two practice events', practice.products.join() === 'Sticker,Keychain' && practice.events === 2, practice);

  const offScreen = [];
  const stuck = await playTour(page, undefined, async (id) => {
    await sleep(300); // the bubble is placed on the next poll
    const box = await page.evaluate(() => { const r = document.querySelector('.tour-bubble').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight }; });
    if (box.top < 0 || box.bottom > box.height) offScreen.push(`${id} ${Math.round(box.top)}..${Math.round(box.bottom)}`);
  });
  check(`all ${Object.keys(TOUR_ACTIONS).length} steps can be done with real taps and move the tour on`, !stuck, stuck ?? '');
  check('the tour bubble is fully on screen at every step (never under the status bar)', !offScreen.length, offScreen.join(' | '));
  await afterReload(page);
  await sleep(300);
  const after = await snapshot(page);
  const left = await page.evaluate(() => ({ bubble: !!document.querySelector('.tour-bubble'), saved: localStorage.getItem('cntrMeta.tutorialSavedData'), session: sessionStorage.getItem('cntrTourRunning') }));
  check('Finish removes all practice data: the data is exactly as before the tour', after === before, after === before ? '' : after.slice(0, 300));
  check('after Finish no tour, no saved copy and no session marker are left', !left.bubble && left.saved === null && left.session === null, left);
  check('the tour wrote no backup or other files', downloads === 0, `${downloads} downloads`);
  await context.close();
}

// 3. Replay from Settings with real data: asks first; on rails; Quit puts the real data back exactly
const REAL = {
  cntrProducts: JSON.stringify([{ name: 'Real tee', price: 120000, cost: 60000, color: '#9b48ad', payments: ['Cash', 'Card'] }]),
  cntrProductHistory: JSON.stringify([{ name: 'Real tee', price: 120000, cost: 60000, color: '#9b48ad', payments: ['Cash', 'Card'] }]),
  cntrSales: JSON.stringify([{ product: 'Real tee', price: 120000, cost: 60000, payment: 'Card', timestamp: new Date().toISOString() }]),
  cntrSettings: JSON.stringify({ currency: 'USD', compactMoney: false, productsPerDay: true, sound: false }),
};
async function realDataPage() {
  const made = await freshPage();
  await made.page.evaluate((real) => {
    localStorage.clear();
    localStorage.setItem('cntrMeta.tutorialOffered', 'test');
    for (const [key, value] of Object.entries(real)) localStorage.setItem(key, value);
  }, REAL);
  await made.page.reload();
  await afterReload(made.page);
  return made;
}
async function startFromSettings(page) {
  await page.click('.tabbar .tab[data-tab="settingsScreen"]');
  await page.click('#startTutorialBtn');
  const asked = await page.evaluate(() => document.getElementById('confirmModalTitle').textContent);
  await page.click('#confirmModalConfirmBtn');
  await afterReload(page);
  return asked;
}
{
  const { context, page } = await realDataPage();
  const before = await snapshot(page);
  const asked = await startFromSettings(page);
  const during = await page.evaluate(() => ({ step: document.querySelector('.tour-bubble')?.dataset.step, products: JSON.parse(localStorage.cntrProducts).map((p) => p.name), sound: JSON.parse(localStorage.cntrSettings).sound }));
  check('Settings → Show tutorial asks first when there is real data', asked === 'Show the tutorial?', asked);
  check('the tour runs on practice data and keeps your settings', during.step === 'sell-cash' && during.products.join() === 'Sticker,Keychain' && during.sound === false, during);

  // On rails: taps off the highlighted button do nothing, and a "do" step has no Skip
  const sales = () => page.evaluate(() => JSON.parse(localStorage.cntrSales ?? '[]').length);
  await page.click('.tabbar .tab[data-tab="settingsScreen"]');
  await page.dispatchEvent('.tile[data-product="Keychain"] [data-payment="Cash"][data-action="plus"]', 'click'); // it sits under the bubble
  await page.click('#openProductEdit');
  await sleep(300);
  const offRails = await page.evaluate(() => ({ screen: document.querySelector('.screen.active').id, step: document.querySelector('.tour-bubble').dataset.step, next: !document.getElementById('tourNextBtn').hidden }));
  check('on rails: other tabs, tiles and buttons ignore taps during a step', offRails.screen === 'salesScreen' && offRails.step === 'sell-cash' && (await sales()) === 0, offRails);
  check('on rails: a "do" step has no Skip button', !offRails.next, offRails);
  check('on rails: the dim spotlight and ring are shown on the target', await page.evaluate(() => !document.querySelector('.tour-ring').classList.contains('tour-ring-full')));

  // On rails inside a dialog: Cancel, close and Escape cannot leave the step
  const toExpenseForm = await playTour(page, 'expense-form');
  await page.waitForSelector('.tour-bubble[data-step="expense-form"]');
  await page.keyboard.press('Escape');
  await page.click('#expenseModalCancelBtn');
  await page.click('#expenseModalCloseBtn');
  await sleep(300);
  const sheet = await page.evaluate(() => ({ open: document.getElementById('expenseModalOverlay').classList.contains('open'), step: document.querySelector('.tour-bubble').dataset.step }));
  check('on rails: a step\'s dialog cannot be cancelled, closed or escaped', !toExpenseForm && sheet.open && sheet.step === 'expense-form', toExpenseForm ?? sheet);

  await page.click('#tourQuitBtn');
  await afterReload(page);
  await sleep(300);
  check('Quit tour puts the real data back exactly as it was', (await snapshot(page)) === before);
  await context.close();
}

// 4. Closed mid-tour: the next launch (a new session) brings the real data back and does not resume
{
  const { context, page } = await realDataPage();
  const before = await snapshot(page);
  await startFromSettings(page);
  await TOUR_ACTIONS['sell-cash'](page);
  await sleep(300);
  await page.close();
  const relaunched = await context.newPage();
  relaunched.on('pageerror', (error) => errors.push(error.message));
  await relaunched.goto(URL);
  await sleep(1500);
  await relaunched.waitForLoadState('load');
  await sleep(1200);
  const after = await snapshot(relaunched);
  const state = await relaunched.evaluate(() => ({ bubble: !!document.querySelector('.tour-bubble'), saved: localStorage.getItem('cntrMeta.tutorialSavedData') }));
  check('a crash mid-tour: the next launch has the real data back exactly', after === before, after === before ? '' : after.slice(0, 300));
  check('a crash mid-tour: the tour does not resume and no saved copy is left', !state.bubble && state.saved === null, state);
  await context.close();
}

// 4b. Reloaded mid-tour (same session): the real data comes back; the tour does not restart on changed practice data
{
  const { context, page } = await realDataPage();
  const before = await snapshot(page);
  await startFromSettings(page);
  await TOUR_ACTIONS['sell-cash'](page);
  await sleep(300);
  await page.reload();
  await afterReload(page); // ends the tutorial, which reloads again
  await afterReload(page);
  const state = await page.evaluate(() => ({ bubble: !!document.querySelector('.tour-bubble'), saved: localStorage.getItem('cntrMeta.tutorialSavedData'), session: sessionStorage.getItem('cntrTourRunning') }));
  check('a reload mid-tour puts the real data back exactly', (await snapshot(page)) === before);
  check('a reload mid-tour does not restart the tour at step 1', !state.bubble && state.saved === null && state.session === null, state);
  await context.close();
}

// 5. Language on first launch: a fresh install follows an Indonesian phone; an updating user stays English
{
  const { context, page } = await freshPage('id-ID');
  const fresh = await page.evaluate(() => ({ stored: JSON.parse(localStorage.cntrSettings ?? '{}').language, select: document.getElementById('languageSelect').value, html: document.documentElement.lang }));
  check('a fresh install on an Indonesian phone starts in Indonesian (and remembers it)', fresh.stored === 'id' && fresh.select === 'id' && fresh.html === 'id', fresh);
  await context.close();
}
{
  const { context, page } = await freshPage('id-ID');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.cntrProducts = JSON.stringify([{ name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' }]);
    localStorage.cntrEvents = JSON.stringify([{ id: 'e1', name: 'Fair', startedAt: '2026-10-20T03:00:00.000Z', endedAt: '2026-10-20T11:00:00.000Z', dayBreaks: [], products: [], sales: [], expenses: [] }]);
  });
  await page.reload();
  await afterReload(page);
  const updating = await page.evaluate(() => ({ stored: JSON.parse(localStorage.cntrSettings ?? '{}').language, select: document.getElementById('languageSelect').value }));
  check('an updating user (data, no language saved) on an Indonesian phone stays in English', updating.stored === 'en' && updating.select === 'en', updating);
  await page.click('.tabbar .tab[data-tab="settingsScreen"]');
  await page.selectOption('#languageSelect', 'id');
  await sleep(200);
  const switched = await page.evaluate(() => ({ stored: JSON.parse(localStorage.cntrSettings).language, theme: document.getElementById('themeLabel').textContent }));
  check('choosing Bahasa Indonesia in Settings switches without a reload and is saved', switched.stored === 'id' && switched.theme === 'Tema', switched);

  // A dialog open during a language switch is closed, not left in the old language.
  await page.click('#startTutorialBtn');
  const dialog = await page.evaluate(() => {
    const open = () => document.getElementById('confirmModalOverlay').classList.contains('open');
    const before = open();
    const select = document.getElementById('languageSelect');
    select.value = 'en';
    select.dispatchEvent(new Event('change'));
    return { before, after: open() };
  });
  check('switching language closes an open dialog', dialog.before && !dialog.after, dialog);
  await page.selectOption('#languageSelect', 'id');
  await sleep(200);

  // Restoring a backup from before 0.1 (no language in it) keeps Bahasa Indonesia.
  const old = JSON.stringify({ app: 'CNTR', format: 1, exportedAt: new Date().toISOString(), data: { cntrProducts: [{ name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' }], cntrSettings: { currency: 'IDR', compactMoney: false } } });
  const chooser = page.waitForEvent('filechooser');
  await page.click('#restoreBackupBtn');
  await (await chooser).setFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(old) });
  await sleep(400);
  const warning = await page.textContent('#confirmModalMessage');
  check('restoring a backup with no past events says History will be emptied', /Riwayat di ponsel ini akan kosong/.test(warning), warning);
  await page.click('#confirmModalConfirmBtn');
  await afterReload(page);
  const restored = await page.evaluate(() => ({ stored: JSON.parse(localStorage.cntrSettings).language, currency: JSON.parse(localStorage.cntrSettings).currency, html: document.documentElement.lang }));
  check('restoring a backup from before 0.1 keeps the current language', restored.stored === 'id' && restored.html === 'id' && restored.currency === 'IDR', restored);
  await context.close();
}

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
