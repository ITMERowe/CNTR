import { fmt } from '../formatters';
import { compareProductCounts, getEventSummary } from '../reports';
import type { PastEvent } from '../types';
import { EmptyState } from './ReportParts';
import { t } from '../i18n';

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
        {winner && <span class="sr-only">{t('better')}</span>}
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
            {row.winner && <span class="sr-only">{t('better')}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** One event's column. Winners are the better value of `event` versus `other`. */
function CompareCard({ label, event, other, products }: { label: string; event: PastEvent; other: PastEvent; products: Row[] }) {
  const mine = getEventSummary(event);
  const theirs = getEventSummary(other);

  const expenseRows = [...new Set([...event.expenses, ...other.expenses].map((cost) => cost.name))]
    .map((name) => {
      const value = event.expenses.find((cost) => cost.name === name)?.amount ?? 0;
      const otherValue = other.expenses.find((cost) => cost.name === name)?.amount ?? 0;
      return { name, amount: value, value: fmt(value), winner: value < otherValue };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div class="compare-card">
      <div class="compare-card-head">
        <span class="compare-badge">{label}</span>
        <h3 class="compare-name">{event.name}</h3>
      </div>
      <Metric label={mine.net < 0 ? t('deficit') : t('net_profit')} value={fmt(mine.net)} winner={mine.net > theirs.net} negative={mine.net < 0} />
      <Metric label={t('revenue')} value={fmt(mine.revenue)} winner={mine.revenue > theirs.revenue} />
      <Metric label={t('profit')} value={fmt(mine.profit)} winner={mine.profit > theirs.profit} />
      <Metric label={t('expenses')} value={fmt(mine.expenses)} winner={mine.expenses < theirs.expenses} />
      <Metric label={t('sales')} value={String(mine.salesCount)} winner={mine.salesCount > theirs.salesCount} />
      <RowList title={t('expenses')} rows={expenseRows} />
      <RowList title={t('units_sold')} rows={products} />
    </div>
  );
}

export function CompareView({ events }: { events: PastEvent[] }) {
  const [left, right] = events;
  if (!left || !right) return <EmptyState icon="chart" title={t('compare.nothing')} text={t('compare.nothingText')} />;

  const counts = compareProductCounts(left, right);
  const rowsFor = (side: 'left' | 'right') =>
    counts.map((row) => {
      const [mine, theirs] = side === 'left' ? [row.leftCount, row.rightCount] : [row.rightCount, row.leftCount];
      return { name: row.name, value: String(mine), winner: mine > theirs };
    });

  return (
    <div class="compare">
      <CompareCard label="A" event={left} other={right} products={rowsFor('left')} />
      <CompareCard label="B" event={right} other={left} products={rowsFor('right')} />
    </div>
  );
}
