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

// ---- OKLCH helpers: adjust lightness/chroma while keeping the hue ----

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function hexToOklch(hex: string) {
  const n = parseInt(normalizeHex(hex).slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => toLinear(v / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, B), h: Math.atan2(B, A) };
}

function oklchToHex(L: number, C: number, h: number) {
  const A = C * Math.cos(h);
  const B = C * Math.sin(h);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return `#${rgb.map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

/**
 * The calm, deep version of a product colour used for tile surfaces: same hue, lightness capped
 * and chroma reduced so white text always reads clearly and bright picks don't shout.
 */
export function tileTone(hex: string) {
  const { L, C, h } = hexToOklch(hex);
  return oklchToHex(Math.min(Math.max(L, 0.38), 0.47), Math.min(C * 0.72, 0.125), h);
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
