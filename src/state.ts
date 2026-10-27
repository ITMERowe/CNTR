// App state and the rules for changing it. No DOM access here: screens read from `state`
// and call these functions, then re-render.
import { generateUUID } from './data';
import { breakTime, defaultEventName, saleTime, snapshotProducts, splitDays, todaySales } from './events';
import * as storage from './storage';
import type { EventCost, LiveEventMeta, PastEvent, Product, SaleRecord } from './types';

// Filled by initState() once storage has loaded.
export const state = {
  /** Active products (tiles on the sales screen). */
  products: [] as Product[],
  /** Every product ever created, including deactivated ones. */
  productHistory: [] as Product[],
  /** The live event's sales, all days. */
  sales: [] as SaleRecord[],
  /** The live event's expenses. */
  eventCosts: [] as EventCost[],
  /** The live event's name and day breaks. */
  liveEvent: null as unknown as LiveEventMeta,
  /** Finished events, oldest first. */
  pastEvents: [] as PastEvent[],
};

function newLiveEvent(startedAt: string): LiveEventMeta {
  return { id: generateUUID(), name: null, startedAt, dayBreaks: [] };
}

/** Loads the state from storage; call once, after initStorage(). Returns true if the live event was just created. */
export function initState() {
  state.products = storage.loadProducts();
  state.productHistory = storage.loadProductHistory();
  state.sales = storage.loadSales();
  state.eventCosts = storage.loadEventCosts();
  state.pastEvents = storage.loadPastEvents();
  const live = storage.loadLiveEvent();
  if (live) {
    state.liveEvent = live;
  } else {
    // First launch with events: the current sales and expenses become the live event.
    const first = state.sales.reduce<Date | null>((min, sale) => (!min || sale.timestamp < min ? sale.timestamp : min), null);
    state.liveEvent = newLiveEvent((first ?? new Date()).toISOString());
    storage.saveLiveEvent(state.liveEvent);
  }
  syncProductState();
  return !live;
}

/** Keeps the last entry for each product name. */
function dedupeByName(list: Product[]) {
  const byName = new Map<string, Product>();
  for (const product of list) byName.set(product.name, { ...product });
  return [...byName.values()];
}

/** Dedupes products and history, and makes sure every active product is also in history. */
function syncProductState() {
  const { products, productHistory } = state;
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

export function productColor(name: string) {
  return state.productHistory.find((product) => product.name === name)?.color ?? '';
}

/** Renames a product's live sales; its new price and cost apply to today's sales only (ended days stay frozen). */
export function renameSales(oldName: string, product: Product) {
  const today = new Set(todayLiveSales());
  for (const sale of state.sales) {
    if (sale.product !== oldName) continue;
    sale.product = product.name;
    if (today.has(sale)) {
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
  state.sales.push({ product: product.name, price: product.price, cost: product.cost, payment, timestamp: saleTime(new Date(), state.liveEvent.dayBreaks) });
  saveSales();
}

/** Removes today's most recent matching sale (never one from an ended day); returns false if there was none. */
export function removeLastSale(productName: string, payment: string) {
  const today = new Set(todayLiveSales());
  for (let i = state.sales.length - 1; i >= 0; i--) {
    const sale = state.sales[i];
    if (today.has(sale) && sale.product === productName && sale.payment === payment) {
      state.sales.splice(i, 1);
      saveSales();
      return true;
    }
  }
  return false;
}

// ---- Live event ----

export function liveEventName() {
  return state.liveEvent.name ?? defaultEventName(state.sales, new Date());
}

/** The live sales after the last End day: what the Sell tab shows. */
export function todayLiveSales() {
  return todaySales(state.sales, state.liveEvent.dayBreaks);
}

/** Number of days so far (1 until End day is pressed). */
export function liveDayCount() {
  return state.liveEvent.dayBreaks.length + 1;
}

export function renameLiveEvent(nextName: string) {
  const name = nextName.trim();
  if (!name) return false;
  state.liveEvent = { ...state.liveEvent, name };
  storage.saveLiveEvent(state.liveEvent);
  return true;
}

/** Freezes today as a finished day. Returns false (nothing changed) if today has no sales. */
export function endDay() {
  if (!todayLiveSales().length) return false;
  state.liveEvent = { ...state.liveEvent, dayBreaks: [...state.liveEvent.dayBreaks, breakTime(new Date(), state.sales, state.liveEvent.dayBreaks)] };
  storage.saveLiveEvent(state.liveEvent);
  return true;
}

/** Moves the live event to History and starts a fresh one. All four keys are saved in the same tick. */
export function endEvent(nextName: string): PastEvent {
  const now = new Date().toISOString();
  // A trailing break with no sales after it would show an empty last day; drop it.
  const days = splitDays(state.sales, state.liveEvent.dayBreaks);
  const dayBreaks = days[days.length - 1].length ? state.liveEvent.dayBreaks : state.liveEvent.dayBreaks.slice(0, -1);
  // Starts at its first sale: the live event was created when the previous one ended, maybe weeks earlier.
  const firstSale = state.sales.reduce<Date | null>((min, sale) => (!min || sale.timestamp < min ? sale.timestamp : min), null);
  const event: PastEvent = {
    id: state.liveEvent.id,
    name: nextName.trim() || liveEventName(),
    startedAt: firstSale ? firstSale.toISOString() : state.liveEvent.startedAt,
    endedAt: now,
    dayBreaks,
    products: snapshotProducts(state.sales, state.productHistory),
    sales: state.sales.map((sale) => ({ ...sale })),
    expenses: state.eventCosts.map((cost) => ({ ...cost })),
  };
  state.pastEvents = [...state.pastEvents, event];
  state.sales.length = 0;
  state.eventCosts.length = 0;
  state.liveEvent = newLiveEvent(now);
  storage.savePastEvents(state.pastEvents);
  storage.saveSales(state.sales);
  storage.saveEventCosts(state.eventCosts);
  storage.saveLiveEvent(state.liveEvent);
  return event;
}

export function addExpense(name: string, amount: number) {
  state.eventCosts.push({ id: generateUUID(), name, amount });
  saveEventCosts();
}

export function updateExpense(id: string, name: string, amount: number) {
  const cost = state.eventCosts.find((item) => item.id === id);
  if (!cost) return;
  cost.name = name;
  cost.amount = amount;
  saveEventCosts();
}

export function removeExpense(id: string) {
  const index = state.eventCosts.findIndex((cost) => cost.id === id);
  if (index < 0) return;
  state.eventCosts.splice(index, 1);
  saveEventCosts();
}

// ---- Past events ----

export function findPastEvent(id: string) {
  return state.pastEvents.find((event) => event.id === id);
}

/** Saves an edited copy of a past event in place of the stored one. */
export function replacePastEvent(edited: PastEvent) {
  if (!findPastEvent(edited.id)) return false;
  state.pastEvents = state.pastEvents.map((event) => (event.id === edited.id ? edited : event));
  storage.savePastEvents(state.pastEvents);
  return true;
}

export function deletePastEvent(id: string) {
  const remaining = state.pastEvents.filter((event) => event.id !== id);
  if (remaining.length === state.pastEvents.length) return false;
  state.pastEvents = remaining;
  storage.savePastEvents(state.pastEvents);
  return true;
}
