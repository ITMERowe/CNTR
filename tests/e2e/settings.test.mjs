// Settings and Products: order of sections, product summary, counter/hidden sections, row tap to edit, delete only in the editor.
import { URL, checks, launch, run, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const load = async () => { await page.goto(URL); await sleep(1200); };

await load();
await run(page, `
  localStorage.clear();
  localStorage.cntrProducts = JSON.stringify([
    { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
    { name: 'Pin', price: 5000, cost: 1000, color: '#31b500', payments: ['E-wallet'] },
  ]);
  localStorage.cntrProductHistory = JSON.stringify([{ name: 'Old badge', price: 8000, cost: 3000, color: '#5f6d77' }]);
`);
await load();

const H = `
  const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
  const tab = (id) => document.querySelector('.tabbar .tab[data-tab="' + id + '"]').click();
  const stored = (key) => JSON.parse(localStorage.getItem(key) ?? 'null');
  const rows = (section) => [...document.querySelectorAll('#productHistoryList [data-section="' + section + '"] .product-edit-btn')].map((b) => b.dataset.name);
`;

// 1. Settings order: Products first, Backup second to last, About last; the Products row summarises the counter
const settings = await run(page, `${H}
  tab('settingsScreen');
  const groups = [...document.querySelectorAll('#settingsScreen .group')].map((g) => g.dataset.group);
  return { groups, summary: document.getElementById('productsSummary').textContent, lastBackup: document.getElementById('lastBackupText').textContent };
`);
check('Settings order: Products, Event, Money, Appearance, Sound, Sales data, Backup, About', settings.groups.join() === 'products,event,money,appearance,sound,sales,backup,about', settings.groups);

// Appearance: follows the phone by default (live, no reload); Light or Dark sticks
const themeNow = () => page.evaluate(() => document.documentElement.dataset.theme);
await page.emulateMedia({ colorScheme: 'light' });
await sleep(100);
const followLight = await themeNow();
await page.emulateMedia({ colorScheme: 'dark' });
await sleep(100);
const followDark = await themeNow();
const choice = await run(page, `${H}
  const select = document.getElementById('themeSelect');
  const before = select.value;
  select.value = 'light'; select.dispatchEvent(new Event('change'));
  await wait(100);
  return { before, stored: stored('cntrSettings').theme };
`);
await page.emulateMedia({ colorScheme: 'dark' });
await sleep(100);
const stuck = await themeNow();
check('Appearance defaults to Phone setting and follows the phone live', choice.before === 'system' && followLight === 'light' && followDark === 'dark', { before: choice.before, followLight, followDark });
check('choosing Light stores it and stays light when the phone is dark', choice.stored === 'light' && stuck === 'light', { stored: choice.stored, stuck });
await run(page, `const s = document.getElementById('themeSelect'); s.value = 'system'; s.dispatchEvent(new Event('change'));`);

// Sound effects: on by default, a sale plays one tone; switched off, a sale is silent and the choice is saved
const sound = await run(page, `${H}
  let tones = 0;
  const Real = window.OscillatorNode;
  window.OscillatorNode = class extends Real { constructor(...args) { super(...args); tones++; } };
  const toggle = document.getElementById('soundToggle');
  const onByDefault = toggle.checked;
  tab('salesScreen');
  const sell = () => document.querySelector('.tile[data-product="Gacha"] [data-payment="Cash"][data-action="plus"]').click();
  sell();
  const onTones = tones;
  tab('settingsScreen');
  toggle.click();
  tones = 0;
  tab('salesScreen');
  sell();
  const offTones = tones;
  await wait();
  const saved = stored('cntrSettings').sound;
  tab('settingsScreen');
  toggle.click(); // back on
  window.OscillatorNode = Real;
  return { onByDefault, onTones, offTones, saved };
`);
check('Sound effects is on by default and a sale plays one soft tone', sound.onByDefault && sound.onTones === 1, sound);
check('with Sound effects off a sale is silent, and the choice is saved', sound.offTones === 0 && sound.saved === false, sound);
check('Products row says how many are on the counter and hidden', settings.summary === '2 on the counter · 1 hidden', settings.summary);
check('Backup shows the last backup plainly ("Never" before the first)', settings.lastBackup === 'Never', settings.lastBackup);

// 2. Products: two sections, rows show price, profit and methods; no delete button on rows
const list = await run(page, `${H}
  document.getElementById('openProductsMenuBtn').click();
  await wait();
  const pin = document.querySelector('.product-edit-btn[data-name="Pin"]').closest('.product-item');
  return {
    counter: rows('counter'), hidden: rows('hidden'),
    heads: [...document.querySelectorAll('#productHistoryList .product-section-title')].map((h) => h.textContent),
    pinText: pin.textContent, deleteButtons: document.querySelectorAll('#productHistoryList .product-delete-btn, #productHistoryList .icon-btn-danger').length,
    addButton: !!document.getElementById('addProductBtn'),
  };
`);
check('Products split into On the counter and Hidden, with counts', list.counter.join() === 'Gacha,Pin' && list.hidden.join() === 'Old badge' && list.heads.join() === 'On the counter · 2,Hidden · 1', list);
check('a row shows price, profit per item and its payment methods', /Rp 5\.000/.test(list.pinText) && /profit Rp 4\.000/.test(list.pinText) && /E-wallet/.test(list.pinText), list.pinText);
check('no delete buttons on rows; an Add product button at the end', list.deleteButtons === 0 && list.addButton, list);

// 3. Tapping the switch moves a product between sections; tapping a row opens the editor
const moves = await run(page, `${H}
  document.querySelector('.product-toggle-btn[data-name="Old badge"]').click();
  await wait();
  const afterOn = { counter: rows('counter'), hidden: rows('hidden'), sell: stored('cntrProducts').map((p) => p.name) };
  document.querySelector('.product-edit-btn[data-name="Pin"]').click();
  const editor = { screen: document.querySelector('.screen.active').id, name: document.getElementById('editName').value };
  return { afterOn, editor };
`);
check('the switch moves a hidden product onto the counter', moves.afterOn.hidden.length === 0 && moves.afterOn.sell.includes('Old badge'), moves.afterOn);
check('tapping a row opens that product in the editor', moves.editor.screen === 'productEditScreen' && moves.editor.name === 'Pin', moves.editor);

// 4. Delete lives in the editor: asks first, then removes the product everywhere
const del = await run(page, `${H}
  document.getElementById('removeProductBtn').click();
  const asked = document.getElementById('confirmModalOverlay').classList.contains('open') && /^Delete 'Pin'?/.test(document.getElementById('confirmModalMessage').textContent);
  document.getElementById('confirmModalConfirmBtn').click();
  await wait();
  return { asked, screen: document.querySelector('.screen.active').id, active: stored('cntrProducts').map((p) => p.name), history: stored('cntrProductHistory').map((p) => p.name) };
`);
check('editor delete asks first, then removes the product from the counter and the list', del.asked && del.screen === 'productHistoryScreen' && !del.active.includes('Pin') && !del.history.includes('Pin'), del);

// 5. A hidden product can be deleted from its editor too
const delHidden = await run(page, `${H}
  document.querySelector('.product-toggle-btn[data-name="Old badge"]').click();
  await wait();
  document.querySelector('.product-edit-btn[data-name="Old badge"]').click();
  const visible = getComputedStyle(document.getElementById('removeProductBtn')).display !== 'none';
  document.getElementById('removeProductBtn').click();
  document.getElementById('confirmModalConfirmBtn').click();
  await wait();
  return { visible, history: stored('cntrProductHistory').map((p) => p.name) };
`);
check('a hidden product can be deleted from its editor', delHidden.visible && !delHidden.history.includes('Old badge'), delHidden);

// 6. Deleting a product keeps all its sales, from earlier days and today
await run(page, `
  const day = 86400000, now = Date.now();
  const sale = (product, price, at) => ({ product, price, cost: 1000, payment: 'Cash', timestamp: new Date(at).toISOString() });
  localStorage.clear();
  localStorage.setItem('cntrMeta.tutorialOffered', 'test');
  localStorage.cntrProducts = localStorage.cntrProductHistory = JSON.stringify([
    { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
    { name: 'Pin', price: 5000, cost: 1000, color: '#31b500' },
  ]);
  localStorage.cntrLiveEvent = JSON.stringify({ id: 'live', name: null, startedAt: new Date(now - 2 * day).toISOString(), dayBreaks: [new Date(now - day).toISOString()] });
  localStorage.cntrSales = JSON.stringify([sale('Pin', 5000, now - 1.5 * day), sale('Pin', 5000, now - 1.4 * day), sale('Pin', 5000, now - 60000), sale('Gacha', 25000, now - 30000)]);
`);
await load();
const deleted = await run(page, `${H}
  document.querySelector('.tile[data-product="Pin"] .tile-edit').click();
  document.getElementById('removeProductBtn').click();
  const message = document.getElementById('confirmModalMessage').textContent;
  document.getElementById('confirmModalConfirmBtn').click();
  await wait(200);
  tab('eventScreen');
  const pinRow = [...document.querySelectorAll('#eventCard .swatch')].map((s) => s.parentElement).find((row) => /Pin/.test(row.textContent));
  const swatch = pinRow ? getComputedStyle(pinRow.querySelector('.swatch')).backgroundColor : 'no row';
  return { message, pinSales: stored('cntrSales').filter((s) => s.product === 'Pin').length, onCounter: stored('cntrProducts').map((p) => p.name), swatch };
`);
check('deleting a product asks with "Its sales stay in your reports"', /Its sales stay in your reports/.test(deleted.message), deleted.message);
check('deleting a product keeps all 3 of its sales (2 earlier days, 1 today) and takes it off the counter', deleted.pinSales === 3 && !deleted.onCounter.includes('Pin'), deleted);
check('a deleted product still shows on the Event screen with a visible colour', !/no row|rgba\(0, 0, 0, 0\)|transparent/.test(deleted.swatch), deleted.swatch);
const recreated = await run(page, `${H}
  tab('salesScreen');
  document.getElementById('openProductEdit').click();
  const set = (id, value) => { const input = document.getElementById(id); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); };
  set('editName', 'Pin'); set('editPrice', '9000');
  document.getElementById('saveProductBtn').click();
  await wait(200);
  return stored('cntrSales').filter((s) => s.product === 'Pin').map((s) => s.price);
`);
check('re-creating a product with the same name keeps the old sales at their old price', recreated.join() === '5000,5000,5000', recreated);

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
