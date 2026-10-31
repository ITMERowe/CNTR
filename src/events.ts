// Event maths: days, totals and History edits. Imports only pure modules, so Node can test it directly.
import { locale, t } from './i18n.ts';
import type { EventCost, PastEvent, Product, SaleRecord } from './types.ts';

const time = (value: Date | string) => new Date(value).getTime();

/** The sales of each day: one list per day, `dayBreaks.length + 1` in all. */
export function splitDays(sales: SaleRecord[], dayBreaks: string[]): SaleRecord[][] {
  const breaks = dayBreaks.map(time);
  const days: SaleRecord[][] = breaks.map(() => []);
  days.push([]);
  for (const sale of sales) {
    const index = breaks.findIndex((end) => time(sale.timestamp) < end);
    days[index < 0 ? breaks.length : index].push(sale);
  }
  return days;
}

// Days are split by time, so a phone clock set back must not move a sale into an ended day, or keep today's
// sales out of the day being ended. Both stamps are pushed just past what they must follow.

/** When to stamp a new sale: now, but always after the last End day. */
export function saleTime(now: Date, dayBreaks: string[]): Date {
  return new Date(Math.max(now.getTime(), ...dayBreaks.map((end) => time(end) + 1)));
}

/** When to stamp End day: now, but always after every sale and earlier End day. */
export function breakTime(now: Date, sales: SaleRecord[], dayBreaks: string[]): string {
  return new Date(Math.max(now.getTime(), ...sales.map((sale) => time(sale.timestamp) + 1), ...dayBreaks.map((end) => time(end) + 1))).toISOString();
}

/** The sales after the last End day. */
export function todaySales(sales: SaleRecord[], dayBreaks: string[]): SaleRecord[] {
  const days = splitDays(sales, dayBreaks);
  return days[days.length - 1];
}

/**
 * The event's sales with item cost 0 for products an expense of the same event is linked to, so the money is not
 * counted twice (owner rule: the expense counts in full, the item cost for none of the units). Matches a sale to a
 * product by id, or by name for sales from before ids. Returns new sale objects; the input is unchanged.
 */
export function withLinkedCosts(sales: SaleRecord[], expenses: EventCost[], products: Product[]): SaleRecord[] {
  const linked = new Set(expenses.flatMap((cost) => cost.productIds ?? []));
  if (!linked.size) return sales;
  const names = new Set(products.filter((product) => product.id && linked.has(product.id)).map((product) => product.name));
  return sales.map((sale) => ((linked.has(sale.productId ?? '') || names.has(sale.product)) ? { ...sale, cost: 0 } : sale));
}

/** Net profit = product profit (revenue − product cost, see withLinkedCosts) − expenses. */
export function eventSummary(rawSales: SaleRecord[], expenses: EventCost[], products: Product[] = []) {
  const sales = withLinkedCosts(rawSales, expenses, products);
  const revenue = sales.reduce((sum, sale) => sum + sale.price, 0);
  const productProfit = sales.reduce((sum, sale) => sum + sale.price - sale.cost, 0);
  const expenseTotal = expenses.reduce((sum, cost) => sum + cost.amount, 0);
  return { revenue, productProfit, expenses: expenseTotal, net: productProfit - expenseTotal, count: sales.length };
}

/** In the app's language (month names), not the phone's. */
export const formatDay = (value: Date | string) => new Date(value).toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });

export function defaultEventName(sales: SaleRecord[], now: Date): string {
  const first = sales.reduce<Date | null>((min, sale) => (!min || time(sale.timestamp) < min.getTime() ? new Date(sale.timestamp) : min), null);
  return t('event.defaultName', { date: formatDay(first ?? now) });
}

/** One product per name sold: the latest sale's price and cost, the colour from `known` ('' if unknown). */
export function snapshotProducts(sales: SaleRecord[], known: Product[]): Product[] {
  const byName = new Map<string, Product>();
  for (const sale of [...sales].sort((a, b) => time(a.timestamp) - time(b.timestamp))) {
    const match = known.find((product) => product.name === sale.product);
    const id = sale.productId ?? match?.id;
    byName.set(sale.product, { ...(id && { id }), name: sale.product, price: sale.price, cost: sale.cost, color: match?.color ?? '', ...(match?.payments && { payments: [...match.payments] }) });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Adds (+1) or removes (−1) one sale of `product`/`payment` on `day`. Returns a new event; the input is unchanged. */
export function adjustCount(event: PastEvent, day: number, product: string, payment: string, delta: 1 | -1): PastEvent {
  const daySales = splitDays(event.sales, event.dayBreaks)[day] ?? [];
  const matches = daySales.filter((sale) => sale.product === product && (delta === 1 || sale.payment === payment));
  const latest = matches.reduce<SaleRecord | null>((last, sale) => (!last || time(sale.timestamp) >= time(last.timestamp) ? sale : last), null);

  if (delta === -1) {
    if (!latest) return event;
    const index = event.sales.indexOf(latest);
    return { ...event, sales: event.sales.filter((_, i) => i !== index) };
  }

  const priced = latest ?? event.products.find((item) => item.name === product);
  if (!priced) return event;
  // Inside the day: just before its End day, or after everything else for the last day (but not after the event ended).
  const end = event.dayBreaks[day];
  const latestTime = Math.max(time(event.startedAt), ...event.dayBreaks.map(time), ...event.sales.map((sale) => time(sale.timestamp)));
  const timestamp = new Date(end !== undefined ? time(end) - 1 : Math.min(latestTime + 1, time(event.endedAt)));
  return { ...event, sales: [...event.sales, { product, price: priced.price, cost: priced.cost, payment, timestamp }] };
}
