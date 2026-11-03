// Highlights maths, pinned on the owner's real event (Comifuro 23). Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventHighlights } from '../src/summary.ts';
import type { PastEvent, Product, SaleRecord } from '../src/types.ts';

const catalog: [string, string | undefined, number, number][] = [
  ['Fanservice Gacha', 'Fanservice', 50000, 0], ['Fanservice Pangku', 'Fanservice', 75000, 0], ['Fanservice Whisper', 'Fanservice', 50000, 0],
  ['Fanservice Hug', 'Fanservice', 75000, 0], ['Fanservice Kabedon', 'Fanservice', 75000, 0], ['Poster', 'Poster', 50000, 0],
  ['Poster sexy', 'Poster sexy', 75000, 0], ['Poster sexy Bundle', 'Poster sexy', 150000, 0], ['Photocard', 'Photocard', 25000, 0],
  ['Photocard Bundle', 'Photocard', 50000, 0], ['Cheki', undefined, 55000, 18000],
];
const products: Product[] = catalog.map(([name, group, price, cost], i) => ({ id: `p${i}`, name, price, cost, color: '#fff', ...(group && { group }) }));

const day1: [string, number][] = [['Fanservice Gacha', 5], ['Fanservice Pangku', 4], ['Cheki', 4], ['Photocard', 4], ['Poster sexy', 3], ['Photocard Bundle', 2], ['Poster', 2], ['Fanservice Whisper', 1]];
const day2: [string, number][] = [['Cheki', 9], ['Fanservice Pangku', 8], ['Photocard Bundle', 6], ['Fanservice Gacha', 4], ['Poster sexy Bundle', 3], ['Photocard', 3], ['Fanservice Hug', 2], ['Fanservice Kabedon', 2], ['Poster sexy', 2], ['Fanservice Whisper', 1], ['Poster', 1]];

function build(rows: [string, number][], iso: string): SaleRecord[] {
  return rows.flatMap(([name, n]) => Array.from({ length: n }, () => name)).map((name, i) => {
    const product = products.find((p) => p.name === name)!;
    return { product: name, productId: product.id, price: product.price, cost: product.cost, payment: 'QRIS', timestamp: new Date(Date.parse(iso) + i * 60000) };
  });
}

const comifuro: PastEvent = {
  id: 'c23', name: 'Comifuro 23', startedAt: '2026-05-01T03:00:00.000Z', endedAt: '2026-05-02T12:00:00.000Z',
  dayBreaks: ['2026-05-01T13:00:00.000Z'], products,
  sales: [...build(day1, '2026-05-01T03:00:00.000Z'), ...build(day2, '2026-05-02T03:00:00.000Z')],
  expenses: [
    { id: 'x1', name: 'Printing', amount: 679000, productIds: ['p5', 'p6', 'p7', 'p8', 'p9', 'p0'] },
    { id: 'x2', name: 'Booth', amount: 2500000 }, { id: 'x3', name: 'Hotel', amount: 800000 }, { id: 'x4', name: 'Travel', amount: 430000 },
  ],
};
// The first 20 sales and sales 25-28 (in the order above) are cash: 24 sales, 1315000.
comifuro.sales.forEach((s, i) => { if (i < 20 || (i >= 25 && i <= 28)) s.payment = 'Cash'; });

test('fixture hits the cash and QRIS totals', () => {
  const by = (p: string) => comifuro.sales.filter((s) => s.payment === p);
  assert.deepEqual([by('Cash').length, by('Cash').reduce((n, s) => n + s.price, 0)], [24, 1315000]);
  assert.deepEqual([by('QRIS').length, by('QRIS').reduce((n, s) => n + s.price, 0)], [42, 2700000]);
});

test('Comifuro 23 highlights', () => {
  const h = eventHighlights(comifuro);
  assert.deepEqual([h.revenue, h.productProfit, h.expenses, h.net, h.salesCount], [4015000, 3781000, 4409000, -628000, 66]);
  assert.equal(h.breakEvenSales, 11);
  assert.deepEqual(h.days, [
    { day: 1, count: 25, revenue: 1345000, profit: 1273000, avgSale: 53800 },
    { day: 2, count: 41, revenue: 2670000, profit: 2508000, avgSale: 65122 },
  ]);
  // Revenue change is 98.51%, which Math.round makes 99.
  assert.deepEqual(h.bestDayChange, { day: 2, vsDay: 1, salesPct: 64, revenuePct: 99 });
  assert.deepEqual(h.topGroup, { name: 'Fanservice', count: 27, revenue: 1750000, share: 43.6 });
  assert.deepEqual(h.biggestExpense, { name: 'Booth', amount: 2500000, shareOfExpenses: 56.7, shareOfRevenue: 62.3, salesToCover: 44 });
  // Day 2's sales are a minute apart from 03:00Z: the first 30 fall in one clock half-hour (Cheki 9, Pangku 8, Photocard Bundle 6, Gacha 4, Poster sexy Bundle 3).
  assert.deepEqual(h.busiestWindow, { day: 2, start: new Date('2026-05-02T03:00:00.000Z'), count: 30, revenue: 2045000 });
});

test('profitable event has no break-even; single day has no day comparison', () => {
  const h = eventHighlights({ ...comifuro, dayBreaks: [], expenses: [] });
  assert.equal(h.breakEvenSales, null);
  assert.equal(h.bestDayChange, null);
});

test('empty event does not throw', () => {
  const h = eventHighlights({ ...comifuro, sales: [], expenses: [] });
  assert.deepEqual([h.net, h.salesCount, h.breakEvenSales, h.bestDayChange, h.topGroup, h.biggestExpense], [0, 0, null, null, null, null]);
  assert.equal(h.busiestWindow, null);
  assert.equal(eventHighlights({ ...comifuro, sales: [] }).biggestExpense?.salesToCover, null);
});
