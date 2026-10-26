// Pure report calculations, shared by the report screens and compare views.
import { eventSummary } from './events';
import type { PastEvent, Product, SaleRecord } from './types';

export interface ProductTotals {
  name: string;
  color: string;
  count: number;
  revenue: number;
  profit: number;
}

export function totals(sales: SaleRecord[]) {
  return sales.reduce(
    (acc, sale) => {
      acc.revenue += sale.price;
      acc.profit += sale.price - sale.cost;
      if (sale.payment === 'Cash') acc.cash += sale.price;
      if (sale.payment === 'QRIS') acc.qris += sale.price;
      return acc;
    },
    { revenue: 0, profit: 0, cash: 0, qris: 0 },
  );
}

export function marginPercent(revenue: number, profit: number) {
  return revenue ? (profit / revenue) * 100 : 0;
}

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

// Per-product totals for a set of sales. Products that were sold but are no longer in the
// product list (e.g. deactivated) are still included so the breakdown matches the revenue.
export function buildProductBreakdown(sales: SaleRecord[], products: Product[], colorFor: (name: string) => string = () => ''): ProductTotals[] {
  const productTotals = new Map<string, { count: number; revenue: number; profit: number }>();
  for (const sale of sales) {
    const entry = productTotals.get(sale.product) ?? { count: 0, revenue: 0, profit: 0 };
    entry.count += 1;
    entry.revenue += sale.price;
    entry.profit += sale.price - sale.cost;
    productTotals.set(sale.product, entry);
  }

  const known = new Set(products.map((product) => product.name));
  const orphanProducts = [...productTotals.keys()]
    .filter((name) => !known.has(name))
    .map((name) => ({ name, color: colorFor(name) }));

  return [...products, ...orphanProducts].map((product) => ({
    name: product.name,
    color: product.color,
    ...(productTotals.get(product.name) ?? { count: 0, revenue: 0, profit: 0 }),
  }));
}

export function getEventSummary(event: PastEvent) {
  const { revenue, productProfit, expenses, net, count } = eventSummary(event.sales, event.expenses);
  return {
    revenue,
    profit: productProfit,
    net,
    margin: marginPercent(revenue, productProfit),
    salesCount: count,
    expenses,
    breakdown: buildProductBreakdown(event.sales, event.products).filter((product) => product.count > 0),
  };
}

/** Units sold per product in two events, busiest products first. */
export function compareProductCounts(left: PastEvent, right: PastEvent, limit = 6) {
  const leftCounts = new Map(getEventSummary(left).breakdown.map((item) => [item.name, item.count]));
  const rightCounts = new Map(getEventSummary(right).breakdown.map((item) => [item.name, item.count]));
  return [...new Set([...leftCounts.keys(), ...rightCounts.keys()])]
    .map((name) => ({ name, leftCount: leftCounts.get(name) ?? 0, rightCount: rightCounts.get(name) ?? 0 }))
    .sort((a, b) => b.leftCount + b.rightCount - (a.leftCount + a.rightCount))
    .slice(0, limit);
}
