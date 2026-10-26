import { fmt } from '../formatters';
import type { Product, ReportType, SaleRecord, SavedReport } from '../types';
import { Icon } from './Icon';
import { EmptyState } from './ReportParts';

const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const formatDate = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function RecentSales({ sales, colorFor }: { sales: SaleRecord[]; colorFor: (name: string) => string }) {
  if (!sales.length) return <EmptyState icon="inbox" title="No sales yet" text="Sales you record on the Sell tab show up here." />;
  return (
    <>
      {sales.map((sale, index) => (
        <div class="list-row" key={`${new Date(sale.timestamp).getTime()}-${index}`} style={{ '--i': index }}>
          <span class="swatch swatch-lg" style={{ background: colorFor(sale.product) || 'var(--text-3)' }} aria-hidden="true" />
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
                {fmt(product.price)} · cost {fmt(product.cost)}
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

interface SavedReportListProps {
  reports: SavedReport[];
  type: ReportType;
  onOpen: (id: string) => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SavedReportList({ reports, type, onOpen, onRename, onDelete }: SavedReportListProps) {
  if (!reports.length) {
    return (
      <EmptyState
        icon={type === 'sales' ? 'file-chart' : 'event'}
        title={`No saved ${type} reports`}
        text={type === 'sales' ? 'Save one from the Reports tab menu.' : 'Save one from the Event tab menu.'}
      />
    );
  }
  return (
    <>
      {reports.map((report, index) => (
        <div
          class="list-row list-row-link sales-report-history-item"
          key={report.id}
          data-id={report.id}
          tabIndex={0}
          role="button"
          style={{ '--i': index }}
          onClick={() => onOpen(report.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpen(report.id);
            }
          }}
        >
          <span class="row-icon" aria-hidden="true">
            <Icon name={type === 'sales' ? 'file-chart' : 'event'} />
          </span>
          <div class="list-main">
            <strong class="list-title">{report.name}</strong>
            <span class="list-sub">
              {formatDate(report.createdAt)} · {report.sales.length} sales
            </span>
          </div>
          <div class="list-actions">
            <button
              class="icon-btn icon-btn-sm sales-report-edit-btn"
              type="button"
              title="Rename report"
              aria-label={`Rename ${report.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onRename(report.id);
              }}
            >
              <Icon name="pencil" />
            </button>
            <button
              class="icon-btn icon-btn-sm icon-btn-danger history-item-delete"
              type="button"
              title="Delete report"
              aria-label={`Delete ${report.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onDelete(report.id);
              }}
            >
              <Icon name="trash" />
            </button>
          </div>
        </div>
      ))}
    </>
  );
}

interface ReportChecklistProps {
  reports: SavedReport[];
  checked: string[];
  emptyText: string;
  /** Optional extra first row (the live counter) with value "current-live". */
  live?: { title: string; subtitle: string };
}

/** Checkbox list of saved reports; the dialogs read the checked inputs when confirmed. */
export function ReportChecklist({ reports, checked, emptyText, live }: ReportChecklistProps) {
  return (
    <>
      {live && (
        <label class="check-row">
          <input type="checkbox" id="importCurrentLiveReport" value="current-live" checked={false} />
          <span class="check-box" aria-hidden="true" />
          <span class="check-text">
            <strong>{live.title}</strong>
            <small>{live.subtitle}</small>
          </span>
        </label>
      )}
      {reports.length ? (
        reports.map((report) => (
          <label class="check-row" key={report.id}>
            <input type="checkbox" value={report.id} checked={checked.includes(report.id)} />
            <span class="check-box" aria-hidden="true" />
            <span class="check-text">
              <strong>{report.name}</strong>
              <small>{formatDate(report.createdAt)}</small>
            </span>
          </label>
        ))
      ) : (
        <p class="card-note">{emptyText}</p>
      )}
    </>
  );
}
