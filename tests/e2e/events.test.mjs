// The event flow: live Event screen, End day, End event, History view, compare, edit.
import { URL, checks, launch, run, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 412, height: 892 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const load = async () => { await page.goto(URL); await sleep(1200); };

await load();
await run(page, `localStorage.clear(); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)};`);
await load();

// Helpers inside the page: tap a tile's +/−, read the hero amount as a number, wait for writes.
const H = `
  const tab = (id) => document.querySelector('.tabbar .tab[data-tab="' + id + '"]').click();
  const tap = (product, payment, action = 'plus') => document.querySelector('.tile[data-product="' + product + '"] [data-payment="' + payment + '"][data-action="' + action + '"]').click();
  const amount = (selector) => { const t = document.querySelector(selector)?.textContent ?? ''; const n = Number(t.replace(/[^0-9]/g, '')); return /[-−]/.test(t) ? -n : n; };
  const wait = (ms = 60) => new Promise((r) => setTimeout(r, ms));
  const confirmYes = async () => { document.getElementById('confirmModalConfirmBtn').click(); await wait(); };
  const nameSheet = async (name) => { const input = document.getElementById('saveModalInput'); input.value = name; input.dispatchEvent(new Event('input')); document.getElementById('saveModalSaveBtn').click(); await wait(); };
  const stored = (key) => JSON.parse(localStorage.getItem(key) ?? 'null');
`;

// 1. Five tabs, Event screen follows the live counter with no save step
const live = await run(page, `${H}
  const tabs = [...document.querySelectorAll('.tabbar .tab-label')].map((n) => n.textContent).join();
  const lastTab = document.querySelector('.tabbar .tab:last-child').getBoundingClientRect();
  const tabsFill = innerWidth - lastTab.right < lastTab.width / 2;
  tab('salesScreen');
  tap('Gacha', 'Cash'); tap('Gacha', 'QRIS'); tap('Cheki', 'Cash');
  await wait();
  tab('eventScreen');
  const sales = stored('cntrSales');
  const profit = sales.reduce((s, x) => s + x.price - x.cost, 0);
  return { tabsFill, eyebrow: document.querySelector('#stats .eyebrow').textContent, tabs, hero: amount('#eventCard .hero-figure'), profit, dayCards: document.querySelectorAll('#eventCard .day-card').length, endDay: !!document.getElementById('endDayBtn'), endEvent: !!document.getElementById('endEventBtn') };
`);
check('tabs are Event, Products, Sell, History, Settings', live.tabs === 'Event,Products,Sell,History,Settings', live.tabs);
check('the 5 tabs fill the tab bar', live.tabsFill, live);
check('Sell hero says Revenue before any End day', live.eyebrow === 'Revenue', live.eyebrow);
check('Event hero = product profit with no save step', live.hero === live.profit && live.profit > 0, live);
check('no day cards before End day; End buttons shown', live.dayCards === 0 && live.endDay && live.endEvent, live);

// 2. An expense lowers net profit by its amount
const exp = await run(page, `${H}
  const before = amount('#eventCard .hero-figure');
  document.getElementById('openAddExpenseBtn').click();
  document.getElementById('eventCostName').value = 'Booth';
  const a = document.getElementById('eventCostAmount'); a.value = '10000'; a.dispatchEvent(new Event('input'));
  document.getElementById('eventCostName').dispatchEvent(new Event('input'));
  document.getElementById('addCostBtn').click();
  await wait();
  return { before, after: amount('#eventCard .hero-figure') };
`);
check('expense of 10.000 lowers net by 10.000', exp.before - exp.after === 10000, exp);

// 3. Rename the live event
const ren = await run(page, `${H}
  document.getElementById('eventNameBtn').click();
  const open = document.getElementById('saveModalOverlay').classList.contains('open');
  await nameSheet('Comifuro');
  return { open, shown: document.getElementById('eventNameBtn').textContent, stored: stored('cntrLiveEvent').name };
`);
check('rename live event via name sheet', ren.open && ren.shown.includes('Comifuro') && ren.stored === 'Comifuro', ren);

// 4. End day: Sell counters restart, totals keep counting, undo cannot reach the ended day
const day = await run(page, `${H}
  document.getElementById('endDayBtn').click();
  const asked = document.getElementById('confirmModalOverlay').classList.contains('open');
  await confirmYes();
  const dayCards = document.querySelectorAll('#eventCard .day-card').length;
  tab('salesScreen');
  const counter = document.querySelector('.tile[data-product="Gacha"] [data-counter-for="Cash"]').textContent;
  const eyebrow = document.querySelector('#stats .eyebrow').textContent;
  const minus = document.querySelector('.tile[data-product="Gacha"] [data-payment="Cash"][data-action="minus"]');
  minus.click();
  await wait();
  return { asked, dayCards, counter, eyebrow, minusDisabled: minus.disabled, sales: stored('cntrSales').length, breaks: stored('cntrLiveEvent').dayBreaks.length };
`);
check('End day asks first and shows 2 day cards', day.asked && day.dayCards === 2, day);
check('Sell counters show today only after End day, and the hero says which day', day.counter === '0' && day.eyebrow === 'Day 2 revenue', day);
check('undo after End day never removes an ended day\'s sale', day.minusDisabled && day.sales === 3 && day.breaks === 1, day);

// 4b. Changing a product's price later never reprices an ended day
const reprice = await run(page, `${H}
  tab('eventScreen');
  const before = document.querySelector('#eventCard .day-card .day-revenue').textContent;
  tab('productHistoryScreen');
  document.querySelector('.product-edit-btn[data-name="Gacha"]').click();
  const price = document.getElementById('editPrice'); price.value = '99000'; price.dispatchEvent(new Event('input'));
  document.getElementById('saveProductBtn').click();
  await wait();
  tab('eventScreen');
  return { before, after: document.querySelector('#eventCard .day-card .day-revenue').textContent };
`);
check('editing a product price does not change an ended day', reprice.before === reprice.after, reprice);

// 4c. Settings → Products per day (on by default): one collapsible Products card per day (latest open); off = one card
const perDay = await run(page, `${H}
  tab('settingsScreen');
  const toggle = document.getElementById('productsPerDayToggle');
  const onByDefault = toggle.checked;
  tab('eventScreen');
  const cards = [...document.querySelectorAll('#eventCard details.products-day')];
  const on = { onByDefault, cards: cards.length, open: cards.map((c) => c.open), titles: cards.map((c) => c.querySelector('summary').textContent) };
  cards[0].querySelector('summary').click();
  const firstOpens = cards[0].open;
  tab('settingsScreen');
  toggle.click();
  await wait();
  tab('eventScreen');
  const off = { offCards: document.querySelectorAll('#eventCard details.products-day').length, offSetting: stored('cntrSettings').productsPerDay };
  tab('settingsScreen');
  toggle.click(); // back on for the rest of the run
  await wait();
  return { ...on, firstOpens, ...off, backOn: stored('cntrSettings').productsPerDay };
`);
check('Products per day is on by default: one card per day, only the latest open', perDay.onByDefault && perDay.cards === 2 && perDay.open.join() === 'false,true' && /Day 1/.test(perDay.titles[0]) && /Day 2/.test(perDay.titles[1]), perDay);
check('a day card opens when tapped', perDay.firstOpens, perDay);
check('turning it off shows one Products card again, and the choice is saved', perDay.offCards === 0 && perDay.offSetting === false && perDay.backOn === true, perDay);

// 5. End event moves it to History and starts fresh
const end = await run(page, `${H}
  tap('Poster', 'QRIS');
  await wait();
  tab('eventScreen');
  const total = amount('#eventCard .hero-figure');
  document.getElementById('endEventBtn').click();
  const prefill = document.getElementById('saveModalInput').value;
  await nameSheet('Comifuro 21');
  await confirmYes();
  await wait(100);
  const events = stored('cntrEvents');
  const firstSale = events[0].sales.map((s) => s.timestamp).sort()[0];
  return { startedAtFirstSale: events[0].startedAt === firstSale, total, prefill, count: events.length, name: events[0]?.name, sales: events[0]?.sales.length, breaks: events[0]?.dayBreaks.length, expenses: events[0]?.expenses.length, liveSales: stored('cntrSales').length, liveCosts: stored('cntrEventCosts').length, liveBreaks: stored('cntrLiveEvent').dayBreaks.length, empty: !!document.querySelector('#eventCard .empty') };
`);
check('End event prefills the current name', end.prefill === 'Comifuro', end);
check('a past event starts at its first sale (not when the previous event ended)', end.startedAtFirstSale, end);
check('End event stores the event with all sales, breaks and expenses', end.count === 1 && end.name === 'Comifuro 21' && end.sales === 4 && end.breaks === 1 && end.expenses === 1, end);
check('fresh live event after End event', end.liveSales === 0 && end.liveCosts === 0 && end.liveBreaks === 0 && end.empty, end);

// 6. History lists it; the view matches what the live screen showed; back returns
const view = await run(page, `${H}
  tab('historyScreen');
  const rows = [...document.querySelectorAll('#pastEventList .event-row')].map((r) => r.textContent);
  document.querySelector('#pastEventList .event-row').click();
  const screen = document.querySelector('.screen.active').id;
  const hero = amount('#pastEventCard .hero-figure');
  const ends = !!document.querySelector('#pastEventCard #endDayBtn, #pastEventCard #endEventBtn');
  document.getElementById('pastEventBackBtn').click();
  return { rows, screen, hero, ends, back: document.querySelector('.screen.active').id };
`);
check('History lists the ended event', view.rows.length === 1 && view.rows[0].includes('Comifuro 21'), view);
check('past event view shows the same net, no End buttons', view.screen === 'pastEventScreen' && view.hero === end.total && !view.ends, view);
check('back from past event returns to History', view.back === 'historyScreen', view);

// 7. Edit: −1 then Save removes one sale from that day; Cancel changes nothing
const edit = await run(page, `${H}
  document.querySelector('#pastEventList .event-row').click();
  const before = localStorage.getItem('cntrEvents');
  document.getElementById('pastEventEditBtn').click();
  document.querySelector('#pastEventCard [data-adjust][data-day="0"][data-product="Gacha"][data-payment="Cash"][data-delta="1"]').click();
  document.getElementById('pastEventCancelBtn').click();
  await wait();
  const unchanged = localStorage.getItem('cntrEvents') === before;
  document.getElementById('pastEventEditBtn').click();
  document.querySelector('#pastEventCard [data-adjust][data-day="0"][data-product="Gacha"][data-payment="Cash"][data-delta="-1"]').click();
  document.getElementById('pastEventSaveBtn').click();
  await wait(150);
  const sales = stored('cntrEvents')[0].sales;
  return { unchanged, gachaCash: sales.filter((s) => s.product === 'Gacha' && s.payment === 'Cash').length, total: sales.length };
`);
check('edit Cancel leaves the stored event unchanged', edit.unchanged, edit);
check('edit −1 Gacha Cash on day 1 then Save removes one sale', edit.gachaCash === 0 && edit.total === 3, edit);

// 8. Edit an expense amount and rename, then Save
const edit2 = await run(page, `${H}
  const netBefore = amount('#pastEventCard .hero-figure');
  document.getElementById('pastEventEditBtn').click();
  document.querySelector('#pastEventCard .edit-cost').click();
  const a = document.getElementById('eventCostAmount'); a.value = '6820'; a.dispatchEvent(new Event('input'));
  document.getElementById('addCostBtn').click();
  document.querySelector('#pastEventCard #eventNameBtn').click();
  await nameSheet('Comifuro XXI');
  document.getElementById('pastEventSaveBtn').click();
  await wait(150);
  const event = stored('cntrEvents')[0];
  return { netBefore, netAfter: amount('#pastEventCard .hero-figure'), amount: event.expenses[0].amount, name: event.name, title: document.querySelector('#pastEventCard .event-name-text').textContent };
`);
check('edited expense amount saved and net rises by the difference', edit2.amount === 6820 && edit2.netAfter - edit2.netBefore === 3180, edit2);
check('rename while editing saved', edit2.name === 'Comifuro XXI' && edit2.title === 'Comifuro XXI', edit2);

// 9. A deleted product still shows in the past event it sold in
const gone = await run(page, `${H}
  document.getElementById('pastEventBackBtn').click();
  tab('productHistoryScreen');
  document.querySelector('.product-edit-btn[data-name="Poster"]').click();
  document.getElementById('removeProductBtn').click();
  await confirmYes();
  tab('historyScreen');
  document.querySelector('#pastEventList .event-row').click();
  return [...document.querySelectorAll('#pastEventCard .rank-name')].map((n) => n.textContent);
`);
check('deleted product still listed in its past event', gone.includes('Poster'), gone);

// 10. Compare two events; net = product profit − expenses
const cmp = await run(page, `${H}
  document.getElementById('pastEventBackBtn').click();
  tab('salesScreen');
  tap('Gacha', 'Cash');
  await wait();
  tab('eventScreen');
  document.getElementById('endEventBtn').click();
  await nameSheet('Second');
  await confirmYes();
  await wait(100);
  tab('historyScreen');
  document.getElementById('compareEventsBtn').click();
  document.querySelectorAll('#compareModalList input').forEach((i) => { i.checked = true; });
  document.getElementById('compareModalList').dispatchEvent(new Event('change'));
  document.getElementById('compareModalConfirmBtn').click();
  const cards = [...document.querySelectorAll('#compareEventCard .cmp-event')];
  const nets = [...document.querySelectorAll('#compareEventCard [data-metric="net"] .cmp-value')].map((v) => { const t = v.textContent; const n = Number(t.replace(/[^0-9]/g, '')); return /[-−]/.test(t) ? -n : n; });
  const expected = stored('cntrEvents').map((e) => e.sales.reduce((s, x) => s + x.price - x.cost, 0) - e.expenses.reduce((s, x) => s + x.amount, 0));
  return { cards: cards.length, nets, expected };
`);
check('compare shows two events with net = product profit − expenses', cmp.cards === 2 && cmp.nets.join() === cmp.expected.join(), cmp);

// 11. Delete a past event (asks first)
const del = await run(page, `${H}
  tab('historyScreen');
  document.querySelector('#pastEventList .event-row').click();
  document.getElementById('pastEventDeleteBtn').click();
  const asked = document.getElementById('confirmModalOverlay').classList.contains('open');
  await confirmYes();
  await wait(100);
  return { asked, left: stored('cntrEvents').length, screen: document.querySelector('.screen.active').id };
`);
check('delete past event asks, removes it, returns to History', del.asked && del.left === 1 && del.screen === 'historyScreen', del);

// An empty day shows "No sales yet", not a misleading date
await run(page, `localStorage.clear(); localStorage.setItem('cntrMeta.tutorialOffered', 'test'); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)};`);
await load();
const emptyDay = await run(page, `${H}
  const subs = () => [...document.querySelectorAll('#eventCard .day-sub')].map((s) => s.textContent.trim());
  tab('salesScreen'); tap('Gacha', 'Cash'); await wait(100);
  tab('eventScreen');
  document.getElementById('endDayBtn').click(); await confirmYes(); await wait(100);
  return subs();
`);
check('a day with sales shows the first sale\'s date and count', /^\d{1,2} \w+ \d{4} · 1 sale$/.test(emptyDay[0] ?? ''), emptyDay);
check('the new empty day after End day says just "No sales yet"', emptyDay.at(-1) === 'No sales yet', emptyDay);

// Two past events for Compare and editing: A has two "Parking" expenses, B has a "Transport" A never had
const gacha = JSON.parse(SAMPLE_PRODUCTS)[0];
const dayAt = (daysAgo, hour) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
const pastEvent = (id, name, daysAgo, count, expenses) => ({
  id, name, startedAt: dayAt(daysAgo, 10), endedAt: dayAt(daysAgo, 18), dayBreaks: [], products: [gacha], expenses,
  sales: Array.from({ length: count }, (_, i) => ({ product: gacha.name, price: gacha.price, cost: gacha.cost, payment: 'Cash', timestamp: dayAt(daysAgo, 11 + i) })),
});
const EVENTS = [
  pastEvent('a', 'Spring', 14, 2, [{ id: 'a1', name: 'Booth', amount: 50000 }, { id: 'a2', name: 'Parking', amount: 10000 }, { id: 'a3', name: 'Parking', amount: 10000 }]),
  pastEvent('b', 'Summer', 7, 3, [{ id: 'b1', name: 'Booth', amount: 60000 }, { id: 'b2', name: 'Transport', amount: 30000 }]),
];
await run(page, `localStorage.clear(); localStorage.setItem('cntrMeta.tutorialOffered', 'test'); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)}; localStorage.cntrEvents = ${JSON.stringify(JSON.stringify(EVENTS))};`);
await load();

const cmp2 = await run(page, `${H}
  tab('historyScreen');
  document.getElementById('compareEventsBtn').click();
  document.querySelectorAll('#compareModalList input').forEach((i) => { i.checked = true; });
  document.getElementById('compareModalList').dispatchEvent(new Event('change'));
  document.getElementById('compareModalConfirmBtn').click();
  const rows = [...document.querySelectorAll('#compareEventCard .cmp-row')].map((r) => [r.querySelector('.cmp-label').textContent, ...[...r.querySelectorAll('.cmp-value')].map((v) => v.textContent)].join('|'));
  return { rows, green: document.querySelectorAll('#compareEventCard .is-positive, #compareEventCard .is-winner').length };
`);
check('compare: one row per expense name, same names added up, a missing one is "—"', ['Booth|Rp 50.000|Rp 60.000', 'Transport|—|Rp 30.000', 'Parking|Rp 20.000|—'].every((row) => cmp2.rows.includes(row)), cmp2.rows);
check('compare: no "better" colouring', cmp2.green === 0, cmp2);

const discard = await run(page, `${H}
  const isOpen = () => document.getElementById('confirmModalOverlay').classList.contains('open');
  const active = () => document.querySelector('.screen.active').id;
  tab('historyScreen');
  document.querySelector('#pastEventList .event-row').click();
  document.getElementById('pastEventEditBtn').click();
  tab('salesScreen');
  const unchangedLeaves = !isOpen() && active() === 'salesScreen';
  tab('historyScreen');
  document.querySelector('#pastEventList .event-row').click();
  document.getElementById('pastEventEditBtn').click();
  document.querySelector('#pastEventCard [data-adjust][data-delta="1"]').click();
  tab('salesScreen');
  const asked = isOpen() && active() === 'pastEventScreen';
  const labels = [document.getElementById('confirmModalCancelBtn').textContent, document.getElementById('confirmModalConfirmBtn').textContent];
  document.getElementById('confirmModalCancelBtn').click();
  const kept = !isOpen() && active() === 'pastEventScreen' && !document.getElementById('pastEventEditBar').hidden;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  tab('eventScreen');
  const escClosed = isOpen();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  const afterEsc = !isOpen() && active() === 'pastEventScreen';
  tab('eventScreen');
  await confirmYes();
  return { unchangedLeaves, asked, labels, kept, escClosed, afterEsc, left: active(), saved: stored('cntrEvents').map((e) => e.sales.length).join() };
`);
check('leaving an unchanged edit asks nothing', discard.unchangedLeaves, discard);
check('leaving an edit with changes asks Keep editing / Discard', discard.asked && discard.labels.join() === 'Keep editing,Discard', discard);
check('Keep editing stays in the edit', discard.kept, discard);
check('Escape closes the confirm sheet', discard.escClosed && discard.afterEsc, discard);
check('Discard leaves and keeps the stored event unchanged', discard.left === 'eventScreen' && discard.saved === '2,3', discard);

// "New day when the date changes": off by default; on, the first sale on a new date starts Day 2
const yesterdaySale = JSON.stringify([{ product: gacha.name, productId: undefined, price: gacha.price, cost: gacha.cost, payment: 'Cash', timestamp: dayAt(1, 12) }]);
for (const on of [false, true]) {
  await run(page, `localStorage.clear(); localStorage.setItem('cntrMeta.tutorialOffered', 'test'); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)};
    localStorage.cntrSales = ${JSON.stringify(yesterdaySale)}; localStorage.cntrLiveEvent = ${JSON.stringify(JSON.stringify({ id: 'live', name: null, startedAt: dayAt(1, 9), dayBreaks: [] }))};
    ${on ? `localStorage.cntrSettings = ${JSON.stringify(JSON.stringify({ newDayOnDateChange: true }))};` : ''}`);
  await load();
  const nd = await run(page, `${H}
    const toggle = document.getElementById('newDayToggle').checked;
    tab('salesScreen'); tap('Gacha', 'Cash'); await wait();
    return { toggle, breaks: stored('cntrLiveEvent').dayBreaks.length, toast: document.getElementById('toast').textContent, sell: document.querySelector('#stats .hero-meta').textContent };
  `);
  if (on) check('new-day setting on: a sale on a new date starts Day 2 and says so', nd.toggle && nd.breaks === 1 && nd.toast === 'New date: Day 2 started' && /^1 sale(?!s)/.test(nd.sell), nd);
  else check('new-day setting is off by default: a new date stays in Day 1', !nd.toggle && nd.breaks === 0 && /^2 sales/.test(nd.sell), nd);
}

// Expenses linked to products: the linked product subtracts no item cost in that event (no double counting)
await run(page, `localStorage.clear(); localStorage.setItem('cntrMeta.tutorialOffered', 'test'); localStorage.cntrProducts = ${JSON.stringify(SAMPLE_PRODUCTS)};
  localStorage.cntrEvents = ${JSON.stringify(JSON.stringify([pastEvent('old', 'Before ids', 3, 2, [])]))};`);
await load();
const link = await run(page, `${H}
  const fill = (name, value) => { document.getElementById('eventCostName').value = name; const a = document.getElementById('eventCostAmount'); a.value = value; a.dispatchEvent(new Event('input')); };
  const rows = () => [...document.querySelectorAll('#expenseProducts .check-row')];
  const tick = (name) => { const input = rows().find((r) => r.textContent === name).querySelector('input'); input.click(); };
  tab('salesScreen'); tap('Photocard', 'Cash'); tap('Photocard', 'Cash'); tap('Photocard', 'QRIS'); tap('Gacha', 'Cash'); await wait();
  tab('eventScreen');
  const before = amount('#eventCard .hero-figure');
  document.getElementById('openAddExpenseBtn').click();
  const listed = rows().length;
  const hint = document.getElementById('expenseProductsHint').textContent;
  const rowHeight = rows()[0].getBoundingClientRect().height;
  // Focus goes to Cancel at the bottom; the sheet must still open at its top, the hint right under its label.
  const opened = { scrollTop: document.querySelector('#expenseModalOverlay .sheet').scrollTop, hintAfter: document.getElementById('expenseProductsHint').previousElementSibling.id };
  fill('Photocard print', '50000'); tick('Photocard');
  document.getElementById('addCostBtn').click(); await wait();
  const net = amount('#eventCard .hero-figure');
  const photocard = stored('cntrProducts').find((p) => p.name === 'Photocard');
  const cost = stored('cntrEventCosts')[0];
  tab('salesScreen'); const sellProfit = amount('#stats .hero-meta span:last-child'); tab('eventScreen');
  document.querySelector('#eventCard .edit-cost').click();
  const reopened = rows().filter((r) => r.querySelector('input').checked).map((r) => r.textContent);
  document.getElementById('expenseModalCancelBtn').click();
  // A past event from before ids: linking gives its product an id, saved with the edit
  tab('historyScreen'); document.querySelector('#pastEventList .event-row').click();
  const pastBefore = amount('#pastEventCard .hero-figure');
  document.getElementById('pastEventEditBtn').click();
  document.getElementById('openAddExpenseBtn').click();
  const pastListed = rows().map((r) => r.textContent).join();
  fill('Capsules', '20000'); tick('Gacha');
  document.getElementById('addCostBtn').click();
  document.getElementById('pastEventSaveBtn').click(); await wait(150);
  const past = stored('cntrEvents')[0];
  return { before, listed, hint, rowHeight, opened, net, linkedId: cost.productIds?.join() === photocard.id && !!photocard.id, sellProfit, reopened: reopened.join(), pastBefore, pastListed, pastAfter: amount('#pastEventCard .hero-figure'), pastIds: past.expenses[0].productIds?.join(), pastProductId: past.products[0].id };
`);
check('expense sheet lists the live products with the hint, rows ≥ 48px', link.listed === 8 && link.hint === "Ticked products' item cost won't be subtracted twice." && link.rowHeight >= 48, link);
check('the expense sheet opens at its top (Name visible), with the hint directly under its label', link.opened.scrollTop === 0 && link.opened.hintAfter === 'expenseProductsLabel', link.opened);
check('a linked print expense replaces the item cost: net = before + 3 × 7.000 − 50.000', link.net === link.before + 3 * 7000 - 50000, link);
check('the link is stored by product id', link.linkedId, link);
check('Sell profit drops the linked item cost too', link.sellProfit === 3 * 15000 + 25000 - 12000, link);
check('editing the expense shows its product ticked', link.reopened === 'Photocard', link);
check('a past event from before ids can link: the product gets an id, net = before + 2 × 12.000 − 20.000', link.pastListed === 'Gacha' && !!link.pastProductId && link.pastIds === link.pastProductId && link.pastAfter === link.pastBefore + 2 * 12000 - 20000, link);

// The keyboard opening (the page shrinks after focus) must not leave the focused field under it.
await run(page, `${H} tab('eventScreen'); document.getElementById('openAddExpenseBtn').click(); await wait(300);`);
await page.focus('#eventCostAmount');
const keyboardTop = 360;
const below = await page.$eval('#eventCostAmount', (n) => n.getBoundingClientRect().bottom);
await page.setViewportSize({ width: 412, height: keyboardTop });
await sleep(400);
const field = await page.$eval('#eventCostAmount', (n) => { const r = n.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, height: innerHeight }; });
check('a focused field scrolls back into view when the keyboard shrinks the page', below > keyboardTop && field.top >= 0 && field.bottom <= field.height, { below, field });
await page.setViewportSize({ width: 412, height: 892 });

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
