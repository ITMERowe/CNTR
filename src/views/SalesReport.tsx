import { fmt } from '../formatters';
import { buildProductBreakdown, marginPercent, plural, totals } from '../reports';
import type { Product, SaleRecord } from '../types';
import { Card, EmptyState, Hero, HourChart, Kpi, PaymentSplit, ProductRows } from './ReportParts';

interface Props {
  sales: SaleRecord[];
  products: Product[];
  colorFor: (name: string) => string;
}

export function SalesReport({ sales, products, colorFor }: Props) {
  const { revenue, profit } = totals(sales);
  const rows = buildProductBreakdown(sales, products, colorFor).sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  const sold = rows.filter((row) => row.count > 0);
  const unsold = rows.filter((row) => row.count === 0);
  const average = sales.length ? Math.round(revenue / sales.length) : 0;

  return (
    <>
      <Hero label="Revenue" value={fmt(revenue)} meta={sales.length ? `${plural(sales.length, 'sale')} recorded` : 'No sales recorded yet'} />
      <div class="kpi-row">
        <Kpi label="Profit" value={fmt(profit)} hint={`${marginPercent(revenue, profit).toFixed(1)}% margin`} tone={profit < 0 ? 'is-negative' : undefined} />
        <Kpi label="Average sale" value={fmt(average)} hint={sales.length ? 'per transaction' : '–'} />
      </div>

      {sales.length > 0 && (
        <Card title="Payment mix">
          <PaymentSplit sales={sales} />
        </Card>
      )}

      {sales.length > 0 && (
        <Card title="Sales by hour">
          <HourChart sales={sales} />
        </Card>
      )}

      <Card title="Products">
        {sold.length > 0 && <ProductRows rows={sold} totalUnits={sales.length} />}
        {unsold.length > 0 && (
          <p class={sold.length ? 'card-note unsold' : 'card-note'}>
            {sold.length ? 'Not sold yet: ' : 'No sales yet for '}
            {unsold.map((row) => row.name).join(', ')}
          </p>
        )}
        {!rows.length && <EmptyState icon="package" title="No products yet" text="Add products from the Sell tab." />}
      </Card>
    </>
  );
}
