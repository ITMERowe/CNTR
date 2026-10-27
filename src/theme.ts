// Light or dark: the CSS tokens switch on <html data-theme>. The phone's own setting only matters once,
// to resolve the very first choice (storage.ts); from then on it's just the Settings toggle.
import type { AppSettings } from './types';

export function applyTheme(choice: AppSettings['theme']) {
  document.documentElement.dataset.theme = choice;
  // The Android status bar and browser chrome match the page background.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', choice);
}
