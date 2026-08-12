import { loadSettings } from './storage';

const CURRENCY_SYMBOLS: Record<'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR', string> = {
  IDR: 'Rp',
  USD: '$',
  EUR: '€',
  SGD: 'S$',
  AUD: 'A$',
  GBP: '£',
  JPY: '¥',
  MYR: 'RM',
};

const CURRENCY_LOCALES: Record<'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR', string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
  AUD: 'en-AU',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  MYR: 'ms-MY',
};

function getCurrencySeparators(currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR') {
  const decimalMap: Record<typeof currency, string> = {
    IDR: ',',
    USD: '.',
    EUR: ',',
    SGD: '.',
    AUD: '.',
    GBP: '.',
    JPY: '.',
    MYR: '.',
  };

  const groupMap: Record<typeof currency, string> = {
    IDR: '.',
    USD: ',',
    EUR: '.',
    SGD: ',',
    AUD: ',',
    GBP: ',',
    JPY: ',',
    MYR: ',',
  };

  return {
    group: groupMap[currency] || ',',
    decimal: decimalMap[currency] || '.',
  };
}

function formatNumeric(value: number, currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR') {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseCurrencyInput(rawValue: string, currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR' = loadSettings().currency) {
  const sanitized = (rawValue ?? '').replace(/\s+/g, '').trim();
  if (!sanitized) return 0;

  const symbol = CURRENCY_SYMBOLS[currency] || 'Rp';
  const symbolText = symbol.replace(/[$€£¥]/g, '\\$&');
  const withoutSymbol = sanitized.replace(new RegExp(`^${symbolText}`), '');

  const { group, decimal } = getCurrencySeparators(currency);
  const withoutGroup = withoutSymbol.replace(new RegExp(`\\${group === '.' ? '\\.' : group}`, 'g'), '');
  const normalized = withoutGroup.replace(decimal, '.').replace(/[^0-9.\-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatInputNumber(rawValue: string, currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR' = loadSettings().currency) {
  const sanitized = (rawValue ?? '').replace(/[^0-9]/g, '');
  if (!sanitized) return '';

  const numberValue = Number(sanitized);
  if (!Number.isFinite(numberValue)) return '';

  const formatted = formatNumeric(numberValue, currency);
  const symbol = CURRENCY_SYMBOLS[currency] || 'Rp';
  return `${symbol} ${formatted}`;
}

export function formatMoney(
  n: number,
  currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR' = loadSettings().currency,
  compact = loadSettings().compactMoney,
) {
  const symbol = CURRENCY_SYMBOLS[currency] || 'Rp';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (compact && abs >= 1000) {
    const unit = abs >= 1000000 ? 1000000 : 1000;
    const suffix = abs >= 1000000 ? 'M' : 'K';
    const value = abs / unit;

    let precision = 1;
    if (value >= 100) precision = 0;
    else if (value >= 10) precision = 1;
    else if (value >= 1) precision = 2;
    else precision = 3;

    const formatted = Number(value.toFixed(precision));
    return `${symbol} ${sign}${formatNumeric(formatted, currency)}${suffix}`;
  }

  return `${symbol} ${sign}${formatNumeric(abs, currency)}`;
}

export const fmt = (n: number) => {
  const settings = loadSettings();
  return formatMoney(n, settings.currency, settings.compactMoney);
};

export const fmtCompact = (n: number) => {
  const settings = loadSettings();
  return formatMoney(n, settings.currency, settings.compactMoney);
};

export const label = (p: number) => p >= 1000 ? `${p / 1000}k` : `${p}`;

export function getContrastColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#071f1d' : '#ffffff';
}

export const PRESET_COLORS = ['#F76495', '#FF4D4D', '#F9B234', '#51C43F', '#30C7FF', '#4F6EFF', '#B85DFF'];

export function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  return `#${hex.toUpperCase()}`;
}

export function getUnusedPresetColor(products: Array<{ color: string }>) {
  const used = new Set(products.map((product) => normalizeHex(product.color).toUpperCase()));
  return PRESET_COLORS.find((hex) => !used.has(hex.toUpperCase())) || null;
}

export function chooseUniqueColor(products: Array<{ color: string }>, candidate: string) {
  const normalized = normalizeHex(candidate);
  const isTaken = products.some((product) => normalizeHex(product.color).toUpperCase() === normalized.toUpperCase());
  if (!isTaken) return normalized;
  return getUnusedPresetColor(products) || normalized;
}
