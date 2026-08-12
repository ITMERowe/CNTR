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
  type: 'sales' | 'event';
  products: Product[];
  sales: SaleRecord[];
  eventCosts: EventCost[];
}
