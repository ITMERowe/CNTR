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
  await page.click('.variant[data-variant="Poster A3"] .tile-edit');
  const opened = { group: await page.inputValue('#editGroup'), name: await page.inputValue('#editName') };
  await page.click('#editPayments .payment-option[data-method="Transfer"]');
  await page.click('#saveProductBtn');
  await sleep(250);
  const synced = [(await product('Poster A3')).payments.join(), (await product('Poster A4')).payments.join()];
  check(`${at} editing a variant opens Group + Variant; its payment methods reach every variant`, opened.group === 'Poster' && opened.name === 'A3' && synced[0] === synced[1] && synced[0].includes('Transfer'), { opened, synced });

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

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  check(`${at} no sideways scroll`, !overflow);
  await page.close();
}

check('no page errors', !errors.length, errors);
await browser.close();
done();
