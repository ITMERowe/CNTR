export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'AUD' | 'GBP' | 'JPY' | 'MYR';

export type ReportType = 'sales' | 'event';

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

export interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
  type: ReportType;
  products: Product[];
  sales: SaleRecord[];
  eventCosts: EventCost[];
}

/** Sales imported into the live event screen. */
export interface ImportedEventReport {
  sales: SaleRecord[];
  products: Product[];
}

/** What the event screen is showing: a previewed saved event report, or the live imported event. */
export interface EventView {
  hasReport: boolean;
  sales: SaleRecord[];
  products: Product[];
  eventCosts: EventCost[];
}

export interface AppSettings {
  currency: Currency;
  compactMoney: boolean;
}
