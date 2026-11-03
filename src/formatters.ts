import { formatMoney } from './money.ts';
import { loadSettings } from './storage';

export { CURRENCY_SYMBOLS, formatInputNumber, formatMoney, parseCurrencyInput } from './money.ts';

/** Formats an amount with the user's currency and compact-money setting. */
export const fmt = (n: number) => {
  const settings = loadSettings();
  return formatMoney(n, settings.currency, settings.compactMoney);
};

/** A `fmt()` result split into its sign, currency symbol and number, for a big figure that styles the symbol smaller and greyer (the sign stays with the number, so a deficit still reads as negative at a glance). */
export function splitFigure(formatted: string): { sign: string; symbol: string; number: string } {
  const sign = formatted.startsWith('-') ? '-' : '';
  const rest = sign ? formatted.slice(1) : formatted;
  const space = rest.indexOf(' ');
  return space < 0 ? { sign, symbol: '', number: rest } : { sign, symbol: rest.slice(0, space), number: rest.slice(space + 1) };
}

export const PRESET_COLORS = ['#F76495', '#FF4D4D', '#F9B234', '#51C43F', '#30C7FF', '#4F6EFF', '#B85DFF'];

export function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  return `#${hex.toUpperCase()}`;
}

/** White text on tiles unless it would fall below this contrast (owner's choice: white still reads well on pink, green, orange). */
const MIN_WHITE_CONTRAST = 2.6;

/** True when white text would be too faint on `hex` (e.g. yellow, beige, pastels), so the tile uses dark text (#1e1e1e). */
export function needsDarkText(hex: string) {
  const value = parseInt(normalizeHex(hex).slice(1), 16);
  if (Number.isNaN(value)) return false;
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
  return 1.05 / (luminance + 0.05) < MIN_WHITE_CONTRAST; // white's contrast ratio on this colour
}

/** Returns `candidate` unless another product already uses it, then the first unused preset. */
export function chooseUniqueColor(products: Array<{ color: string }>, candidate: string) {
  const normalized = normalizeHex(candidate);
  const used = new Set(products.map((product) => normalizeHex(product.color)));
  if (!used.has(normalized)) return normalized;
  return PRESET_COLORS.find((hex) => !used.has(hex)) || normalized;
}
