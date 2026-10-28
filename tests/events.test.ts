// Event maths: days, totals, History edits. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adjustCount, breakTime, defaultEventName, eventSummary, formatDay, saleTime, snapshotProducts, splitDays, todaySales } from '../src/events.ts';
import { setLanguage } from '../src/i18n.ts';
import type { PastEvent, SaleRecord } from '../src/types.ts';

const sale = (product: string, iso: string, payment = 'Cash', price = 25000, cost = 12000): SaleRecord => ({ product, price, cost, payment, timestamp: new Date(iso) });

const T1 = '2026-10-25T03:00:00.000Z';
const BREAK = '2026-10-25T12:00:00.000Z';
const T3 = '2026-10-26T03:00:00.000Z';

function event(sales: SaleRecord[], dayBreaks: string[] = []): PastEvent {
  return {
    id: 'e1',
    name: 'Comifuro',
    startedAt: T1,
    endedAt: '2026-10-26T12:00:00.000Z',
    dayBreaks,
    products: [{ name: 'Poster', price: 30000, cost: 10000, color: '#f76495' }],
    sales,
    expenses: [],
  };
}

test('splitDays puts each sale in the day before the next break', () => {
  const days = splitDays([sale('Poster', T1), sale('Poster', T3)], [BREAK]);
  assert.deepEqual(days.map((day) => day.map((s) => s.timestamp.toISOString())), [[T1], [T3]]);
});

test('splitDays without breaks is one day, and todaySales is the last day', () => {
  const sales = [sale('Poster', T1), sale('Poster', T3)];
  assert.equal(splitDays(sales, []).length, 1);
  assert.deepEqual(todaySales(sales, [BREAK]).map((s) => s.timestamp.toISOString()), [T3]);
  assert.deepEqual(todaySales(sales, ['2026-10-27T00:00:00.000Z']), []);
});

test('eventSummary: net profit is product profit minus expenses', () => {
  const summary = eventSummary([sale('Gacha', T1, 'Cash', 25000, 12000), sale('Cheki', T1, 'QRIS', 15000, 5000)], [{ id: 'x', name: 'Booth', amount: 10000 }]);
  assert.deepEqual(summary, { revenue: 40000, productProfit: 23000, expenses: 10000, net: 13000, count: 2 });
});

test('adjustCount +1 copies that day\'s latest price and lands inside that day', () => {
  const before = event([sale('Poster', T1, 'Cash', 28000, 9000), sale('Poster', T3, 'Cash', 35000, 9000)], [BREAK]);
  const after = adjustCount(before, 0, 'Poster', 'Cash', 1);
  const days = splitDays(after.sales, after.dayBreaks);
  assert.equal(days[0].length, 2);
  assert.equal(days[0][1].price, 28000);
  assert.equal(days[1].length, 1);
  assert.equal(before.sales.length, 2, 'input not mutated');
});

test('adjustCount +1 on a day without that product uses the snapshot price', () => {
  const after = adjustCount(event([sale('Gacha', T1)], [BREAK]), 1, 'Poster', 'QRIS', 1);
  const added = splitDays(after.sales, after.dayBreaks)[1];
  assert.equal(added.length, 1);
  assert.deepEqual([added[0].product, added[0].payment, added[0].price, added[0].cost], ['Poster', 'QRIS', 30000, 10000]);
});

test('adjustCount +1 on the last day is never timed after the event ended', () => {
  const ended = '2026-10-26T12:00:00.000Z';
  const after = adjustCount(event([sale('Poster', ended)]), 0, 'Poster', 'Cash', 1);
  assert.ok(after.sales.every((s) => s.timestamp.getTime() <= Date.parse(ended)));
});

test('adjustCount -1 removes one matching sale on that day only, then does nothing', () => {
  const start = event([sale('Poster', T1), sale('Poster', T3)], [BREAK]);
  const once = adjustCount(start, 1, 'Poster', 'Cash', -1);
  assert.deepEqual(once.sales.map((s) => s.timestamp.toISOString()), [T1]);
  const twice = adjustCount(once, 1, 'Poster', 'Cash', -1);
  assert.deepEqual(twice.sales, once.sales);
});

test('snapshotProducts keeps a product that is no longer known, with no colour', () => {
  const products = snapshotProducts([sale('Gone', T1, 'Cash', 5000, 1000), sale('Poster', T1, 'Cash', 30000, 10000)], [{ name: 'Poster', price: 1, cost: 1, color: '#123456' }]);
  assert.deepEqual(products, [
    { name: 'Gone', price: 5000, cost: 1000, color: '' },
    { name: 'Poster', price: 30000, cost: 10000, color: '#123456' },
  ]);
});

test('defaultEventName uses the first sale\'s date, else now', () => {
  const now = new Date('2026-11-01T05:00:00.000Z');
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  assert.equal(defaultEventName([sale('Poster', T1)], now), `Event ${date(T1)}`);
  assert.equal(defaultEventName([], now), `Event ${date(now.toISOString())}`);
});

test('a sale is never stamped before the last End day, even if the clock went back', () => {
  const now = new Date('2026-10-25T11:50:00.000Z'); // clock corrected 10 minutes back after End day at 12:00
  const stamped = saleTime(now, [BREAK]);
  assert.ok(stamped.getTime() > new Date(BREAK).getTime());
  assert.equal(todaySales([sale('Poster', T1), { ...sale('Poster', T1), timestamp: stamped }], [BREAK]).length, 1);
  assert.equal(saleTime(new Date(T3), [BREAK]).toISOString(), T3, 'a normal clock is left alone');
});

test('End day is never stamped before today\'s last sale, so those sales end up in the ended day', () => {
  const late = sale('Poster', T3);
  const stamped = breakTime(new Date(T1), [late], []); // clock behind the last sale
  assert.equal(splitDays([late], [stamped])[0].length, 1);
  assert.equal(breakTime(new Date(T3), [sale('Poster', T1)], []), T3);
});

test('snapshotProducts keeps each product\'s payment methods', () => {
  const [poster] = snapshotProducts([sale('Poster', T1)], [{ name: 'Poster', price: 1, cost: 1, color: '#123456', payments: ['Transfer'] }]);
  assert.deepEqual(poster.payments, ['Transfer']);
});

test('dates and the default event name follow the app language, not the phone', () => {
  setLanguage('en');
  assert.equal(formatDay('2026-10-05T12:00:00.000Z'), '5 Oct 2026');
  setLanguage('id');
  assert.equal(formatDay('2026-10-05T12:00:00.000Z'), '5 Okt 2026');
  assert.equal(defaultEventName([], new Date('2026-10-05T12:00:00.000Z')), 'Acara 5 Okt 2026');
  setLanguage('en');
});
