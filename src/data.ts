import type { Product } from './types';

/** Upserts `product` into the history list, following a rename from `previousName`. */
export function ensureProductHistory(product: Product, productHistory: Product[], previousName?: string) {
  const lookupName = previousName ?? product.name;
  const existingIndex = productHistory.findIndex((item) => item.name === lookupName);

  if (existingIndex >= 0) {
    Object.assign(productHistory[existingIndex], product);
    const duplicateIndex = productHistory.findIndex((item, index) => index !== existingIndex && item.name === product.name);
    if (duplicateIndex >= 0) productHistory.splice(duplicateIndex, 1);
    return productHistory;
  }

  const duplicateIndex = productHistory.findIndex((item) => item.name === product.name);
  if (duplicateIndex >= 0) productHistory.splice(duplicateIndex, 1);
  productHistory.push({ ...product });
  return productHistory;
}

export function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
