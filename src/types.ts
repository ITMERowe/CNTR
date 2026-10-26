export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR';

export interface Product {
  name: string;
  price: number;
  cost: number;
  color: string;
}

export interface SaleRecord {
  product: string;
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
}
