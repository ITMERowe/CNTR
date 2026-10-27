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

// 1. Four tabs, Event screen follows the live counter with no save step
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
check('tabs are Event, Sell, History, Settings', live.tabs === 'Event,Sell,History,Settings', live.tabs);
check('the 4 tabs fill the tab bar', live.tabsFill, live);
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
  tab('settingsScreen');
  document.getElementById('openProductsMenuBtn').click();
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
  tab('settingsScreen');
  document.getElementById('openProductsMenuBtn').click();
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
  const cards = [...document.querySelectorAll('#compareEventCard .compare-card')];
  const nets = cards.map((c) => { const t = c.querySelector('.compare-metric .compare-value').textContent; const n = Number(t.replace(/[^0-9]/g, '')); return /[-−]/.test(t) ? -n : n; });
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

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
