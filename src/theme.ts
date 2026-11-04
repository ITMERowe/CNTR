// Light or dark: the CSS tokens switch on <html data-theme>. The phone's own setting only matters once,
// to resolve the very first choice (storage.ts); from then on it's just the Settings toggle.
import type { AppSettings } from './types';

export function applyTheme(choice: AppSettings['theme']) {
  document.documentElement.dataset.theme = choice;
  // The Android status bar and browser chrome match the page background.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', choice);
}

/** The Settings switch: light grows out of `from` as a circle, and shrinks back into it on the way to dark (owner, 2026-11-04). */
export function revealTheme(choice: AppSettings['theme'], from: HTMLElement) {
  // Older WebViews and reduced motion: just switch.
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme(choice);
    return;
  }
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const root = document.documentElement;
  root.style.setProperty('--reveal-x', `${x}px`);
  root.style.setProperty('--reveal-y', `${y}px`);
  root.style.setProperty('--reveal-r', `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`);
  root.dataset.reveal = choice === 'light' ? 'grow' : 'shrink';
  document.startViewTransition(() => applyTheme(choice));
}
