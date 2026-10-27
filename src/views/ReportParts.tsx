import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { fmt } from '../formatters';
import { paymentClass, paymentsInUse } from '../payments';
import type { ProductTotals } from '../reports';
import type { SaleRecord } from '../types';
import type { IconName } from '../ui/icons';
import { Icon } from './Icon';
import { t, tn } from '../i18n';

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
export function Hero({ label, value, meta, tone }: { label: string; value: string; meta?: ComponentChildren; tone?: 'negative' }) {
  return (
    <section class="report-hero">
      <span class="eyebrow">{label}</span>
      <span class={tone === 'negative' ? 'hero-figure is-negative' : 'hero-figure'} style={{ '--chars': value.length }}>{value}</span>
      {meta && <span class="hero-meta">{meta}</span>}
    </section>
  );
}

export function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  return (
    <div class="kpi">
      <span class="kpi-label">{label}</span>
      <span class={tone ? `kpi-value ${tone}` : 'kpi-value'}>{value}</span>
      {hint && <span class="kpi-hint">{hint}</span>}
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

/** The payment methods used, as one part-to-whole bar with a labelled legend (never colour alone). */
export function PaymentSplit({ sales }: { sales: SaleRecord[] }) {
  const parts = paymentsInUse(sales).map((payment) => {
    const matching = sales.filter((sale) => sale.payment === payment);
    return { payment, count: matching.length, amount: matching.reduce((sum, sale) => sum + sale.price, 0) };
  });
  const total = parts.reduce((sum, part) => sum + part.amount, 0);

  return (
    <div class="split">
      <div class="split-bar" role="img" aria-label={parts.map((part) => `${part.payment} ${fmt(part.amount)}`).join(', ')}>
        {total > 0 ? (
          parts
            .filter((part) => part.amount > 0)
            .map((part) => <span key={part.payment} class={`split-seg ${paymentClass(part.payment)}`} style={{ flexGrow: part.amount }} />)
        ) : (
          <span class="split-seg seg-empty" style={{ flexGrow: 1 }} />
        )}
      </div>
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

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** Sales per hour. Emphasis form: the busiest hour in ink, the rest recessive. Tap a column to read it. */
export function HourChart({ sales }: { sales: SaleRecord[] }) {
  const counts = new Map<number, number>();
  for (const sale of sales) {
    const hour = new Date(sale.timestamp).getHours();
    counts.set(hour, (counts.get(hour) ?? 0) + 1);
  }
  const hours = [...counts.keys()].sort((a, b) => a - b);
  const [selected, setSelected] = useState<number | null>(null);
  if (hours.length < 2) {
    // One column is not a chart; say it in words instead.
    return hours.length ? <p class="chart-note">{t('chart.allBetween', { sales: tn('count.sale', sales.length), from: hourLabel(hours[0]), to: hourLabel((hours[0] + 1) % 24) })}</p> : null;
  }

  const range = Array.from({ length: hours[hours.length - 1] - hours[0] + 1 }, (_, i) => hours[0] + i);
  const max = Math.max(...counts.values());
  const peak = range.find((hour) => counts.get(hour) === max)!;
  const focus = selected ?? peak;
  const labelEvery = range.length > 8 ? 2 : 1;

  return (
    <figure class="chart" aria-label={t('chart.busiestLabel', { hour: hourLabel(peak), sales: tn('count.sale', max) })}>
      <figcaption class="chart-caption">
        <strong>{hourLabel(focus)}</strong> · {tn('count.sale', counts.get(focus) ?? 0)}
        {focus === peak && <span class="chip">{t('chart.busiest')}</span>}
      </figcaption>
      <div class="chart-plot">
        {range.map((hour, index) => {
          const count = counts.get(hour) ?? 0;
          return (
            <button
              key={hour}
              type="button"
              class={`chart-col${hour === peak ? ' is-peak' : ''}${hour === focus ? ' is-focus' : ''}`}
              style={{ '--i': index }}
              aria-label={`${hourLabel(hour)}: ${tn('count.sale', count)}`}
              aria-pressed={hour === focus}
              onClick={() => setSelected(hour === selected ? null : hour)}
            >
              <span class="chart-bar" style={{ height: `${count ? Math.max(4, (count / max) * 100) : 0}%` }} />
            </button>
          );
        })}
      </div>
      <div class="chart-axis" aria-hidden="true">
        {range.map((hour, index) => (
          <span key={hour}>{index % labelEvery === 0 ? String(hour).padStart(2, '0') : ''}</span>
        ))}
      </div>
    </figure>
  );
}

/** Ranked product rows: swatch + name, profit and revenue; units and share on the right; thin bar below. */
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
              <span class="rank-count">{tn('count.sale', item.count)}</span>
            </div>
            <div class="rank-meta">
              <span class={`rank-profit ${profitClass(item.profit)}`}>{t('profit.amount', { amount: fmt(item.profit) })}</span>
              <span class="rank-revenue">{fmt(item.revenue)}</span>
            </div>
            <div class="rank-track" aria-hidden="true">
              <span class="rank-fill" style={{ width: `${share > 0 ? Math.max(2, share) : 0}%`, background: item.color || 'var(--text-3)' }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
