import { initialLanguage, t } from './i18n';
import { localStorageStore, openSqliteStore, type KvStore } from './kv';
import { DATA_KEYS, migrateFromLegacy } from './migrate';
import type { AppSettings, Currency, EventCost, LiveEventMeta, PastEvent, Product, SaleRecord } from './types';

export const PRODUCT_STORAGE_KEY = 'cntrProducts';
export const PRODUCT_HISTORY_STORAGE_KEY = 'cntrProductHistory';
export const TX_STORAGE_KEY = 'cntrSales';
export const EVENT_COST_STORAGE_KEY = 'cntrEventCosts';
export const LIVE_EVENT_KEY = 'cntrLiveEvent';
export const PAST_EVENTS_KEY = 'cntrEvents';
export const SETTINGS_KEY = 'cntrSettings';

export const CURRENCIES: Currency[] = ['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'GBP', 'JPY', 'MYR'];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'IDR',
  compactMoney: false,
  productsPerDay: true,
  newDayOnDateChange: false,
  sound: true,
  theme: 'dark',
  language: 'en',
};

/** The phone's own light/dark setting, read only to resolve the very first choice (never followed afterwards). */
const resolveTheme = (): AppSettings['theme'] => (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

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
// Made when shown, not at startup, so it is in the saved language (read after the data loads).
let startupProblem: (() => string) | null = null;
let onProblem: (message: string | null) => void = () => {};

/** Called with a message whenever saving is failing, and with null once it works again. */
export function onStorageProblem(listener: (message: string | null) => void) {
  onProblem = listener;
  listener(saveProblem ?? startupProblem?.() ?? null);
}

function setSaveProblem(message: string | null) {
  saveProblem = message;
  onProblem(saveProblem ?? startupProblem?.() ?? null);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

function flush(): Promise<void> {
  flushing ??= (async () => {
    try {
      // Let the rest of this tick's writes join the batch, so a multi-key change (e.g. End event) is all-or-nothing.
      await Promise.resolve();
      while (pending.size) {
        const batch = new Map(pending);
        pending.clear();
        try {
          await store.write(batch);
        } catch (error) {
          // Keep the batch for the retry, unless a newer value for the same key arrived meanwhile.
          for (const [key, value] of batch) if (!pending.has(key)) pending.set(key, value);
          console.error('Saving failed', error);
          setSaveProblem(t('storage.saveFailing', { error: errorText(error) }));
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
        return { ok: false, error: t('storage.cannotOpen', { error: errorText(error) }) };
      }
      // Never migrated: localStorage still holds the only, current copy. Keep using it and retry next launch.
      store = localStorageStore;
      startupProblem = () => t('storage.notMoved', { error: errorText(error) });
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
    freshInstall = ![...cache.keys()].some((key) => DATA_KEYS.includes(key) || key.startsWith('cntrMeta.tutorial'));
  } catch (error) {
    return { ok: false, error: t('storage.cannotRead', { error: errorText(error) }) };
  }
  return { ok: true, usingDatabase };
}

/** The stored JSON strings for every data key (or `keys`), including changes still being written. */
export function storedValues(keys = DATA_KEYS) {
  return new Map([...cache].filter(([key]) => keys.includes(key)));
}

/** Replaces all data in one step (keys missing from `values` are deleted). The caller reloads the app afterwards. */
export async function replaceAllData(values: Map<string, string>) {
  await flush();
  if (pending.size) throw new Error('Earlier changes have not been saved yet');
  await store.write(new Map(DATA_KEYS.map((key) => [key, values.get(key) ?? null])));
}

// ---- Tutorial: practice data in place of the real data ----
// The real data waits under TUTORIAL_KEY (not a data key, so never in a backup). Both swaps are one
// all-or-nothing write, so a crash leaves either the real data or the practice data plus the saved copy.
const TUTORIAL_KEY = 'cntrMeta.tutorialSavedData';
const TUTORIAL_OFFERED_KEY = 'cntrMeta.tutorialOffered';

/** True while practice data is in place (the real data is waiting to come back). */
export const tutorialActive = () => cache.has(TUTORIAL_KEY);

export const tutorialOffered = () => cache.has(TUTORIAL_OFFERED_KEY);

export function markTutorialOffered() {
  persist(TUTORIAL_OFFERED_KEY, new Date().toISOString());
}

/** Puts the real data aside and the practice data in its place. The caller reloads the app afterwards. */
export async function startTutorialData(practice: Map<string, string>) {
  await flush();
  if (pending.size) throw new Error('Earlier changes have not been saved yet');
  const changes = new Map<string, string | null>(DATA_KEYS.map((key) => [key, practice.get(key) ?? null]));
  changes.set(TUTORIAL_KEY, JSON.stringify([...storedValues()]));
  await store.write(changes);
}

/** Brings the real data back exactly as it was and drops the practice data. The caller reloads the app afterwards. */
export async function endTutorialData() {
  const raw = cache.get(TUTORIAL_KEY);
  if (raw === undefined) return;
  const saved = new Map<string, string>(JSON.parse(raw) as [string, string][]);
  await flush(); // let practice writes finish first, so none land after the real data is back
  const changes = new Map<string, string | null>(DATA_KEYS.map((key) => [key, saved.get(key) ?? null]));
  changes.set(TUTORIAL_KEY, null);
  pending.clear(); // a practice write still failing must not be retried over the real data
  await store.write(changes);
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

export function loadLiveEvent(): LiveEventMeta | null {
  const parsed = readJson<LiveEventMeta | null>(LIVE_EVENT_KEY, null);
  return parsed && typeof parsed === 'object' && Array.isArray(parsed.dayBreaks) ? parsed : null;
}

export function saveLiveEvent(meta: LiveEventMeta) {
  writeJson(LIVE_EVENT_KEY, meta);
}

export function loadPastEvents(): PastEvent[] {
  return readArray<PastEvent & { sales: StoredSale[] }>(PAST_EVENTS_KEY).map((event) => ({ ...event, sales: reviveSales(event.sales) }));
}

export function savePastEvents(events: PastEvent[]) {
  writeJson(PAST_EVENTS_KEY, events.map((event) => ({ ...event, sales: serializeSales(event.sales) })));
}

// When the last backup was exported. Not part of the backup itself, so a restore does not change it.
const LAST_BACKUP_KEY = 'cntrMeta.lastBackup';

export function loadLastBackup(): string | null {
  return cache.get(LAST_BACKUP_KEY) ?? null;
}

export function saveLastBackup(iso: string) {
  persist(LAST_BACKUP_KEY, iso);
}

/** Nothing stored yet when the app started: a first launch, not an update. */
let freshInstall = false;

// Settings are read on every money format call, so keep the parsed value in memory.
let cachedSettings: AppSettings | null = null;

export function loadSettings(): AppSettings {
  if (cachedSettings) return { ...cachedSettings };
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {});

  cachedSettings = {
    currency: CURRENCIES.includes(stored.currency as Currency) ? (stored.currency as Currency) : DEFAULT_SETTINGS.currency,
    compactMoney: Boolean(stored.compactMoney),
    // Settings saved before this option (or a damaged value) get the default.
    productsPerDay: typeof stored.productsPerDay === 'boolean' ? stored.productsPerDay : DEFAULT_SETTINGS.productsPerDay,
    newDayOnDateChange: typeof stored.newDayOnDateChange === 'boolean' ? stored.newDayOnDateChange : DEFAULT_SETTINGS.newDayOnDateChange,
    sound: typeof stored.sound === 'boolean' ? stored.sound : DEFAULT_SETTINGS.sound,
    theme: stored.theme === 'light' || stored.theme === 'dark' ? stored.theme : resolveTheme(),
    language: stored.language === 'en' || stored.language === 'id' ? stored.language : initialLanguage(navigator.language, freshInstall),
  };
  // The first choice is saved at once, so it never changes on its own later (e.g. after the phone's language or theme changes).
  if (stored.language !== cachedSettings.language || stored.theme !== cachedSettings.theme) {
    persist(SETTINGS_KEY, JSON.stringify({ ...stored, language: cachedSettings.language, theme: cachedSettings.theme }));
  }
  return { ...cachedSettings };
}

export function saveSettings(settings: AppSettings) {
  cachedSettings = null;
  writeJson(SETTINGS_KEY, settings);
}
