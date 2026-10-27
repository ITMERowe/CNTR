// Motion: counters roll, the hero counts up, sheets slide; with reduced motion they jump straight to the end.
import { URL, checks, launch, run, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();

for (const reduced of [false, true]) {
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.goto(URL);
  await page.evaluate((p) => { localStorage.clear(); localStorage.cntrProducts = p; }, SAMPLE_PRODUCTS);
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
    await new Promise(r => setTimeout(r, 40));
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
  await page.close();
}

await browser.close();
done();
