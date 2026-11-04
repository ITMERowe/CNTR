// Report maths. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildProductBreakdown, marginPercent, roundedShares, totals } from '../src/reports.ts';
import type { Product, SaleRecord } from '../src/types.ts';

const sale = (product: string, price: number, cost: number): SaleRecord => ({ product, price, cost, payment: 'Cash', timestamp: '2026-10-25T03:00:00.000Z' });
const poster: Product = { id: 'a', name: 'Poster', price: 50000, cost: 10000, color: '#111111' };

test('totals add up revenue and profit; no sales is zero', () => {
  assert.deepEqual(totals([sale('Poster', 50000, 10000), sale('Poster', 40000, 10000)]), { revenue: 90000, profit: 70000 });
  assert.deepEqual(totals([]), { revenue: 0, profit: 0 });
});

test('margin of no revenue is 0, not a division by zero', () => {
  assert.equal(marginPercent(0, 0), 0);
  assert.equal(marginPercent(200, 50), 25);
});

test('the breakdown keeps products that sold but left the list, so it matches revenue', () => {
  const rows = buildProductBreakdown([sale('Poster', 50000, 10000), sale('Old sticker', 5000, 1000)], [poster], () => '#222222');
  assert.deepEqual(rows.map((row) => [row.name, row.color, row.count, row.revenue, row.profit]), [
    ['Poster', '#111111', 1, 50000, 40000],
    ['Old sticker', '#222222', 1, 5000, 4000],
  ]);
  assert.equal(rows.reduce((sum, row) => sum + row.revenue, 0), 55000);
});

test('rounded shares always total 100', () => {
  assert.deepEqual(roundedShares([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(roundedShares([990, 10]), [99, 1]);
  assert.equal(roundedShares([125, 125, 125, 625]).reduce((a, b) => a + b), 100);
  assert.deepEqual(roundedShares([0, 7]), [0, 100]);
});

test('rounded shares of nothing are all 0', () => {
  assert.deepEqual(roundedShares([0, 0]), [0, 0]);
  assert.deepEqual(roundedShares([]), []);
});
