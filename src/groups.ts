// Product groups: variants (Poster A3, Poster A4) are ordinary products with a `group`; the group only gathers them into one Sell tile.
import { MAX_NAME } from './backup.ts';
import { generateUUID } from './data.ts';
import type { Product } from './types.ts';

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** The product's real name: "Group Variant", unless the variant already starts with the group as a whole word ("POSTER set", not "Posters"). */
export function groupedName(group: string, variant: string) {
  if (!group) return variant;
  if (!variant) return group;
  const rest = variant.slice(group.length);
  return same(variant.slice(0, group.length), group) && (rest === '' || rest.startsWith(' ')) ? variant : `${group} ${variant}`;
}

/** What a variant's Sell row shows: its name without the "Group " the editor added. */
export function variantLabel(product: Product) {
  return product.group && product.name.startsWith(`${product.group} `) ? product.name.slice(product.group.length + 1) : product.name;
}

/** Sell tiles in order: an ungrouped product alone, a group's variants together where its first variant is. */
export function groupTiles(products: Product[]) {
  const tiles: Product[][] = [];
  const byGroup = new Map<string, Product[]>();
  for (const product of products) {
    const key = product.group?.toLowerCase();
    const tile = key ? byGroup.get(key) : undefined;
    if (tile) {
      tile.push(product);
      continue;
    }
    tiles.push([product]);
    if (key) byGroup.set(key, tiles[tiles.length - 1]);
  }
  return tiles;
}

/** The products of `group` (any case). */
export function groupMembers(products: Product[], group: string) {
  return group ? products.filter((product) => !!product.group && same(product.group, group)) : [];
}

/** One row of the editor's group form; `id` is set for a variant that already exists. */
export interface VariantRow {
  id?: string;
  variant: string;
  price: number;
  cost: number;
}

const filled = (rows: VariantRow[]) => rows.filter((row) => row.id || row.variant.trim() || row.price || row.cost);
const realName = (group: string, row: VariantRow) => groupedName(group, row.variant.trim()).slice(0, MAX_NAME);

export type GroupPlan = { ok: true; save: Product[]; remove: Product[] } | { ok: false; error: 'groupName' | 'noVariant' | 'twice' | 'nameTaken' | 'groupTaken'; name?: string };

/**
 * What saving the group form changes, or why it can't (then nothing is saved). `members` are the group's products before
 * the edit; `others` every other product, active or hidden. Existing variants keep their ids, so sales and expense links follow.
 */
export function planGroup(groupName: string, rows: VariantRow[], shared: { color: string; payments: string[] }, members: Product[], others: Product[]): GroupPlan {
  const group = groupName.trim();
  if (!group) return { ok: false, error: 'groupName' };
  const kept = filled(rows);
  if (!kept.length) return { ok: false, error: 'noVariant' };
  if (others.some((product) => product.group && same(product.group, group))) return { ok: false, error: 'groupTaken', name: group };
  const save: Product[] = [];
  for (const row of kept) {
    const name = realName(group, row);
    if (save.some((product) => same(product.name, name))) return { ok: false, error: 'twice', name };
    const before = members.find((product) => product.id === row.id);
    // Only a changed name is checked: older data may hold names differing only in case, and those must stay editable.
    if (name !== before?.name && nameTaken(name, others)) return { ok: false, error: 'nameTaken', name };
    save.push({ ...before, id: before?.id ?? generateUUID(), name, price: row.price, cost: row.cost, color: shared.color, payments: [...shared.payments], group });
  }
  return { ok: true, save, remove: members.filter((product) => !save.some((saved) => saved.id === product.id)) };
}

/** Switching Group off: possible with exactly one variant, which becomes a normal product keeping its full real name. */
export function ungroup(group: string, rows: VariantRow[]) {
  const kept = filled(rows);
  return kept.length === 1 ? { id: kept[0].id, name: realName(group.trim(), kept[0]), price: kept[0].price, cost: kept[0].cost } : null;
}

/** Names are identity, so two that differ only in case would look like one product: refused. `originalName` is the product being renamed. */
export function nameTaken(name: string, products: Product[], originalName: string | null = null) {
  return products.some((product) => same(product.name, name) && product.name !== originalName);
}
