import { loadSettings } from './storage';
import type { Currency } from './types';

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  AUD: 'A$',
  GBP: '£',
  JPY: '¥',
  MYR: 'RM',
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  MYR: 'ms-MY',
};

// Separators must match what Intl.NumberFormat produces for CURRENCY_LOCALES.
const CURRENCY_SEPARATORS: Record<Currency, { group: string; decimal: string }> = {
  IDR: { group: '.', decimal: ',' },
  USD: { group: ',', decimal: '.' },
  EUR: { group: '.', decimal: ',' },
  SGD: { group: ',', decimal: '.' },
  AUD: { group: ',', decimal: '.' },
  GBP: { group: ',', decimal: '.' },
  JPY: { group: ',', decimal: '.' },
  MYR: { group: ',', decimal: '.' },
};

// Building an Intl.NumberFormat is slow and this runs for every amount on screen.
const numberFormats = new Map<Currency, Intl.NumberFormat>();

function formatNumeric(value: number, currency: Currency) {
  let format = numberFormats.get(currency);
  if (!format) {
    format = new Intl.NumberFormat(CURRENCY_LOCALES[currency], { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    numberFormats.set(currency, format);
  }
  return format.format(value);
}

const escapeForRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function parseCurrencyInput(rawValue: string, currency: Currency = loadSettings().currency) {
  const sanitized = (rawValue ?? '').replace(/\s+/g, '');
  if (!sanitized) return 0;

  const withoutSymbol = sanitized.replace(new RegExp(`^${escapeForRegExp(CURRENCY_SYMBOLS[currency])}`), '');
  const { group, decimal } = CURRENCY_SEPARATORS[currency];
  const normalized = withoutSymbol
    .replace(new RegExp(escapeForRegExp(group), 'g'), '')
    .replace(new RegExp(escapeForRegExp(decimal), 'g'), '.')
    .replace(/[^0-9.\-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Formats digits typed into an amount field, e.g. "25000" -> "Rp 25.000". */
export function formatInputNumber(rawValue: string, currency: Currency = loadSettings().currency) {
  const digits = (rawValue ?? '').replace(/[^0-9]/g, '');
  if (!digits) return '';

  const numberValue = Number(digits);
  if (!Number.isFinite(numberValue)) return '';
  return `${CURRENCY_SYMBOLS[currency]} ${formatNumeric(numberValue, currency)}`;
}

export function formatMoney(n: number, currency: Currency, compact: boolean) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (compact && abs >= 1000) {
    const isMillions = abs >= 1000000;
    const value = abs / (isMillions ? 1000000 : 1000);
    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${sign}${symbol} ${formatNumeric(Number(value.toFixed(precision)), currency)}${isMillions ? 'M' : 'K'}`;
  }

  return `${sign}${symbol} ${formatNumeric(abs, currency)}`;
}

/** Formats an amount with the user's currency and compact-money setting. */
export const fmt = (n: number) => {
  const settings = loadSettings();
  return formatMoney(n, settings.currency, settings.compactMoney);
};

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape user-entered text before interpolating it into innerHTML templates (Preact views escape automatically).
export function escapeHtml(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

function relativeLuminance(hex: string) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const INK_DARK = '#0b0b0c';
export const INK_LIGHT = '#ffffff';

/** White or near-black, whichever has the higher WCAG contrast on `hex`. */
export function inkFor(hex: string) {
  const l = relativeLuminance(hex);
  const contrastWithWhite = 1.05 / (l + 0.05);
  const contrastWithDark = (l + 0.05) / (relativeLuminance(INK_DARK) + 0.05);
  return contrastWithWhite >= contrastWithDark ? INK_LIGHT : INK_DARK;
}

export const PRESET_COLORS = ['#F76495', '#FF4D4D', '#F9B234', '#51C43F', '#30C7FF', '#4F6EFF', '#B85DFF'];

export function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  return `#${hex.toUpperCase()}`;
}

/** Returns `candidate` unless another product already uses it, then the first unused preset. */
export function chooseUniqueColor(products: Array<{ color: string }>, candidate: string) {
  const normalized = normalizeHex(candidate);
  const used = new Set(products.map((product) => normalizeHex(product.color)));
  if (!used.has(normalized)) return normalized;
  return PRESET_COLORS.find((hex) => !used.has(hex)) || normalized;
}
