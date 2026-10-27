// The Event screen: the live event, or a past event from History (read-only or being edited).
import { eventSummary, formatDay, splitDays } from '../events';
import { fmt } from '../formatters';
import { paymentClass, productPayments, sortPayments } from '../payments';
import { buildProductBreakdown, marginPercent, plural } from '../reports';
import type { EventCost, Product, SaleRecord } from '../types';
import { Icon } from './Icon';
import { Card, EmptyState, Hero, HourChart, Kpi, PaymentSplit, ProductRows, profitClass } from './ReportParts';

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
  colorFor: (name: string) => string;
  live: boolean;
  /** One collapsible Products card per day (Settings → Products per day). */
  productsPerDay: boolean;
  onRename?: () => void;
  onAddExpense?: () => void;
  onEditExpense?: (id: string) => void;
  onDeleteExpense?: (id: string) => void;
  onEndDay?: () => void;
  onEndEvent?: () => void;
  edit?: EventEditHandlers;
}


/** Day N's date: its first sale, else the day it started. */
function dayDate(day: SaleRecord[], index: number, dayBreaks: string[], startedAt: string) {
  if (day.length) return formatDay(day[0].timestamp);
  return formatDay(index === 0 ? startedAt : dayBreaks[index - 1]);
}

function DayCards({ days, dayBreaks, startedAt, live }: { days: SaleRecord[][]; dayBreaks: string[]; startedAt: string; live: boolean }) {
  return (
    <Card title="Days">
      <div class="day-list">
        {days.map((day, index) => {
          const { revenue, productProfit } = eventSummary(day, []);
          const isToday = live && index === days.length - 1;
          return (
            <div class="day-card" key={index} style={{ '--i': index }}>
              <div class="day-main">
                <strong class="day-title">
                  Day {index + 1}
                  {isToday && <span class="chip">Today · live</span>}
                </strong>
                <span class="day-sub">
                  {dayDate(day, index, dayBreaks, startedAt)} · {plural(day.length, 'sale')}
                </span>
              </div>
              <div class="day-figures">
                <span class="day-revenue">{fmt(revenue)}</span>
                <span class={`day-profit ${profitClass(productProfit)}`}>{fmt(productProfit)} profit</span>
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
        <Card title={days.length > 1 ? `Day ${dayIndex + 1} counts` : 'Counts'} key={dayIndex}>
          <div class="count-list">
            {products.map((product) => (
              <div class="count-row" key={product.name}>
                <span class="swatch" style={{ background: product.color || 'var(--text-3)' }} aria-hidden="true" />
                <span class="count-name">{product.name}</span>
                {sortPayments([...productPayments(product), ...day.filter((sale) => sale.product === product.name).map((sale) => sale.payment)]).map((payment) => {
                  const count = day.filter((sale) => sale.product === product.name && sale.payment === payment).length;
                  const where = days.length > 1 ? ` on day ${dayIndex + 1}` : '';
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
                      aria-label={`${delta === 1 ? 'Add' : 'Remove'} one ${payment} ${product.name}${where}`}
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

/** Per-product rows for a set of sales, then the products not sold in it. */
function ProductBreakdown({ sales, products, colorFor }: { sales: SaleRecord[]; products: Product[]; colorFor: (name: string) => string }) {
  const rows = buildProductBreakdown(sales, products, colorFor).sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  const sold = rows.filter((row) => row.count > 0);
  const unsold = rows.filter((row) => row.count === 0);
  return (
    <>
      {sold.length > 0 && <ProductRows rows={sold} totalUnits={sales.length} />}
      {unsold.length > 0 && (
        <p class={sold.length ? 'card-note unsold' : 'card-note'}>
          {sold.length ? 'Not sold yet: ' : 'No sales yet for '}
          {unsold.map((row) => row.name).join(', ')}
        </p>
      )}
      {!rows.length && <EmptyState icon="package" title="No products yet" text="Add products from the Sell tab." />}
    </>
  );
}

export function EventScreen(props: Props) {
  const { name, sales, dayBreaks, expenses, products, colorFor, live, edit } = props;
  const summary = eventSummary(sales, expenses);
  const days = splitDays(sales, dayBreaks);
  const startedAt = sales.length ? new Date(Math.min(...sales.map((sale) => new Date(sale.timestamp).getTime()))).toISOString() : new Date().toISOString();
  const isEmpty = !sales.length && !expenses.length;

  return (
    <>
      <div class="event-name-row">
        {props.onRename ? (
          <button class="event-name" id="eventNameBtn" type="button" onClick={props.onRename} aria-label={`Rename event, now ${name}`}>
            <span class="event-name-text">{name}</span>
            <Icon name="pencil" />
          </button>
        ) : (
          <span class="event-name">
            <span class="event-name-text">{name}</span>
          </span>
        )}
        {live && <span class="chip chip-live">Live</span>}
      </div>

      {isEmpty && !edit ? (
        <Card>
          <EmptyState icon="event" title="No sales yet" text="Sell on the Sell tab; this screen keeps the event total, day by day." />
        </Card>
      ) : (
        <>
          <Hero
            label={summary.net < 0 ? 'Deficit' : 'Net profit'}
            value={fmt(summary.net)}
            tone={summary.net < 0 ? 'negative' : undefined}
            meta={`${fmt(summary.productProfit)} product profit − ${fmt(summary.expenses)} expenses`}
          />
          <div class="kpi-row kpi-row-3">
            <Kpi label="Revenue" value={fmt(summary.revenue)} hint={plural(summary.count, 'sale')} />
            <Kpi label="Profit" value={fmt(summary.productProfit)} hint={`${marginPercent(summary.revenue, summary.productProfit).toFixed(1)}% margin`} tone={summary.productProfit < 0 ? 'is-negative' : undefined} />
            <Kpi label="Expenses" value={fmt(summary.expenses)} hint={plural(expenses.length, 'item')} />
          </div>
        </>
      )}

      {dayBreaks.length > 0 && <DayCards days={days} dayBreaks={dayBreaks} startedAt={startedAt} live={live} />}

      {edit && <CountEditor days={days} products={products} edit={edit} />}

      <Card
        title="Expenses"
        action={
          props.onAddExpense && (
            <button class="icon-btn icon-btn-soft" id="openAddExpenseBtn" type="button" title="Add expense" aria-label="Add expense" onClick={props.onAddExpense}>
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
                    <button class="icon-btn icon-btn-sm edit-cost" type="button" data-id={cost.id} title="Edit expense" aria-label={`Edit ${cost.name}`} onClick={() => props.onEditExpense!(cost.id)}>
                      <Icon name="pencil" />
                    </button>
                    <button class="icon-btn icon-btn-sm icon-btn-danger delete-cost" type="button" data-id={cost.id} title="Delete expense" aria-label={`Delete ${cost.name}`} onClick={() => props.onDeleteExpense!(cost.id)}>
                      <Icon name="trash" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p class="card-note">{props.onAddExpense ? 'No expenses yet. Add booth rental, transport or staffing costs.' : 'No expenses.'}</p>
        )}
      </Card>

      {!edit && sales.length > 0 && (
        <Card title="Payment mix">
          <PaymentSplit sales={sales} />
        </Card>
      )}

      {!edit && sales.length > 0 && (
        <Card title="Sales by hour">
          <HourChart sales={sales} />
        </Card>
      )}

      {!edit &&
        (props.productsPerDay ? (
          days.map((day, index) => (
            // Only the latest day starts open; `open` is set again only if that changes, so taps stick.
            <details class="card products-day" key={index} open={index === days.length - 1}>
              <summary class="products-day-head">
                <h2 class="card-title">Products · Day {index + 1}</h2>
                <span class="products-day-meta">{plural(day.length, 'sale')}</span>
                <Icon name="chevron-right" />
              </summary>
              <ProductBreakdown sales={day} products={products} colorFor={colorFor} />
            </details>
          ))
        ) : (
          <Card title="Products">
            <ProductBreakdown sales={sales} products={products} colorFor={colorFor} />
          </Card>
        ))}

      {live && (
        <div class="event-actions">
          <button class="btn btn-secondary" id="endDayBtn" type="button" disabled={!days[days.length - 1].length} onClick={props.onEndDay}>
            End day
          </button>
          <button class="btn btn-primary" id="endEventBtn" type="button" disabled={isEmpty} onClick={props.onEndEvent}>
            End event
          </button>
        </div>
      )}
    </>
  );
}
