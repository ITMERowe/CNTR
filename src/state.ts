// App state and the rules for changing it. No DOM access here: screens read from `state`
// and call these functions, then re-render.
import { defaultProducts, generateUUID } from './data';
import * as storage from './storage';
import type { EventView, ImportedEventReport, Product, ReportType, SaleRecord, SavedReport } from './types';

export const state = {
  /** Active products (tiles on the sales screen). */
  products: storage.loadProducts(),
  /** Every product ever created, including deactivated ones. */
  productHistory: storage.loadProductHistory(),
  /** Live sales for the current session. */
  sales: storage.loadSales(),
  /** Live event expenses. */
  eventCosts: storage.loadEventCosts(),
  importedEventReport: storage.loadImportedEventReport(),
  /** A saved report currently being viewed on the Reports or Event screen. */
  previewReport: null as SavedReport | null,
};

/** Keeps the last entry for each product name. */
function dedupeByName(list: Product[]) {
  const byName = new Map<string, Product>();
  for (const product of list) byName.set(product.name, { ...product });
  return [...byName.values()];
}

/** Dedupes products and history, and makes sure every active product is also in history. */
function syncProductState() {
  const { products, productHistory } = state;
  // Fresh install: seed the defaults before building history so they show up under Products too.
  // Do NOT repopulate active products from history when the user intentionally removed all products.
  if (products.length === 0 && productHistory.length === 0) {
    products.push(...defaultProducts.map((product) => ({ ...product })));
  }

  const uniqueProducts = dedupeByName(products);
  const uniqueHistory = dedupeByName(productHistory);
  const activeNames = new Set(uniqueProducts.map((product) => product.name));
  const historyNames = new Set(uniqueHistory.map((product) => product.name));
  const mergedHistory = [
    ...uniqueHistory.filter((product) => activeNames.has(product.name)),
    ...uniqueHistory.filter((product) => !activeNames.has(product.name)),
    ...uniqueProducts.filter((product) => !historyNames.has(product.name)).map((product) => ({ ...product })),
  ];

  products.splice(0, products.length, ...uniqueProducts);
  productHistory.splice(0, productHistory.length, ...mergedHistory);
}

syncProductState();

export function saveProducts() {
  syncProductState();
  storage.saveProducts(state.products);
}

export function saveProductHistory() {
  state.productHistory.splice(0, state.productHistory.length, ...dedupeByName(state.productHistory));
  storage.saveProductHistory(state.productHistory);
}

export function saveSales() {
  storage.saveSales(state.sales);
}

export function saveEventCosts() {
  storage.saveEventCosts(state.eventCosts);
}

export function setImportedEventReport(report: ImportedEventReport | null) {
  state.importedEventReport = report;
  storage.saveImportedEventReport(report);
}

export function productColor(name: string) {
  return state.productHistory.find((product) => product.name === name)?.color ?? '';
}

/** Renames a product's recorded sales and applies its current price and cost. */
export function renameSales(oldName: string, product: Product) {
  for (const sale of state.sales) {
    if (sale.product === oldName) {
      sale.product = product.name;
      sale.price = product.price;
      sale.cost = product.cost;
    }
  }
}

/** Removes a product from history, the counter and the live sales. */
export function deleteProduct(name: string) {
  const keep = <T>(list: T[], predicate: (item: T) => boolean) => list.splice(0, list.length, ...list.filter(predicate));
  keep(state.productHistory, (product) => product.name !== name);
  keep(state.products, (product) => product.name !== name);
  keep(state.sales, (sale) => sale.product !== name);
  saveProductHistory();
  saveProducts();
  saveSales();
}

export function recordSale(product: Product, payment: string) {
  state.sales.push({ product: product.name, price: product.price, cost: product.cost, payment, timestamp: new Date() });
  saveSales();
}

/** Removes the most recent matching sale; returns false if there was none. */
export function removeLastSale(productName: string, payment: string) {
  for (let i = state.sales.length - 1; i >= 0; i--) {
    if (state.sales[i].product === productName && state.sales[i].payment === payment) {
      state.sales.splice(i, 1);
      saveSales();
      return true;
    }
  }
  return false;
}

// ---- Saved reports ----

export const loadSavedReports = storage.loadSavedReports;

export function findSavedReport(id: string) {
  return loadSavedReports().find((report) => report.id === id);
}

export function deleteSavedReport(id: string) {
  const reports = loadSavedReports();
  const remaining = reports.filter((report) => report.id !== id);
  if (remaining.length === reports.length) return false;
  storage.saveSavedReports(remaining);
  if (state.previewReport?.id === id) state.previewReport = null;
  return true;
}

export function renameSavedReport(id: string, nextName: string) {
  const name = nextName.trim();
  const reports = loadSavedReports();
  const target = reports.find((report) => report.id === id);
  if (!name || !target) return false;
  target.name = name;
  storage.saveSavedReports(reports);
  if (state.previewReport?.id === id) state.previewReport = { ...target };
  return true;
}

/** Saves a snapshot of the live sales screen or of what the event screen shows; returns the name used. */
export function saveCurrentReport(name: string, type: ReportType) {
  const reportName = name.trim() || `${type === 'event' ? 'Event report' : 'Report'} ${new Date().toLocaleString()}`;
  const source = type === 'event' ? getEventView() : { products: state.products, sales: state.sales, eventCosts: state.eventCosts };
  const reports = loadSavedReports();
  reports.push({
    id: generateUUID(),
    name: reportName,
    createdAt: new Date().toISOString(),
    type,
    products: source.products.map((product) => ({ ...product })),
    sales: source.sales.map((sale) => ({ ...sale })),
    eventCosts: source.eventCosts.map((cost) => ({ ...cost })),
  });
  storage.saveSavedReports(reports);
  return reportName;
}

// ---- Event screen ----

export function getEventView(): EventView {
  const saved = state.previewReport?.type === 'event' ? state.previewReport : null;
  if (saved) return { hasReport: true, sales: saved.sales, products: saved.products, eventCosts: saved.eventCosts };
  const imported = state.importedEventReport;
  return { hasReport: Boolean(imported), sales: imported?.sales ?? [], products: imported?.products ?? [], eventCosts: state.eventCosts };
}

/** Persists expense edits to whichever cost list the event screen is showing. */
function saveActiveEventCosts() {
  const preview = state.previewReport;
  if (preview?.type === 'event') {
    const reports = loadSavedReports();
    const target = reports.find((report) => report.id === preview.id);
    if (target) {
      target.eventCosts = preview.eventCosts.map((cost) => ({ ...cost }));
      storage.saveSavedReports(reports);
    }
    return;
  }
  saveEventCosts();
}

export function addExpense(name: string, amount: number) {
  getEventView().eventCosts.push({ id: generateUUID(), name, amount });
  saveActiveEventCosts();
}

export function updateExpense(id: string, name: string, amount: number) {
  const cost = getEventView().eventCosts.find((item) => item.id === id);
  if (!cost) return;
  cost.name = name;
  cost.amount = amount;
  saveActiveEventCosts();
}

export function removeExpense(id: string) {
  const costs = getEventView().eventCosts;
  const index = costs.findIndex((cost) => cost.id === id);
  if (index < 0) return;
  costs.splice(index, 1);
  saveActiveEventCosts();
}

/** Replaces the live event's sales with the live counter and/or saved sales reports. */
export function importEventSales(includeLive: boolean, reportIds: string[]) {
  const reports = loadSavedReports().filter((report) => report.type === 'sales' && reportIds.includes(report.id));
  const sales: SaleRecord[] = [
    ...(includeLive ? state.sales.map((sale) => ({ ...sale })) : []),
    ...reports.flatMap((report) => report.sales.map((sale) => ({ ...sale }))),
  ];
  // Products from the imported reports first, current ones override, so every sale has a colour.
  const products = dedupeByName([...reports.flatMap((report) => report.products), ...state.products]);
  setImportedEventReport({ sales, products });
  state.previewReport = null;
}

export function clearLiveEvent() {
  setImportedEventReport(null);
  state.eventCosts.length = 0;
  saveEventCosts();
}

export function clearSales() {
  state.sales.length = 0;
  saveSales();
}
