import type { ComponentChildren } from 'preact';
import { fmt, splitFigure } from '../formatters';
import { paymentClass, paymentsInUse } from '../payments';
import type { ProductTotals } from '../reports';
import type { eventHighlights } from '../summary';
import type { SaleRecord } from '../types';
import type { IconName } from '../ui/icons';
import { Icon } from './Icon';
import { locale, t, tn } from '../i18n';

const signed = (pct: number) => `${pct > 0 ? '+' : ''}${pct}%`;
/** A template with "one|other" forms (English), picked by n like tn(). */
const plural = (text: string, n: number) => text.split('|')[n === 1 ? 0 : text.split('|').length - 1];

/** An ended event's report opens with a few plain sentences: arithmetic on its own numbers, no advice (owner, 0.1.2). */
export function Highlights({ h }: { h: ReturnType<typeof eventHighlights> }) {
  const lines: string[] = [];
  if (h.net < 0 && h.breakEvenSales) lines.push(plural(t('hl.short', { amount: fmt(-h.net), n: h.breakEvenSales }), h.breakEvenSales));
  else if (h.net >= 0) lines.push(t('hl.made', { amount: fmt(h.net) }));
  const best = h.bestDayChange;
  if (best) {
    const values = { day: best.day, vs: best.vsDay, sales: signed(best.salesPct ?? 0) };
    lines.push(best.revenuePct === null ? t('hl.bestDaySales', values) : t('hl.bestDay', { ...values, revenue: signed(best.revenuePct) }));
  }
  if (h.topGroup && h.topGroup.share < 100) lines.push(t('hl.topGroup', { name: h.topGroup.name, share: Math.round(h.topGroup.share) }));
  const cost = h.biggestExpense;
  if (cost) {
    // The only expense is 100% of costs: say what it cost instead. Past tense only when the sales made really covered it.
    const what = cost.shareOfExpenses >= 100 ? t('hl.expenseSingle', { name: cost.name, amount: fmt(cost.amount) }) : t('hl.expenseOnly', { name: cost.name, share: Math.round(cost.shareOfExpenses) });
    const n = cost.salesToCover;
    const cover = !n ? '' : n <= h.salesCount ? plural(t('hl.covered', { n }), n) : t('hl.notCovered', { n, made: h.salesCount });
    lines.push(cover ? `${what} ${cover}` : what);
  }
  const busy = h.busiestWindow;
  if (busy) {
    const time = (date: Date) => date.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    const end = new Date(busy.start.getTime() + 30 * 60000);
    const values = { day: busy.day, from: time(busy.start), to: time(end), n: busy.count, amount: fmt(busy.revenue) };
    lines.push(t(h.days.filter((day) => day.count).length > 1 ? 'hl.busyDay' : 'hl.busy', values));
  }
  return (
    <ul class="highlights">
      {lines.map((line) => <li key={line}>{line}</li>)}
    </ul>
  );
}

export function profitClass(value: number) {
  return value < 0 ? 'is-negative' : value === 0 ? 'is-zero' : 'is-positive';
}

export function Card({ title, action, children, class: className }: { title?: string; action?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={className ? `card ${className}` : 'card'}>
      {(title || action) && (
        <div class="card-head">
          {title && <h2 class="card-title">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** The one headline number of a view. */
export function Hero({ label, value, tone }: { label: string; value: string; tone?: 'negative' }) {
  const { sign, symbol, number } = splitFigure(value);
  return (
    <section class="report-hero">
      <span class="eyebrow">{label}</span>
      <span class={tone === 'negative' ? 'hero-figure is-negative' : 'hero-figure'} style={{ '--chars': value.length }}>
        {sign}
        <span class="hero-figure-symbol">{symbol}</span> {number}
      </span>
    </section>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div class="kpi">
      <span class="kpi-text">
        <span class="kpi-label">{label}</span>
        {hint && <span class="kpi-hint">{hint}</span>}
      </span>
      <span class={tone ? `kpi-value ${tone}` : 'kpi-value'}>{value}</span>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: IconName; title: string; text?: string; action?: ComponentChildren }) {
  return (
    <div class="empty">
      <span class="empty-icon">
        <Icon name={icon} />
      </span>
      <strong class="empty-title">{title}</strong>
      {text && <p class="empty-text">{text}</p>}
      {action}
    </div>
  );
}

/** Donut ring geometry: r = 100 / 2π, so the circumference is 100 and dash lengths are percentages. */
const RING_R = 15.9155;
/** Surface gap between segments, in circumference units (about 2px at the drawn size). */
const RING_GAP = 1;

/** The payment methods used, as a part-to-whole donut with a labelled legend beside it (never colour alone). */
export function PaymentSplit({ sales }: { sales: SaleRecord[] }) {
  const parts = paymentsInUse(sales).map((payment) => {
    const matching = sales.filter((sale) => sale.payment === payment);
    return { payment, count: matching.length, amount: matching.reduce((sum, sale) => sum + sale.price, 0) };
  });
  const total = parts.reduce((sum, part) => sum + part.amount, 0);
  const drawn = parts.filter((part) => part.amount > 0);
  // One method (or no money yet) is a full ring with no gap.
  const gap = drawn.length > 1 ? RING_GAP : 0;
  let start = 0;

  return (
    <div class="split">
      <svg class="donut" viewBox="0 0 42 42" role="img" aria-label={parts.map((part) => `${part.payment} ${fmt(part.amount)}`).join(', ')}>
        {total > 0 ? (
          drawn.map((part) => {
            const length = (part.amount / total) * 100;
            const seg = (
              <circle
                key={part.payment}
                class={`donut-seg ${paymentClass(part.payment)}`}
                cx="21"
                cy="21"
                r={RING_R}
                stroke-dasharray={`${Math.max(length - gap, 0.01)} ${100 - Math.max(length - gap, 0.01)}`}
                stroke-dashoffset={-start}
              />
            );
            start += length;
            return seg;
          })
        ) : (
          <circle class="donut-seg seg-empty" cx="21" cy="21" r={RING_R} />
        )}
      </svg>
      <div class="split-legend">
        {parts.map((part) => (
          <div class="split-item" key={part.payment}>
            <span class={`swatch ${paymentClass(part.payment)}`} aria-hidden="true" />
            <span class="split-name">{part.payment}</span>
            <span class="split-share">{total ? Math.round((part.amount / total) * 100) : 0}%</span>
            <span class="split-amount">
              {fmt(part.amount)}
              <small>{tn('count.sale', part.count)}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Ranked product rows, two lines each: swatch + name + revenue; then units (and profit when it differs from revenue) beside a share bar. */
export function ProductRows({ rows, totalUnits }: { rows: ProductTotals[]; totalUnits: number }) {
  return (
    <div class="rank">
      {rows.map((item, index) => {
        const share = totalUnits ? (item.count / totalUnits) * 100 : 0;
        return (
          <div class="product-row" key={item.name} style={{ '--i': index }}>
            <div class="rank-main">
              <span class="swatch" style={{ background: item.color || 'var(--text-3)' }} aria-hidden="true" />
              <span class="rank-name">{item.name}</span>
              <span class="rank-revenue">{fmt(item.revenue)}</span>
            </div>
            <div class="rank-meta">
              <span class="rank-count">
                {tn('count.sale', item.count)}
                {/* Always shown, even when it equals revenue (no item cost, e.g. paid by a linked expense): owner, 0.1.2. */}
                <span class="rank-profit-part">
                  {' · '}
                  <span class={`rank-profit ${profitClass(item.profit)}`}>{t('profit.amount', { amount: fmt(item.profit) })}</span>
                </span>
              </span>
              <span class="rank-track" aria-hidden="true">
                <span class="rank-fill" style={{ width: `${share > 0 ? Math.max(2, share) : 0}%`, background: item.color || 'var(--text-3)' }} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
