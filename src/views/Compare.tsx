import { fmt } from '../formatters';
import { compareProductCounts, getReportSummary } from '../reports';
import type { ReportType, SavedReport } from '../types';
import { EmptyState } from './ReportParts';

interface Row {
  name: string;
  value: string;
  winner: boolean;
}

function Metric({ label, value, winner, negative = false }: { label: string; value: string; winner: boolean; negative?: boolean }) {
  return (
    <div class={`compare-metric${winner ? ' is-winner' : ''}${negative ? ' is-negative' : ''}`}>
      <span class="compare-label">{label}</span>
      <span class="compare-value">
        {value}
        {winner && <span class="sr-only"> (better)</span>}
      </span>
    </div>
  );
}

function RowList({ title, rows }: { title: string; rows: Row[] }) {
  if (!rows.length) return null;
  return (
    <div class="compare-group">
      <span class="compare-group-title">{title}</span>
      {rows.map((row) => (
        <div class={row.winner ? 'compare-line is-winner' : 'compare-line'} key={row.name}>
          <span class="compare-line-name">{row.name}</span>
          <span class="compare-line-value">
            {row.value}
            {row.winner && <span class="sr-only"> (better)</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One report's column. Winners are the better value of `report` versus `other`. */
function CompareCard({ label, type, report, other, products }: { label: string; type: ReportType; report: SavedReport; other: SavedReport; products: Row[] }) {
  const mine = getReportSummary(report);
  const theirs = getReportSummary(other);
  const net = mine.revenue - mine.expenses;

  const expenseRows = [...new Set([...report.eventCosts, ...other.eventCosts].map((cost) => cost.name))]
    .map((name) => {
      const value = report.eventCosts.find((cost) => cost.name === name)?.amount ?? 0;
      const otherValue = other.eventCosts.find((cost) => cost.name === name)?.amount ?? 0;
      return { name, amount: value, value: fmt(value), winner: value < otherValue };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div class="compare-card">
      <div class="compare-card-head">
        <span class="compare-badge">{label}</span>
        <h3 class="compare-name">{report.name}</h3>
      </div>
      {type === 'sales' ? (
        <>
          <Metric label="Revenue" value={fmt(mine.revenue)} winner={mine.revenue > theirs.revenue} />
          <Metric label="Profit" value={fmt(mine.profit)} winner={mine.profit > theirs.profit} />
          <Metric label="Margin" value={`${mine.margin.toFixed(1)}%`} winner={mine.margin > theirs.margin} />
          <Metric label="Sales" value={String(mine.salesCount)} winner={mine.salesCount > theirs.salesCount} />
        </>
      ) : (
        <>
          <Metric label={net < 0 ? 'Deficit' : 'Net profit'} value={fmt(net)} winner={net > theirs.revenue - theirs.expenses} negative={net < 0} />
          <Metric label="Revenue" value={fmt(mine.revenue)} winner={mine.revenue > theirs.revenue} />
          <Metric label="Profit" value={fmt(mine.profit)} winner={mine.profit > theirs.profit} />
          <Metric label="Expenses" value={fmt(mine.expenses)} winner={mine.expenses < theirs.expenses} />
          <RowList title="Expenses" rows={expenseRows} />
        </>
      )}
      <RowList title="Units sold" rows={products} />
    </div>
  );
}

export function CompareView({ type, reports }: { type: ReportType; reports: SavedReport[] }) {
  const [left, right] = reports;
  if (!left || !right) return <EmptyState icon="chart" title="Nothing to compare" text={`Select two saved ${type} reports to compare.`} />;

  const counts = compareProductCounts(left, right);
  const rowsFor = (side: 'left' | 'right') =>
    counts.map((row) => {
      const [mine, theirs] = side === 'left' ? [row.leftCount, row.rightCount] : [row.rightCount, row.leftCount];
      return { name: row.name, value: String(mine), winner: mine > theirs };
    });

  return (
    <div class="compare">
      <CompareCard label="A" type={type} report={left} other={right} products={rowsFor('left')} />
      <CompareCard label="B" type={type} report={right} other={left} products={rowsFor('right')} />
    </div>
  );
}
