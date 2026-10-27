// English and Bahasa Indonesia. No DOM or storage imports at load time, so Node can test it.
// User-typed text, payment method names and CSV headers are never translated.

export type Lang = 'en' | 'id';

export const en = {
  'event.defaultName': 'Event {date}',
  'settings.appearance': 'Appearance',
  'settings.theme': 'Theme',
  'settings.language': 'Language',
  'theme.system': 'Phone setting',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
};

export type Key = keyof typeof en;

/** Same keys as `en`: TypeScript fails the build if one is missing. */
export const id: Record<Key, string> = {
  'event.defaultName': 'Acara {date}',
  'settings.appearance': 'Tampilan',
  'settings.theme': 'Tema',
  'settings.language': 'Bahasa',
  'theme.system': 'Ikuti ponsel',
  'theme.light': 'Terang',
  'theme.dark': 'Gelap',
};

let current: Lang = 'en';

export const setLanguage = (lang: Lang) => {
  current = lang;
};
export const language = () => current;

/** The text for `key` in the current language, with `{name}` placeholders filled from `params`. */
export function t(key: Key, params: Record<string, string | number> = {}) {
  return (current === 'id' ? id : en)[key].replace(/\{(\w+)\}/g, (hole, name: string) => (name in params ? String(params[name]) : hole));
}

/** Dates follow the app's language (day-month-year in English), not the phone's. */
export const locale = () => (current === 'id' ? 'id-ID' : 'en-GB');

/** Indonesian only on a fresh install whose phone is set to Indonesian; updating users stay English until they choose. */
export function initialLanguage(phoneLanguage: string, isFreshInstall: boolean): Lang {
  return isFreshInstall && /^id\b/i.test(phoneLanguage) ? 'id' : 'en';
}

const TRANSLATED_ATTRIBUTES = [
  ['data-i18n-aria', 'aria-label'],
  ['data-i18n-title', 'title'],
  ['data-i18n-placeholder', 'placeholder'],
] as const;

/** Fills static markup: `data-i18n` sets the text; `data-i18n-aria`, `-title` and `-placeholder` set those attributes. */
export function translateStatic(root: ParentNode) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => (node.textContent = t(node.dataset.i18n as Key)));
  for (const [marker, attribute] of TRANSLATED_ATTRIBUTES) {
    root.querySelectorAll(`[${marker}]`).forEach((node) => node.setAttribute(attribute, t(node.getAttribute(marker) as Key)));
  }
}
