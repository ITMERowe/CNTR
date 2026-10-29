// Product groups: naming, Sell tiles, shared colour/payments, unique names, reports and backups unchanged. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBackup, parseBackup } from '../src/backup.ts';
import { eventSummary } from '../src/events.ts';
import { groupedName, groupTiles, nameTaken, planGroup, syncGroup, ungroup, variantLabel } from '../src/groups.ts';
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

// The editor's group form: one save turns the rows into products, all or nothing.
const shared = { color: '#4f6eff', payments: ['Cash'] };
const row = (variant: string, price = 30000, id?: string) => ({ variant, price, cost: 10000, ...(id && { id }) });

test('a new group makes one product per row, named "Group Variant", with the group colour and payments; blank rows are skipped', () => {
  const plan = planGroup('Poster', [row('A3'), row('A4', 25000), { variant: ' ', price: 0, cost: 0 }], shared, [], [product('Mug')]);
  assert.ok(plan.ok);
  assert.deepEqual(plan.save.map((p) => [p.name, p.group, p.price, p.color, p.payments?.join()]), [['Poster A3', 'Poster', 30000, '#4f6eff', 'Cash'], ['Poster A4', 'Poster', 25000, '#4f6eff', 'Cash']]);
  assert.ok(plan.save.every((p) => p.id) && plan.save[0].id !== plan.save[1].id);
  assert.deepEqual(plan.remove, []);
});

test('editing a group keeps the variant ids, renames them with the group, and removes the rows taken out', () => {
  const members = [product('Poster A3', 'Poster', { id: 'a3' }), product('Poster A4', 'Poster', { id: 'a4' })];
  const plan = planGroup('Print', [row('A3', 32000, 'a3'), row('A5')], shared, members, []);
  assert.ok(plan.ok);
  assert.deepEqual(plan.save.map((p) => [p.id === 'a3' ? 'a3' : 'new', p.name, p.group, p.price]), [['a3', 'Print A3', 'Print', 32000], ['new', 'Print A5', 'Print', 30000]]);
  assert.deepEqual(plan.remove.map((p) => p.id), ['a4']);
});

test('refused: no group name, no variant, two variants with one name, a name or group another product has', () => {
  const others = [product('Poster Bundle'), product('Sticker A6', 'Sticker')];
  const error = (group: string, rows: ReturnType<typeof row>[]) => { const plan = planGroup(group, rows, shared, [], others); return plan.ok ? 'ok' : `${plan.error}:${plan.name ?? ''}`; };
  assert.equal(error(' ', [row('A3')]), 'groupName:');
  assert.equal(error('Poster', [{ variant: '', price: 0, cost: 0 }]), 'noVariant:');
  assert.equal(error('Poster', [row('A3'), row('a3')]), 'twice:Poster a3');
  assert.equal(error('Poster', [row('bundle')]), 'nameTaken:Poster bundle');
  assert.equal(error('sticker', [row('A5')]), 'groupTaken:sticker');
});

test('an unchanged name passes even if older data holds it in another case; the long real name is capped', () => {
  const members = [product('Poster A3', 'Poster', { id: 'a3' })];
  assert.ok(planGroup('Poster', [row('A3', 30000, 'a3')], shared, members, [product('poster a3')]).ok);
  const long = planGroup('Poster', [row('x'.repeat(1200))], shared, [], []);
  assert.ok(long.ok && long.save[0].name.length === 1000);
});

test('switching a product to a group and back: an empty variant keeps the group name; only one variant can ungroup', () => {
  const plan = planGroup('Mug', [row('', 40000, 'm'), row('Big')], shared, [product('Mug', undefined, { id: 'm' })], []);
  assert.ok(plan.ok);
  assert.deepEqual(plan.save.map((p) => p.name), ['Mug', 'Mug Big']);
  assert.deepEqual(ungroup('Poster', [row('A3', 30000, 'a3'), { variant: '', price: 0, cost: 0 }]), { id: 'a3', name: 'Poster A3', price: 30000, cost: 10000 });
  assert.equal(ungroup('Poster', [row('A3'), row('A4')]), null);
});
