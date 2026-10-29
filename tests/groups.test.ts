// Product groups: naming, Sell tiles, shared colour/payments, unique names, reports and backups unchanged. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBackup, parseBackup } from '../src/backup.ts';
import { eventSummary } from '../src/events.ts';
import { groupedName, groupTiles, nameTaken, syncGroup, variantLabel } from '../src/groups.ts';
import type { Product, SaleRecord } from '../src/types.ts';

test('report name is "Group Variant" unless the variant already starts with the group', () => {
  assert.equal(groupedName('Poster', 'Poster'), 'Poster');
  assert.equal(groupedName('Poster', 'poster'), 'poster');
  assert.equal(groupedName('Poster', 'Bundle'), 'Poster Bundle');
  assert.equal(groupedName('Poster', 'A3'), 'Poster A3');
  assert.equal(groupedName('Poster', 'POSTER set'), 'POSTER set');
});

test('the group counts as a prefix only as a whole word; no group or no variant keeps the other', () => {
  assert.equal(groupedName('Poster', 'Posters'), 'Poster Posters');
  assert.equal(groupedName('', 'Mug'), 'Mug');
  assert.equal(groupedName('Poster', ''), 'Poster');
});

const product = (name: string, group?: string, extra: Partial<Product> = {}): Product => ({ id: name, name, price: 30000, cost: 10000, color: '#f76495', ...(group && { group }), ...extra });

test('the Sell row shows the variant as typed', () => {
  assert.equal(variantLabel(product('Poster A3', 'Poster')), 'A3');
  assert.equal(variantLabel(product('POSTER set', 'Poster')), 'POSTER set');
  assert.equal(variantLabel(product('Poster', 'Poster')), 'Poster');
  assert.equal(variantLabel(product('Mug')), 'Mug');
});

test('a group is one tile at its first variant, whatever the case of its name', () => {
  const tiles = groupTiles([product('Poster A3', 'Poster'), product('Mug'), product('poster A4', 'poster'), product('Sticker')]);
  assert.deepEqual(tiles.map((tile) => tile.map((item) => item.name)), [['Poster A3', 'poster A4'], ['Mug'], ['Sticker']]);
});

test('the group colour and payments reach every variant, and nothing else', () => {
  const list = [product('Poster A3', 'Poster'), product('Poster A4', 'poster'), product('Mug')];
  syncGroup(list, 'Poster', '#4f6eff', ['Cash']);
  assert.deepEqual(list.map((item) => [item.color, item.payments]), [['#4f6eff', ['Cash']], ['#4f6eff', ['Cash']], ['#f76495', undefined]]);
});

test('names are unique ignoring case; a product keeps its own name', () => {
  const list = [product('Poster Bundle'), product('Mug')];
  assert.equal(nameTaken(groupedName('Poster', 'Bundle'), list), true);
  assert.equal(nameTaken('mug', list), true);
  assert.equal(nameTaken('MUG', list, 'Mug'), false);
  assert.equal(nameTaken('Sticker', list), false);
});

test('a grouped variant sums exactly like the same product without a group', () => {
  const sales: SaleRecord[] = [1, 2, 3].map((n) => ({ product: 'Poster A3', productId: 'p', price: 30000, cost: 10000, payment: 'Cash', timestamp: new Date(2026, 9, 25, n) }));
  const grouped = eventSummary(sales, [{ id: 'x', name: 'Print', amount: 5000, productIds: ['p'] }], [product('Poster A3', 'Poster', { id: 'p' })]);
  const plain = eventSummary(sales, [{ id: 'x', name: 'Print', amount: 5000, productIds: ['p'] }], [product('Poster A3', undefined, { id: 'p' })]);
  assert.deepEqual(grouped, plain);
});

test('backups keep the group; old products without one still load; a damaged group is rejected', () => {
  const stored = new Map([['cntrProducts', JSON.stringify([product('Poster A3', 'Poster'), product('Mug')])]]);
  const parsed = parseBackup(JSON.stringify(buildBackup(stored)));
  assert.ok(parsed.ok);
  assert.equal(parsed.values.get('cntrProducts'), stored.get('cntrProducts'));
  for (const group of [42, 'x'.repeat(1001)]) {
    const bad = buildBackup(new Map([['cntrProducts', JSON.stringify([{ ...product('Poster A3'), group }])]]));
    assert.equal(parseBackup(JSON.stringify(bad)).ok, false, String(group).slice(0, 10));
  }
});
