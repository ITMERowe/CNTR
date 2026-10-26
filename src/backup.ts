// Backup files: build, validate and turn into CSV. Type-only imports, so Node can test it directly.
import { DATA_KEYS } from './migrate.ts'; // explicit extension so `node --test` can load it

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
  savedReports: number;
  products: number;
}

export type ParsedBackup = { ok: true; values: Map<string, string>; summary: BackupSummary } | { ok: false; error: string };

/** Builds a backup from the stored JSON strings. Unparseable values are kept as strings rather than dropped. */
export function buildBackup(stored: Map<string, string>, now = new Date()): BackupFile {
  const data: Record<string, unknown> = {};
  for (const key of DATA_KEYS) {
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
  return isObject(item) && isString(item.name) && isNumber(item.price) && isNumber(item.cost) && isString(item.color);
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

function checkReport(report: unknown, index: number): string | null {
  const label = `Saved report ${index + 1}`;
  if (!isObject(report) || !isString(report.id) || !isString(report.name) || !isString(report.createdAt) || (report.type !== 'sales' && report.type !== 'event')) {
    return `${label} is damaged or incomplete`;
  }
  return checkList(report.products, checkProduct, `${label} products`) ?? checkList(report.sales, checkSale, `${label} sales`) ?? checkList(report.eventCosts, checkCost, `${label} expenses`);
}

const CHECKS: Record<string, (value: unknown) => string | null> = {
  cntrProducts: (value) => checkList(value, checkProduct, 'Products'),
  cntrProductHistory: (value) => checkList(value, checkProduct, 'Product history'),
  cntrSales: (value) => checkList(value, checkSale, 'Sales'),
  cntrEventCosts: (value) => checkList(value, checkCost, 'Expenses'),
  cntrSavedReports: (value) => (Array.isArray(value) ? value.map(checkReport).find(Boolean) ?? null : 'Saved reports is not a list'),
  cntrImportedEventReport: (value) => (value === null ? null : isObject(value) ? checkList(value.sales, checkSale, 'Event sales') ?? checkList(value.products, checkProduct, 'Event products') : 'Event data is damaged'),
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
    summary: { exportedAt: isString(file.exportedAt) ? (file.exportedAt as string) : '', sales: count('cntrSales'), savedReports: count('cntrSavedReports'), products: count('cntrProductHistory') || count('cntrProducts') },
  };
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Every recorded sale (current sales and saved reports) as CSV. Starts with a BOM so Excel reads UTF-8. */
export function salesCsv(backup: BackupFile): string {
  type Sale = { product: string; payment: string; price: number; cost: number; timestamp: string };
  const rows: (string | number)[][] = [['Report', 'Report type', 'Time', 'Product', 'Payment', 'Price', 'Cost']];
  const add = (report: string, type: string, sales: unknown) => {
    if (!Array.isArray(sales)) return;
    for (const sale of sales as Sale[]) rows.push([report, type, sale.timestamp, sale.product, sale.payment, sale.price, sale.cost]);
  };
  add('Current sales', 'live', backup.data.cntrSales);
  const reports = Array.isArray(backup.data.cntrSavedReports) ? (backup.data.cntrSavedReports as { name: string; type: string; sales: unknown }[]) : [];
  for (const report of reports) add(report.name, report.type, report.sales);
  return '﻿' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
