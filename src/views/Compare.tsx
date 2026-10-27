import type { ComponentChildren } from 'preact';
import { formatDay } from '../events';
import { fmt } from '../formatters';
import { compareProductCounts, getEventSummary } from '../reports';
import type { EventCost, PastEvent } from '../types';
import { Card, EmptyState } from './ReportParts';
import { t, tn } from '../i18n';

/** B's change from A, in neutral text: ▲/▼ say which way, never whether that is good. */
function Diff({ a, b, money }: { a: number; b: number; money: boolean }) {
  const delta = b - a;
  if (!delta) return null;
  const amount = money ? fmt(Math.abs(delta)) : String(Math.abs(delta));
  return (
    <span class="cmp-diff" aria-label={t(delta > 0 ? 'compare.more' : 'compare.less', { amount })}>
      {delta > 0 ? '▲' : '▼'} {amount}
    </span>
  );
}

/** One line: its label, then A and B under their event's column. `null` = the event has none ("—"). */
function Row({ label, a, b, money = true, metric }: { label: string; a: number | null; b: number | null; money?: boolean; metric?: string }) {
  const show = (value: number | null) =>
    value === null ? <span class="cmp-value cmp-missing">—</span> : <span class={`cmp-value${money && value < 0 ? ' is-negative' : ''}`}>{money ? fmt(value) : String(value)}</span>;
  return (
    <div class="cmp-row" data-metric={metric}>
      <span class="cmp-label">{label}</span>
      <span class="cmp-cell">{show(a)}</span>
      <span class="cmp-cell">
        {show(b)}
        {a !== null && b !== null && <Diff a={a} b={b} money={money} />}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <Card title={title}>
      <div class="cmp-rows">{children}</div>
    </Card>
  );
}

/** Expense totals by name (two "Parking" lines are one row), so both events line up row by row. */
function expenseTotals(expenses: EventCost[]) {
  const totals = new Map<string, number>();
  for (const cost of expenses) totals.set(cost.name, (totals.get(cost.name) ?? 0) + cost.amount);
  return totals;
}

const dayCount = (event: PastEvent) => event.dayBreaks.length + 1;

/** Two past events side by side: A (older) in the left column, B in the right with its change from A. */
export function CompareView({ events }: { events: PastEvent[] }) {
  const [left, right] = [...events].sort((x, y) => new Date(x.startedAt).getTime() - new Date(y.startedAt).getTime());
  if (!left || !right) return <EmptyState icon="chart" title={t('compare.nothing')} text={t('compare.nothingText')} />;

  const a = getEventSummary(left);
  const b = getEventSummary(right);
  const products = compareProductCounts(left, right, Infinity);
  const costsA = expenseTotals(left.expenses);
  const costsB = expenseTotals(right.expenses);
  const costNames = [...new Set([...costsA.keys(), ...costsB.keys()])].sort((x, y) => Math.max(costsB.get(y) ?? 0, costsA.get(y) ?? 0) - Math.max(costsB.get(x) ?? 0, costsA.get(x) ?? 0));
  const multiDay = dayCount(left) > 1 || dayCount(right) > 1;

  return (
    <div class="cmp">
      <div class="cmp-head">
        {[left, right].map((event, index) => (
          <div class="cmp-event" key={event.id}>
            <span class="cmp-tag">{index ? 'B' : 'A'}</span>
            <h2 class="cmp-name">{event.name}</h2>
            <span class="cmp-when">
              {formatDay(event.startedAt)} · {tn('count.day', dayCount(event))}
            </span>
          </div>
        ))}
      </div>

      <Section title={t('compare.results')}>
        <Row label={t('net_profit')} a={a.net} b={b.net} metric="net" />
        {multiDay && <Row label={t('compare.netPerDay')} a={Math.round(a.net / dayCount(left))} b={Math.round(b.net / dayCount(right))} />}
        <Row label={t('revenue')} a={a.revenue} b={b.revenue} />
        <Row label={t('profit')} a={a.profit} b={b.profit} />
        <Row label={t('expenses')} a={a.expenses} b={b.expenses} />
        <Row label={t('sales')} a={a.salesCount} b={b.salesCount} money={false} />
      </Section>

      {products.length > 0 && (
        <Section title={t('units_sold')}>
          {products.map((row) => (
            <Row key={row.name} label={row.name} a={row.leftCount} b={row.rightCount} money={false} />
          ))}
        </Section>
      )}

      {costNames.length > 0 && (
        <Section title={t('compare.expenseItems')}>
          {costNames.map((name) => (
            <Row key={name} label={name} a={costsA.get(name) ?? null} b={costsB.get(name) ?? null} />
          ))}
        </Section>
      )}
    </div>
  );
}
