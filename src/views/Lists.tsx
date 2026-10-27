import { eventSummary, formatDay } from '../events';
import { fmt } from '../formatters';
import { paymentClass, productPayments } from '../payments';
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
              <span class={`pay-chip ${paymentClass(sale.payment)}`}>{sale.payment}</span>
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
  onToggle: (name: string) => void;
  onAdd: () => void;
}

/** One product: tap the row to edit; the switch puts it on or takes it off the Sell tab. */
function ProductRow({ product, active, index, onEdit, onToggle }: { product: Product; active: boolean; index: number; onEdit: (name: string) => void; onToggle: (name: string) => void }) {
  return (
    <div class="product-item" style={{ '--i': index }}>
      <button class="product-edit-btn" type="button" data-name={product.name} aria-label={`Edit ${product.name}`} onClick={() => onEdit(product.name)}>
        <span class="swatch swatch-lg" style={{ background: product.color }} aria-hidden="true" />
        <span class="product-item-main">
          <strong class="list-title">{product.name}</strong>
          <span class="product-item-sub">
            {fmt(product.price)} · profit {fmt(product.price - product.cost)}
          </span>
          <span class="product-item-methods">
            {productPayments(product).map((method) => (
              <span class={`pay-chip ${paymentClass(method)}`} key={method}>
                {method}
              </span>
            ))}
          </span>
        </span>
      </button>
      <button
        class="product-toggle-btn"
        type="button"
        data-name={product.name}
        role="switch"
        aria-checked={active}
        aria-label={`${product.name} on the Sell tab`}
        onClick={() => onToggle(product.name)}
      >
        <span class="switch-track" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ProductList({ products, activeNames, onEdit, onToggle, onAdd }: ProductListProps) {
  const addButton = (
    <button class="btn btn-secondary btn-block" id="addProductBtn" type="button" onClick={onAdd}>
      <Icon name="plus" />
      Add product
    </button>
  );
  if (!products.length) {
    return (
      <>
        <section class="card">
          <EmptyState icon="package" title="No products yet" text="Add what you sell; each product becomes a tile on the Sell tab." />
        </section>
        {addButton}
      </>
    );
  }
  const sections = [
    { key: 'counter', title: 'On the counter', note: 'Shown on the Sell tab. Tap a product to edit it.', items: products.filter((product) => activeNames.has(product.name)) },
    { key: 'hidden', title: 'Hidden', note: 'Not on the Sell tab. Sales history is kept; switch one on to sell it again.', items: products.filter((product) => !activeNames.has(product.name)) },
  ].filter((section) => section.items.length);
  return (
    <>
      {sections.map((section) => (
        <section class="product-section" data-section={section.key} key={section.key}>
          <h2 class="product-section-title">
            {section.title} · {section.items.length}
          </h2>
          <p class="product-section-note">{section.note}</p>
          <div class="list list-card">
            {section.items.map((product, index) => (
              <ProductRow key={product.name} product={product} active={section.key === 'counter'} index={index} onEdit={onEdit} onToggle={onToggle} />
            ))}
          </div>
        </section>
      ))}
      {addButton}
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
