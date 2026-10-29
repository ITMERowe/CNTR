// Product groups: variants (Poster A3, Poster A4) are ordinary products with a `group`; the group only gathers them into one Sell tile.
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

/** The products of `group` (any case), skipping the one named `exceptName` (the product being edited). */
export function groupMembers(products: Product[], group: string, exceptName: string | null = null) {
  return group ? products.filter((product) => product.name !== exceptName && !!product.group && same(product.group, group)) : [];
}

/** Gives every variant of `group` the group's colour and payment methods. */
export function syncGroup(products: Product[], group: string, color: string, payments: string[]) {
  for (const product of groupMembers(products, group)) Object.assign(product, { color, payments: [...payments] });
}

/** Names are identity, so two that differ only in case would look like one product: refused. `originalName` is the product being renamed. */
export function nameTaken(name: string, products: Product[], originalName: string | null = null) {
  return products.some((product) => same(product.name, name) && product.name !== originalName);
}
