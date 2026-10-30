// The Event screen: the live event, or a past event from History (read-only or being edited).
import { eventSummary, formatDay, splitDays, withLinkedCosts } from '../events';
import { fmt } from '../formatters';
import { paymentClass, productPayments, sortPayments } from '../payments';
import { buildProductBreakdown, marginPercent } from '../reports';
import type { EventCost, Product, SaleRecord } from '../types';
import { holdToDelete } from '../ui/dom';
import { Icon } from './Icon';
import { Card, EmptyState, Hero, Kpi, PaymentSplit, ProductRows, profitClass } from './ReportParts';
import { t, tn } from '../i18n';

export interface EventEditHandlers {
  onAdjust: (day: number, product: string, payment: string, delta: 1 | -1) => void;
}

interface Props {
  name: string;
  sales: SaleRecord[];
  dayBreaks: string[];
  expenses: EventCost[];
  /** Products to list (the counter's products live, the event's snapshot in History). */
  products: Product[];
  /** Products a linked expense can match (defaults to `products`; live adds the hidden ones). */
  costProducts?: Product[];
  colorFor: (name: string) => string;
  live: boolean;
  /** A past event's first and last sale dates, shown under its name (the live event shows the Live chip instead). */
  dates?: { startedAt: string; endedAt: string };
  /** One collapsible Products card per day (Settings → Products per day). */
  productsPerDay: boolean;
  onRename?: () => void;
  onAddExpense?: () => void;
  onEditExpense?: (id: string) => void;
  /** `ask`: a keyboard or screen-reader press, which confirms first; a held press deletes at once. */
  onDeleteExpense?: (id: string, ask: boolean) => void;
  onEndDay?: () => void;
  onEndEvent?: () => void;
  onGoToSell?: () => void;
  edit?: EventEditHandlers;
}


/** A day's line under its title: the first sale's date and the count; an empty day has no meaningful date yet. */
function daySummary(day: SaleRecord[]) {
  return day.length ? `${formatDay(day[0].timestamp)} · ${tn('count.sale', day.length)}` : t('sales.none');
}

function DayCards({ days, live }: { days: SaleRecord[][]; live: boolean }) {
  return (
    <Card title={t('days')}>
      <div class="day-list">
        {days.map((day, index) => {
          const { revenue, productProfit } = eventSummary(day, []);
          const isToday = live && index === days.length - 1;
          return (
            <div class="day-card" key={index} style={{ '--i': index }}>
              <div class="day-main">
                <strong class="day-title">
                  {t('day.title', { n: index + 1 })}
                  {isToday && <span class="chip">{t('day.todayLive')}</span>}
                </strong>
                <span class="day-sub">
                  {daySummary(day)}
                </span>
              </div>
              <div class="day-figures">
                <span class="day-revenue">{fmt(revenue)}</span>
                <span class={`day-profit ${profitClass(productProfit)}`}>{t('profit.amount', { amount: fmt(productProfit) })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Per day, per product: counts per payment method (the product's methods, plus any its sales used) with − / +. */
function CountEditor({ days, products, edit }: { days: SaleRecord[][]; products: Product[]; edit: EventEditHandlers }) {
  return (
    <>
      {days.map((day, dayIndex) => (
        <Card title={days.length > 1 ? t('counts.day', { n: dayIndex + 1 }) : t('counts')} key={dayIndex}>
          <div class="count-list">
            {products.map((product) => (
              <div class="count-row" key={product.name}>
                <span class="swatch" style={{ background: product.color || 'var(--text-3)' }} aria-hidden="true" />
                <span class="count-name">{product.name}</span>
                {sortPayments([...productPayments(product), ...day.filter((sale) => sale.product === product.name).map((sale) => sale.payment)]).map((payment) => {
                  const count = day.filter((sale) => sale.product === product.name && sale.payment === payment).length;
                  const where = days.length > 1 ? t('counts.onDay', { n: dayIndex + 1 }) : '';
                  const button = (delta: 1 | -1) => (
                    <button
                      class="step-btn"
                      type="button"
                      data-adjust
                      data-day={dayIndex}
                      data-product={product.name}
                      data-payment={payment}
                      data-delta={delta}
                      disabled={delta === -1 && count === 0}
                      aria-label={t(delta === 1 ? 'stepper.add' : 'stepper.remove', { payment, name: product.name, where })}
                      onClick={() => edit.onAdjust(dayIndex, product.name, payment, delta)}
                    >
                      <Icon name={delta === 1 ? 'plus' : 'minus'} />
                    </button>
                  );
                  return (
                    <span class={`stepper ${paymentClass(payment)}`} key={payment}>
                      <span class="stepper-label">{payment}</span>
                      {button(-1)}
                      <span class="stepper-value">{count}</span>
                      {button(1)}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

/** Per-product rows for a set of sales (only what sold). */
function ProductBreakdown({ sales, products, colorFor }: { sales: SaleRecord[]; products: Product[]; colorFor: (name: string) => string }) {
  const rows = buildProductBreakdown(sales, products, colorFor).sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  return <ProductRows rows={rows.filter((row) => row.count > 0)} totalUnits={sales.length} />;
}

export function EventScreen(props: Props) {
  const { name, sales, dayBreaks, expenses, products, colorFor, live, edit } = props;
  const linkable = props.costProducts ?? products;
  const summary = eventSummary(sales, expenses, linkable);
  // Day cards and product rows take linked expenses into account too (no item cost for the products they cover).
  const days = splitDays(withLinkedCosts(sales, expenses, linkable), dayBreaks);
  // Days without sales get no Products card, so the one that starts open is the latest day with sales.
  const lastSoldDay = days.map((day) => day.length > 0).lastIndexOf(true);
  const isEmpty = !sales.length && !expenses.length;
  // Nothing at all yet (no products either): one empty state instead of it stacked with another for the Products card below.
  const allEmpty = isEmpty && !products.length;

  return (
    <>
      <div class="event-name-row">
        {props.onRename ? (
          <button class="event-name" id="eventNameBtn" type="button" onClick={props.onRename} aria-label={t('event.renameLabel', { name })}>
            <span class="event-name-text">{name}</span>
            <Icon name="pencil" />
          </button>
        ) : (
          <span class="event-name">
            <span class="event-name-text">{name}</span>
          </span>
        )}
        {live && <span class="chip chip-live">{t('live')}</span>}
      </div>

      {props.dates && (
        <p class="event-when">
          {(() => {
            const first = formatDay(props.dates.startedAt);
            const last = formatDay(props.dates.endedAt);
            return first === last ? first : `${first} – ${last}`;
          })()}
          {' · '}
          {tn('count.day', days.length)}
        </p>
      )}

      {allEmpty && !edit ? (
        <Card>
          <EmptyState
            icon="event"
            title={t('sales.none')}
            text={t('event.emptyText')}
            action={props.onGoToSell && (
              <button class="btn btn-primary btn-block" type="button" onClick={props.onGoToSell}>
                {t('event.goToSell')}
              </button>
            )}
          />
        </Card>
      ) : isEmpty && !edit ? (
        <Card>
          <EmptyState icon="event" title={t('sales.none')} text={t('event.emptyText')} />
        </Card>
      ) : (
        <>
          <Hero label={summary.net < 0 ? t('deficit') : t('net_profit')} value={fmt(summary.net)} tone={summary.net < 0 ? 'negative' : undefined} />
          <div class="kpi-row kpi-row-3">
            <Kpi label={t('revenue')} value={fmt(summary.revenue)} hint={tn('count.sale', summary.count)} />
            <Kpi label={t('profit')} value={fmt(summary.productProfit)} hint={t('margin', { pct: marginPercent(summary.revenue, summary.productProfit).toFixed(1) })} tone={summary.productProfit < 0 ? 'is-negative' : undefined} />
            <Kpi label={t('expenses')} value={fmt(summary.expenses)} hint={tn('count.item', expenses.length)} />
          </div>
        </>
      )}

      {dayBreaks.length > 0 && <DayCards days={days} live={live} />}

      {edit && <CountEditor days={days} products={products} edit={edit} />}

      <Card
        title={t('expenses')}
        action={
          props.onAddExpense && (
            <button class="icon-btn icon-btn-soft" id="openAddExpenseBtn" type="button" title={t('add_expense')} aria-label={t('add_expense')} onClick={props.onAddExpense}>
              <Icon name="plus" />
            </button>
          )
        }
      >
        {expenses.length ? (
          <div class="list">
            {expenses.map((cost, index) => (
              <div class="list-row cost-item" key={cost.id} style={{ '--i': index }}>
                <div class="list-main">
                  <strong class="list-title">{cost.name}</strong>
                </div>
                <span class="list-value">{fmt(cost.amount)}</span>
                {props.onEditExpense && props.onDeleteExpense && (
                  <div class="list-actions">
                    <button class="icon-btn icon-btn-sm edit-cost" type="button" data-id={cost.id} title={t('expense.edit')} aria-label={t('edit.named', { name: cost.name })} onClick={() => props.onEditExpense!(cost.id)}>
                      <Icon name="pencil" />
                    </button>
                    <button
                      class="icon-btn icon-btn-sm icon-btn-danger hold-delete delete-cost"
                      type="button"
                      data-id={cost.id}
                      title={t('hold.hint')}
                      aria-label={t('hold.deleteNamed', { name: cost.name })}
                      {...holdToDelete(() => props.onDeleteExpense!(cost.id, false), () => props.onDeleteExpense!(cost.id, true))}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p class="card-note">{props.onAddExpense ? t('expenses.none') : t('expenses.noneShort')}</p>
        )}
      </Card>

      {!edit && sales.length > 0 && (
        <Card title={t('payment_mix')}>
          <PaymentSplit sales={sales} />
        </Card>
      )}

      {!edit &&
        sales.length > 0 &&
        (props.productsPerDay ? (
          days.map((day, index) => day.length > 0 && (
            // Only the latest day with sales starts open; `open` is set again only if that changes, so taps stick.
            <details class="card products-day" key={index} open={index === lastSoldDay}>
              <summary class="products-day-head">
                <h2 class="card-title">{days.length > 1 ? t('products.day', { n: index + 1 }) : t('products')}</h2>
                <span class="products-day-meta">{tn('count.sale', day.length)}</span>
                <Icon name="chevron-right" />
              </summary>
              <ProductBreakdown sales={day} products={products} colorFor={colorFor} />
            </details>
          ))
        ) : (
          <Card title={t('products')}>
            <ProductBreakdown sales={withLinkedCosts(sales, expenses, linkable)} products={products} colorFor={colorFor} />
          </Card>
        ))}

      {live && (
        <div class="event-actions">
          <button class="btn btn-secondary" id="endDayBtn" type="button" disabled={!days[days.length - 1].length} onClick={props.onEndDay}>
            {t('endDay.button')}
          </button>
          <button class="btn btn-primary" id="endEventBtn" type="button" disabled={isEmpty} onClick={props.onEndEvent}>
            {t('endEvent.button')}
          </button>
        </div>
      )}
    </>
  );
}
