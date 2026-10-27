// Shared helpers for the browser tests. Each suite is a standalone script; run.mjs runs them all.
import { chromium } from 'playwright-core';

export const URL = process.env.CNTR_URL ?? 'http://localhost:4320/';

// Edge on Windows dev machines; Chrome on CI (preinstalled on GitHub's Ubuntu runners). Override with CNTR_BROWSER.
// Pages start as if the first-launch tutorial offer was already seen (even after localStorage.clear()),
// so it doesn't cover what a suite tests; tutorial.test.mjs passes { welcome: true } to see it.
export async function launch({ welcome = false } = {}) {
  const browser = await chromium.launch({ channel: process.env.CNTR_BROWSER ?? (process.platform === 'win32' ? 'msedge' : 'chrome') });
  if (welcome) return browser;
  const newContext = browser.newContext.bind(browser);
  browser.newContext = async (options) => {
    const context = await newContext(options);
    await context.addInitScript(() => localStorage.setItem('cntrMeta.tutorialOffered', 'test'));
    return context;
  };
  browser.newPage = async (options) => (await browser.newContext(options)).newPage();
  return browser;
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Evaluates a function body in the page (it may use await and return a value). */
export const run = (page, body) => page.evaluate(`(async () => { ${body} })()`);

/** check(name, ok, detail) prints PASS/FAIL; done() prints the total and exits non-zero on any failure. */
export function checks() {
  let passed = 0;
  let failed = 0;
  return {
    check(name, ok, detail = '') {
      ok ? passed++ : failed++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`);
    },
    done() {
      console.log(`${passed}/${passed + failed} passed`);
      process.exit(failed ? 1 : 0);
    },
  };
}

/** What a user does at each tutorial step, in order (keys are the steps' ids). Real clicks, on rails. */
const tourNext = (page) => page.click('#tourNextBtn');
export const TOUR_ACTIONS = {
  'sell-cash': (p) => p.click('.tile[data-product="Sticker"] [data-payment="Cash"][data-action="plus"]'),
  'sell-qris': (p) => p.click('.tile[data-product="Sticker"] [data-payment="QRIS"][data-action="plus"]'),
  undo: (p) => p.click('.tile[data-product="Sticker"] [data-payment="Cash"][data-action="minus"]'),
  totals: tourNext,
  'add-open': (p) => p.click('#openProductEdit'),
  'add-details': async (p) => {
    await p.fill('#editName', 'Practice mug');
    await p.fill('#editPrice', '30000');
    await p.fill('#editCost', '12000');
    await tourNext(p);
  },
  'add-payments': tourNext,
  'add-color': tourNext,
  'add-save': (p) => p.click('#saveProductBtn'),
  'event-tab': (p) => p.click('.tabbar .tab[data-tab="eventScreen"]'),
  'event-name': tourNext,
  expense: (p) => p.click('#openAddExpenseBtn'),
  'expense-form': async (p) => {
    await p.fill('#eventCostName', 'Booth');
    await p.fill('#eventCostAmount', '50000');
    await p.click('#addCostBtn');
  },
  'end-day': (p) => p.click('#endDayBtn'),
  'end-day-confirm': (p) => p.click('#confirmModalConfirmBtn'),
  'end-event': (p) => p.click('#endEventBtn'),
  'end-event-name': async (p) => {
    await p.fill('#saveModalInput', 'Practice weekend');
    await p.click('#saveModalSaveBtn');
  },
  'end-event-confirm': (p) => p.click('#confirmModalConfirmBtn'),
  'history-tab': (p) => p.click('.tabbar .tab[data-tab="historyScreen"]'),
  'history-open': (p) => p.click('#pastEventList .event-row >> nth=0'),
  'history-edit': (p) => p.click('#pastEventEditBtn'),
  'history-adjust': (p) => p.click('#pastEventCard [data-adjust][data-delta="1"]:visible >> nth=0'),
  'history-save': (p) => p.click('#pastEventSaveBtn'),
  'history-back': (p) => p.click('#pastEventBackBtn'),
  'compare-open': (p) => p.click('#compareEventsBtn'),
  // Compares as soon as the 2nd event is ticked; no separate confirm tap.
  'compare-pick': async (p) => {
    await p.click('#compareModalList .check-row >> nth=0');
    await p.click('#compareModalList .check-row >> nth=1');
  },
  'compare-view': tourNext,
  done: tourNext,
};

/** Does the tour's steps in order until (not including) `until`. Returns null, or where it got stuck. `onStep(id)` runs as each step shows. */
export async function playTour(page, until, onStep) {
  for (const id of Object.keys(TOUR_ACTIONS)) {
    if (id === until) return null;
    try {
      await page.waitForSelector(`.tour-bubble[data-step="${id}"]`, { timeout: 4000 });
    } catch {
      return { expected: id, showing: await page.evaluate(() => document.querySelector('.tour-bubble')?.dataset.step ?? null) };
    }
    await onStep?.(id);
    try {
      await TOUR_ACTIONS[id](page);
    } catch (error) {
      return { step: id, error: error.message.split('\n')[0] };
    }
  }
  return null;
}

/** Sample products for the suites (a fresh install has none). Set as localStorage.cntrProducts before loading. */
export const SAMPLE_PRODUCTS = JSON.stringify([
  { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
  { name: 'Cheki', price: 35000, cost: 17000, color: '#31b500' },
  { name: 'Poster', price: 30000, cost: 15000, color: '#f16900' },
  { name: 'Photocard', price: 15000, cost: 7000, color: '#d49762' },
  { name: 'Sticker', price: 5000, cost: 1500, color: '#c8070b' },
  { name: 'Acrylic Stand', price: 45000, cost: 25000, color: '#9b48ad' },
  { name: 'Keychain', price: 20000, cost: 9000, color: '#d8b800' },
  { name: 'Tote Bag', price: 50000, cost: 30000, color: '#5f6d77' },
]);
