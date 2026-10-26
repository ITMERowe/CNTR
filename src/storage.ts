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

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to save ${key}`, error);
  }
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
    localStorage.removeItem(IMPORTED_EVENT_REPORT_KEY);
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
