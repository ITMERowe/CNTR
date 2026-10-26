import { fmt } from '../formatters';
import type { Product, ReportType, SaleRecord, SavedReport } from '../types';
import { Icon } from './ReportParts';

export function RecentSales({ sales }: { sales: SaleRecord[] }) {
  if (!sales.length) return <div class="empty-state">No sales recorded yet.</div>;
  return (
    <>
      {sales.map((sale, index) => (
        <div class="history-item" key={`${new Date(sale.timestamp).getTime()}-${index}`}>
          <div>
            <strong>{sale.product}</strong>
            <div class="history-meta">
              {sale.payment} · {fmt(sale.price)}
            </div>
          </div>
          <span class="history-badge">{new Date(sale.timestamp).toLocaleTimeString()}</span>
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
  if (!products.length) return <div class="empty-state">No products have been created yet.</div>;
  return (
    <>
      {products.map((product) => {
        const isActive = activeNames.has(product.name);
        return (
          <div class="product-history-item" key={product.name} style={{ '--product-color': product.color }}>
            <div class="product-row product-row-compact">
              <div class="product-history-main">
                <strong>{product.name}</strong>
                <span class="history-meta">
                  <span class="nowrap">Price {fmt(product.price)}</span> · <span class="nowrap">Cost {fmt(product.cost)}</span>
                </span>
              </div>
              <div class="product-history-actions">
                <button class="product-edit-btn" type="button" data-name={product.name} title={`Edit ${product.name}`} aria-label={`Edit ${product.name}`} onClick={() => onEdit(product.name)}>
                  <Icon name="edit" />
                </button>
                <button class="icon-btn product-delete-btn" type="button" data-name={product.name} title={`Delete ${product.name}`} aria-label={`Delete ${product.name}`} onClick={() => onDelete(product.name)}>
                  <Icon name="delete" />
                </button>
                <button class="product-toggle-btn" type="button" data-name={product.name} aria-pressed={isActive} onClick={() => onToggle(product.name)}>
                  <span class="toggle-label">{isActive ? 'Active' : 'Add'}</span>
                </button>
              </div>
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
  if (!reports.length) return <div class="empty-state">No saved {type} reports yet.</div>;
  return (
    <>
      {reports.map((report) => (
        <div
          class="sales-report-history-item"
          key={report.id}
          data-id={report.id}
          tabIndex={0}
          role="button"
          onClick={() => onOpen(report.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onOpen(report.id);
            }
          }}
        >
          <div class="product-row product-row-compact">
            <div class="product-history-main">
              <strong>{report.name}</strong>
              <span class="history-meta">{new Date(report.createdAt).toLocaleString()}</span>
            </div>
            <div class="product-history-actions">
              <button
                class="icon-btn sales-report-edit-btn"
                type="button"
                title="Rename report"
                aria-label="Rename report"
                onClick={(event) => {
                  event.stopPropagation();
                  onRename(report.id);
                }}
              >
                <Icon name="edit" />
              </button>
              <button
                class="icon-btn history-item-delete"
                type="button"
                title="Delete report"
                aria-label="Delete report"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(report.id);
                }}
              >
                <Icon name="delete" />
              </button>
            </div>
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
        <label class="import-item">
          <input type="checkbox" id="importCurrentLiveReport" value="current-live" checked={false} />
          <div>
            <strong>{live.title}</strong>
            <small>{live.subtitle}</small>
          </div>
        </label>
      )}
      {reports.length ? (
        reports.map((report) => (
          <label class="import-item" key={report.id}>
            <input type="checkbox" value={report.id} checked={checked.includes(report.id)} />
            <div>
              <strong>{report.name}</strong>
              <small>{new Date(report.createdAt).toLocaleString()}</small>
            </div>
          </label>
        ))
      ) : (
        <div class="empty-state">{emptyText}</div>
      )}
    </>
  );
}
