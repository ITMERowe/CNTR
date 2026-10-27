// Light or dark: the CSS tokens switch on <html data-theme>; 'system' follows the phone and keeps following it.
import type { AppSettings } from './types';

const phoneLight = window.matchMedia('(prefers-color-scheme: light)');
let following: (() => void) | null = null;

/** Applies `choice` now; for 'system', also whenever the phone switches between light and dark. */
export function applyTheme(choice: AppSettings['theme']) {
  if (following) phoneLight.removeEventListener('change', following);
  following = null;
  const apply = () => {
    const theme = choice === 'system' ? (phoneLight.matches ? 'light' : 'dark') : choice;
    document.documentElement.dataset.theme = theme;
    // The Android status bar and browser chrome match the page background.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', theme);
  };
  apply();
  if (choice === 'system') {
    following = apply;
    phoneLight.addEventListener('change', following);
  }
}
