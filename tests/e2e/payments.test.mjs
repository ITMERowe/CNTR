// No starter products; each product takes 1 or 2 payment methods (Cash, QRIS, Transfer, Card, E-wallet).
import { URL, checks, launch, run, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const load = async () => { await page.goto(URL); await sleep(1200); };

await load();
await run(page, `localStorage.clear()`);
await load();

const H = `
  const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
  const tab = (id) => document.querySelector('.tabbar .tab[data-tab="' + id + '"]').click();
  const option = (m) => document.querySelector('#editPayments .payment-option[data-method="' + m + '"]');
  const pressed = () => [...document.querySelectorAll('#editPayments .payment-option[aria-pressed="true"]')].map((b) => b.dataset.method);
  const stored = (key) => JSON.parse(localStorage.getItem(key) ?? 'null');
  const addProduct = async (name, price, methods) => {
    document.getElementById('openProductEdit').click();
    document.getElementById('editName').value = name;
    const p = document.getElementById('editPrice'); p.value = String(price); p.dispatchEvent(new Event('input'));
    for (const m of methods) option(m).click();
    document.getElementById('saveProductBtn').click();
    await wait();
  };
`;

// 1. A fresh install has no starter products
const fresh = await run(page, `${H}
  return { tiles: document.querySelectorAll('.tile').length, empty: document.querySelector('.grid-empty')?.textContent ?? '', stored: localStorage.getItem('cntrProducts') };
`);
check('fresh install: no starter products, the empty counter says how to add one', fresh.tiles === 0 && /Tap \+/.test(fresh.empty), fresh);

// 2. The editor offers the methods; a new product starts with Cash + QRIS; a third is refused; the last cannot be removed
const editor = await run(page, `${H}
  document.getElementById('openProductEdit').click();
  const offered = [...document.querySelectorAll('#editPayments .payment-option')].map((b) => b.dataset.method);
  const start = pressed();
  option('Card').click();
  const afterThird = pressed();
  const cardDisabled = option('Card').getAttribute('aria-disabled') === 'true';
  option('QRIS').click(); option('Cash').click();
  const lastKept = pressed();
  document.getElementById('closeEditBtn').click();
  return { offered, start, afterThird, cardDisabled, lastKept };
`);
check('editor offers Cash, QRIS, Transfer, Card, E-wallet', editor.offered.join() === 'Cash,QRIS,Transfer,Card,E-wallet', editor);
check('a new product starts with Cash + QRIS', editor.start.join() === 'Cash,QRIS', editor);
check('a third method is refused while 2 are chosen', editor.afterThird.join() === 'Cash,QRIS' && editor.cardDisabled, editor);
check('the last method cannot be removed', editor.lastKept.join() === 'Cash', editor);

// 3. Two methods = two halves; one method = one full-width button; the sale records that method
const tiles = await run(page, `${H}
  await addProduct('Zine', 10000, ['QRIS', 'Transfer']);            // Cash + QRIS -> Cash + Transfer
  await addProduct('Pin', 5000, ['QRIS', 'Card', 'Cash']);          // -> Card only
  const zine = [...document.querySelectorAll('.tile[data-product="Zine"] .pay-add')].map((b) => b.dataset.payment);
  const pin = [...document.querySelectorAll('.tile[data-product="Pin"] .pay-add')].map((b) => b.dataset.payment);
  const pinTile = document.querySelector('.tile[data-product="Pin"]').getBoundingClientRect().width;
  const pinButton = document.querySelector('.tile[data-product="Pin"] .pay').getBoundingClientRect().width;
  document.querySelector('.tile[data-product="Zine"] .pay-add[data-payment="Transfer"]').click();
  document.querySelector('.tile[data-product="Pin"] .pay-add[data-payment="Card"]').click();
  document.querySelector('.tile[data-product="Pin"] .pay-add[data-payment="Card"]').click();
  await wait();
  return { zine, pin, wide: pinButton / pinTile, saved: stored('cntrProducts').map((p) => p.name + ':' + p.payments.join('+')), sales: stored('cntrSales').map((s) => s.payment) };
`);
check('a product with 2 methods shows both, in order', tiles.zine.join() === 'Cash,Transfer', tiles);
check('a product with 1 method shows one full-width button', tiles.pin.join() === 'Card' && tiles.wide > 0.85, tiles);
check('chosen methods are saved with the product', tiles.saved.join() === 'Zine:Cash+Transfer,Pin:Card', tiles);
check('a sale records the method tapped', tiles.sales.join() === 'Transfer,Card,Card', tiles);

// 4. Reopening the editor shows the saved methods
const reopen = await run(page, `${H}
  document.querySelector('.tile[data-product="Zine"] .tile-edit').click();
  const methods = pressed();
  document.getElementById('closeEditBtn').click();
  return methods;
`);
check('editing a product shows its saved methods', reopen.join() === 'Cash,Transfer', reopen);

// 5. The payment mix lists only the methods used, in the fixed order, with their names
const mix = await run(page, `${H}
  tab('eventScreen');
  return [...document.querySelectorAll('#eventCard .split-item .split-name')].map((n) => n.textContent);
`);
check('payment mix lists the methods used (Transfer, Card), not Cash/QRIS', mix.join() === 'Transfer,Card', mix);

// 6. History edit offers each product's own methods
const hist = await run(page, `${H}
  document.getElementById('endEventBtn').click();
  document.getElementById('saveModalSaveBtn').click();
  document.getElementById('confirmModalConfirmBtn').click();
  await wait(200);
  tab('historyScreen');
  document.querySelector('#pastEventList .event-row').click();
  document.getElementById('pastEventEditBtn').click();
  const methodsFor = (p) => [...document.querySelectorAll('#pastEventCard [data-adjust][data-product="' + p + '"][data-delta="1"]')].map((b) => b.dataset.payment);
  const result = { pin: methodsFor('Pin'), zine: methodsFor('Zine') };
  document.getElementById('pastEventCancelBtn').click();
  return result;
`);
check('History edit steppers follow each product\'s methods', hist.pin.join() === 'Card' && hist.zine.join() === 'Cash,Transfer', hist);

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
