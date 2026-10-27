// Shared helpers for the browser tests. Each suite is a standalone script; run.mjs runs them all.
import { chromium } from 'playwright-core';

export const URL = process.env.CNTR_URL ?? 'http://localhost:4320/';

// Edge on Windows dev machines; Chrome on CI (preinstalled on GitHub's Ubuntu runners). Override with CNTR_BROWSER.
export const launch = () => chromium.launch({ channel: process.env.CNTR_BROWSER ?? (process.platform === 'win32' ? 'msedge' : 'chrome') });

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
