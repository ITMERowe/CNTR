// Bundled SVG icons (Lucide), so icons render offline. Static markup uses <i data-icon="name">,
// replaced once at startup by hydrateIcons(); Preact views use views/Icon.tsx.
import {
  ArchiveRestore,
  ArrowLeft,
  Banknote,
  CreditCard,
  ChartColumn,
  ChevronRight,
  DatabaseBackup,
  FileSpreadsheet,
  Gift,
  GraduationCap,
  HandCoins,
  History,
  Landmark,
  Inbox,
  Info,
  Minus,
  EllipsisVertical,
  Package,
  Pencil,
  Plus,
  QrCode,
  Settings,
  Tent,
  Trash2,
  X,
  type IconNode,
  Wallet,
} from 'lucide';

export const ICONS = {
  'arrow-left': ArrowLeft,
  backup: DatabaseBackup,
  csv: FileSpreadsheet,
  restore: ArchiveRestore,
  banknote: Banknote,
  'credit-card': CreditCard,
  landmark: Landmark,
  wallet: Wallet,
  gift: Gift,
  chart: ChartColumn,
  'chevron-right': ChevronRight,
  sell: HandCoins,
  history: History,
  inbox: Inbox,
  info: Info,
  tutorial: GraduationCap,
  minus: Minus,
  more: EllipsisVertical,
  package: Package,
  pencil: Pencil,
  plus: Plus,
  qr: QrCode,
  settings: Settings,
  event: Tent,
  trash: Trash2,
  close: X,
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof ICONS;

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Shared SVG attributes: 24-unit grid, 2px round strokes, sized by CSS (1em by default). */
export const SVG_ATTRS = {
  xmlns: SVG_NS,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  focusable: 'false',
} as const;

export function createIconElement(name: IconName) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  for (const [key, value] of Object.entries(SVG_ATTRS)) svg.setAttribute(key, value);
  svg.setAttribute('class', 'icon');
  for (const [tag, attrs] of ICONS[name]) {
    const child = document.createElementNS(SVG_NS, tag);
    for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, String(value));
    svg.appendChild(child);
  }
  return svg;
}

/** Replaces every <i data-icon="name"> in static markup with its SVG. */
export function hydrateIcons(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('i[data-icon]').forEach((placeholder) => {
    const name = placeholder.dataset.icon as IconName;
    if (name in ICONS) placeholder.replaceWith(createIconElement(name));
  });
}
