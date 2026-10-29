// Backup files: build, validate and turn into CSV. Type-only imports, so Node can test it directly.
import { splitDays, withLinkedCosts } from './events.ts';
import { DATA_KEYS } from './migrate.ts'; // explicit extension so `node --test` can load it
import type { EventCost, Product, SaleRecord } from './types.ts';
import { t } from './i18n.ts';

export const BACKUP_APP = 'CNTR';
export const BACKUP_FORMAT = 1;
const MAX_BACKUP_BYTES = 50 * 1024 * 1024;

export interface BackupFile {
  app: typeof BACKUP_APP;
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  /** Stored values by storage key, parsed (not strings) so the file is readable. */
  data: Record<string, unknown>;
}

export interface BackupSummary {
  exportedAt: string;
  sales: number;
  events: number;
  products: number;
}

export type ParsedBackup = { ok: true; values: Map<string, string>; summary: BackupSummary } | { ok: false; error: string };

/** Builds a backup from the stored JSON strings. Unparseable values are kept as strings rather than dropped. */
export function buildBackup(stored: Map<string, string>, now = new Date(), keys = DATA_KEYS): BackupFile {
  const data: Record<string, unknown> = {};
  for (const key of keys) {
    const value = stored.get(key);
    if (value === undefined) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }
  return { app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), data };
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown) => typeof value === 'string';
/** The name fields cap at this length too (index.html maxlength), so a backup of real data always fits. */
export const MAX_NAME = 1000;
// A huge name in a hand-made backup would only slow the phone down; real names are far shorter.
const isName = (value: unknown) => isString(value) && (value as string).length <= MAX_NAME;

function checkProduct(item: unknown) {
  // `payments` is optional (older backups have none): 1 or 2 method names.
  const payments = isObject(item) ? item.payments : undefined;
  const paymentsOk = payments === undefined || (Array.isArray(payments) && payments.length >= 1 && payments.length <= 2 && payments.every(isString));
  return isObject(item) && (item.id === undefined || isString(item.id)) && isName(item.name) && isNumber(item.price) && isNumber(item.cost) && isString(item.color) && paymentsOk && (item.group === undefined || isName(item.group));
}

function checkSale(item: unknown) {
  return isObject(item) && isName(item.product) && (item.productId === undefined || isString(item.productId)) && isNumber(item.price) && isNumber(item.cost) && isString(item.payment) && isString(item.timestamp) && !Number.isNaN(Date.parse(item.timestamp as string));
}

function checkCost(item: unknown) {
  // `productIds` is optional (older backups have none): the ids of the products the expense pays for.
  const ids = isObject(item) ? item.productIds : undefined;
  const idsOk = ids === undefined || (Array.isArray(ids) && ids.length <= 1000 && ids.every(isName));
  return isObject(item) && isString(item.id) && isName(item.name) && isNumber(item.amount) && idsOk;
}

/** Returns the first problem in `list`, or null. */
function checkList(list: unknown, check: (item: unknown) => boolean, label: string): string | null {
  if (!Array.isArray(list)) return t('backup.notList', { label });
  const bad = list.findIndex((item) => !check(item));
  return bad >= 0 ? t('backup.badItem', { label, n: bad + 1 }) : null;
}

const isDateString = (value: unknown) => isString(value) && !Number.isNaN(Date.parse(value as string));

function checkLiveEvent(value: unknown): string | null {
  const ok = isObject(value) && isString(value.id) && isDateString(value.startedAt) && (value.name === null || isName(value.name)) && Array.isArray(value.dayBreaks) && value.dayBreaks.every(isDateString);
  return ok ? null : t('backup.badLive');
}

function checkEvent(event: unknown, index: number): string | null {
  const label = t('backup.event', { n: index + 1 });
  if (!isObject(event) || !isString(event.id) || !isName(event.name) || !isDateString(event.startedAt) || !isDateString(event.endedAt) || !Array.isArray(event.dayBreaks) || !event.dayBreaks.every(isDateString)) {
    return t('backup.damaged', { label });
  }
  return checkList(event.products, checkProduct, t('backup.eventProducts', { label })) ?? checkList(event.sales, checkSale, t('backup.eventSales', { label })) ?? checkList(event.expenses, checkCost, t('backup.eventExpenses', { label }));
}

const CHECKS: Record<string, (value: unknown) => string | null> = {
  cntrProducts: (value) => checkList(value, checkProduct, t('products')),
  cntrProductHistory: (value) => checkList(value, checkProduct, t('backup.productHistory')),
  cntrSales: (value) => checkList(value, checkSale, t('sales')),
  cntrEventCosts: (value) => checkList(value, checkCost, t('expenses')),
  cntrLiveEvent: checkLiveEvent,
  cntrEvents: (value) => (Array.isArray(value) ? value.map(checkEvent).find(Boolean) ?? null : t('backup.eventsNotList')),
  cntrSettings: (value) => (isObject(value) ? null : t('backup.badSettings')),
};

/** Validates a backup file completely before anything is changed. On success returns the values to store. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: t('backup.tooLarge') };
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: t('backup.notJson') };
  }
  if (!isObject(file) || file.app !== BACKUP_APP || !isObject(file.data)) return { ok: false, error: t('backup.notCntr') };
  if (file.format !== BACKUP_FORMAT) return { ok: false, error: t('backup.newer') };

  const data = file.data;
  const values = new Map<string, string>();
  for (const key of DATA_KEYS) {
    if (!(key in data)) continue;
    const problem = CHECKS[key](data[key]);
    if (problem) return { ok: false, error: t('backup.damagedFile', { problem }) };
    values.set(key, JSON.stringify(data[key]));
  }

  const count = (key: string) => (Array.isArray(data[key]) ? (data[key] as unknown[]).length : 0);
  return {
    ok: true,
    values,
    summary: { exportedAt: isString(file.exportedAt) ? (file.exportedAt as string) : '', sales: count('cntrSales'), events: count('cntrEvents'), products: count('cntrProductHistory') || count('cntrProducts') },
  };
}

const csvCell = (value: string | number) => {
  // A name starting like a formula would run as one in Excel or Sheets; a leading ' makes it plain text.
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Every recorded sale (the live event, then past events) as CSV, with day numbers. Starts with a BOM so Excel reads UTF-8. */
export function salesCsv(backup: BackupFile): string {
  type StoredSale = Omit<SaleRecord, 'timestamp'> & { timestamp: string };
  type StoredEvent = { name: string | null; dayBreaks: string[]; sales: StoredSale[]; expenses?: EventCost[]; products?: Product[] };
  const rows: (string | number)[][] = [['Event', 'Day', 'Time', 'Product', 'Payment', 'Price', 'Cost']];
  const list = <T>(value: unknown) => (Array.isArray(value) ? (value as T[]) : []);
  // Cost as the reports count it: 0 for products a linked expense of the same event pays for.
  const add = (name: string, dayBreaks: string[], sales: StoredSale[], expenses: unknown, products: unknown) => {
    const revived = sales.map((sale) => ({ ...sale, timestamp: new Date(sale.timestamp) }));
    const days = splitDays(withLinkedCosts(revived, list<EventCost>(expenses), list<Product>(products)), dayBreaks);
    days.forEach((day, index) => {
      for (const sale of day) rows.push([name, index + 1, sale.timestamp.toISOString(), sale.product, sale.payment, sale.price, sale.cost]);
    });
  };
  const live = isObject(backup.data.cntrLiveEvent) ? (backup.data.cntrLiveEvent as StoredEvent) : null;
  if (Array.isArray(backup.data.cntrSales)) add(live?.name || 'Current event', live?.dayBreaks ?? [], backup.data.cntrSales as StoredSale[], backup.data.cntrEventCosts, [...list<Product>(backup.data.cntrProducts), ...list<Product>(backup.data.cntrProductHistory)]);
  const events = Array.isArray(backup.data.cntrEvents) ? (backup.data.cntrEvents as StoredEvent[]) : [];
  for (const event of events) add(event.name ?? '', event.dayBreaks, event.sales, event.expenses, event.products);
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
