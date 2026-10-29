// Product groups: one Sell tile per group, one row per variant (each a normal product), made in the product editor.
import { URL, checks, launch, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const errors = [];

for (const width of [412, 1280]) {
  const at = `${width}px:`;
  const page = await browser.newPage({ viewport: { width, height: 892 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await sleep(900);

  const stored = (key) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '[]'), key);
  const product = async (name) => (await stored('cntrProducts')).find((p) => p.name === name);
  const tiles = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((tile) => tile.dataset.group ?? tile.dataset.product));
  const add = async (group, name, price) => {
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    await page.click('#openProductEdit');
    await page.fill('#editGroup', group);
    await page.fill('#editName', name);
    await page.fill('#editPrice', String(price));
    await page.click('#saveProductBtn');
    await sleep(250);
  };

  await add('', 'Mug', 40000);
  await add('Poster', 'A3', 30000);
  // Joining an existing group (typed in another case) takes its spelling, colour and payment methods.
  await page.click('#openProductEdit');
  await page.fill('#editGroup', 'poster');
  const label = await page.textContent('#editNameLabel');
  await page.fill('#editName', 'A4');
  await page.fill('#editPrice', '25000');
  await page.click('#saveProductBtn');
  await sleep(250);
  const [a3, a4] = [await product('Poster A3'), await product('Poster A4')];
  check(`${at} the editor makes variants "Poster A3" and "Poster A4" in group Poster, asking for a Variant`, label === 'Variant' && a3?.group === 'Poster' && a4?.group === 'Poster', { label, a3, a4 });
  check(`${at} a new variant takes its group's colour`, a3.color === a4.color, [a3.color, a4.color]);

  // Sell: one tile for the group, its name once, one row per variant.
  const tile = await page.evaluate(() => {
    const group = document.querySelector('.tile-group');
    return {
      name: group?.querySelector('.group-name')?.textContent,
      rows: [...(group?.querySelectorAll('.variant') ?? [])].map((row) => ({ label: row.querySelector('.product-name').textContent, buttons: [...row.querySelectorAll('.pay-add')].map((b) => b.dataset.payment).join() })),
      tiles: document.querySelectorAll('.tile').length,
    };
  });
  check(`${at} the group is one tile with one row per variant (labels as typed, own payment buttons)`, tile.name === 'Poster' && tile.tiles === 2 && tile.rows.map((r) => `${r.label}:${r.buttons}`).join() === 'A3:Cash,QRIS,A4:Cash,QRIS', tile);

  if (width === 412) {
    // The group exists to save space: 2 variants (Cash + QRIS) were 318px tall (246px compact) before the tight rows.
    const compact = async () => { await page.click('#sellMenuBtn'); await page.click('label[for="compactTilesToggle"]'); await page.keyboard.press('Escape'); await sleep(150); };
    const size = () => page.evaluate(() => ({
      height: document.querySelector('.tile-group').getBoundingClientRect().height,
      // Every sell button at least 44x44, and apart from its neighbours.
      small: [...document.querySelectorAll('.tile-group .pay-add')].filter((b) => { const r = b.getBoundingClientRect(); return r.height < 44 || r.width < 44; }).length,
      labels: [...document.querySelectorAll('.tile-group .pay-label')].filter((n) => n.offsetParent).length,
    }));
    const normal = await size();
    await compact();
    const tight = await size();
    await compact();
    check(`${at} a 2-variant group is short (under 200px, compact under 160px), every sell button at least 44px`, normal.height < 200 && tight.height < 160 && !normal.small && !tight.small, { normal, tight });
    check(`${at} compact tiles show the payment labels once, as column headers`, normal.labels === 4 && tight.labels === 2, { normal: normal.labels, tight: tight.labels });
  }

  // Selling and undoing a variant.
  await page.click('.variant[data-variant="Poster A4"] [data-payment="Cash"][data-action="plus"]');
  await page.click('.variant[data-variant="Poster A4"] [data-payment="Cash"][data-action="plus"]');
  await sleep(150);
  let sales = await stored('cntrSales');
  const counts = () => page.evaluate(() => [...document.querySelectorAll('.tile-group .variant')].map((row) => row.querySelector('[data-counter-for="Cash"]').textContent).join());
  check(`${at} tapping a variant's row sells that variant (by name and id)`, sales.length === 2 && sales.every((s) => s.product === 'Poster A4' && s.productId === a4.id && s.price === 25000) && (await counts()) === '0,2', { sales, counts: await counts() });
  await page.click('.variant[data-variant="Poster A4"] [data-payment="Cash"][data-action="minus"]');
  await sleep(150);
  sales = await stored('cntrSales');
  check(`${at} undo on a variant's row takes back that variant's sale`, sales.length === 1 && (await counts()) === '0,1', { sales: sales.length, counts: await counts() });

  // Changing the group's payment methods on one variant changes them for every variant.
  await page.click('.tile-group[data-group="Poster"] .tile-edit');
  const opened = { group: await page.inputValue('#editGroup'), name: await page.inputValue('#editName') };
  await page.click('#editPayments .payment-option[data-method="Transfer"]');
  await page.click('#saveProductBtn');
  await sleep(250);
  const synced = [(await product('Poster A3')).payments.join(), (await product('Poster A4')).payments.join()];
  check(`${at} the group's one pencil opens the editor (Group + Variant); its payment methods reach every variant`, opened.group === 'Poster' && opened.name === 'A3' && synced[0] === synced[1] && synced[0].includes('Transfer'), { opened, synced });

  // Clearing the group keeps the full name, so ungrouping isn't a rename; putting it back leaves the product as it was.
  await page.click('.tile-group[data-group="Poster"] .tile-edit');
  await page.fill('#editGroup', '');
  const ungrouped = await page.inputValue('#editName');
  await page.fill('#editGroup', 'Poster');
  await page.click('#saveProductBtn');
  await sleep(250);
  const kept = await product('Poster A3');
  check(`${at} clearing a variant's group keeps its full name`, ungrouped === 'Poster A3' && kept?.group === 'Poster', { ungrouped, kept });

  // Names stay unique, ignoring case: an ungrouped "Poster Bundle" blocks the variant "Bundle".
  await add('', 'Poster Bundle', 50000);
  await add('Poster', 'Bundle', 50000);
  await add('', 'mug', 1000);
  const names = (await stored('cntrProducts')).map((p) => p.name);
  check(`${at} a variant whose real name is taken, or a name differing only in case, is refused`, names.join() === 'Mug,Poster A3,Poster A4,Poster Bundle', names);

  if (width === 412) {
    // Sort by best sellers counts a group's variants together: Mug 2, Poster 1 + 2 = 3.
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    for (let i = 0; i < 2; i++) await page.click('.tile[data-product="Mug"] [data-payment="Cash"][data-action="plus"]');
    // (The group now takes QRIS + Transfer.)
    await page.click('.variant[data-variant="Poster A3"] [data-payment="QRIS"][data-action="plus"]');
    await page.click('.variant[data-variant="Poster A4"] [data-payment="QRIS"][data-action="plus"]');
    await page.click('#sellMenuBtn');
    await page.click('label[for="autoSortToggle"]');
    await page.keyboard.press('Escape');
    check(`${at} Sort by best sellers sorts a group by its total units`, (await tiles())[0] === 'Poster', await tiles());
    await page.click('#sellMenuBtn');
    await page.click('label[for="autoSortToggle"]');
    await page.keyboard.press('Escape');
    // Drag: hold the group's tile and move it above Mug; it moves whole.
    const before = (await stored('cntrSales')).length;
    const box = (s) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
    const [grab, groupMid, mugMid] = [await box('.tile-group .group-name'), await box('.tile-group'), await box('.tile[data-product="Mug"]')];
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await sleep(550);
    const toY = grab.y + mugMid.y - groupMid.y - 20;
    for (let i = 1; i <= 10; i++) await page.mouse.move(grab.x, grab.y + ((toY - grab.y) * i) / 10);
    await page.mouse.up();
    await sleep(300);
    const order = (await stored('cntrProducts')).map((p) => p.name);
    check(`${at} dragging the group tile moves all its variants together, without selling`, (await tiles())[0] === 'Poster' && order.join() === 'Poster A3,Poster A4,Mug,Poster Bundle' && (await stored('cntrSales')).length === before, { tiles: await tiles(), order });
    // Compact tiles keep one row per variant, every button inside the tile.
    await page.click('#sellMenuBtn');
    await page.click('label[for="compactTilesToggle"]');
    await page.keyboard.press('Escape');
    const fit = await page.evaluate(() => {
      const t = document.querySelector('.tile-group').getBoundingClientRect();
      const out = [...document.querySelectorAll('.tile-group button, .tile-group .product-name')].filter((n) => { const r = n.getBoundingClientRect(); return r.left < t.left - 1 || r.right > t.right + 1; });
      return { rows: document.querySelectorAll('.tile-group .variant').length, out: out.length };
    });
    check(`${at} compact tiles: the group keeps one row per variant, all inside the tile`, fit.rows === 2 && !fit.out, fit);
    await page.click('#sellMenuBtn');
    await page.click('label[for="compactTilesToggle"]');
    await page.keyboard.press('Escape');
  }

  // Products tab: the variants sit together under the group's name.
  await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
  const listed = await page.evaluate(() => [...document.querySelectorAll('#productHistoryList .product-group')].map((g) => `${g.querySelector('.product-group-title').textContent}:${[...g.querySelectorAll('.list-title')].map((n) => n.textContent).join('+')}`));
  check(`${at} Products lists a group's variants under its name`, listed.join() === 'Poster:A3+A4', listed);

  // Expense sheet: ticking the group ticks all its variants; the expense links to each.
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('#openAddExpenseBtn');
  await page.click('#expenseProducts .check-group .check-row:has(.check-all)');
  await page.fill('#eventCostName', 'Print run');
  await page.fill('#eventCostAmount', '100000');
  await page.click('#addCostBtn');
  await sleep(200);
  const linked = (await stored('cntrEventCosts'))[0]?.productIds ?? [];
  check(`${at} the expense picker's group row picks all its variants`, linked.length === 2 && linked.includes(a3.id) && linked.includes(a4.id), linked);

  if (width === 412) {
    // A long, free variant: the editor's colour preview ellipsizes instead of widening the page; Products says Free.
    await add('Poster', 'A4 Glossy Laminated', 0);
    await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
    await page.click('.product-edit-btn[data-name="Poster A4 Glossy Laminated"]');
    await sleep(300);
    const wide = await page.evaluate(() => [document.documentElement, document.querySelector('.content')].some((e) => e.scrollWidth > innerWidth));
    check(`${at} the editor with a long variant name has no sideways scroll`, !wide);
    await page.click('#closeEditBtn');
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    await sleep(300);
    // Undo (26px) and edit (32px) reach 44px with their ::after, but where they meet a sell button, the sell button wins.
    const hits = await page.evaluate(() => {
      const row = document.querySelector('.variant[data-variant="Poster A4"]');
      const undo = row.querySelector('.pay-undo:not(:disabled)');
      const [edit, sell] = [row.closest('.tile-group').querySelector('.tile-edit'), undo.closest('.pay').querySelector('.pay-add')];
      const [u, e, a] = [undo, edit, sell].map((n) => n.getBoundingClientRect());
      const at = (x, y, n) => !!document.elementFromPoint(x, y)?.closest('button') && document.elementFromPoint(x, y).closest('button') === n;
      return { undo: at(u.left - 8, u.top + u.height / 2, undo) && at(u.left + u.width / 2, u.top - 8, undo), edit: at(e.left - 5, e.top + e.height / 2, edit) && at(e.left + e.width / 2, e.bottom + 5, edit), sellWins: at(a.left + a.width / 2, a.top + 1, sell) };
    });
    check(`${at} undo and edit have 44px hit areas, and the sell button wins where they meet`, hits.undo && hits.edit && hits.sellWins, hits);
    await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
    await sleep(300);
    const free = await page.evaluate(() => [...document.querySelectorAll('.product-item')].find((r) => r.querySelector('.list-title').textContent === 'A4 Glossy Laminated')?.querySelector('.product-item-sub').textContent);
    check(`${at} Products shows a free product as Free, not "Rp 0 · profit Rp 0"`, free === 'Free', free);
  }

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(`${at} no sideways scroll`, !overflow);
  await page.close();
}

// Seeded: a long variant name at 360px, and folding a group.
{
  const at = '360px:';
  const page = await browser.newPage({ viewport: { width: 360, height: 640 } });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(URL);
  const p = (id, name, price, group) => ({ id, name, price, cost: 0, color: '#f76495', payments: ['Cash', 'QRIS'], group });
  await page.evaluate((products) => {
    localStorage.setItem('cntrProducts', JSON.stringify(products));
    localStorage.setItem('cntrSettings', JSON.stringify({ language: 'en', theme: 'dark' }));
  }, [p('a', 'Fanservice Pangku', 75000, 'Fanservice'), p('b', 'Fanservice Hug with a signed polaroid set', 75000, 'Fanservice'), p('c', 'Fanservice Freebie', 0, 'Fanservice')]);
  await page.reload();
  await sleep(900);
  const outside = () => page.evaluate(() => {
    const t = document.querySelector('.tile-group').getBoundingClientRect();
    return [...document.querySelectorAll('.tile-group button, .tile-group .product-name')].filter((n) => { const r = n.getBoundingClientRect(); return r.left < t.left - 1 || r.right > t.right + 1; }).length + (document.documentElement.scrollWidth > innerWidth ? 100 : 0);
  });
  const compact = async () => { await page.click('#sellMenuBtn'); await page.click('label[for="compactTilesToggle"]'); await page.keyboard.press('Escape'); await sleep(150); };
  const normalOut = await outside();
  await compact();
  const compactOut = await outside();
  check(`${at} a long variant name keeps every button inside the tile, both layouts`, !normalOut && !compactOut, { normalOut, compactOut });

  // Folding: a tap on the group's name row hides its rows and is remembered; the pencil never folds.
  const state = () => page.evaluate(() => ({ rows: document.querySelectorAll('.tile-group .variant').length, expanded: document.querySelector('.tile-group-toggle').getAttribute('aria-expanded'), height: document.querySelector('.tile-group').getBoundingClientRect().height }));
  await page.click('.tile-group .tile-edit');
  await sleep(300);
  await page.click('#closeEditBtn');
  await sleep(300);
  const afterPencil = await state();
  await page.click('.tile-group[data-product="Fanservice Pangku"] [data-payment="Cash"][data-action="plus"]');
  await page.click('.tile-group-toggle');
  await sleep(150);
  const folded = await state();
  const sold = await page.textContent('.tile-group-sold');
  check(`${at} the pencil doesn't fold the group; the name row folds it to one short row with its units sold`, afterPencil.rows === 3 && afterPencil.expanded === 'true' && folded.rows === 0 && folded.expanded === 'false' && folded.height < 72 && sold === '1 sold', { afterPencil, folded, sold });
  await compact();
  const foldedNormal = await state();
  await page.reload();
  await sleep(900);
  const reloaded = await state();
  await page.click('.tile-group-toggle');
  await sleep(150);
  const opened = await state();
  check(`${at} a folded group stays folded after a reload (under 72px in both layouts) and unfolds again`, foldedNormal.height < 72 && reloaded.rows === 0 && opened.rows === 3 && opened.expanded === 'true', { foldedNormal, reloaded, opened });
  await page.close();
}

check('no page errors', !errors.length, errors);
await browser.close();
done();
