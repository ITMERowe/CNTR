// Layout and accessibility on every tab: no text cut off or page overflow, 44px tap targets, labelled controls,
// text contrast (including names on product tiles), and 4 tiles visible on the owner's 412x892 phone.
import { URL, checks, launch, sleep } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const TABS = ['salesScreen', 'eventScreen', 'historyScreen', 'settingsScreen'];

function scan() {
  const visible = (e) => e.offsetParent && getComputedStyle(e).visibility !== 'hidden';
  const name = (e) => `${e.id ? '#' + e.id : ''}.${String(e.className).split(' ')[0]}${e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : ''}`;
  const out = { overflow: [], small: [], unlabeled: [], contrast: [] };
  for (const e of document.querySelectorAll('.screen.active *')) {
    if (visible(e) && !e.children.length && e.textContent.trim() && (e.getBoundingClientRect().right > innerWidth - 8 || e.scrollWidth > e.clientWidth + 1)) out.overflow.push(`${name(e)} "${e.textContent.trim().slice(0, 30)}"`);
    if (visible(e) && e.getBoundingClientRect().right > innerWidth + 0.5) out.overflow.push(`${name(e)} sticks out of the screen (right ${Math.round(e.getBoundingClientRect().right)}px)`);
  }
  for (const e of document.querySelectorAll('button, a, input, select, [role=switch], [role=button]')) {
    if (!visible(e) || e.type === 'checkbox' || e.type === 'file') continue;
    const r = e.getBoundingClientRect();
    const after = getComputedStyle(e, '::after');
    const grow = after.content !== 'none' && after.position === 'absolute' ? -parseFloat(after.top) || 0 : 0;
    // 0.5px slack: entrance animations can report e.g. 43.99px for an exact 44px target
    if (Math.min(r.width, r.height) + 2 * grow < 43.5) out.small.push(`${name(e)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    if (!(e.getAttribute('aria-label') || e.textContent.trim() || e.labels?.[0]?.textContent.trim() || e.title)) out.unlabeled.push(name(e));
  }
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const background = (e) => { for (let n = e; n; n = n.parentElement) { const c = rgb(getComputedStyle(n).backgroundColor); if (c.length === 3 || c[3] > 0.9) return c.slice(0, 3); } return [30, 30, 30]; };
  for (const e of document.querySelectorAll('body *')) {
    if (!visible(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(e);
    if (parseFloat(s.opacity) < 1 || e.closest('[disabled], .is-inactive, [aria-hidden=true]')) continue;
    const fg = rgb(s.color);
    if (fg[3] !== undefined && fg[3] < 1) continue;
    const [hi, lo] = [lum(fg), lum(background(e))].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) out.contrast.push(`${name(e)} "${e.textContent.trim().slice(0, 18)}" ${ratio.toFixed(2)}`);
  }
  return out;
}

for (const [width, height] of [[320, 700], [360, 800], [412, 892], [892, 412]]) {
  const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
  await page.goto(URL);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.cntrEventCosts = JSON.stringify([{ id: 'a', name: 'Booth rental', amount: 125500000 }]);
  });
  await page.reload();
  await sleep(600);
  const sellSome = async () => { await page.click('.tabbar .tab[data-tab="salesScreen"]'); for (let i = 0; i < 6; i++) await page.click('.tile .pay-add'); };
  const confirm = async () => { await page.click('#confirmModalConfirmBtn'); await sleep(300); };
  const assess = async (label) => {
    await sleep(450);
    const r = await page.evaluate(scan);
    const wider = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const problems = [...r.overflow, ...r.small, ...r.unlabeled, ...r.contrast];
    check(`${width}x${height} ${label}: no overflow, tap targets >= 44px, labels, contrast`, !wider && !problems.length, problems.join(' | ') || '');
  };
  // Two days of sales with a long expense, so the day cards show.
  await sellSome();
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('#endDayBtn'); await confirm();
  await sellSome();
  for (const tab of TABS) {
    await page.click(`.tabbar .tab[data-tab="${tab}"]`);
    await assess(tab);
  }
  if (width === 412) {
    await page.click('.tabbar .tab[data-tab="salesScreen"]');
    await sleep(300);
    const fit = await page.evaluate(() => {
      const nav = document.querySelector('.tabbar').getBoundingClientRect().top;
      return { tiles: [...document.querySelectorAll('.tile')].filter((t) => t.getBoundingClientRect().bottom <= nav).length, sell: parseFloat(getComputedStyle(document.querySelector('.hero .hero-figure')).fontSize) };
    });
    await page.click('.tabbar .tab[data-tab="eventScreen"]');
    await sleep(300);
    // The report figure's normal size: a long amount (here a big deficit) is allowed to shrink it to fit.
    const report = await page.evaluate(() => {
      const figure = [...document.querySelectorAll('.report-hero .hero-figure')].find((e) => e.offsetParent);
      const probe = figure.cloneNode();
      probe.textContent = 'Rp 1';
      probe.style.setProperty('--chars', '4');
      figure.after(probe);
      const size = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      return size;
    });
    check('412x892: 4 tiles fit above the tab bar', fit.tiles >= 4, `${fit.tiles} tiles`);
    check('Sell revenue figure is 3/4 of the report figure', Math.abs(fit.sell / report - 0.75) < 0.01, `${fit.sell}px vs ${report}px`);
  }
  // End the event, then the History list, the past event and its edit mode.
  await page.click('.tabbar .tab[data-tab="eventScreen"]');
  await page.click('#endEventBtn');
  await page.fill('#saveModalInput', 'A very long convention name that goes on and on, Day 1 and 2');
  await page.click('#saveModalSaveBtn'); await confirm();
  await page.click('.tabbar .tab[data-tab="historyScreen"]');
  await assess('History with a past event');
  await page.click('#pastEventList .event-row');
  await assess('past event view');
  await page.click('#pastEventEditBtn');
  await assess('past event edit mode');
  await page.click('#pastEventCancelBtn');
  await page.close();
}

await browser.close();
done();
