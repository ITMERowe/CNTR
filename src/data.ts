import type { Product } from './types';

export const defaultProducts: Product[] = [
  { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
  { name: 'Cheki', price: 35000, cost: 17000, color: '#31b500' },
  { name: 'Poster', price: 30000, cost: 15000, color: '#f16900' },
  { name: 'Photocard', price: 15000, cost: 7000, color: '#d49762' },
  { name: 'Sticker', price: 5000, cost: 1500, color: '#c8070b' },
  { name: 'Acrylic Stand', price: 45000, cost: 25000, color: '#9b48ad' },
  { name: 'Keychain', price: 20000, cost: 9000, color: '#d8b800' },
  { name: 'Tote Bag', price: 50000, cost: 30000, color: '#5f6d77' },
];

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
