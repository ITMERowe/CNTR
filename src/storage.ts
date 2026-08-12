type ProductShape = {
  name: string;
  price: number;
  cost: number;
  color: string;
};

type SaleRecordShape = {
  product: string;
  price: number;
  cost: number;
  payment: string;
  timestamp: Date;
};

type EventCostShape = {
  id: string;
  name: string;
  amount: number;
};

type SavedReportShape = {
  id: string;
  name: string;
  createdAt: string;
  type: 'sales' | 'event';
  products: ProductShape[];
  sales: SaleRecordShape[];
  eventCosts: EventCostShape[];
};

export const PRODUCT_STORAGE_KEY = 'cntrProducts';
export const PRODUCT_HISTORY_STORAGE_KEY = 'cntrProductHistory';
export const TX_STORAGE_KEY = 'cntrSales';
export const EVENT_COST_STORAGE_KEY = 'cntrEventCosts';
export const SAVED_REPORTS_KEY = 'cntrSavedReports';
export const IMPORTED_EVENT_REPORT_KEY = 'cntrImportedEventReport';
export const SETTINGS_KEY = 'cntrSettings';

export type AppSettings = {
  currency: 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR';
  compactMoney: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  currency: 'IDR',
  compactMoney: false,
};

function readJson<T>(key: string, fallback: T): T {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;

  try {
    const parsed = JSON.parse(stored) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadImportedEventReport() {
  const stored = localStorage.getItem(IMPORTED_EVENT_REPORT_KEY);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as {
      sales: Array<{ product: string; price: number; cost: number; payment: string; timestamp: string }>;
      products: ProductShape[];
    };

    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sales) || !Array.isArray(parsed.products)) {
      return null;
    }

    return {
      sales: parsed.sales.map((item) => ({ ...item, timestamp: new Date(item.timestamp) })),
      products: parsed.products,
    };
  } catch {
    return null;
  }
}

export function saveImportedEventReport(report: { sales: SaleRecordShape[]; products: ProductShape[] } | null) {
  if (report === null) {
    localStorage.removeItem(IMPORTED_EVENT_REPORT_KEY);
    return;
  }

  writeJson(IMPORTED_EVENT_REPORT_KEY, report);
}

export function loadProducts(): ProductShape[] {
  return readJson<ProductShape[]>(PRODUCT_STORAGE_KEY, []);
}

export function saveProducts(products: ProductShape[]) {
  writeJson(PRODUCT_STORAGE_KEY, products);
}

export function loadProductHistory(): ProductShape[] {
  return readJson<ProductShape[]>(PRODUCT_HISTORY_STORAGE_KEY, []);
}

export function saveProductHistory(products: ProductShape[]) {
  writeJson(PRODUCT_HISTORY_STORAGE_KEY, products);
}

export function loadSales(): SaleRecordShape[] {
  const parsed = readJson<Array<{ product: string; price: number; cost: number; payment: string; timestamp: string }>>(
    TX_STORAGE_KEY,
    []
  );
  return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
}

export function saveSales(sales: SaleRecordShape[]) {
  writeJson(
    TX_STORAGE_KEY,
    sales.map((item) => ({
      ...item,
      timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
    }))
  );
}

export function loadEventCosts(): EventCostShape[] {
  return readJson<Array<{ id: string; name: string; amount: number; category?: string }>>(EVENT_COST_STORAGE_KEY, []).map(
    (item) => ({ id: item.id, name: item.name, amount: item.amount })
  );
}

export function saveEventCosts(eventCosts: EventCostShape[]) {
  writeJson(EVENT_COST_STORAGE_KEY, eventCosts);
}

export function loadSavedReports(): SavedReportShape[] {
  return readJson<SavedReportShape[]>(SAVED_REPORTS_KEY, []);
}

export function saveSavedReports(reports: SavedReportShape[]) {
  writeJson(SAVED_REPORTS_KEY, reports);
}

export function loadSettings(): AppSettings {
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {});
  const allowedCurrencies: AppSettings['currency'][] = ['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'GBP', 'JPY', 'MYR'];

  return {
    currency: allowedCurrencies.includes(stored.currency as AppSettings['currency'])
      ? (stored.currency as AppSettings['currency'])
      : DEFAULT_SETTINGS.currency,
    compactMoney: Boolean(stored.compactMoney),
  };
}

export function saveSettings(settings: AppSettings) {
  writeJson(SETTINGS_KEY, settings);
}
