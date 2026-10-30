// Product groups: made in one editor page (Group switch on: group name + variant rows); one Sell tile per group, one row per variant.
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
  const names = async () => (await stored('cntrProducts')).map((p) => p.name).join();
  const tiles = () => page.evaluate(() => [...document.querySelectorAll('.tile')].map((tile) => tile.dataset.group ?? tile.dataset.product));
  const screen = () => page.evaluate(() => document.querySelector('.screen.active').id);
  const toast = () => page.textContent('#toast');
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#editVariants .variant-row')].map((row) => [...row.querySelectorAll('input')].map((i) => i.value).join('|')));
  const fillRow = async (i, variant, price, cost = '') => {
    while ((await page.locator('#editVariants .variant-row').count()) <= i) await page.click('#addVariantBtn');
    const row = page.locator('#editVariants .variant-row').nth(i);
    await row.locator('input').nth(0).fill(variant);
    await row.locator('input').nth(1).fill(String(price));
    await row.locator('input').nth(2).fill(String(cost));
  };
  const removeRow = (variant) => page.evaluate((v) => [...document.querySelectorAll('#editVariants .variant-row')].find((row) => row.querySelector('input').value === v).querySelector('.variant-remove').click(), variant);
  const save = async () => { await page.click('#saveProductBtn'); await sleep(250); };
  const openNew = async () => { await page.click('.tabbar .tab[data-tab="salesScreen"]'); await page.click('#openProductEdit'); await sleep(150); };
  // Opens the editor from the Products tab (what the Sell pencil does too: openProductEditor on that product).
  const openFromProducts = async (name) => { await page.click('.tabbar .tab[data-tab="productHistoryScreen"]'); await page.click(`.product-edit-btn[data-name="${name}"]`); await sleep(200); };
  const add = async (name, price) => { await openNew(); await page.fill('#editName', name); await page.fill('#editPrice', String(price)); await save(); };

  await add('Mug', 40000);

  // A new group in one page: switch on, name it, three variants.
  await openNew();
  const hiddenOff = await page.evaluate(() => [document.getElementById('groupNameField').hidden, document.getElementById('variantsField').hidden, document.getElementById('productFields').hidden].join());
  await page.click('label[for="editGroupToggle"]');
  const startRows = (await rows()).length;
  await page.fill('#editGroup', 'Poster');
  await fillRow(0, 'A3', 30000, 10000);
  await fillRow(1, 'A4', 25000);
  await fillRow(2, 'A5', 20000);
  const preview = await page.textContent('#editPreviewName');
  await save();
  const [a3, a4, a5] = [await product('Poster A3'), await product('Poster A4'), await product('Poster A5')];
  check(`${at} the switch starts off (normal product), on shows group name + 2 empty variant rows; the preview shows the group`, hiddenOff === 'true,true,false' && startRows === 2 && preview === 'Poster', { hiddenOff, startRows, preview });
  check(`${at} one save makes three variants in group Poster with its colour, price and cost`, [a3, a4, a5].every((p) => p?.group === 'Poster' && p.color === a3.color) && a3.price === 30000 && a3.cost === 10000 && a5.price === 20000, { a3, a4, a5 });

  // Sell: one tile for the group, its name once, one row per variant.
  await page.click('.tabbar .tab[data-tab="salesScreen"]');
  const tile = await page.evaluate(() => {
    const group = document.querySelector('.tile-group');
    return { name: group?.querySelector('.group-name')?.textContent, rows: [...(group?.querySelectorAll('.variant') ?? [])].map((row) => row.querySelector('.product-name').textContent).join(), tiles: document.querySelectorAll('.tile').length };
  });
  check(`${at} Sell shows the group as one tile with three rows`, tile.name === 'Poster' && tile.rows === 'A3,A4,A5' && tile.tiles === 2, tile);

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
    // 3 variants here: about 62px per row by default (2 rows were 182px), 52px compact (2 rows were 148px).
    check(`${at} a 3-variant group is short (under 260px, compact under 210px), every sell button at least 44px`, normal.height < 260 && tight.height < 210 && !normal.small && !tight.small, { normal, tight });
    check(`${at} compact tiles show the payment labels once, as column headers`, normal.labels === 6 && tight.labels === 2, { normal: normal.labels, tight: tight.labels });
  }

  // Selling and undoing a variant.
  const plus = (v) => page.click(`.variant[data-variant="${v}"] [data-payment="Cash"][data-action="plus"]`);
  await plus('Poster A4');
  await plus('Poster A4');
  await sleep(150);
  let sales = await stored('cntrSales');
  const counts = () => page.evaluate(() => [...document.querySelectorAll('.tile-group .variant')].map((row) => row.querySelector('[data-counter-for="Cash"]').textContent).join());
  check(`${at} tapping a variant's row sells that variant (by name and id)`, sales.length === 2 && sales.every((s) => s.product === 'Poster A4' && s.productId === a4.id && s.price === 25000) && (await counts()) === '0,2,0', { sales, counts: await counts() });
  await page.click('.variant[data-variant="Poster A4"] [data-payment="Cash"][data-action="minus"]');
  await sleep(150);
  sales = await stored('cntrSales');
  check(`${at} undo on a variant's row takes back that variant's sale`, sales.length === 1 && (await counts()) === '0,1,0', { sales: sales.length, counts: await counts() });

  // Editing any variant opens the whole group; remove a row, add one, rename the group, change payments: ids and sales follow.
  await openFromProducts('Poster A4');
  const opened = { on: await page.isChecked('#editGroupToggle'), group: await page.inputValue('#editGroup'), rows: (await rows()).join() };
  check(`${at} editing a variant opens the whole group, switch on, every variant listed`, opened.on && opened.group === 'Poster' && opened.rows === 'A3|30.000|10.000,A4|25.000|,A5|20.000|', opened);
  await removeRow('A5');
  await fillRow(2, 'A2', 35000);
  await page.fill('#editGroup', 'Print');
  await page.click('#editPayments .payment-option[data-method="Transfer"]');
  // Back with changed rows asks first; Keep editing stays.
  await page.click('#closeEditBtn');
  await sleep(250);
  const backAsk = { title: await page.textContent('#confirmModalTitle'), keep: await page.textContent('#confirmModalCancelBtn') };
  await page.click('#confirmModalCancelBtn');
  await sleep(250);
  // Saving would delete the removed row's product: asks first, naming it; Cancel keeps editing with nothing saved.
  await save();
  const removeAsk = await page.textContent('#confirmModalMessage');
  await page.click('#confirmModalCancelBtn');
  await sleep(250);
  const kept = { screen: await screen(), a5: !!(await product('Poster A5')), rows: (await rows()).length };
  check(`${at} Back after changing rows asks Keep editing / Discard; Keep editing stays`, backAsk.title === 'Discard changes?' && backAsk.keep === 'Keep editing' && kept.screen === 'productEditScreen', backAsk);
  check(`${at} saving with a removed row asks first, naming it; Cancel keeps editing and saves nothing`, removeAsk === "Saving deletes 'Poster A5'. Their sales stay in your reports." && kept.a5 && kept.rows === 3, { removeAsk, kept });
  await save();
  await page.click('#confirmModalConfirmBtn');
  await sleep(250);
  const list = await stored('cntrProducts');
  const history = await stored('cntrProductHistory');
  const [p3, p4, p2] = ['Print A3', 'Print A4', 'Print A2'].map((n) => list.find((p) => p.name === n));
  sales = await stored('cntrSales');
  check(`${at} renaming the group renames every variant, keeping ids; payments reach all`, p3?.id === a3.id && p4?.id === a4.id && p2 && ![a3.id, a4.id, a5.id].includes(p2.id) && [p3, p4, p2].every((p) => p.group === 'Print' && p.payments.includes('Transfer')), { p3, p4, p2 });
  check(`${at} a removed row is gone like Delete; the variant's sales follow its rename`, !list.some((p) => p.id === a5.id) && !history.some((p) => p.id === a5.id) && sales.length === 1 && sales[0].product === 'Print A4', { names: list.map((p) => p.name), sales });

  // Refused, with nothing saved: a group name another group has (any case), two rows with one name, a name a product has, no group name.
  const before = await names();
  const refusals = [];
  const marked = [];
  for (const [group, variants] of [['print', ['B1']], ['Cups', ['X', 'x']], ['Mug', ['']], ['', ['A']]]) {
    await openNew();
    await page.click('label[for="editGroupToggle"]');
    await page.fill('#editGroup', group);
    for (const [i, v] of variants.entries()) await fillRow(i, v, 1000);
    await save();
    refusals.push(`${await screen()}:${await toast()}`);
    marked.push(await page.evaluate(() => { const f = document.activeElement; return `${f.id || f.value}:${f.getAttribute('aria-invalid')}`; }));
    await page.click('#closeEditBtn');
    await sleep(250);
    await page.click('#confirmModalConfirmBtn'); // Discard
    await sleep(250);
  }
  check(`${at} a clashing group, a duplicate variant, a taken name or no group name is refused with a toast`, (await names()) === before && refusals.join('|') === "productEditScreen:A group named 'print' already exists|productEditScreen:Two variants are named 'Cups x'|productEditScreen:A product named 'Mug' already exists|productEditScreen:Give the group a name", refusals);
  check(`${at} a refusal focuses the field at fault (group name, or the clashing variant) and marks it invalid`, marked.join('|') === 'editGroup:true|x:true|:true|editGroup:true', marked);

  // Switching on for a normal product: it becomes the first variant, its real name unchanged.
  await add('Pin', 5000);
  const pin = await product('Pin');
  await openFromProducts('Pin');
  await page.click('label[for="editGroupToggle"]');
  const switched = { group: await page.inputValue('#editGroup'), rows: (await rows()).join() };
  await fillRow(1, 'Big', 8000);
  await save();
  check(`${at} switching a product to a group keeps it as the first variant (same name and id)`, switched.group === 'Pin' && switched.rows === '|5.000|,||' && (await product('Pin'))?.id === pin.id && (await product('Pin'))?.group === 'Pin' && (await product('Pin Big'))?.group === 'Pin', switched);

  // Switching off: refused with two variants; with one left it is a normal product again, keeping its full name and id.
  await openFromProducts('Pin Big');
  await page.click('label[for="editGroupToggle"]');
  const refused = { on: await page.isChecked('#editGroupToggle'), toast: await toast() };
  await removeRow('Pin');
  await page.click('label[for="editGroupToggle"]');
  const off = { on: await page.isChecked('#editGroupToggle'), name: await page.inputValue('#editName'), price: await page.inputValue('#editPrice') };
  const bigId = (await product('Pin Big')).id;
  await save();
  const offAsk = await page.textContent('#confirmModalMessage');
  await page.click('#confirmModalConfirmBtn');
  await sleep(250);
  const big = await product('Pin Big');
  check(`${at} Group can't be switched off with two variants`, refused.on && refused.toast === 'Remove variants until one is left, then turn Group off', refused);
  check(`${at} with one variant left, switching off makes it a normal product with its full name; the removed one goes`, !off.on && off.name === 'Pin Big' && off.price === 'Rp 8.000' && big?.id === bigId && !big.group && !(await product('Pin')) && offAsk.includes("'Pin'"), { off, big, offAsk, names: await names() });

  if (width === 412) {
    // Sort by best sellers counts a group's variants together: Mug 2, Print 1 + 2 = 3.
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    for (let i = 0; i < 2; i++) await page.click('.tile[data-product="Mug"] [data-payment="Cash"][data-action="plus"]');
    await page.click('.variant[data-variant="Print A3"] [data-payment="QRIS"][data-action="plus"]');
    await page.click('.variant[data-variant="Print A2"] [data-payment="QRIS"][data-action="plus"]');
    await page.click('#sellMenuBtn');
    await page.click('label[for="autoSortToggle"]');
    await page.keyboard.press('Escape');
    check(`${at} Sort by best sellers sorts a group by its total units`, (await tiles())[0] === 'Print', await tiles());
    await page.click('#sellMenuBtn');
    await page.click('label[for="autoSortToggle"]');
    await page.keyboard.press('Escape');
    // Drag: hold the group's tile and move it above Mug; it moves whole.
    const salesBefore = (await stored('cntrSales')).length;
    const box = (s) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
    const [grab, groupMid, mugMid] = [await box('.tile-group .group-name'), await box('.tile-group'), await box('.tile[data-product="Mug"]')];
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await sleep(550);
    const toY = grab.y + mugMid.y - groupMid.y - 20;
    for (let i = 1; i <= 10; i++) await page.mouse.move(grab.x, grab.y + ((toY - grab.y) * i) / 10);
    await page.mouse.up();
    await sleep(300);
    const order = await names();
    check(`${at} dragging the group tile moves all its variants together, without selling`, (await tiles())[0] === 'Print' && order === 'Print A3,Print A4,Print A2,Mug,Pin Big' && (await stored('cntrSales')).length === salesBefore, { tiles: await tiles(), order });
    // Compact tiles keep one row per variant, every button inside the tile.
    await page.click('#sellMenuBtn');
    await page.click('label[for="compactTilesToggle"]');
    await page.keyboard.press('Escape');
    const fit = await page.evaluate(() => {
      const t = document.querySelector('.tile-group').getBoundingClientRect();
      const out = [...document.querySelectorAll('.tile-group button, .tile-group .product-name')].filter((n) => { const r = n.getBoundingClientRect(); return r.left < t.left - 1 || r.right > t.right + 1; });
      return { rows: document.querySelectorAll('.tile-group .variant').length, out: out.length };
    });
    check(`${at} compact tiles: the group keeps one row per variant, all inside the tile`, fit.rows === 3 && !fit.out, fit);
    await page.click('#sellMenuBtn');
    await page.click('label[for="compactTilesToggle"]');
    await page.keyboard.press('Escape');
  }

  // Products tab: the variants sit together under the group's name.
  await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
  const listed = await page.evaluate(() => [...document.querySelectorAll('#productHistoryList .product-group')].map((g) => `${g.querySelector('.product-group-title span').textContent}:${[...g.querySelectorAll('.list-title')].map((n) => n.textContent).join('+')}`));
  check(`${at} Products lists a group's variants under its name`, listed.join() === 'Print:A3+A4+A2', listed);

  // Expense sheet: ticking the group ticks all its variants; the expense links to each.
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('#openAddExpenseBtn');
  await page.click('label[for="expenseProductsToggle"]');
  const foldedFirst = await page.evaluate(() => { const g = document.querySelector('#expenseProducts .check-group'); return g.querySelector('.check-variants').hidden && g.querySelector('.check-fold').getAttribute('aria-expanded') === 'false'; });
  await page.click('#expenseProducts .check-group .check-fold');
  const shown = await page.evaluate(() => [...document.querySelectorAll('#expenseProducts .check-variants .check-row')].filter((r) => r.offsetParent).length);
  await page.click('#expenseProducts .check-group .check-row:has(.check-all)');
  await page.fill('#eventCostName', 'Print run');
  await page.fill('#eventCostAmount', '100000');
  await page.click('#addCostBtn');
  await sleep(200);
  const linked = (await stored('cntrEventCosts'))[0]?.productIds ?? [];
  check(`${at} the expense picker's groups start folded; the arrow shows their variants`, foldedFirst && shown === 3, { foldedFirst, shown });
  check(`${at} the expense picker's group row picks all its variants`, linked.length === 3 && [a3.id, a4.id, p2.id].every((id) => linked.includes(id)), linked);

  if (width === 412) {
    // A long, free variant: the editor's rows and preview stay inside the page; Products says Free.
    await openFromProducts('Print A3');
    await fillRow(3, 'Glossy Laminated Extra Large', 0);
    await sleep(200);
    const wide = await page.evaluate(() => [document.documentElement, document.querySelector('.content')].some((e) => e.scrollWidth > innerWidth));
    const targets = await page.evaluate(() => [...document.querySelectorAll('.variant-remove, #addVariantBtn')].every((b) => { const r = b.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && parseFloat(getComputedStyle(b).borderTopLeftRadius) > 0; }));
    check(`${at} the group editor has no sideways scroll; remove and add buttons are 44px and rounded`, !wide && targets, { wide, targets });
    await save();
    // Undo (26px) and edit (32px) reach 44px with their ::after, but where they meet a sell button, the sell button wins.
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    await sleep(200);
    const hits = await page.evaluate(() => {
      const row = document.querySelector('.variant[data-variant="Print A3"]');
      const undo = row.querySelector('.pay-undo:not(:disabled)');
      const [edit, sell] = [row.closest('.tile-group').querySelector('.tile-edit'), undo.closest('.pay').querySelector('.pay-add')];
      const [u, e, a] = [undo, edit, sell].map((n) => n.getBoundingClientRect());
      const at = (x, y, n) => !!document.elementFromPoint(x, y)?.closest('button') && document.elementFromPoint(x, y).closest('button') === n;
      return { undo: at(u.left - 8, u.top + u.height / 2, undo) && at(u.left + u.width / 2, u.top - 8, undo), edit: at(e.left - 5, e.top + e.height / 2, edit) && at(e.left + e.width / 2, e.bottom + 5, edit), sellWins: at(a.left + a.width / 2, a.top + 1, sell), plusHidden: getComputedStyle(sell.querySelector('.pay-plus')).display === 'none' };
    });
    check(`${at} undo and edit have 44px hit areas; the sell button wins where they meet; no + icon (the whole half sells)`, hits.undo && hits.edit && hits.sellWins && hits.plusHidden, hits);
    await page.click('.tabbar .tab[data-tab="productHistoryScreen"]');
    await sleep(300);
    const free = await page.evaluate(() => [...document.querySelectorAll('.product-item')].find((r) => r.querySelector('.list-title').textContent === 'Glossy Laminated Extra Large')?.querySelector('.product-item-sub').textContent);
    check(`${at} Products shows a free product as Free, not "Rp 0 · profit Rp 0"`, free === 'Free', free);
  }

  // Delete on a group asks first, then removes every variant; their sales stay.
  await openFromProducts('Print A3');
  await page.click('#removeProductBtn');
  const asked = await page.textContent('#confirmModalMessage');
  await page.click('#confirmModalConfirmBtn');
  await sleep(250);
  const left = await names();
  check(`${at} deleting a group asks, then removes all its variants and keeps their sales`, asked.startsWith("Delete the group 'Print'") && left === 'Mug,Pin Big' && (await stored('cntrSales')).some((s) => s.product === 'Print A4'), { asked, left });

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

  // A tap right after folding/unfolding lands on tiles that just moved: ignored for a moment, then it sells again.
  const soldNow = () => page.evaluate(() => JSON.parse(localStorage.getItem('cntrSales') ?? '[]').length);
  const salesBefore = await soldNow();
  const stray = await page.evaluate(() => {
    document.querySelector('.tile-group-toggle').click();
    document.querySelector('.tile-group-toggle').click();
    document.querySelector('.tile-group [data-action="plus"]').click();
    document.querySelector('.tile-group [data-action="minus"]:not(:disabled)')?.click();
    return document.querySelectorAll('.tile-group .variant').length;
  });
  const afterStray = await soldNow();
  await sleep(450);
  await page.click('.tile-group [data-action="plus"]');
  const afterWait = await soldNow();
  check(`${at} sell and undo taps within 400ms of a fold are ignored; later taps sell`, stray === 3 && afterStray === salesBefore && afterWait === salesBefore + 1, { stray, salesBefore, afterStray, afterWait });

  // Folded, the toggle's name reads with a pause: "Fanservice, 2 sold".
  await page.click('.tile-group-toggle');
  const foldedName = await page.getAttribute('.tile-group-toggle', 'aria-label');
  await page.click('.tile-group-toggle');
  check(`${at} a folded group's toggle is named "group, n sold"`, foldedName === 'Fanservice, 2 sold', foldedName);

  // TRANSFER / E-WALLET show in full in a group's rows and in the compact column headers.
  const q = (id, name) => ({ id, name, price: 15000, cost: 0, color: '#1b2a4a', payments: ['Transfer', 'E-wallet'], group: 'Print' });
  await page.evaluate((products) => localStorage.setItem('cntrProducts', JSON.stringify(products)), [q('t1', 'Print A3'), q('t2', 'Print A4')]);
  await page.reload();
  await sleep(900);
  const cut = () => page.evaluate(() => [...document.querySelectorAll('.tile-group .pay-name')].filter((n) => n.offsetParent && n.scrollWidth > n.clientWidth).map((n) => n.textContent));
  const cutNormal = await cut();
  await compact();
  const cutCompact = await cut();
  await compact();
  const icons = await page.evaluate(() => [...document.querySelectorAll('.tile-group .pay-label .icon')].filter((n) => n.getBoundingClientRect().width > 0).length);
  check(`${at} Transfer and E-wallet labels are never cut and keep their icons, rows and compact headers`, !cutNormal.length && !cutCompact.length && icons === 4, { cutNormal, cutCompact, icons });

  // The editor's variant rows hold a 7-digit price whole.
  await page.evaluate((products) => localStorage.setItem('cntrProducts', JSON.stringify(products)), [{ ...q('t1', 'Print A3'), price: 1500000, cost: 900000 }]);
  await page.reload();
  await sleep(900);
  await page.click('.tile-group .tile-edit');
  await sleep(300);
  const price = await page.evaluate(() => { const i = document.querySelectorAll('#editVariants input')[1]; return { value: i.value, sw: i.scrollWidth, cw: i.clientWidth }; });
  check(`${at} a 1.500.000 price fits its variant input`, price.value === '1.500.000' && price.sw <= price.cw, price);
  await page.close();
}

check('no page errors', !errors.length, errors);
await browser.close();
done();
