import { fmt } from '../formatters';
import { buildProductBreakdown, marginPercent, plural, totals } from '../reports';
import type { Product, SaleRecord } from '../types';
import { ProductRows, ReportHero, SummaryTile } from './ReportParts';

interface Props {
  sales: SaleRecord[];
  products: Product[];
  colorFor: (name: string) => string;
}

export function SalesReport({ sales, products, colorFor }: Props) {
  const { revenue, profit, cash, qris } = totals(sales);
  const cashSales = sales.filter((sale) => sale.payment === 'Cash').length;
  const qrisSales = sales.filter((sale) => sale.payment === 'QRIS').length;
  const rows = buildProductBreakdown(sales, products, colorFor).sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  return (
    <div class="report-shell">
      <ReportHero
        title="Sales overview"
        subtitle={sales.length ? 'Revenue, profit, payment mix and best-selling products.' : 'Every sale you record will appear here.'}
      >
        <div class="summary-grid">
          <SummaryTile label="Revenue" value={fmt(revenue)} hint={plural(sales.length, 'sale')} />
          <SummaryTile label="Profit" value={fmt(profit)} hint={`${marginPercent(revenue, profit).toFixed(1)}% margin`} />
          <SummaryTile label="Cash" value={String(cashSales)} hint={`${fmt(cash)} via cash`} />
          <SummaryTile label="QRIS" value={String(qrisSales)} hint={`${fmt(qris)} via QRIS`} />
        </div>
      </ReportHero>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Product distribution</h2>
        </div>
        {rows.length ? <ProductRows rows={rows} totalUnits={sales.length} /> : <div class="empty-state">No products yet.</div>}
      </section>
    </div>
  );
}
