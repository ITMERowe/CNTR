import { localStorageStore, openSqliteStore, type KvStore } from './kv';
import { DATA_KEYS, migrateFromLegacy } from './migrate';
import type { AppSettings, Currency, EventCost, ImportedEventReport, Product, SaleRecord, SavedReport } from './types';

export const PRODUCT_STORAGE_KEY = 'cntrProducts';
export const PRODUCT_HISTORY_STORAGE_KEY = 'cntrProductHistory';
export const TX_STORAGE_KEY = 'cntrSales';
export const EVENT_COST_STORAGE_KEY = 'cntrEventCosts';
export const SAVED_REPORTS_KEY = 'cntrSavedReports';
export const IMPORTED_EVENT_REPORT_KEY = 'cntrImportedEventReport';
export const SETTINGS_KEY = 'cntrSettings';

export const CURRENCIES: Currency[] = ['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'GBP', 'JPY', 'MYR'];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'IDR',
  compactMoney: false,
};

/** Sales are stored with ISO string timestamps. */
type StoredSale = Omit<SaleRecord, 'timestamp'> & { timestamp: string };

// ---- Persistence ----
// Reads come from `cache` (synchronous, as the app expects). Writes update `cache` at once and are
// written to `store` in order; a failed write is kept and retried, never dropped.

const cache = new Map<string, string>();
let store: KvStore = localStorageStore;
const pending = new Map<string, string | null>();
let flushing: Promise<void> | null = null;
let retryTimer = 0;
// Set in localStorage once the database holds the data, so a later database failure never falls back to stale copies.
const USING_DATABASE_FLAG = 'cntrMeta.usingDatabase';

let saveProblem: string | null = null;
let startupProblem: string | null = null;
let onProblem: (message: string | null) => void = () => {};

/** Called with a message whenever saving is failing, and with null once it works again. */
export function onStorageProblem(listener: (message: string | null) => void) {
  onProblem = listener;
  listener(saveProblem ?? startupProblem);
}

function setSaveProblem(message: string | null) {
  saveProblem = message;
  onProblem(saveProblem ?? startupProblem);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function flush(): Promise<void> {
  flushing ??= (async () => {
    try {
      while (pending.size) {
        const batch = new Map(pending);
        pending.clear();
        try {
          await store.write(batch);
        } catch (error) {
          // Keep the batch for the retry, unless a newer value for the same key arrived meanwhile.
          for (const [key, value] of batch) if (!pending.has(key)) pending.set(key, value);
          console.error('Saving failed', error);
          setSaveProblem(`Your latest changes could not be saved (${errorText(error)}). The phone may be out of storage. CNTR keeps trying; free up space and export a backup.`);
          window.clearTimeout(retryTimer);
          retryTimer = window.setTimeout(() => void flush(), 5000);
          return;
        }
      }
      if (saveProblem) setSaveProblem(null);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

function persist(key: string, value: string | null) {
  if (value === null) cache.delete(key);
  else cache.set(key, value);
  pending.set(key, value);
  void flush();
}

export type StorageStartup = { ok: true; usingDatabase: boolean } | { ok: false; error: string };

/**
 * Loads all data before the app starts. On the phone the data lives in SQLite; the first launch after the
 * update copies the old localStorage data there (see migrate.ts). In the browser it stays in localStorage.
 */
export async function initStorage(isNative: boolean): Promise<StorageStartup> {
  let usingDatabase = false;
  if (isNative) {
    try {
      const database = await openSqliteStore();
      await migrateFromLegacy(database, localStorage);
      store = database;
      usingDatabase = true;
    } catch (error) {
      console.error('Opening the database failed', error);
      if (localStorage.getItem(USING_DATABASE_FLAG)) {
        // The newest data is in the database; the old localStorage copy is stale, so do not run on it.
        return { ok: false, error: `CNTR could not open its data (${errorText(error)}). Nothing was changed or deleted. Close CNTR completely and open it again.` };
      }
      // Never migrated: localStorage still holds the only, current copy. Keep using it and retry next launch.
      store = localStorageStore;
      startupProblem = `Your data could not be moved to safer storage yet (${errorText(error)}). It is still on this phone and CNTR will try again next time. Export a backup now.`;
    }
    if (usingDatabase) {
      try {
        localStorage.setItem(USING_DATABASE_FLAG, '1');
      } catch (error) {
        console.error('Could not set the database marker', error);
      }
    }
  }
  try {
    for (const [key, value] of await store.readAll()) cache.set(key, value);
  } catch (error) {
    return { ok: false, error: `CNTR could not read its data (${errorText(error)}). Nothing was changed or deleted. Close CNTR completely and open it again.` };
  }
  return { ok: true, usingDatabase };
}

/** The stored JSON strings for every data key, including changes still being written. */
export function storedValues() {
  return new Map([...cache].filter(([key]) => DATA_KEYS.includes(key)));
}

/** Replaces all data in one step (keys missing from `values` are deleted). The caller reloads the app afterwards. */
export async function replaceAllData(values: Map<string, string>) {
  await flush();
  if (pending.size) throw new Error('Earlier changes have not been saved yet');
  await store.write(new Map(DATA_KEYS.map((key) => [key, values.get(key) ?? null])));
}

function readJson<T>(key: string, fallback: T): T {
  const stored = cache.get(key);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

// Corrupt or hand-edited storage must not crash startup, so list loaders only accept arrays.
function readArray<T>(key: string): T[] {
  const parsed = readJson<unknown>(key, []);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function writeJson<T>(key: string, value: T) {
  persist(key, JSON.stringify(value));
}

function reviveSales(sales: StoredSale[]): SaleRecord[] {
  return sales.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
}

function serializeSales(sales: SaleRecord[]) {
  return sales.map((item) => ({
    ...item,
    timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
  }));
}

export function loadImportedEventReport(): ImportedEventReport | null {
  const parsed = readJson<{ sales?: unknown; products?: unknown } | null>(IMPORTED_EVENT_REPORT_KEY, null);
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sales) || !Array.isArray(parsed.products)) {
    return null;
  }
  return { sales: reviveSales(parsed.sales as StoredSale[]), products: parsed.products as Product[] };
}

export function saveImportedEventReport(report: ImportedEventReport | null) {
  if (report === null) {
    persist(IMPORTED_EVENT_REPORT_KEY, null);
    return;
  }
  writeJson(IMPORTED_EVENT_REPORT_KEY, { ...report, sales: serializeSales(report.sales) });
}

export function loadProducts(): Product[] {
  return readArray<Product>(PRODUCT_STORAGE_KEY);
}

export function saveProducts(products: Product[]) {
  writeJson(PRODUCT_STORAGE_KEY, products);
}

export function loadProductHistory(): Product[] {
  return readArray<Product>(PRODUCT_HISTORY_STORAGE_KEY);
}

export function saveProductHistory(products: Product[]) {
  writeJson(PRODUCT_HISTORY_STORAGE_KEY, products);
}

export function loadSales(): SaleRecord[] {
  return reviveSales(readArray<StoredSale>(TX_STORAGE_KEY));
}

export function saveSales(sales: SaleRecord[]) {
  writeJson(TX_STORAGE_KEY, serializeSales(sales));
}

export function loadEventCosts(): EventCost[] {
  // Older versions stored a `category` field; keep only the current shape.
  return readArray<EventCost & { category?: string }>(EVENT_COST_STORAGE_KEY).map((item) => ({ id: item.id, name: item.name, amount: item.amount }));
}

export function saveEventCosts(eventCosts: EventCost[]) {
  writeJson(EVENT_COST_STORAGE_KEY, eventCosts);
}

export function loadSavedReports(): SavedReport[] {
  return readArray<SavedReport>(SAVED_REPORTS_KEY);
}

export function saveSavedReports(reports: SavedReport[]) {
  writeJson(SAVED_REPORTS_KEY, reports);
}

// When the last backup was exported. Not part of the backup itself, so a restore does not change it.
const LAST_BACKUP_KEY = 'cntrMeta.lastBackup';

export function loadLastBackup(): string | null {
  return cache.get(LAST_BACKUP_KEY) ?? null;
}

export function saveLastBackup(iso: string) {
  persist(LAST_BACKUP_KEY, iso);
}

// Settings are read on every money format call, so keep the parsed value in memory.
let cachedSettings: AppSettings | null = null;

export function loadSettings(): AppSettings {
  if (cachedSettings) return { ...cachedSettings };
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {});

  cachedSettings = {
    currency: CURRENCIES.includes(stored.currency as Currency) ? (stored.currency as Currency) : DEFAULT_SETTINGS.currency,
    compactMoney: Boolean(stored.compactMoney),
  };
  return { ...cachedSettings };
}

export function saveSettings(settings: AppSettings) {
  cachedSettings = null;
  writeJson(SETTINGS_KEY, settings);
}
