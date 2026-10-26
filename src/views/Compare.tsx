import { fmt } from '../formatters';
import { compareProductCounts, getReportSummary } from '../reports';
import type { ReportType, SavedReport } from '../types';

interface Row {
  name: string;
  value: number;
  winner: boolean;
}

function Metric({ label, value, winner, negative = false }: { label: string; value: string; winner: boolean; negative?: boolean }) {
  return (
    <div class={winner ? 'compare-metric compare-metric-winner' : 'compare-metric'}>
      <span>{label}</span>
      <span class={negative ? 'compare-metric-negative' : undefined}>{value}</span>
    </div>
  );
}

function ProductsSold({ rows }: { rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <div class="compare-product-list compare-product-list-inline">
      <div class="compare-product-section-title">Products sold</div>
      {rows.map((item) => (
        <div class="compare-product-row" key={item.name}>
          <div class="compare-product-name">
            <strong>{item.name}</strong>
          </div>
          <div class={item.winner ? 'compare-product-side winner' : 'compare-product-side'}>
            <span class="report-side-value">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/** One report's column. Winners are the better value of `report` versus `other`. */
function CompareCard({ type, report, other, products }: { type: ReportType; report: SavedReport; other: SavedReport; products: Row[] }) {
  const mine = getReportSummary(report);
  const theirs = getReportSummary(other);

  if (type === 'sales') {
    return (
      <div class="compare-card">
        <div class="compare-card-header">
          <h3>{report.name}</h3>
        </div>
        <Metric label="Revenue" value={fmt(mine.revenue)} winner={mine.revenue > theirs.revenue} />
        <Metric label="Profit" value={fmt(mine.profit)} winner={mine.profit > theirs.profit} />
        <Metric label="Margin" value={`${mine.margin.toFixed(1)}%`} winner={mine.margin > theirs.margin} />
        <Metric label="Sales" value={String(mine.salesCount)} winner={mine.salesCount > theirs.salesCount} />
        <ProductsSold rows={products} />
      </div>
    );
  }

  const net = mine.revenue - mine.expenses;
  const expenseNames = [...new Set([...report.eventCosts, ...other.eventCosts].map((cost) => cost.name))];
  const expenseRows = expenseNames
    .map((name) => {
      const value = report.eventCosts.find((cost) => cost.name === name)?.amount ?? 0;
      const otherValue = other.eventCosts.find((cost) => cost.name === name)?.amount ?? 0;
      return { name, value, winner: value < otherValue };
    })
    .sort((a, b) => b.value - a.value);

  return (
    <div class="compare-card">
      <div class="compare-card-header">
        <h3>{report.name}</h3>
      </div>
      <Metric label="Expenses" value={fmt(mine.expenses)} winner={mine.expenses < theirs.expenses} />
      <Metric label="Revenue" value={fmt(mine.revenue)} winner={mine.revenue > theirs.revenue} />
      <Metric label="Profit" value={fmt(mine.profit)} winner={mine.profit > theirs.profit} />
      <Metric label={net < 0 ? 'Deficit' : 'Net profit'} value={fmt(net)} winner={net > theirs.revenue - theirs.expenses} negative={net < 0} />
      {expenseRows.length > 0 && (
        <div class="compare-expense-list compare-product-list-inline">
          <div class="compare-product-section-title">Expenses</div>
          {expenseRows.map((item) => (
            <div class={item.winner ? 'compare-expense-row compare-expense-winner' : 'compare-expense-row'} key={item.name}>
              <span class="compare-expense-name">{item.name}</span>
              <span class="compare-expense-value">{fmt(item.value)}</span>
            </div>
          ))}
        </div>
      )}
      <ProductsSold rows={products} />
    </div>
  );
}

export function CompareView({ type, reports }: { type: ReportType; reports: SavedReport[] }) {
  const [left, right] = reports;
  if (!left || !right) return <div class="empty-state">Select two saved {type} reports to compare.</div>;

  const counts = compareProductCounts(left, right);
  const column = (label: string, report: SavedReport, other: SavedReport, side: 'left' | 'right') => (
    <div class="compare-report-column">
      <div class="compare-report-header">{label}</div>
      <CompareCard
        type={type}
        report={report}
        other={other}
        products={counts.map((row) => {
          const [mine, theirs] = side === 'left' ? [row.leftCount, row.rightCount] : [row.rightCount, row.leftCount];
          return { name: row.name, value: mine, winner: mine > theirs };
        })}
      />
    </div>
  );

  return (
    <div class="compare-sales-page">
      <div class="compare-report-columns">
        {column('Report A', left, right, 'left')}
        {column('Report B', right, left, 'right')}
      </div>
    </div>
  );
}
