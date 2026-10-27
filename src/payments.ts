// Payment methods a product can take (1 or 2 each). Type-only imports, so Node can test it directly.
import type { Product, SaleRecord } from './types.ts';

/** Fixed order: tiles, the payment mix and its colours (`--pay-*` in style.css) all follow it. */
export const PAYMENT_METHODS = ['Cash', 'QRIS', 'Transfer', 'Card', 'E-wallet'];
export const MAX_PAYMENTS = 2;
/** What products saved before payment methods existed take, and what a new product starts with. */
export const DEFAULT_PAYMENTS = ['Cash', 'QRIS'];

export function productPayments(product: Product): string[] {
  return product.payments?.length ? product.payments : DEFAULT_PAYMENTS;
}

const order = (method: string) => {
  const index = PAYMENT_METHODS.indexOf(method);
  return index < 0 ? PAYMENT_METHODS.length : index;
};

/** Turns `method` on or off: at most MAX_PAYMENTS, never none, always in the fixed order. */
export function togglePayment(selected: string[], method: string): string[] {
  if (selected.includes(method)) return selected.length > 1 ? selected.filter((item) => item !== method) : selected;
  if (selected.length >= MAX_PAYMENTS) return selected;
  return [...selected, method].sort((a, b) => order(a) - order(b));
}

/** Unique method names: fixed order, then any others (e.g. from an old backup) by name. */
export function sortPayments(methods: string[]): string[] {
  return [...new Set(methods)].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
}

/** The methods these sales were paid with. */
export const paymentsInUse = (sales: SaleRecord[]) => sortPayments(sales.map((sale) => sale.payment));

/** CSS class that sets the method's colour (`pay-cash`, `pay-ewallet`, ...). */
export const paymentClass = (method: string) => `pay-${method.toLowerCase().replace(/[^a-z]/g, '')}`;
