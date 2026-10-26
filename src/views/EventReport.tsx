import { fmt } from '../formatters';
import { buildProductBreakdown, marginPercent, plural, totalCost, totals } from '../reports';
import type { EventView } from '../types';
import { Icon } from './Icon';
import { Card, EmptyState, Hero, Kpi, ProductRows } from './ReportParts';

interface Props {
  view: EventView;
  colorFor: (name: string) => string;
  onAddExpense: () => void;
  onEditExpense: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onImport: () => void;
}

export function EventReport({ view, colorFor, onAddExpense, onEditExpense, onDeleteExpense, onImport }: Props) {
  const { hasReport, sales, products, eventCosts } = view;
  const expenses = totalCost(eventCosts);
  const { revenue, profit } = totals(sales);
  const net = revenue - expenses;
  const topProducts = buildProductBreakdown(sales, products, colorFor)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.count - a.count)
    .slice(0, 5);

  const importButton = (
    <button class="btn btn-small btn-secondary" id="eventImportBtn" type="button" onClick={onImport}>
      <Icon name="download" />
      Import sales
    </button>
  );

  return (
    <>
      {hasReport ? (
        <>
          <Hero
            label={net < 0 ? 'Deficit' : 'Net profit'}
            value={fmt(net)}
            tone={net < 0 ? 'negative' : undefined}
            meta={`${fmt(revenue)} revenue − ${fmt(expenses)} expenses`}
          />
          <div class="kpi-row kpi-row-3">
            <Kpi label="Revenue" value={fmt(revenue)} hint={plural(sales.length, 'sale')} />
            <Kpi label="Profit" value={fmt(profit)} hint={`${marginPercent(revenue, profit).toFixed(1)}% margin`} />
            <Kpi label="Expenses" value={fmt(expenses)} hint={plural(eventCosts.length, 'item')} />
          </div>
        </>
      ) : (
        <Card>
          <EmptyState icon="event" title="No event sales yet" text="Import today's sales or a saved report to see revenue and profit after expenses." action={importButton} />
        </Card>
      )}

      <Card
        title="Expenses"
        action={
          <button class="icon-btn icon-btn-soft" id="openAddExpenseBtn" type="button" title="Add expense" aria-label="Add expense" onClick={onAddExpense}>
            <Icon name="plus" />
          </button>
        }
      >
        {eventCosts.length ? (
          <div class="list">
            {eventCosts.map((cost, index) => (
              <div class="list-row cost-item" key={cost.id} style={{ '--i': index }}>
                <div class="list-main">
                  <strong class="list-title">{cost.name}</strong>
                </div>
                <span class="list-value">{fmt(cost.amount)}</span>
                <div class="list-actions">
                  <button class="icon-btn icon-btn-sm edit-cost" type="button" data-id={cost.id} title="Edit expense" aria-label={`Edit ${cost.name}`} onClick={() => onEditExpense(cost.id)}>
                    <Icon name="pencil" />
                  </button>
                  <button class="icon-btn icon-btn-sm icon-btn-danger delete-cost" type="button" data-id={cost.id} title="Delete expense" aria-label={`Delete ${cost.name}`} onClick={() => onDeleteExpense(cost.id)}>
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p class="card-note">No expenses yet. Add booth rental, transport or staffing costs.</p>
        )}
      </Card>

      {hasReport && (
        <Card title="Top products" action={importButton}>
          {topProducts.length ? <ProductRows rows={topProducts} totalUnits={sales.length} /> : <p class="card-note">No sales in this event.</p>}
        </Card>
      )}
    </>
  );
}
