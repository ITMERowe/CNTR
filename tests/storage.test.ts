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

const fullData = new Map([
  ['cntrSales', SALES],
  ['cntrProducts', PRODUCTS],
  ['cntrProductHistory', PRODUCTS],
  ['cntrEventCosts', JSON.stringify([{ id: 'c1', name: 'Booth', amount: 750000 }])],
  ['cntrSavedReports', JSON.stringify([{ id: 'r1', name: 'Day 1, "Comic"', createdAt: '2026-10-25T10:00:00.000Z', type: 'sales', products: JSON.parse(PRODUCTS), sales: JSON.parse(SALES), eventCosts: [] }])],
  ['cntrImportedEventReport', JSON.stringify({ sales: JSON.parse(SALES), products: JSON.parse(PRODUCTS) })],
  ['cntrSettings', JSON.stringify({ currency: 'IDR', compactMoney: true })],
]);

test('backup round trip restores exactly the stored values', () => {
  const parsed = parseBackup(JSON.stringify(buildBackup(fullData)));
  assert.ok(parsed.ok);
  for (const [key, value] of fullData) assert.equal(parsed.values.get(key), value, key);
  assert.deepEqual({ ...parsed.summary, exportedAt: '' }, { exportedAt: '', sales: 1, savedReports: 1, products: 1 });
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

test('a backup with one damaged record is rejected whole, naming the problem', () => {
  const backup = buildBackup(fullData);
  (backup.data.cntrSales as { price: unknown }[])[0].price = 'lots';
  const parsed = parseBackup(JSON.stringify(backup));
  assert.ok(!parsed.ok);
  assert.match(parsed.error, /Sales: item 1/);

  const reportBackup = buildBackup(fullData);
  (reportBackup.data.cntrSavedReports as { sales: { timestamp: string }[] }[])[0].sales[0].timestamp = 'yesterday';
  const reportParsed = parseBackup(JSON.stringify(reportBackup));
  assert.ok(!reportParsed.ok);
  assert.match(reportParsed.error, /Saved report 1 sales/);
});

test('CSV lists current and saved sales, quoting commas and quotes', () => {
  const csv = salesCsv(buildBackup(fullData));
  assert.ok(csv.startsWith('﻿Report,Report type,Time,Product,Payment,Price,Cost\r\n'));
  assert.match(csv, /^Current sales,live,2026-10-26T10:00:00.000Z,Gacha,Cash,25000,12000\r$/m);
  assert.match(csv, /^"Day 1, ""Comic""",sales,/m);
});
