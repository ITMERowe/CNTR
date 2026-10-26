import { fmt } from '../formatters';
import { buildProductBreakdown, marginPercent, plural, totalCost, totals } from '../reports';
import type { EventView } from '../types';
import { Icon, ProductRows, ReportHero, SummaryTile } from './ReportParts';

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
  const netProfit = revenue - expenses;
  const topProducts = buildProductBreakdown(sales, products, colorFor)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.count - a.count)
    .slice(0, 5);

  return (
    <div class="report-shell">
      <ReportHero
        title="Event overview"
        subtitle={hasReport ? 'Revenue and profit after event expenses.' : 'Import sales to see event revenue and profit.'}
      >
        {hasReport && (
          <div class="summary-grid">
            <SummaryTile label="Revenue" value={fmt(revenue)} hint={plural(sales.length, 'sale')} />
            <SummaryTile label="Profit" value={fmt(profit)} hint={`${marginPercent(revenue, profit).toFixed(1)}% margin`} />
            <SummaryTile label="Expenses" value={fmt(expenses)} hint={plural(eventCosts.length, 'expense')} />
            <SummaryTile
              label={netProfit < 0 ? 'Deficit' : 'Net profit'}
              value={fmt(netProfit)}
              hint="Revenue − expenses"
              valueClass={netProfit < 0 ? 'value deficit' : 'value'}
            />
          </div>
        )}
      </ReportHero>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Expenses</h2>
          <button class="control-btn add-expense-btn" id="openAddExpenseBtn" type="button" title="Add expense" aria-label="Add expense" onClick={onAddExpense}>
            <span class="material-symbols-outlined control-icon">add</span>
          </button>
        </div>
        {eventCosts.length ? (
          <div class="cost-list">
            {eventCosts.map((cost) => (
              <div class="cost-item" key={cost.id}>
                <div>
                  <strong>{cost.name}</strong>
                </div>
                <div class="cost-actions">
                  <span class="cost-amount">{fmt(cost.amount)}</span>
                  <button class="history-item-delete edit-cost" type="button" data-id={cost.id} title="Edit expense" aria-label="Edit expense" onClick={() => onEditExpense(cost.id)}>
                    <Icon name="edit" />
                  </button>
                  <button class="history-item-delete delete-cost" type="button" data-id={cost.id} title="Delete expense" aria-label="Delete expense" onClick={() => onDeleteExpense(cost.id)}>
                    <Icon name="delete" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div class="empty-state">No expenses yet. Add booth rental, transport or staffing costs.</div>
        )}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Top products</h2>
          <button class="control-btn add-expense-btn" id="eventImportBtn" type="button" title="Import sales" aria-label="Import sales" onClick={onImport}>
            <span class="material-symbols-outlined control-icon">download</span>
          </button>
        </div>
        {topProducts.length ? <ProductRows rows={topProducts} totalUnits={sales.length} /> : <div class="empty-state">No sales imported yet.</div>}
      </section>
    </div>
  );
}
