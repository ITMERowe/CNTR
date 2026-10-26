import type { ComponentChildren } from 'preact';
import { fmt } from '../formatters';
import { plural, type ProductTotals } from '../reports';

export function profitClass(value: number) {
  return value < 0 ? 'profit is-negative' : value === 0 ? 'profit is-zero' : 'profit';
}

export function ReportHero({ title, subtitle, children }: { title: string; subtitle: string; children?: ComponentChildren }) {
  return (
    <section class="report-hero">
      <div class="report-hero-heading">
        <div>
          <h2 class="report-title">{title}</h2>
          <p class="report-subtitle">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SummaryTile({ label, value, hint, valueClass = 'value' }: { label: string; value: string; hint: string; valueClass?: string }) {
  return (
    <div class="summary-tile">
      <span class="label">{label}</span>
      <span class={valueClass}>{value}</span>
      <span class="hint">{hint}</span>
    </div>
  );
}

/** One row per product: name, profit and revenue on the left; sales count and share of units on the right. */
export function ProductRows({ rows, totalUnits }: { rows: ProductTotals[]; totalUnits: number }) {
  return (
    <div class="product-columns">
      {rows.map((item) => {
        const share = totalUnits ? (item.count / totalUnits) * 100 : 0;
        return (
          <div class="product-row" key={item.name}>
            <div class="performance-item">
              <div class="performance-top">
                <strong>{item.name}</strong>
              </div>
              <div class="performance-details">
                <span class={profitClass(item.profit)}>{fmt(item.profit)} profit</span>
                <span>{fmt(item.revenue)} revenue</span>
              </div>
            </div>
            <div class="distribution-item">
              <div class="distribution-line">
                <span class="distribution-sales">{plural(item.count, 'sale')}</span>
                <span class="distribution-value">{share.toFixed(0)}%</span>
              </div>
              <div class="distribution-track">
                <div
                  class="distribution-fill"
                  style={{ width: `${share > 0 ? Math.max(4, share) : 0}%`, background: item.color || 'var(--highlight)' }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Icon({ name }: { name: string }) {
  return <span class="material-symbols-outlined">{name}</span>;
}
