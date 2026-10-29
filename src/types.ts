export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR';

export interface Product {
  /** Links sales to the product (a new product reusing a deleted one's name gets a new id). Given at load to older data. */
  id?: string;
  name: string;
  price: number;
  cost: number;
  color: string;
  /** 1 or 2 of PAYMENT_METHODS (payments.ts); missing on older data, which means Cash + QRIS. */
  payments?: string[];
}

export interface SaleRecord {
  product: string;
  /** The product's id; missing on sales from before ids, which match by name. */
  productId?: string;
  price: number;
  cost: number;
  payment: string;
  timestamp: Date;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface EventCost {
  id: string;
  name: string;
  amount: number;
  /** Products this expense pays for (e.g. a print run): in its event they subtract no item cost (see withLinkedCosts). Optional; older data has none. */
  productIds?: string[];
}

/** The live event's name and day breaks; its sales and expenses are the live `cntrSales` and `cntrEventCosts`. */
export interface LiveEventMeta {
  id: string;
  /** null: show the default name ("Event <date of the first sale>"). */
  name: string | null;
  startedAt: string;
  /** ISO times End day was pressed. */
  dayBreaks: string[];
}

/** A finished event in History. `products` is a snapshot of what it sold (colours and prices for edits). */
export interface PastEvent {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string;
  dayBreaks: string[];
  products: Product[];
  sales: SaleRecord[];
  expenses: EventCost[];
}

export interface AppSettings {
  currency: Currency;
  compactMoney: boolean;
  /** Event screen: one Products card per day instead of one for the whole event. */
  productsPerDay: boolean;
  /** The first sale on a new calendar date starts a new day by itself (as if End day had been pressed). */
  newDayOnDateChange: boolean;
  /** Sell: best sellers today first (re-sorted only when Sell is opened, so a tile never moves mid-tap). */
  autoSort: boolean;
  /** Sell: shorter tiles (no price, smaller counters), so more fit on screen. */
  compactTiles: boolean;
  /** Soft tones on sales, undo and finished actions (vibration is separate and always on). */
  sound: boolean;
  /** Colour theme. Resolved from the phone's own setting once, the first time there is no stored choice yet; after that it is just Light/Dark, chosen in Settings. */
  theme: 'light' | 'dark';
  /** App language; chosen once on first launch (see initialLanguage), then only by the user. */
  language: 'en' | 'id';
}
