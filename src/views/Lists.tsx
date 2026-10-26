import { eventSummary, formatDay } from '../events';
import { fmt } from '../formatters';
import type { PastEvent, Product, SaleRecord } from '../types';
import { Icon } from './Icon';
import { EmptyState, profitClass } from './ReportParts';

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function RecentSales({ sales, colorFor }: { sales: SaleRecord[]; colorFor: (name: string) => string }) {
  if (!sales.length) return <EmptyState icon="inbox" title="No sales yet" text="Sales you record on the Sell tab show up here." />;
  return (
    <>
      {sales.map((sale, index) => (
        <div class="list-row" key={`${new Date(sale.timestamp).getTime()}-${index}`} style={{ '--i': index }}>
          <span class="swatch swatch-lg" style={{ background: colorFor(sale.product) || 'var(--surface-3)' }} aria-hidden="true" />
          <div class="list-main">
            <strong class="list-title">{sale.product}</strong>
            <span class="list-sub">
              <span class={`pay-chip pay-${sale.payment.toLowerCase()}`}>{sale.payment}</span>
              {formatTime(new Date(sale.timestamp))}
            </span>
          </div>
          <span class="list-value">{fmt(sale.price)}</span>
        </div>
      ))}
    </>
  );
}

interface ProductListProps {
  products: Product[];
  activeNames: Set<string>;
  onEdit: (name: string) => void;
  onDelete: (name: string) => void;
  onToggle: (name: string) => void;
}

export function ProductList({ products, activeNames, onEdit, onDelete, onToggle }: ProductListProps) {
  if (!products.length) return <EmptyState icon="package" title="No products yet" text="Tap + at the top to add your first product." />;
  return (
    <>
      {products.map((product, index) => {
        const isActive = activeNames.has(product.name);
        return (
          <div class={isActive ? 'list-row' : 'list-row is-inactive'} key={product.name} style={{ '--i': index }}>
            <span class="swatch swatch-lg" style={{ background: product.color }} aria-hidden="true" />
            <div class="list-main">
              <strong class="list-title">{product.name}</strong>
              <span class="list-sub list-sub-text">
                <span>{fmt(product.price)}</span>
                <span>cost {fmt(product.cost)}</span>
              </span>
            </div>
            <div class="list-actions">
              <button class="icon-btn icon-btn-sm product-edit-btn" type="button" data-name={product.name} title={`Edit ${product.name}`} aria-label={`Edit ${product.name}`} onClick={() => onEdit(product.name)}>
                <Icon name="pencil" />
              </button>
              <button class="icon-btn icon-btn-sm icon-btn-danger product-delete-btn" type="button" data-name={product.name} title={`Delete ${product.name}`} aria-label={`Delete ${product.name}`} onClick={() => onDelete(product.name)}>
                <Icon name="trash" />
              </button>
              <button
                class="product-toggle-btn"
                type="button"
                data-name={product.name}
                role="switch"
                aria-checked={isActive}
                aria-label={`${product.name} on counter`}
                title={isActive ? 'On the counter' : 'Hidden from the counter'}
                onClick={() => onToggle(product.name)}
              >
                <span class="switch-track" aria-hidden="true" />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/** Past events, newest first: name, dates and days, net profit. */
export function EventList({ events, onOpen }: { events: PastEvent[]; onOpen: (id: string) => void }) {
  if (!events.length) return <EmptyState icon="event" title="No past events yet" text="Press End event on the Event tab when an event is over; it moves here." />;
  return (
    <>
      {[...events].reverse().map((event, index) => {
        const { net } = eventSummary(event.sales, event.expenses);
        const first = formatDay(event.startedAt);
        const last = formatDay(event.endedAt);
        const days = event.dayBreaks.length + 1;
        return (
          <div
            class="list-row list-row-link event-row"
            key={event.id}
            data-id={event.id}
            tabIndex={0}
            role="button"
            style={{ '--i': index }}
            onClick={() => onOpen(event.id)}
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                keyEvent.preventDefault();
                onOpen(event.id);
              }
            }}
          >
            <span class="row-icon" aria-hidden="true">
              <Icon name="event" />
            </span>
            <div class="list-main">
              <strong class="list-title">{event.name}</strong>
              <span class="list-sub">
                {first === last ? first : `${first} – ${last}`} · {days === 1 ? '1 day' : `${days} days`}
              </span>
            </div>
            <span class={`list-value ${profitClass(net)}`}>{fmt(net)}</span>
          </div>
        );
      })}
    </>
  );
}

/** Checkbox list of past events; the compare dialog reads the checked inputs when confirmed. */
export function EventChecklist({ events, checked }: { events: PastEvent[]; checked: string[] }) {
  if (!events.length) return <p class="card-note">No past events yet.</p>;
  return (
    <>
      {[...events].reverse().map((event) => (
        <label class="check-row" key={event.id}>
          <input type="checkbox" value={event.id} checked={checked.includes(event.id)} />
          <span class="check-box" aria-hidden="true" />
          <span class="check-text">
            <strong>{event.name}</strong>
            <small>{formatDay(event.startedAt)}</small>
          </span>
        </label>
      ))}
    </>
  );
}
