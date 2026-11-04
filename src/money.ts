// Money amounts: formatting and reading typed amounts, per currency. Pure (no settings), so `node --test` can load it.
import type { Currency } from './types.ts';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
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

export function parseCurrencyInput(rawValue: string, currency: Currency) {
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

/** IDR and JPY amounts are whole numbers; the others have cents. */
const hasCents = (currency: Currency) => currency !== 'IDR' && currency !== 'JPY';

/**
 * Formats an amount field from a stored number or from what the seller typed ("25000" -> "Rp 25.000", "2.5" -> "$ 2.5").
 * Typing keeps a trailing decimal separator and up to 2 decimals, so cents can be entered; IDR and JPY take whole numbers.
 */
export function formatInputNumber(raw: string | number, currency: Currency) {
  const symbol = CURRENCY_SYMBOLS[currency];
  if (typeof raw === 'number') return Number.isFinite(raw) ? `${symbol} ${formatNumeric(raw, currency)}` : '';
  const typed = (raw ?? '').replace(/[^0-9.,]/g, '');
  if (!hasCents(currency)) {
    const digits = typed.replace(/[^0-9]/g, '');
    return digits ? `${symbol} ${formatNumeric(Number(digits), currency)}` : '';
  }
  const { decimal } = CURRENCY_SEPARATORS[currency];
  // Phone keyboards may offer the other separator: pressed last, either one means the decimal.
  const text = /[.,]$/.test(typed) ? typed.slice(0, -1) + decimal : typed;
  const at = text.indexOf(decimal);
  const whole = (at < 0 ? text : text.slice(0, at)).replace(/[^0-9]/g, '');
  if (at < 0) return whole ? `${symbol} ${formatNumeric(Number(whole), currency)}` : '';
  const cents = text.slice(at + 1).replace(/[^0-9]/g, '').slice(0, 2);
  return `${symbol} ${formatNumeric(Number(whole || '0'), currency)}${decimal}${cents}`;
}

/** No-break space after the symbol, so a sentence never wraps between "Rp" and the number. */
export function formatMoney(n: number, currency: Currency, compact: boolean) {
  const symbol = CURRENCY_SYMBOLS[currency];
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  if (compact && abs >= 1000) {
    // By the rounded thousands, so 999,500 reads "1M" rather than "1.000K".
    const isMillions = Math.round(abs / 1000) >= 1000;
    const value = abs / (isMillions ? 1000000 : 1000);
    const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
    return `${sign}${symbol} ${formatNumeric(Number(value.toFixed(precision)), currency)}${isMillions ? 'M' : 'K'}`;
  }

  return `${sign}${symbol} ${formatNumeric(abs, currency)}`;
}

