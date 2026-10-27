// Backup files: build, validate and turn into CSV. Type-only imports, so Node can test it directly.
import { splitDays } from './events.ts';
import { DATA_KEYS } from './migrate.ts'; // explicit extension so `node --test` can load it
import type { SaleRecord } from './types.ts';

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

function checkProduct(item: unknown) {
  // `payments` is optional (older backups have none): 1 or 2 method names.
  const payments = isObject(item) ? item.payments : undefined;
  const paymentsOk = payments === undefined || (Array.isArray(payments) && payments.length >= 1 && payments.length <= 2 && payments.every(isString));
  return isObject(item) && isString(item.name) && isNumber(item.price) && isNumber(item.cost) && isString(item.color) && paymentsOk;
}

function checkSale(item: unknown) {
  return isObject(item) && isString(item.product) && isNumber(item.price) && isNumber(item.cost) && isString(item.payment) && isString(item.timestamp) && !Number.isNaN(Date.parse(item.timestamp as string));
}

function checkCost(item: unknown) {
  return isObject(item) && isString(item.id) && isString(item.name) && isNumber(item.amount);
}

/** Returns the first problem in `list`, or null. */
function checkList(list: unknown, check: (item: unknown) => boolean, label: string): string | null {
  if (!Array.isArray(list)) return `${label} is not a list`;
  const bad = list.findIndex((item) => !check(item));
  return bad >= 0 ? `${label}: item ${bad + 1} is damaged or incomplete` : null;
}

const isDateString = (value: unknown) => isString(value) && !Number.isNaN(Date.parse(value as string));

function checkLiveEvent(value: unknown): string | null {
  const ok = isObject(value) && isString(value.id) && isDateString(value.startedAt) && (value.name === null || isString(value.name)) && Array.isArray(value.dayBreaks) && value.dayBreaks.every(isDateString);
  return ok ? null : 'Current event is damaged or incomplete';
}

function checkEvent(event: unknown, index: number): string | null {
  const label = `Event ${index + 1}`;
  if (!isObject(event) || !isString(event.id) || !isString(event.name) || !isDateString(event.startedAt) || !isDateString(event.endedAt) || !Array.isArray(event.dayBreaks) || !event.dayBreaks.every(isDateString)) {
    return `${label} is damaged or incomplete`;
  }
  return checkList(event.products, checkProduct, `${label} products`) ?? checkList(event.sales, checkSale, `${label} sales`) ?? checkList(event.expenses, checkCost, `${label} expenses`);
}

const CHECKS: Record<string, (value: unknown) => string | null> = {
  cntrProducts: (value) => checkList(value, checkProduct, 'Products'),
  cntrProductHistory: (value) => checkList(value, checkProduct, 'Product history'),
  cntrSales: (value) => checkList(value, checkSale, 'Sales'),
  cntrEventCosts: (value) => checkList(value, checkCost, 'Expenses'),
  cntrLiveEvent: checkLiveEvent,
  cntrEvents: (value) => (Array.isArray(value) ? value.map(checkEvent).find(Boolean) ?? null : 'Events is not a list'),
  cntrSettings: (value) => (isObject(value) ? null : 'Settings are damaged'),
};

/** Validates a backup file completely before anything is changed. On success returns the values to store. */
export function parseBackup(text: string): ParsedBackup {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: 'This file is too large to be a CNTR backup.' };
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This file is not a CNTR backup (it is not valid JSON). It may be damaged or cut off.' };
  }
  if (!isObject(file) || file.app !== BACKUP_APP || !isObject(file.data)) return { ok: false, error: 'This file is not a CNTR backup.' };
  if (file.format !== BACKUP_FORMAT) return { ok: false, error: 'This backup was made by a newer version of CNTR. Update the app, then try again.' };

  const data = file.data;
  const values = new Map<string, string>();
  for (const key of DATA_KEYS) {
    if (!(key in data)) continue;
    const problem = CHECKS[key](data[key]);
    if (problem) return { ok: false, error: `The backup is damaged, so nothing was changed. ${problem}.` };
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
  type StoredEvent = { name: string | null; dayBreaks: string[]; sales: StoredSale[] };
  const rows: (string | number)[][] = [['Event', 'Day', 'Time', 'Product', 'Payment', 'Price', 'Cost']];
  const add = (name: string, dayBreaks: string[], sales: StoredSale[]) => {
    const days = splitDays(sales.map((sale) => ({ ...sale, timestamp: new Date(sale.timestamp) })), dayBreaks);
    days.forEach((day, index) => {
      for (const sale of day) rows.push([name, index + 1, sale.timestamp.toISOString(), sale.product, sale.payment, sale.price, sale.cost]);
    });
  };
  const live = isObject(backup.data.cntrLiveEvent) ? (backup.data.cntrLiveEvent as StoredEvent) : null;
  if (Array.isArray(backup.data.cntrSales)) add(live?.name || 'Current event', live?.dayBreaks ?? [], backup.data.cntrSales as StoredSale[]);
  const events = Array.isArray(backup.data.cntrEvents) ? (backup.data.cntrEvents as StoredEvent[]) : [];
  for (const event of events) add(event.name ?? '', event.dayBreaks, event.sales);
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
