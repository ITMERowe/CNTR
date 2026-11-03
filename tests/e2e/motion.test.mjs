// Motion: counters roll, the hero counts up, sheets slide; with reduced motion they jump straight to the end.
import { URL, checks, launch, run, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();

for (const reduced of [false, true]) {
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto(URL);
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; localStorage.cntrEventCosts = JSON.stringify([{ id: 'm1', name: 'Tape', amount: 5000 }]); }, SAMPLE_PRODUCTS);
  await page.reload();
  await sleep(1000);
  const mode = reduced ? '[reduced motion]' : '[normal]';

  const r = await run(page, `
    const hero = () => document.querySelector('#stats .hero-figure').textContent;
    const btn = document.querySelector('.tile [data-action="plus"][data-payment="Cash"]');
    btn.click();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const value = document.querySelector('.tile [data-counter-for="Cash"]');
    const rollAnim = value.getAnimations().map(a => a.animationName);
    const heroMid = hero();
    await new Promise(r => setTimeout(r, 600));
    const heroEnd = hero();
    const overlay = document.getElementById('saveModalOverlay');
    document.querySelector('.tabbar .tab[data-tab="eventScreen"]').click();
    document.getElementById('eventNameBtn').click();
    const sheet = overlay.querySelector('.sheet');
    await new Promise(r => setTimeout(r, ${reduced ? 150 : 40})); // reduced: more time for a busy machine (still far below the normal slide)
    const sheetMidTransform = getComputedStyle(sheet).transform;
    await new Promise(r => setTimeout(r, 400));
    const sheetEndTransform = getComputedStyle(sheet).transform;
    return { value: value.textContent, rollAnim, heroMid, heroEnd, sheetMidTransform, sheetEndTransform };
  `);

  if (!reduced) {
    check(`${mode} counter rolls up`, r.rollAnim.includes('roll-up') && r.value === '1', { roll: r.rollAnim, value: r.value });
    check(`${mode} hero counts up (mid-frame below final)`, r.heroMid !== r.heroEnd, { mid: r.heroMid, end: r.heroEnd });
    check(`${mode} sheet slides in`, r.sheetMidTransform !== 'none' && r.sheetEndTransform === 'none', { mid: r.sheetMidTransform, end: r.sheetEndTransform });
  } else {
    check(`${mode} hero jumps straight to final`, r.heroMid === r.heroEnd, { mid: r.heroMid, end: r.heroEnd });
    check(`${mode} sheet is in place almost immediately`, r.sheetMidTransform === 'none', { mid: r.sheetMidTransform });
  }

  // Tactile sell button: at rest it is the same box, corner and fill as before, plus a 2px edge in the tile's ink;
  // pressed, the edge flattens and the face sinks 1px; it still sells exactly once.
  await page.click('#saveModalCancelBtn'); await page.click('.tabbar .tab[data-tab="salesScreen"]'); await sleep(400);
  const sell = page.locator('.tile').nth(1).locator('.pay-add[data-payment="QRIS"]');
  const look = () => sell.evaluate((b) => { const s = getComputedStyle(b); const r = b.getBoundingClientRect(); return { h: r.height, radius: s.borderRadius, bg: s.backgroundColor, shadow: s.boxShadow, transform: s.transform, onLight: b.closest('.tile').classList.contains('on-light') }; });
  const rest = await look();
  const box = await sell.boundingBox();
  const salesBefore = await page.evaluate(() => JSON.parse(localStorage.cntrSales).length);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await sleep(200);
  const pressed = await look();
  await page.mouse.up(); await sleep(300);
  const sold = (await page.evaluate(() => JSON.parse(localStorage.cntrSales).length)) - salesBefore;
  check(`${mode} sell button at rest: 80px tall, 14px corners, the ink-faint fill, a 2px bottom edge`, rest.h === 80 && rest.radius === '14px' && rest.bg === (rest.onLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.09)') && /inset$/.test(rest.shadow) && rest.shadow.includes(' 0px -2px 0px'), rest);
  check(`${mode} sell button pressed: the edge flattens, the face sinks and shrinks; one press sells once`, pressed.shadow.includes(' 0px 0px 0px') && pressed.transform !== 'none' && sold === 1, { pressed, sold });

  // Hold to delete: the fill shows while held (instantly with reduced motion); a short hold still deletes nothing.
  await page.click('.tabbar .tab[data-tab="eventScreen"]'); await sleep(300);
  const trash = await page.locator('.delete-cost').boundingBox();
  await page.mouse.move(trash.x + trash.width / 2, trash.y + trash.height / 2);
  await page.mouse.down(); await sleep(150);
  const fill = await page.evaluate(() => getComputedStyle(document.querySelector('.delete-cost .hold-fill')).clipPath);
  await page.mouse.up(); await sleep(150);
  const kept = await page.evaluate(() => JSON.parse(localStorage.cntrEventCosts).length);
  const scaleX = 1 - (+(/inset\(0px ([\d.]+)%/.exec(fill)?.[1] ?? 0) / 100); // the share of the button uncovered
  check(`${mode} hold fill ${reduced ? 'shows at once' : 'grows over the hold'}; let go early, nothing is deleted`, (reduced ? scaleX === 1 : scaleX > 0 && scaleX < 1) && kept === 1, { fill, kept });
  await page.close();
}

// Scroll fade: a sheet's edge fades only toward where there is more to scroll.
{
  const page = await browser.newPage({ viewport: { width: 412, height: 640 } });
  await page.goto(URL);
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
  await page.reload(); await sleep(800);
  const fades = (id) => page.evaluate((i) => ['fade-top', 'fade-bottom'].filter((c) => document.getElementById(i).classList.contains(c)).join() || 'none', id);
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('#eventNameBtn'); await sleep(400);
  const short = await fades('saveModalOverlay');
  await page.click('#saveModalCancelBtn'); await sleep(300);
  await page.click('#openAddExpenseBtn'); await sleep(400);
  const closedList = await fades('expenseModalOverlay');
  await page.click('label:has(#expenseProductsToggle)'); await sleep(400);
  const atTop = await fades('expenseModalOverlay');
  await page.locator('#expenseModalOverlay .sheet').evaluate((s) => { s.scrollTop = (s.scrollHeight - s.clientHeight) / 2; }); await sleep(200);
  const middle = await fades('expenseModalOverlay');
  await page.locator('#expenseModalOverlay .sheet').evaluate((s) => { s.scrollTop = s.scrollHeight; }); await sleep(200);
  const atEnd = await fades('expenseModalOverlay');
  const veil = await page.evaluate(() => getComputedStyle(document.getElementById('expenseModalOverlay'), '::before').pointerEvents);
  check('scroll fade: none on a sheet that fits; bottom when its list grows past the screen, both mid-way, top only at the end; never catches taps', short === 'none' && closedList === 'none' && atTop === 'fade-bottom' && middle === 'fade-top,fade-bottom' && atEnd === 'fade-top' && veil === 'none', { short, closedList, atTop, middle, atEnd, veil });
  await page.close();
}

await browser.close();
done();
