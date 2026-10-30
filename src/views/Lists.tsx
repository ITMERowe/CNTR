import { eventSummary, formatDay } from '../events';
import { fmt } from '../formatters';
import { groupTiles, variantLabel } from '../groups';
import { FREE_PAYMENT, paymentClass, productPayments } from '../payments';
import type { PastEvent, Product, SaleRecord } from '../types';
import { Icon } from './Icon';
import { EmptyState, profitClass } from './ReportParts';
import { locale, t, tn } from '../i18n';

/** A compact day/month block in place of a generic icon, so rows are told apart at a glance. */
function DateBlock({ value }: { value: Date | string }) {
  const date = new Date(value);
  return (
    <span class="row-date" aria-hidden="true">
      <strong>{date.toLocaleDateString(locale(), { day: 'numeric' })}</strong>
      <small>{date.toLocaleDateString(locale(), { month: 'short' })}</small>
    </span>
  );
}

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function RecentSales({ sales, colorFor }: { sales: SaleRecord[]; colorFor: (name: string) => string }) {
  if (!sales.length) return <EmptyState icon="inbox" title={t('sales.none')} text={t('recent.emptyText')} />;
  return (
    <>
      {sales.map((sale, index) => (
        <div class="list-row" key={`${new Date(sale.timestamp).getTime()}-${index}`} style={{ '--i': index }}>
          <span class="sale-bar" style={{ background: colorFor(sale.product) || 'var(--surface-3)' }} aria-hidden="true" />
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
      <button class="product-edit-btn" type="button" data-name={product.name} aria-label={t('edit.named', { name: product.name })} onClick={() => onEdit(product.name)}>
        <span class="sale-bar" style={{ background: product.color }} aria-hidden="true" />
        <span class="product-item-main">
          <strong class="list-title">{variantLabel(product)}</strong>
          <span class="product-item-sub">
            {/* Free (price 0), as on its Sell tile; its profit only matters when it has a cost. */}
            {product.price === 0 ? FREE_PAYMENT : fmt(product.price)}
            {product.price === 0 && !product.cost ? '' : ` · ${t('product.profitEach', { amount: fmt(product.price - product.cost) })}`}
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
        aria-label={t('product.onSell', { name: product.name })}
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
      {t('add_product')}
    </button>
  );
  if (!products.length) {
    return (
      <>
        <section class="card">
          <EmptyState icon="package" title={t('products.noneYet')} text={t('products.emptyText')} />
        </section>
        {addButton}
      </>
    );
  }
  const sections = [
    { key: 'counter', title: t('products.counter'), note: '', items: products.filter((product) => activeNames.has(product.name)) },
    { key: 'hidden', title: t('products.hidden'), note: t('products.hiddenNote'), items: products.filter((product) => !activeNames.has(product.name)) },
  ].filter((section) => section.items.length);
  return (
    <>
      {sections.map((section) => (
        <section class="product-section" data-section={section.key} key={section.key}>
          <h2 class="product-section-title">
            {section.title} · {section.items.length}
          </h2>
          {section.note && <p class="product-section-note">{section.note}</p>}
          <div class="list list-card">
            {/* A group's variants sit together under its name. */}
            {groupTiles(section.items).map((tile) => {
              const rows = tile.map((product) => (
                <ProductRow key={product.name} product={product} active={section.key === 'counter'} index={section.items.indexOf(product)} onEdit={onEdit} onToggle={onToggle} />
              ));
              if (!tile[0].group) return rows;
              return (
                // Open by default; a tap on the name folds it (re-renders keep what the user chose).
                <details class="product-group" key={`group:${tile[0].group.toLowerCase()}`} open>
                  <summary class="product-group-title">
                    <span>{tile[0].group}</span>
                    <span class="product-group-count">{tile.length}</span>
                    <Icon name="chevron-down" />
                  </summary>
                  {rows}
                </details>
              );
            })}
          </div>
        </section>
      ))}
      {addButton}
    </>
  );
}

/** Past events, newest first: name, dates and days, net profit. */
// Every tap re-renders History; past events are replaced, never changed in place, so their net profit is worked out once.
const netByEvent = new WeakMap<PastEvent, number>();
const eventNet = (event: PastEvent) => netByEvent.get(event) ?? netByEvent.set(event, eventSummary(event.sales, event.expenses, event.products).net).get(event)!;

export function EventList({ events, onOpen }: { events: PastEvent[]; onOpen: (id: string) => void }) {
  if (!events.length) return <EmptyState icon="event" title={t('history.none')} text={t('history.noneText')} />;
  return (
    <>
      {[...events].reverse().map((event, index) => {
        const net = eventNet(event);
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
            <DateBlock value={event.startedAt} />
            <div class="list-main">
              <strong class="list-title">{event.name}</strong>
              <span class="list-sub">
                {first === last ? first : `${first} – ${last}`} · {tn('count.day', days)}
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
  if (!events.length) return <p class="card-note">{t('history.noneShort')}</p>;
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

/** Expense sheet: products the expense pays for (values are list indexes; `checked` holds product ids). A group's own box ticks all its variants. */
export function ProductChecklist({ products, checked }: { products: Product[]; checked: string[] }) {
  const isChecked = (product: Product) => !!product.id && checked.includes(product.id);
  // The group box follows its variants: ticked when all of them are.
  const syncGroupBox = (event: Event) => {
    const group = (event.currentTarget as HTMLElement).closest('.check-group');
    const box = group?.querySelector<HTMLInputElement>('input.check-all');
    if (box) box.checked = [...group!.querySelectorAll<HTMLInputElement>('input:not(.check-all)')].every((input) => input.checked);
  };
  const tickAll = (event: Event) => {
    const box = event.currentTarget as HTMLInputElement;
    for (const input of box.closest('.check-group')!.querySelectorAll<HTMLInputElement>('input:not(.check-all)')) input.checked = box.checked;
  };
  const fold = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    document.getElementById(button.getAttribute('aria-controls')!)!.hidden = !open;
  };
  const row = (product: Product, label: string) => (
    <label class="check-row" key={product.id ?? product.name}>
      <input type="checkbox" value={products.indexOf(product)} checked={isChecked(product)} onChange={syncGroupBox} />
      <span class="check-box" aria-hidden="true" />
      <span class="check-text">
        <strong>{label}</strong>
      </span>
    </label>
  );
  return (
    <>
      {groupTiles(products).map((tile) => {
        const group = tile[0].group;
        if (!group) return row(tile[0], tile[0].name);
        // Folded unless only some of its variants are ticked, so the list stays short; the group's box still ticks them all.
        const ticked = tile.filter(isChecked).length;
        const id = `check-variants-${products.indexOf(tile[0])}`;
        return (
          <div class="check-group" key={`group:${group.toLowerCase()}`}>
            <div class="check-group-head">
              <label class="check-row">
                <input class="check-all" type="checkbox" checked={ticked === tile.length} onChange={tickAll} />
                <span class="check-box" aria-hidden="true" />
                <span class="check-text">
                  <strong>{group}</strong>
                </span>
              </label>
              <button class="check-fold" type="button" aria-expanded={ticked > 0 && ticked < tile.length} aria-controls={id} aria-label={t('expense.variantsOf', { name: group })} onClick={fold}>
                <Icon name="chevron-down" />
              </button>
            </div>
            <div class="check-variants" id={id} hidden={!(ticked > 0 && ticked < tile.length)}>
              {tile.map((product) => row(product, variantLabel(product)))}
            </div>
          </div>
        );
      })}
    </>
  );
}
