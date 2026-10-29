// Run with `npm test` (Node's built-in runner; no extra dependencies).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBackup, parseBackup, salesCsv } from '../src/backup.ts';
import type { KvStore } from '../src/kv.ts';
import { MIGRATED_FLAG, migrateFromLegacy } from '../src/migrate.ts';

/** In-memory store; `failWrites` makes the next n writes throw, like a full disk or a killed app. */
function memoryStore(initial: [string, string][] = []) {
  const data = new Map(initial);
  const s = {
    data,
    failWrites: 0,
    corruptReads: false,
    async readAll() {
      const copy = new Map(data);
      if (s.corruptReads) for (const key of copy.keys()) copy.set(key, 'garbled');
      return copy;
    },
    async write(changes: Map<string, string | null>) {
      if (s.failWrites > 0) {
        s.failWrites--;
        throw new Error('disk full');
      }
      for (const [key, value] of changes) value === null ? data.delete(key) : data.set(key, value);
    },
  };
  return s satisfies KvStore;
}

const legacyOf = (entries: Record<string, string>) => ({ getItem: (key: string) => entries[key] ?? null });

const SALES = JSON.stringify([{ product: 'Gacha', price: 25000, cost: 12000, payment: 'Cash', timestamp: '2026-10-26T10:00:00.000Z' }]);
const PRODUCTS = JSON.stringify([{ name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' }]);

test('migration copies legacy data, verifies it, then sets the flag', async () => {
  const legacy = { cntrSales: SALES, cntrProducts: PRODUCTS };
  const store = memoryStore();
  assert.equal(await migrateFromLegacy(store, legacyOf(legacy)), 'copied');
  assert.equal(store.data.get('cntrSales'), SALES);
  assert.equal(store.data.get('cntrProducts'), PRODUCTS);
  assert.ok(store.data.has(MIGRATED_FLAG));
});

test('migration is idempotent: a second run changes nothing, even after new sales', async () => {
  const store = memoryStore();
  await migrateFromLegacy(store, legacyOf({ cntrSales: SALES }));
  const newer = JSON.stringify([...JSON.parse(SALES), ...JSON.parse(SALES)]);
  store.data.set('cntrSales', newer); // the app recorded another sale in the database
  assert.equal(await migrateFromLegacy(store, legacyOf({ cntrSales: SALES })), 'already-done');
  assert.equal(store.data.get('cntrSales'), newer);
});

test('an interrupted migration sets no flag and succeeds on the next launch without duplicates', async () => {
  const store = memoryStore();
  store.failWrites = 1;
  await assert.rejects(migrateFromLegacy(store, legacyOf({ cntrSales: SALES })), /disk full/);
  assert.ok(!store.data.has(MIGRATED_FLAG));
  assert.equal(await migrateFromLegacy(store, legacyOf({ cntrSales: SALES })), 'copied');
  assert.equal(store.data.get('cntrSales'), SALES);
});

test('migration that cannot be verified throws and leaves the flag unset', async () => {
  const store = memoryStore();
  store.corruptReads = true;
  await assert.rejects(migrateFromLegacy(store, legacyOf({ cntrSales: SALES })), /did not match/);
  store.corruptReads = false;
  assert.ok(!store.data.has(MIGRATED_FLAG));
});

test('a failure while setting the flag is retried next launch, replacing rather than duplicating', async () => {
  const store = memoryStore();
  const legacy = legacyOf({ cntrSales: SALES });
  const write = store.write.bind(store);
  let calls = 0;
  store.write = async (changes) => {
    if (++calls === 2) throw new Error('killed'); // dies after copying, before the flag
    return write(changes);
  };
  await assert.rejects(migrateFromLegacy(store, legacy));
  assert.equal(await migrateFromLegacy(store, legacy), 'copied');
  assert.equal(store.data.get('cntrSales'), SALES);
});

test('fresh install: nothing to copy, flag set', async () => {
  const store = memoryStore();
  assert.equal(await migrateFromLegacy(store, legacyOf({})), 'nothing-to-copy');
  assert.ok(store.data.has(MIGRATED_FLAG));
});

test('migration never changes the legacy data', async () => {
  const legacy = { cntrSales: SALES };
  const before = JSON.stringify(legacy);
  await migrateFromLegacy(memoryStore(), legacyOf(legacy));
  assert.equal(JSON.stringify(legacy), before);
});

const PAST_EVENT = {
  id: 'e1',
  name: 'Day 1, "Comic"',
  startedAt: '2026-10-25T02:00:00.000Z',
  endedAt: '2026-10-26T12:00:00.000Z',
  dayBreaks: ['2026-10-25T12:00:00.000Z'],
  products: JSON.parse(PRODUCTS),
  sales: [
    { product: 'Gacha', price: 25000, cost: 12000, payment: 'Cash', timestamp: '2026-10-25T03:00:00.000Z' },
    { product: 'Gacha', price: 25000, cost: 12000, payment: 'QRIS', timestamp: '2026-10-26T03:00:00.000Z' },
  ],
  expenses: [{ id: 'c2', name: 'Booth', amount: 500000 }],
};

const fullData = new Map([
  ['cntrSales', SALES],
  ['cntrProducts', PRODUCTS],
  ['cntrProductHistory', PRODUCTS],
  ['cntrEventCosts', JSON.stringify([{ id: 'c1', name: 'Booth', amount: 750000 }])],
  ['cntrLiveEvent', JSON.stringify({ id: 'live', name: null, startedAt: '2026-10-26T09:00:00.000Z', dayBreaks: [] })],
  ['cntrEvents', JSON.stringify([PAST_EVENT])],
  ['cntrSettings', JSON.stringify({ currency: 'IDR', compactMoney: true })],
]);

test('backup round trip restores exactly the stored values', () => {
  const parsed = parseBackup(JSON.stringify(buildBackup(fullData)));
  assert.ok(parsed.ok);
  for (const [key, value] of fullData) assert.equal(parsed.values.get(key), value, key);
  assert.deepEqual({ ...parsed.summary, exportedAt: '' }, { exportedAt: '', sales: 1, events: 1, products: 1 });
});

test('an old backup (saved reports, no events) restores its live sales and expenses and ignores saved reports', () => {
  const old = {
    app: 'CNTR',
    format: 1,
    exportedAt: '2026-10-26T10:00:00.000Z',
    data: {
      cntrSales: JSON.parse(SALES),
      cntrEventCosts: [{ id: 'c1', name: 'Booth', amount: 750000 }],
      cntrSavedReports: [{ id: 'r1', name: 'Old', createdAt: '2026-10-25T10:00:00.000Z', type: 'sales', products: [], sales: [], eventCosts: [] }],
      cntrImportedEventReport: null,
    },
  };
  const parsed = parseBackup(JSON.stringify(old));
  assert.ok(parsed.ok);
  assert.equal(parsed.values.get('cntrSales'), SALES);
  assert.ok(parsed.values.has('cntrEventCosts'));
  assert.ok(!parsed.values.has('cntrSavedReports'));
  assert.ok(!parsed.values.has('cntrImportedEventReport'));
});

test('malformed, truncated or foreign files are rejected', () => {
  const good = JSON.stringify(buildBackup(fullData));
  const cases: [string, RegExp][] = [
    ['not json at all', /not valid JSON/],
    [good.slice(0, good.length / 2), /not valid JSON/], // interrupted copy / cut-off file
    [JSON.stringify({ hello: 'world' }), /not a CNTR backup/],
    [JSON.stringify({ ...buildBackup(fullData), format: 99 }), /newer version/],
    ['', /not valid JSON/],
  ];
  for (const [text, message] of cases) {
    const parsed = parseBackup(text);
    assert.ok(!parsed.ok, text.slice(0, 30));
    assert.match(parsed.error, message);
  }
});

test('a name longer than the inputs allow is rejected; one at the limit restores', () => {
  const backup = buildBackup(fullData);
  const products = backup.data.cntrProducts as { name: string }[];
  products[0].name = 'x'.repeat(1000);
  assert.ok(parseBackup(JSON.stringify(backup)).ok);
  products[0].name = 'x'.repeat(1001);
  const parsed = parseBackup(JSON.stringify(backup));
  assert.ok(!parsed.ok);
  assert.match(parsed.error, /Products: item 1/);
});

test('a backup with one damaged record is rejected whole, naming the problem', () => {
  const backup = buildBackup(fullData);
  (backup.data.cntrSales as { price: unknown }[])[0].price = 'lots';
  const parsed = parseBackup(JSON.stringify(backup));
  assert.ok(!parsed.ok);
  assert.match(parsed.error, /Sales: item 1/);

  const eventBackup = buildBackup(fullData);
  (eventBackup.data.cntrEvents as { sales: { timestamp: string }[] }[])[0].sales[0].timestamp = 'yesterday';
  const eventParsed = parseBackup(JSON.stringify(eventBackup));
  assert.ok(!eventParsed.ok);
  assert.match(eventParsed.error, /Event 1 sales/);

  const liveBackup = buildBackup(fullData);
  (liveBackup.data.cntrLiveEvent as { dayBreaks: unknown }).dayBreaks = 'monday';
  const liveParsed = parseBackup(JSON.stringify(liveBackup));
  assert.ok(!liveParsed.ok);
  assert.match(liveParsed.error, /Current event/);
});

test('CSV lists the live event and past events with day numbers, quoting commas and quotes', () => {
  const csv = salesCsv(buildBackup(fullData));
  assert.ok(csv.startsWith('\uFEFFEvent,Day,Time,Product,Payment,Price,Cost\r\n'));
  assert.match(csv, /^Current event,1,2026-10-26T10:00:00.000Z,Gacha,Cash,25000,12000\r$/m);
  assert.match(csv, /^"Day 1, ""Comic""",1,2026-10-25T03:00:00.000Z,Gacha,Cash,/m);
  assert.match(csv, /^"Day 1, ""Comic""",2,2026-10-26T03:00:00.000Z,Gacha,QRIS,/m);
});

test('CSV neutralises cells that start like a formula', () => {
  const sale = (product: string) => ({ product, price: 1000, cost: -5, payment: 'Cash', timestamp: '2026-10-26T10:00:00.000Z' });
  const data = new Map([
    ['cntrSales', JSON.stringify([sale('=HYPERLINK("http://x","y")'), sale('+cmd'), sale('-1'), sale('@a')])],
    ['cntrLiveEvent', JSON.stringify({ id: 'live', name: '\tTabbed', startedAt: '2026-10-26T09:00:00.000Z', dayBreaks: [] })],
  ]);
  const csv = salesCsv(buildBackup(data));
  assert.match(csv, /,"'=HYPERLINK\(""http:\/\/x"",""y""\)",Cash,/);
  assert.match(csv, /,'\+cmd,Cash,1000,-5\r$/m);
  assert.match(csv, /,'-1,Cash,/);
  assert.match(csv, /,'@a,Cash,/);
  assert.match(csv, /^'\tTabbed,1,/m);
});

test('products with payment methods restore; a damaged method list is rejected', () => {
  const withMethods = buildBackup(new Map([['cntrProducts', JSON.stringify([{ name: 'Poster', price: 1, cost: 0, color: '#123456', payments: ['Cash', 'Card'] }])]]));
  assert.ok(parseBackup(JSON.stringify(withMethods)).ok);
  for (const payments of ['Cash', [], ['Cash', 'QRIS', 'Card'], [7]]) {
    const bad = buildBackup(new Map([['cntrProducts', JSON.stringify([{ name: 'Poster', price: 1, cost: 0, color: '#123456', payments }])]]));
    const parsed = parseBackup(JSON.stringify(bad));
    assert.ok(!parsed.ok, JSON.stringify(payments));
    assert.match(parsed.error, /Products: item 1/);
  }
});

test('expenses linked to products round-trip; old ones without links still load; a damaged link list is rejected', () => {
  const linked = new Map(fullData);
  linked.set('cntrProducts', JSON.stringify([{ id: 'p1', name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' }]));
  linked.set('cntrEventCosts', JSON.stringify([{ id: 'c1', name: 'Print', amount: 100000, productIds: ['p1'] }, { id: 'c3', name: 'Booth', amount: 750000 }]));
  const parsed = parseBackup(JSON.stringify(buildBackup(linked)));
  assert.ok(parsed.ok);
  for (const [key, value] of linked) assert.equal(parsed.values.get(key), value, key);
  // The CSV's cost is the one the reports count: none for the linked product (old sale matched by name).
  assert.match(salesCsv(buildBackup(linked)), /^Current event,1,2026-10-26T10:00:00.000Z,Gacha,Cash,25000,0\r$/m);
  for (const productIds of ['p1', [1], null]) {
    const bad = buildBackup(fullData);
    bad.data.cntrEventCosts = [{ id: 'c1', name: 'Print', amount: 1, productIds }];
    assert.equal(parseBackup(JSON.stringify(bad)).ok, false, JSON.stringify(productIds));
  }
});
