// Numbers behind the Highlights card of an ended event's report. Pure maths: the screen turns them into sentences.
import { eventSummary, splitDays, withLinkedCosts } from './events.ts';
import type { PastEvent, SaleRecord } from './types.ts';

const one = (value: number) => Math.round(value * 10) / 10;
const share = (part: number, whole: number) => (whole ? one((part / whole) * 100) : 0);

/** Count, revenue and item cost per key. */
function tally(sales: SaleRecord[], key: (sale: SaleRecord) => string) {
  const map = new Map<string, { name: string; count: number; revenue: number; cost: number }>();
  for (const sale of sales) {
    const name = key(sale);
    const entry = map.get(name) ?? { name, count: 0, revenue: 0, cost: 0 };
    entry.count += 1;
    entry.revenue += sale.price;
    entry.cost += sale.cost;
    map.set(name, entry);
  }
  return [...map.values()];
}

export function eventHighlights(event: PastEvent) {
  const { revenue, productProfit, expenses, net, count: salesCount } = eventSummary(event.sales, event.expenses, event.products);
  const sales = withLinkedCosts(event.sales, event.expenses, event.products);
  // Product profit per sale: how many sales cover an amount. Null when there is nothing to divide by.
  const perSale = salesCount && productProfit > 0 ? productProfit / salesCount : 0;
  const salesToCover = (amount: number) => (perSale ? Math.ceil(amount / perSale) : null);

  const dayLists = splitDays(sales, event.dayBreaks);
  const days = dayLists.map((daySales, index) => {
    const dayRevenue = daySales.reduce((sum, sale) => sum + sale.price, 0);
    return {
      day: index + 1,
      count: daySales.length,
      revenue: dayRevenue,
      profit: dayRevenue - daySales.reduce((sum, sale) => sum + sale.cost, 0),
      avgSale: daySales.length ? Math.round(dayRevenue / daySales.length) : 0,
    };
  });
  const selling = days.filter((day) => day.count > 0);
  const best = selling.reduce((top, day) => (day.revenue > top.revenue ? day : top), selling[0]);
  const before = selling.filter((day) => day.day < best?.day).pop();
  // Null when the earlier day had nothing to compare with (e.g. only free items), so a percentage is never Infinity.
  const change = (now: number, was: number) => (was ? Math.round(((now - was) / was) * 100) : null);
  // Null when the best day is the first day with sales: there is no earlier day to compare with.
  const bestDayChange = best && before ? { day: best.day, vsDay: before.day, salesPct: change(best.count, before.count), revenuePct: change(best.revenue, before.revenue) } : null;

  const groupOf = (sale: SaleRecord) => event.products.find((product) => product.name === sale.product)?.group || sale.product;
  const top = tally(sales, groupOf).sort((a, b) => b.revenue - a.revenue)[0];
  const topGroup = top ? { name: top.name, count: top.count, revenue: top.revenue, share: share(top.revenue, revenue) } : null;

  const big = event.expenses.reduce<(typeof event.expenses)[number] | null>((max, cost) => (!max || cost.amount > max.amount ? cost : max), null);
  const biggestExpense = big ? { name: big.name, amount: big.amount, shareOfExpenses: share(big.amount, expenses), shareOfRevenue: share(big.amount, revenue), salesToCover: salesToCover(big.amount) } : null;

  // Busiest clock half-hour (10:00-10:30, local time) across all days. Null when every sale is in one, or when the top count is 1 or tied: nothing stands out.
  const windows = dayLists.flatMap((daySales, index) => {
    const byStart = new Map<number, { day: number; start: Date; count: number; revenue: number }>();
    for (const sale of daySales) {
      const start = new Date(sale.timestamp);
      start.setMinutes(start.getMinutes() < 30 ? 0 : 30, 0, 0);
      const entry = byStart.get(start.getTime()) ?? { day: index + 1, start, count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += sale.price;
      byStart.set(start.getTime(), entry);
    }
    return [...byStart.values()].sort((a, b) => a.start.getTime() - b.start.getTime());
  });
  const busiest = windows.reduce<(typeof windows)[number] | null>((top, w) => (!top || w.count > top.count ? w : top), null);

  return {
    net, revenue, productProfit, expenses, salesCount,
    breakEvenSales: net < 0 ? salesToCover(-net) : null,
    days, bestDayChange, topGroup, biggestExpense,
    busiestWindow: windows.length > 1 && busiest && busiest.count > 1 && windows.filter((w) => w.count === busiest.count).length === 1 ? busiest : null,
  };
}
