// Core flows: selling, expenses, products, reset, compare, saved reports, corrupt storage.
import { URL, checks, launch, run, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const load = async () => { await page.goto(URL); await sleep(1200); };

await load();
await run(page, `localStorage.clear()`);
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
  document.querySelector('.tabbar .tab[data-tab="reportsScreen"]').click();
  return [...document.querySelectorAll('#reportCard .rank-name')].map(n => n.textContent).includes('Poster');
`);
check('deactivated product still in sales breakdown', orphan);

// 9. Reset asks for confirmation; cancel keeps sales
const reset = await run(page, `
  document.querySelector('.tabbar .tab[data-tab="salesScreen"]').click();
  const before = JSON.parse(localStorage.cntrSales).length;
  document.getElementById('resetBtn').click();
  const modal = document.getElementById('confirmModalOverlay').classList.contains('open');
  document.getElementById('confirmModalCancelBtn').click();
  const afterCancel = JSON.parse(localStorage.cntrSales).length;
  document.getElementById('resetBtn').click();
  document.getElementById('confirmModalConfirmBtn').click();
  await new Promise((r) => setTimeout(r, 50)); // clearing waits for the automatic backup
  return { before, modal, afterCancel, afterConfirm: JSON.parse(localStorage.cntrSales).length };
`);
check('reset confirms; cancel keeps, confirm clears', reset.modal && reset.before > 0 && reset.afterCancel === reset.before && reset.afterConfirm === 0, JSON.stringify(reset));

// 10. Save + compare sales vs events keep separate selections; preview event expense edits go to that report
const cmp = await run(page, `
  const reports = [1,2].map(i => ({ id: 's'+i, name: 'S'+i, createdAt: new Date().toISOString(), type: 'sales', products: [], sales: [], eventCosts: [] }))
    .concat([1,2].map(i => ({ id: 'e'+i, name: 'E'+i, createdAt: new Date().toISOString(), type: 'event', products: [], sales: [], eventCosts: [{ id: 'c'+i, name: 'Booth', amount: 1000*i }] })));
  localStorage.cntrSavedReports = JSON.stringify(reports);
  return true;
`);
await load();
const cmp2 = await run(page, `
  const pick = (type, ids) => {
    document.getElementById(type === 'sales' ? 'compareSalesBtn' : 'compareEventsBtn').click();
    document.querySelectorAll('#compareModalList input').forEach(i => { i.checked = ids.includes(i.value); }); document.getElementById("compareModalList").dispatchEvent(new Event("change"));
    document.getElementById('compareModalConfirmBtn').click();
  };
  document.querySelector('.tabbar .tab[data-tab="historyScreen"]').click();
  pick('event', ['e1','e2']);
  const eventCards = document.querySelectorAll('#compareEventCard .compare-card').length;
  pick('sales', ['s1','s2']);
  const salesCards = document.querySelectorAll('#compareSalesCard .compare-card').length;
  const eventStill = document.querySelectorAll('#compareEventCard .compare-card').length;
  return { eventCards, salesCards, eventStill };
`);
check('sales & event compare selections independent', cmp2.eventCards === 2 && cmp2.salesCards === 2 && cmp2.eventStill === 2, JSON.stringify(cmp2));

const prev = await run(page, `
  document.getElementById('openEventReportMenuBtn').click();
  document.querySelector('#eventReportHistoryList .sales-report-history-item[data-id="e1"]').click();
  document.querySelector('.delete-cost').click();
  const saved = JSON.parse(localStorage.cntrSavedReports).find(r => r.id === 'e1');
  return { savedCosts: saved.eventCosts.length, live: JSON.parse(localStorage.cntrEventCosts || '[]').length, shown: document.querySelectorAll('#eventCard .cost-item').length };
`);
check('expense delete in previewed event report updates that report', prev.savedCosts === 0 && prev.shown === 0, JSON.stringify(prev));

// 11. Report delete asks for confirmation
const del = await run(page, `
  document.getElementById('eventDeleteBtn').click();
  const modal = document.getElementById('confirmModalOverlay').classList.contains('open');
  document.getElementById('confirmModalConfirmBtn').click();
  await new Promise((r) => setTimeout(r, 50)); // deleting waits for the automatic backup
  return { modal, left: JSON.parse(localStorage.cntrSavedReports).map(r => r.id).join(), screen: document.querySelector('.screen.active').id };
`);
check('report delete confirms then returns to history', del.modal && !del.left.includes('e1') && del.screen === 'historyScreen', JSON.stringify(del));

// 12. Corrupt storage doesn't crash startup
await run(page, `localStorage.cntrSales = '{"oops":1}'; localStorage.cntrSavedReports = 'null';`);
errors.length = 0;
await load();
const tiles = await run(page, `return document.querySelectorAll('.tile').length`);
check('corrupt storage: app still boots', tiles > 0 && errors.length === 0, errors.join(' | '));

check('no uncaught exceptions overall', errors.length === 0, errors.join(' | '));
await browser.close();
done();
