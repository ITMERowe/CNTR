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
