// Core flows: selling, expenses, products, corrupt storage. The event flow is in events.test.mjs.
import { URL, checks, launch, run, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const load = async () => { await page.goto(URL); await sleep(1200); };

await load();
await run(page, `localStorage.clear(); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)};`);
await load();

// 1. Counters update and sales record
const counts = await run(page, `
  const tile = document.querySelector('.tile');
  const plus = tile.querySelector('[data-payment="Cash"][data-action="plus"]');
  for (let i = 0; i < 5; i++) plus.click();
  tile.querySelector('[data-payment="QRIS"][data-action="plus"]').click();
  await new Promise((r) => setTimeout(r, 30)); return [tile.querySelector('[data-counter-for="Cash"]').textContent, tile.querySelector('[data-counter-for="QRIS"]').textContent, JSON.parse(localStorage.cntrSales).length];
`);
check('tile counters after 5 cash + 1 qris', counts.join() === '5,1,6', counts.join());

// 2. Expense modal: listeners not stacked after many renders, scroll not reset
const exp = await run(page, `
  document.querySelector('.tabbar .tab[data-tab="eventScreen"]').click();
  let resets = 0;
  const amount = document.getElementById('eventCostAmount');
  document.getElementById('openAddExpenseBtn').click();
  const open1 = document.getElementById('expenseModalOverlay').classList.contains('open');
  document.getElementById('eventCostName').value = 'Booth';
  amount.value = '150000'; amount.dispatchEvent(new Event('input'));
  const formatted = amount.value;
  document.getElementById('addCostBtn').click();
  await new Promise((r) => setTimeout(r, 30));
  const costs = JSON.parse(localStorage.cntrEventCosts);
  const closed = !document.getElementById('expenseModalOverlay').classList.contains('open');
  return { open1, formatted, costs: costs.length, amt: costs[0]?.amount, closed, bodyPos: document.body.style.position };
`);
check('expense modal opens via delegated button', exp.open1);
check('expense amount formatted', exp.formatted === 'Rp 150.000', exp.formatted);
check('exactly one expense added', exp.costs === 1 && exp.amt === 150000, JSON.stringify(exp));
check('modal closed and body scroll unlocked', exp.closed && exp.bodyPos === '', exp.bodyPos);

// 3. Edit expense then delete
const exp2 = await run(page, `
  document.querySelector('.edit-cost').click();
  const nameIn = document.getElementById('eventCostName');
  const before = nameIn.value;
  nameIn.value = 'Booth fee'; nameIn.dispatchEvent(new Event('input'));
  document.getElementById('addCostBtn').click();
  await new Promise((r) => setTimeout(r, 30)); const afterEdit = JSON.parse(localStorage.cntrEventCosts).map(c => c.name).join();
  document.querySelector('.delete-cost').click();
  await new Promise((r) => setTimeout(r, 30)); return { before, afterEdit, left: JSON.parse(localStorage.cntrEventCosts).length };
`);
check('edit expense prefills and saves', exp2.before === 'Booth' && exp2.afterEdit === 'Booth fee', JSON.stringify(exp2));
check('delete expense', exp2.left === 0);

// 4. HTML in product name is escaped
const esc = await run(page, `
  document.querySelector('.tabbar .tab[data-tab="salesScreen"]').click();
  document.getElementById('openProductEdit').click();
  document.getElementById('editName').value = '<img src=x onerror="window.__xss=1">Evil';
  document.getElementById('saveProductBtn').click();
  const tiles = [...document.querySelectorAll('.tile .product-name')].map(n => n.textContent);
  return { xss: window.__xss === 1, last: tiles[tiles.length - 1], imgs: document.querySelectorAll('.tile img').length };
`);
check('product name rendered as text, no injection', !esc.xss && esc.imgs === 0 && esc.last.startsWith('<img'), JSON.stringify(esc));

// 5. Duplicate name rejected
const dup = await run(page, `
  const n = JSON.parse(localStorage.cntrProducts).length;
  document.getElementById('openProductEdit').click();
  document.getElementById('editName').value = 'Gacha';
  document.getElementById('saveProductBtn').click();
  return { n, after: JSON.parse(localStorage.cntrProducts).length, toast: document.getElementById('toast').textContent, screen: document.querySelector('.screen.active').id };
`);
check('duplicate product name rejected', dup.n === dup.after && /already exists/.test(dup.toast), JSON.stringify(dup));
await run(page, `document.getElementById('closeEditBtn').click();`);

// 6. Fresh load: edit an INACTIVE product from history first -> Save works (was a no-op before)
await load();
const hist = await run(page, `
  // deactivate Cheki
  document.getElementById('openProductsMenuBtn').click();
  document.querySelector('.product-toggle-btn[data-name="Cheki"]').click();
  await new Promise((r) => setTimeout(r, 30));
  return JSON.parse(localStorage.cntrProducts).some(p => p.name === 'Cheki');
`);
check('deactivate product', hist === false);
await load();
const histEdit = await run(page, `
  document.getElementById('openProductsMenuBtn').click();
  document.querySelector('.product-edit-btn[data-name="Cheki"]').click();
  const title = document.getElementById('productEditTitle').textContent;
  document.getElementById('editName').value = 'Cheki 2';
  document.getElementById('saveProductBtn').click();
  await new Promise((r) => setTimeout(r, 30)); const history = JSON.parse(localStorage.cntrProductHistory).map(p => p.name);
  return { title, renamed: history.includes('Cheki 2') && !history.includes('Cheki'), active: JSON.parse(localStorage.cntrProducts).some(p => p.name === 'Cheki 2') };
`);
check('inactive product edit saves on fresh load', histEdit.renamed && !histEdit.active && histEdit.title === 'Edit product', JSON.stringify(histEdit));

// 7. Abort a history edit, then "Add product" must add, not overwrite history entry
const addAfter = await run(page, `
  document.querySelector('.product-edit-btn[data-name="Cheki 2"]').click();
  document.getElementById('closeEditBtn').click();
  document.querySelector('.tabbar .tab[data-tab="salesScreen"]').click();
  document.getElementById('openProductEdit').click();
  document.getElementById('editName').value = 'Brand New';
  document.getElementById('saveProductBtn').click();
  await new Promise((r) => setTimeout(r, 30));
  const history = JSON.parse(localStorage.cntrProductHistory).map(p => p.name);
  return { history, active: JSON.parse(localStorage.cntrProducts).map(p => p.name) };
`);
check('add after aborted history edit adds a new product', addAfter.active.includes('Brand New') && addAfter.history.includes('Cheki 2'), JSON.stringify(addAfter));

// 8. Deactivated product's sales still appear in report breakdown
const orphan = await run(page, `
  const tile = document.querySelector('.tile[data-product="Poster"]');
  tile.querySelector('[data-payment="Cash"][data-action="plus"]').click();
  document.getElementById('openProductsMenuBtn').click();
  document.querySelector('.product-toggle-btn[data-name="Poster"]').click();
  document.querySelector('.tabbar .tab[data-tab="eventScreen"]').click();
  return [...document.querySelectorAll('#eventCard .rank-name')].map(n => n.textContent).includes('Poster');
`);
check('deactivated product still in sales breakdown', orphan);

// 9. A new product reusing a deleted product's name is a different product: editing it leaves the old one's sales alone
const reuse = await run(page, `
  document.querySelector('.tabbar .tab[data-tab="salesScreen"]').click();
  const ids = JSON.parse(localStorage.cntrProducts).map((p) => p.id);
  const sell = () => document.querySelector('.tile[data-product="Gacha"] [data-payment="Cash"][data-action="plus"]').click();
  sell();
  const editGacha = () => { document.getElementById('openProductsMenuBtn').click(); document.querySelector('.product-edit-btn[data-name="Gacha"]').click(); };
  editGacha();
  document.getElementById('removeProductBtn').click();
  document.getElementById('confirmModalConfirmBtn').click();
  document.querySelector('.tabbar .tab[data-tab="salesScreen"]').click();
  document.getElementById('openProductEdit').click();
  document.getElementById('editName').value = 'Gacha';
  document.getElementById('editPrice').value = '1000';
  document.getElementById('saveProductBtn').click();
  sell();
  editGacha();
  document.getElementById('editPrice').value = '2000';
  document.getElementById('saveProductBtn').click();
  await new Promise((r) => setTimeout(r, 30));
  const gacha = JSON.parse(localStorage.cntrSales).filter((s) => s.product === 'Gacha');
  return { ids: ids.every(Boolean), prices: gacha.map((s) => s.price), linked: gacha.at(-1).productId === JSON.parse(localStorage.cntrProducts).find((p) => p.name === 'Gacha').id };
`);
check('older products get an id on load', reuse.ids, JSON.stringify(reuse));
check("editing a re-created product reprices only its own sales, not the deleted one's", reuse.prices.at(-1) === 2000 && reuse.prices.slice(0, -1).every((p) => p !== 2000) && reuse.linked, JSON.stringify(reuse));

// 12. Corrupt storage doesn't crash startup
await run(page, `localStorage.cntrSales = '{"oops":1}'; localStorage.cntrEvents = 'null'; localStorage.cntrLiveEvent = '[]';`);
errors.length = 0;
await load();
const tiles = await run(page, `return document.querySelectorAll('.tile').length`);
check('corrupt storage: app still boots', tiles > 0 && errors.length === 0, errors.join(' | '));

check('no uncaught exceptions overall', errors.length === 0, errors.join(' | '));
await browser.close();
done();
