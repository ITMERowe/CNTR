import './style.css';
import { Capacitor } from '@capacitor/core';
import { defaultProducts, ensureProductHistory, generateUUID, totals } from './data';
import {
  chooseUniqueColor,
  escapeHtml,
  fmt,
  formatInputNumber,
  getContrastColor,
  normalizeHex,
  parseCurrencyInput,
} from './formatters';
import { loadSettings, saveSettings, type AppSettings } from './storage';
import {
  loadEventCosts as readEventCosts,
  loadImportedEventReport as readImportedEventReport,
  loadProductHistory as readProductHistory,
  loadProducts as readProducts,
  loadSales as readSales,
  loadSavedReports as readSavedReports,
  saveEventCosts as writeEventCosts,
  saveImportedEventReport as writeImportedEventReport,
  saveProductHistory as writeProductHistory,
  saveProducts as writeProducts,
  saveSales as writeSales,
  saveSavedReports as writeSavedReports,
} from './storage';
import type { EventCost, HSV, Product, SaleRecord, SavedReport } from './types';

const products: Product[] = loadProducts();
const productHistory: Product[] = loadProductHistory();

function syncProductState() {
  // Fresh install: seed the defaults before building history so they show up under Products too.
  // Do NOT repopulate active products from history when the user intentionally removed all products.
  if (products.length === 0 && productHistory.length === 0) {
    products.push(...defaultProducts.map((product) => ({ ...product })));
  }

  const uniqueProducts = products.reduce<Product[]>((acc, product) => {
    const index = acc.findIndex((item) => item.name === product.name);
    if (index >= 0) {
      acc[index] = { ...product };
      return acc;
    }
    acc.push({ ...product });
    return acc;
  }, []);

  const uniqueHistory = productHistory.reduce<Product[]>((acc, product) => {
    const index = acc.findIndex((item) => item.name === product.name);
    if (index >= 0) {
      acc[index] = { ...product };
      return acc;
    }
    acc.push({ ...product });
    return acc;
  }, []);

  const activeNames = new Set(uniqueProducts.map((product) => product.name));
  const mergedHistory = [...uniqueHistory.filter((product) => activeNames.has(product.name)), ...uniqueHistory.filter((product) => !activeNames.has(product.name))];

  for (const product of uniqueProducts) {
    if (!mergedHistory.some((item) => item.name === product.name)) {
      mergedHistory.push({ ...product });
    }
  }

  products.splice(0, products.length, ...uniqueProducts);
  productHistory.splice(0, productHistory.length, ...mergedHistory);
}

syncProductState();
console.debug('startup: loaded products count=', products.length);
const tx: SaleRecord[] = loadSales();
const eventCosts: EventCost[] = loadEventCosts();
let previewReport: SavedReport | null = null;
let importedEventReport: { sales: SaleRecord[]; products: Product[] } | null = loadImportedEventReport();
let renamingSavedReportId: string | null = null;

function loadImportedEventReport() {
  return readImportedEventReport();
}

function saveImportedEventReport(report: { sales: SaleRecord[]; products: Product[] } | null) {
  writeImportedEventReport(report);
}

function loadProducts() {
  return readProducts();
}

function saveProducts() {
  syncProductState();
  writeProducts(products);
}

function loadProductHistory() {
  return readProductHistory();
}

function saveProductHistory(history: Product[] = productHistory) {
  const next = history.reduce<Product[]>((acc, product) => {
    const index = acc.findIndex((item) => item.name === product.name);
    if (index >= 0) {
      acc[index] = { ...product };
      return acc;
    }
    acc.push({ ...product });
    return acc;
  }, []);

  productHistory.splice(0, productHistory.length, ...next);
  writeProductHistory(productHistory);
}

function loadSales() {
  return readSales();
}

function saveSales() {
  writeSales(tx);
}

function loadEventCosts() {
  return readEventCosts();
}

function saveEventCosts() {
  writeEventCosts(eventCosts);
}

function loadSavedReports() {
  return readSavedReports() as SavedReport[];
}

function saveSavedReports(reports: SavedReport[]) {
  writeSavedReports(reports as SavedReport[]);
}

function deleteSavedReport(reportId: string) {
  const reports = loadSavedReports();
  const remaining = reports.filter((report) => report.id !== reportId);
  if (remaining.length === reports.length) return;
  saveSavedReports(remaining);
  if (previewReport?.id === reportId) previewReport = null;
  showToast('Report deleted');
  render();
}

function confirmDeleteSavedReport(reportId: string, onDeleted?: () => void) {
  const report = loadSavedReports().find((entry) => entry.id === reportId);
  if (!report) return;
  openConfirmModal(`Delete report '${report.name}'? This cannot be undone.`, 'Delete', () => {
    deleteSavedReport(reportId);
    onDeleted?.();
  });
}

function renameSavedReport(reportId: string, nextName: string) {
  const trimmedName = nextName.trim();
  if (!trimmedName) return;
  const reports = loadSavedReports();
  const target = reports.find((report) => report.id === reportId);
  if (!target) return;
  target.name = trimmedName;
  saveSavedReports(reports);
  if (previewReport?.id === reportId) previewReport = { ...target };
  showToast('Report renamed');
  render();
}

// The data the event screen is showing: a previewed saved event report, else the imported live event.
function getEventView() {
  const savedEventReport = previewReport && previewReport.type === 'event' ? previewReport : null;
  if (savedEventReport) {
    return { hasReport: true, sales: savedEventReport.sales, products: savedEventReport.products, eventCosts: savedEventReport.eventCosts };
  }
  return {
    hasReport: Boolean(importedEventReport),
    sales: importedEventReport ? importedEventReport.sales : [],
    products: importedEventReport ? importedEventReport.products : [],
    eventCosts,
  };
}

// Persist expense edits to whichever cost list the event screen is showing.
function saveActiveEventCosts() {
  if (previewReport && previewReport.type === 'event') {
    const reports = loadSavedReports();
    const target = reports.find((report) => report.id === previewReport!.id);
    if (target) {
      target.eventCosts = previewReport.eventCosts.map((cost) => ({ ...cost }));
      saveSavedReports(reports);
    }
    return;
  }
  saveEventCosts();
}

function saveCurrentReport(name: string, type: 'sales' | 'event') {
  const reports = loadSavedReports();
  const reportName = name.trim() || `${type === 'event' ? 'Event report' : 'Report'} ${new Date().toLocaleString()}`;

  if (type === 'event') {
    const view = getEventView();
    const snapshot = {
      sales: view.sales.map((sale) => ({ ...sale })),
      products: view.products.map((product) => ({ ...product })),
      eventCosts: view.eventCosts.map((cost) => ({ ...cost })),
    };

    reports.push({
      id: generateUUID(),
      name: reportName,
      createdAt: new Date().toISOString(),
      type,
      products: snapshot.products,
      sales: snapshot.sales,
      eventCosts: snapshot.eventCosts,
    });
    saveSavedReports(reports);
    showToast(`Saved event report: ${reportName}`);
    render();
    return;
  }

  reports.push({
    id: generateUUID(),
    name: reportName,
    createdAt: new Date().toISOString(),
    type,
    products: products.map((p) => ({ ...p })),
    sales: tx.map((sale) => ({ ...sale })),
    eventCosts: eventCosts.map((cost) => ({ ...cost })),
  });
  saveSavedReports(reports);
  showToast(`Saved report: ${reportName}`);
  render();
}

function addEventCost(name: string, amount: number) {
  getEventView().eventCosts.push({ id: generateUUID(), name, amount });
  saveActiveEventCosts();
  render();
}

function removeEventCost(id: string) {
  const costs = getEventView().eventCosts;
  const index = costs.findIndex((cost) => cost.id === id);
  if (index >= 0) {
    costs.splice(index, 1);
    saveActiveEventCosts();
    render();
  }
}

function openExpenseModalForEdit(id: string) {
  const cost = getEventView().eventCosts.find((item) => item.id === id);
  if (!cost) return;

  const overlay = document.getElementById('expenseModalOverlay') as HTMLDivElement | null;
  const title = document.getElementById('expenseModalTitle') as HTMLHeadingElement | null;
  const nameInput = document.getElementById('eventCostName') as HTMLInputElement | null;
  const amountInput = document.getElementById('eventCostAmount') as HTMLInputElement | null;
  const addBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;

  if (!overlay || !title || !nameInput || !amountInput || !addBtn) return;

  editingExpenseId = cost.id;
  nameInput.value = cost.name;
  amountInput.value = formatInputNumber(String(cost.amount), loadSettings().currency);
  title.textContent = 'Edit Expense';
  addBtn.textContent = 'Save changes';
  overlay.classList.add('open');
  lockBodyScroll();
  updateExpenseButtonState();
}

let editingIndex = -1;
let editingExpenseId: string | null = null;
let editingHistoryIndex: number | null = null;
let productEditorReturnScreen = 'salesScreen';
let animatedProduct: string | null = null;
let animatedPayment: string | null = null;
let _savedBodyScroll = 0;
let _bodyScrollLocked = false;

function lockBodyScroll() {
  if (_bodyScrollLocked) return;
  _bodyScrollLocked = true;
  _savedBodyScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${_savedBodyScroll}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockBodyScroll() {
  if (!_bodyScrollLocked) return;
  _bodyScrollLocked = false;
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, _savedBodyScroll || 0);
  _savedBodyScroll = 0;
}
const el = {
  grid: document.getElementById('grid') as HTMLDivElement,
  stats: document.getElementById('stats') as HTMLDivElement,
  headline: document.getElementById('headline') as HTMLDivElement,
  toast: document.getElementById('toast') as HTMLDivElement,
  reset: document.getElementById('resetBtn') as HTMLButtonElement,
  optionsBtn: document.getElementById('optionsBtn') as HTMLButtonElement,
  optionsMenu: document.getElementById('optionsMenu') as HTMLDivElement,
  saveReportOption: document.getElementById('saveReportOption') as HTMLButtonElement,
  saveEventReportOption: document.getElementById('saveEventReportOption') as HTMLButtonElement,
  openProductEdit: document.getElementById('openProductEdit') as HTMLButtonElement,
  closeEditBtn: document.getElementById('closeEditBtn') as HTMLButtonElement,
  removeProductBtn: document.getElementById('removeProductBtn') as HTMLButtonElement,
  editName: document.getElementById('editName') as HTMLInputElement,
  editPrice: document.getElementById('editPrice') as HTMLInputElement,
  editCost: document.getElementById('editCost') as HTMLInputElement,
  editColorHex: document.getElementById('editColorHex') as HTMLSpanElement,
  editColorHexInput: document.getElementById('editColorHexInput') as HTMLInputElement,
  colorGroup: document.querySelector('.color-input-group') as HTMLDivElement,
  colorPickerMenu: document.getElementById('colorPickerMenu') as HTMLDivElement,
  pickerSurface: document.getElementById('pickerSurface') as HTMLDivElement,
  pickerSurfaceThumb: document.getElementById('pickerSurfaceThumb') as HTMLDivElement,
  hueSlider: document.getElementById('hueSlider') as HTMLDivElement,
  hueThumb: document.getElementById('hueThumb') as HTMLDivElement,
  hueValue: document.getElementById('hueValue') as HTMLSpanElement,
  pickerHexCard: document.getElementById('pickerHexCard') as HTMLDivElement,
  saveProductBtn: document.getElementById('saveProductBtn') as HTMLButtonElement,
  report: document.getElementById('reportCard') as HTMLDivElement,
  eventReport: document.getElementById('eventCard') as HTMLDivElement,
  expenseModalOverlay: document.getElementById('expenseModalOverlay') as HTMLDivElement,
  expenseModalCloseBtn: document.getElementById('expenseModalCloseBtn') as HTMLButtonElement,
  expenseModalCancelBtn: document.getElementById('expenseModalCancelBtn') as HTMLButtonElement,
  reportPageTitle: document.getElementById('reportPageTitle') as HTMLHeadingElement,
  eventPageTitle: document.getElementById('eventPageTitle') as HTMLHeadingElement,
  reportBackBtn: document.getElementById('reportBackBtn') as HTMLButtonElement,
  eventBackBtn: document.getElementById('eventBackBtn') as HTMLButtonElement,
  reportDeleteBtn: document.getElementById('reportDeleteBtn') as HTMLButtonElement,
  eventDeleteBtn: document.getElementById('eventDeleteBtn') as HTMLButtonElement,
  historySavedReports: document.getElementById('historySavedReports') as HTMLDivElement,
  historySavedEventReports: document.getElementById('historySavedEventReports') as HTMLDivElement,
  historyRecentPurchase: document.getElementById('historyRecentPurchase') as HTMLDivElement,
  saveModalOverlay: document.getElementById('saveModalOverlay') as HTMLDivElement,
  saveModalTitle: document.getElementById('saveModalTitle') as HTMLHeadingElement,
  saveModalInput: document.getElementById('saveModalInput') as HTMLInputElement,
  saveModalSaveBtn: document.getElementById('saveModalSaveBtn') as HTMLButtonElement,
  saveModalCancelBtn: document.getElementById('saveModalCancelBtn') as HTMLButtonElement,
  saveModalCloseBtn: document.getElementById('saveModalCloseBtn') as HTMLButtonElement,
  compareModalOverlay: document.getElementById('compareModalOverlay') as HTMLDivElement,
  compareModalTitle: document.getElementById('compareModalTitle') as HTMLHeadingElement,
  compareModalList: document.getElementById('compareModalList') as HTMLDivElement,
  compareModalConfirmBtn: document.getElementById('compareModalConfirmBtn') as HTMLButtonElement,
  compareModalCancelBtn: document.getElementById('compareModalCancelBtn') as HTMLButtonElement,
  compareModalCloseBtn: document.getElementById('compareModalCloseBtn') as HTMLButtonElement,
  compareSalesBtn: document.getElementById('compareSalesBtn') as HTMLButtonElement,
  compareEventsBtn: document.getElementById('compareEventsBtn') as HTMLButtonElement,
  compareSalesCard: document.getElementById('compareSalesCard') as HTMLDivElement,
  compareEventCard: document.getElementById('compareEventCard') as HTMLDivElement,
  compareSalesBackBtn: document.getElementById('compareSalesBackBtn') as HTMLButtonElement,
  compareEventBackBtn: document.getElementById('compareEventBackBtn') as HTMLButtonElement,
  productMenuBtn: document.getElementById('openProductsMenuBtn') as HTMLDivElement,
  salesReportHistoryBackBtn: document.getElementById('salesReportHistoryBackBtn') as HTMLButtonElement,
  eventReportHistoryBackBtn: document.getElementById('eventReportHistoryBackBtn') as HTMLButtonElement,
  productHistoryBackBtn: document.getElementById('productHistoryBackBtn') as HTMLButtonElement,
  productHistoryAddBtn: document.getElementById('productHistoryAddBtn') as HTMLButtonElement,
  productHistoryList: document.getElementById('productHistoryList') as HTMLDivElement,
  salesReportHistoryList: document.getElementById('salesReportHistoryList') as HTMLDivElement,
  eventReportHistoryList: document.getElementById('eventReportHistoryList') as HTMLDivElement,
  importModalOverlay: document.getElementById('importModalOverlay') as HTMLDivElement,
  importSavedReportsList: document.getElementById('importSavedReportsList') as HTMLDivElement,
  importModalCancelBtn: document.getElementById('importModalCancelBtn') as HTMLButtonElement,
  importModalConfirmBtn: document.getElementById('importModalConfirmBtn') as HTMLButtonElement,
  importModalCloseBtn: document.getElementById('importModalCloseBtn') as HTMLButtonElement,
  confirmModalOverlay: document.getElementById('confirmModalOverlay') as HTMLDivElement,
  confirmModalTitle: document.getElementById('confirmModalTitle') as HTMLHeadingElement,
  confirmModalMessage: document.getElementById('confirmModalMessage') as HTMLParagraphElement,
  confirmModalCloseBtn: document.getElementById('confirmModalCloseBtn') as HTMLButtonElement,
  confirmModalCancelBtn: document.getElementById('confirmModalCancelBtn') as HTMLButtonElement,
  confirmModalConfirmBtn: document.getElementById('confirmModalConfirmBtn') as HTMLButtonElement,
};

function openConfirmModal(message: string, confirmLabel = 'Delete', onConfirm?: () => void) {
  const overlay = el.confirmModalOverlay;
  const msg = el.confirmModalMessage;
  const confirmBtn = el.confirmModalConfirmBtn;
  const cancelBtn = el.confirmModalCancelBtn;
  const closeBtn = el.confirmModalCloseBtn;
  if (!overlay || !msg || !confirmBtn || !cancelBtn || !closeBtn) return;
  msg.textContent = message;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.classList.add('danger');
  overlay.classList.add('open');

  const cleanup = () => {
    overlay.classList.remove('open');
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    closeBtn.onclick = null;
  };

  confirmBtn.onclick = () => {
    cleanup();
    try { onConfirm && onConfirm(); } catch { /* ignore */ }
  };
  cancelBtn.onclick = () => { cleanup(); };
  closeBtn.onclick = () => { cleanup(); };

  overlay.onclick = (ev) => { if (ev.target === overlay) cleanup(); };
}

// Per-product totals for a set of sales. Products that were sold but are no longer in the
// product list (e.g. deactivated) are still included so the breakdown matches the revenue.
function buildProductBreakdown(sales: SaleRecord[], reportProducts: Product[]) {
  const productTotals = new Map<string, { count: number; revenue: number; profit: number }>();
  for (const sale of sales) {
    const entry = productTotals.get(sale.product) ?? { count: 0, revenue: 0, profit: 0 };
    entry.count += 1;
    entry.revenue += sale.price;
    entry.profit += sale.price - sale.cost;
    productTotals.set(sale.product, entry);
  }

  const known = new Set(reportProducts.map((product) => product.name));
  const orphanProducts = [...productTotals.keys()]
    .filter((name) => !known.has(name))
    .map((name) => ({ name, color: productHistory.find((product) => product.name === name)?.color ?? '' }));

  return [...reportProducts, ...orphanProducts].map((product) => {
    const totalsForProduct = productTotals.get(product.name) ?? { count: 0, revenue: 0, profit: 0 };
    return { name: product.name, color: product.color, ...totalsForProduct };
  });
}

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

function profitClass(value: number) {
  return value < 0 ? 'profit is-negative' : value === 0 ? 'profit is-zero' : 'profit';
}

function summaryTile(label: string, value: string, hint: string, valueClass = 'value') {
  return `
          <div class="summary-tile">
            <span class="label">${label}</span>
            <span class="${valueClass}">${value}</span>
            <span class="hint">${hint}</span>
          </div>`;
}

// One row layout for every per-product breakdown: name, profit and revenue on the left;
// sales count and share of units sold on the right.
function buildProductRows(rows: Array<{ name: string; color: string; count: number; revenue: number; profit: number }>, totalUnits: number) {
  return `<div class="product-columns">${rows.map((item) => {
    const share = totalUnits ? (item.count / totalUnits) * 100 : 0;
    return `
            <div class="product-row">
              <div class="performance-item">
                <div class="performance-top">
                  <strong>${escapeHtml(item.name)}</strong>
                </div>
                <div class="performance-details">
                  <span class="${profitClass(item.profit)}">${fmt(item.profit)} profit</span>
                  <span>${fmt(item.revenue)} revenue</span>
                </div>
              </div>
              <div class="distribution-item">
                <div class="distribution-line">
                  <span class="distribution-sales">${plural(item.count, 'sale')}</span>
                  <span class="distribution-value">${share.toFixed(0)}%</span>
                </div>
                <div class="distribution-track">
                  <div class="distribution-fill" style="width:${share > 0 ? Math.max(4, share) : 0}%;background:${escapeHtml(item.color || 'var(--highlight)')}"></div>
                </div>
              </div>
            </div>`;
  }).join('')}</div>`;
}

function buildReportMarkup() {
  const reportSales = previewReport && previewReport.type === 'sales' ? previewReport.sales : tx;
  const reportProducts = previewReport && previewReport.type === 'sales' ? previewReport.products : products;
  const { revenue, profit, cash: cashRevenue, qris: qrisRevenue } = totals(reportSales);
  const cashSales = reportSales.filter((item) => item.payment === 'Cash').length;
  const qrisSales = reportSales.filter((item) => item.payment === 'QRIS').length;

  const allProducts = buildProductBreakdown(reportSales, reportProducts)
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const grossMargin = revenue ? (profit / revenue) * 100 : 0;

  return `
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Sales overview</h2>
            <p class="report-subtitle">${reportSales.length ? 'Revenue, profit, payment mix and best-selling products.' : 'Every sale you record will appear here.'}</p>
          </div>
        </div>
        <div class="summary-grid">
          ${summaryTile('Revenue', fmt(revenue), plural(reportSales.length, 'sale'))}
          ${summaryTile('Profit', fmt(profit), `${grossMargin.toFixed(1)}% margin`)}
          ${summaryTile('Cash', String(cashSales), `${fmt(cashRevenue)} via cash`)}
          ${summaryTile('QRIS', String(qrisSales), `${fmt(qrisRevenue)} via QRIS`)}
        </div>
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Product distribution</h2>
        </div>
        ${allProducts.length ? buildProductRows(allProducts, reportSales.length) : '<div class="empty-state">No products yet.</div>'}
      </section>
    </div>`;
}

function buildEventMarkup() {
  const { hasReport, sales: reportSales, products: reportProducts, eventCosts: reportCosts } = getEventView();
  const totalCost = reportCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const { revenue, profit } = totals(reportSales);
  const netProfit = revenue - totalCost;
  const grossMargin = revenue ? (profit / revenue) * 100 : 0;

  const topProducts = buildProductBreakdown(reportSales, reportProducts)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.count - a.count)
    .slice(0, 5);

  return `
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Event overview</h2>
            <p class="report-subtitle">${hasReport ? 'Revenue and profit after event expenses.' : 'Import sales to see event revenue and profit.'}</p>
          </div>
        </div>
        ${hasReport ? `
        <div class="summary-grid">
          ${summaryTile('Revenue', fmt(revenue), plural(reportSales.length, 'sale'))}
          ${summaryTile('Profit', fmt(profit), `${grossMargin.toFixed(1)}% margin`)}
          ${summaryTile('Expenses', fmt(totalCost), plural(reportCosts.length, 'expense'))}
          ${summaryTile(netProfit < 0 ? 'Deficit' : 'Net profit', fmt(netProfit), 'Revenue − expenses', netProfit < 0 ? 'value deficit' : 'value')}
        </div>
        ` : ''}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Expenses</h2>
          <button class="control-btn add-expense-btn" id="openAddExpenseBtn" type="button" title="Add expense" aria-label="Add expense"><span class="material-symbols-outlined control-icon">add</span></button>
        </div>
        ${reportCosts.length ? `<div class="cost-list">${reportCosts.map((cost) => `
          <div class="cost-item">
            <div>
              <strong>${escapeHtml(cost.name)}</strong>
            </div>
            <div class="cost-actions">
              <span class="cost-amount">${fmt(cost.amount)}</span>
              <button class="history-item-delete edit-cost" type="button" data-id="${escapeHtml(cost.id)}" title="Edit expense" aria-label="Edit expense"><span class="material-symbols-outlined">edit</span></button>
              <button class="history-item-delete delete-cost" type="button" data-id="${escapeHtml(cost.id)}" title="Delete expense" aria-label="Delete expense"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>`).join('')}</div>` : '<div class="empty-state">No expenses yet. Add booth rental, transport or staffing costs.</div>'}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Top products</h2>
          <button class="control-btn add-expense-btn" id="eventImportBtn" type="button" title="Import sales" aria-label="Import sales"><span class="material-symbols-outlined control-icon">download</span></button>
        </div>
        ${topProducts.length ? buildProductRows(topProducts, reportSales.length) : '<div class="empty-state">No sales imported yet.</div>'}
      </section>
    </div>`;
}

function updateExpenseButtonState() {
  const addCostBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;
  const costName = document.getElementById('eventCostName') as HTMLInputElement | null;
  const costAmount = document.getElementById('eventCostAmount') as HTMLInputElement | null;

  if (!addCostBtn || !costName || !costAmount) return;
  const name = costName.value.trim();
  const amount = parseCurrencyInput(costAmount.value, loadSettings().currency);
  addCostBtn.disabled = !name || Number.isNaN(amount) || amount <= 0;
}

function resetExpenseModal() {
  const overlay = document.getElementById('expenseModalOverlay') as HTMLDivElement | null;
  const title = document.getElementById('expenseModalTitle') as HTMLHeadingElement | null;
  const nameInput = document.getElementById('eventCostName') as HTMLInputElement | null;
  const amountInput = document.getElementById('eventCostAmount') as HTMLInputElement | null;
  const addBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;

  editingExpenseId = null;
  if (overlay) overlay.classList.remove('open');
  // restore scrolling when closing the expense modal
  try { unlockBodyScroll(); } catch (e) { /* ignore */ }
  if (title) title.textContent = 'Add expense';
  if (nameInput) nameInput.value = '';
  if (amountInput) amountInput.value = '';
  if (addBtn) {
    addBtn.textContent = 'Add expense';
    addBtn.disabled = true;
  }
}

// Expense modal controls are static markup, so they are wired exactly once.
function initExpenseModal() {
  const addCostBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;
  const costName = document.getElementById('eventCostName') as HTMLInputElement | null;
  const costAmount = document.getElementById('eventCostAmount') as HTMLInputElement | null;

  costName?.addEventListener('input', updateExpenseButtonState);
  costAmount?.addEventListener('input', () => {
    costAmount.value = formatInputNumber(costAmount.value, loadSettings().currency);
    updateExpenseButtonState();
  });

  if (addCostBtn && costName && costAmount) {
    addCostBtn.addEventListener('click', () => {
      const name = costName.value.trim();
      const amount = parseCurrencyInput(costAmount.value, loadSettings().currency);
      if (!name || Number.isNaN(amount) || amount <= 0) return;

      if (editingExpenseId) {
        const cost = getEventView().eventCosts.find((item) => item.id === editingExpenseId);
        if (cost) {
          cost.name = name;
          cost.amount = amount;
          saveActiveEventCosts();
        }
        resetExpenseModal();
        render();
      } else {
        resetExpenseModal();
        addEventCost(name, amount);
      }
    });
  }

  el.expenseModalCloseBtn?.addEventListener('click', resetExpenseModal);
  el.expenseModalCancelBtn?.addEventListener('click', resetExpenseModal);
  el.expenseModalOverlay?.addEventListener('click', (ev) => { if (ev.target === el.expenseModalOverlay) resetExpenseModal(); });
}

// The event card is re-rendered on every update, so its buttons are handled by delegation.
function initEventCardActions() {
  el.eventReport?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest('button');
    if (!target) return;

    if (target.id === 'openAddExpenseBtn') {
      event.stopPropagation();
      resetExpenseModal();
      el.expenseModalOverlay.classList.add('open');
      lockBodyScroll();
      updateExpenseButtonState();
      return;
    }

    if (target.id === 'eventImportBtn') {
      event.stopPropagation();
      openImportModal();
      return;
    }

    const id = target.getAttribute('data-id');
    if (!id) return;
    if (target.classList.contains('edit-cost')) openExpenseModalForEdit(id);
    else if (target.classList.contains('delete-cost')) removeEventCost(id);
  });
}

function makeTiles() {
  const gridEl = document.getElementById('grid') as HTMLDivElement | null;
  if (!gridEl) {
    console.warn('makeTiles: grid element not found');
    return;
  }

  // start from a clean slate to avoid duplicates when called multiple times
  gridEl.innerHTML = '';

  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'tile';
    card.style.setProperty('--tile', p.color);
    card.dataset.product = p.name;
    card.innerHTML = `
        <div class="tile-head">
          <div class="product-meta">
            <div class="product-name">${escapeHtml(p.name)}</div>
            <div class="product-price">${fmt(p.price)}</div>
          </div>
          <button class="settings-btn" aria-label="Edit ${escapeHtml(p.name)}"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="tile-bottom">
          <div class="payment-quarter">
            <span class="payment-label">Cash</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="Cash" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <div class="payment-value-wrap"><span class="payment-value" data-counter-for="Cash">0</span></div>
              <button class="control-btn" data-payment="Cash" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
          <div class="payment-quarter">
            <span class="payment-label">QRIS</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="QRIS" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <div class="payment-value-wrap"><span class="payment-value" data-counter-for="QRIS">0</span></div>
              <button class="control-btn" data-payment="QRIS" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
        </div>`;

    card.querySelectorAll('.control-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const payment = target.getAttribute('data-payment') || 'Cash';
        const action = target.getAttribute('data-action');
        const rect = card.getBoundingClientRect();
        const buttonRect = target.getBoundingClientRect();
        card.style.setProperty('--x', `${buttonRect.left - rect.left + buttonRect.width / 2}px`);
        card.style.setProperty('--y', `${buttonRect.top - rect.top + buttonRect.height / 2}px`);
        card.classList.add('ripple');
        setTimeout(() => card.classList.remove('ripple'), 160);
        if (action === 'plus') {
          recordSale(p, payment);
        } else {
          removeLastMatching(p.name, payment);
        }
      });
    });

    const settingsBtn = card.querySelector('.settings-btn') as HTMLButtonElement;
    settingsBtn.addEventListener('click', () => {
      openProductEditor(products.findIndex((item) => item.name === p.name));
    });

    gridEl.appendChild(card);
  });
}

function recordSale(p: Product, payment: string) {
  tx.push({ product: p.name, price: p.price, cost: p.cost, payment, timestamp: new Date() });
  saveSales();
  animatedProduct = p.name;
  animatedPayment = payment;
  render(true);
  showToast(`${p.name} • ${payment}`);
}

function removeLastMatching(product: string, payment: string) {
  for (let i = tx.length - 1; i >= 0; i--) {
    if (tx[i].product === product && tx[i].payment === payment) {
      tx.splice(i, 1);
      saveSales();
      animatedProduct = product;
      animatedPayment = payment;
      render(true);
      showToast(`${product} removed`);
      return;
    }
  }
  showToast('Nothing to remove');
}

function buildHistoryMarkup(allReports: SavedReport[] = loadSavedReports()) {
  const savedReports = allReports.filter((r) => r.type === 'sales');
  const savedEventReports = allReports.filter((r) => r.type === 'event');
  const recentPurchases = tx.slice(-5).reverse();

  const renderReportList = (reports: SavedReport[]) => {
    if (!reports.length) return '<div class="empty-state">No saved reports yet.</div>';
    return reports
      .map(
        (report) => `
          <div class="history-item" data-id="${escapeHtml(report.id)}" data-type="${report.type}" tabindex="0" role="button">
            <div>
              <strong>${escapeHtml(report.name)}</strong>
              <div class="history-meta">${new Date(report.createdAt).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
              <button class="icon-btn history-item-delete" type="button" title="Delete report" data-delete-id="${escapeHtml(report.id)}">
                <span class="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        `,
      )
      .join('');
  };

  const attachReportClick = (container: HTMLDivElement | null) => {
    if (!container) return;
    container.querySelectorAll('.history-item').forEach((item) => {
      const deleteBtn = item.querySelector('.history-item-delete') as HTMLButtonElement | null;
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (event) => {
          event.stopPropagation();
          const reportId = deleteBtn.getAttribute('data-delete-id');
          if (!reportId) return;
          confirmDeleteSavedReport(reportId);
        });
      }

      item.addEventListener('click', () => {
        const reportId = item.getAttribute('data-id');
        if (!reportId) return;
        const report = loadSavedReports().find((r) => r.id === reportId);
        if (!report) return;
        previewReport = report;
        openScreen(report.type === 'event' ? 'eventScreen' : 'reportsScreen');
        render();
      });

      item.addEventListener('keydown', (event) => {
        const keyboardEvent = event as KeyboardEvent;
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          keyboardEvent.preventDefault();
          (item as HTMLElement).click();
        }
      });
    });
  };

  const renderPurchaseList = (purchases: SaleRecord[]) => {
    if (!purchases.length) return '<div class="empty-state">No sales recorded yet.</div>';
    return purchases
      .map(
        (purchase) => `
          <div class="history-item">
            <div>
              <strong>${escapeHtml(purchase.product)}</strong>
              <div class="history-meta">${escapeHtml(purchase.payment)} · ${fmt(purchase.price)}</div>
            </div>
            <span class="history-badge">${new Date(purchase.timestamp).toLocaleTimeString()}</span>
          </div>
        `,
      )
      .join('');
  };

  if (el.historySavedReports) el.historySavedReports.innerHTML = renderReportList(savedReports);
  if (el.historySavedEventReports) el.historySavedEventReports.innerHTML = renderReportList(savedEventReports);
  if (el.historyRecentPurchase) el.historyRecentPurchase.innerHTML = renderPurchaseList(recentPurchases);
  attachReportClick(el.historySavedReports);
  attachReportClick(el.historySavedEventReports);
}

function renderProductHistory() {
  if (!el.productHistoryList) return;
  // Use preserved view order if user is currently on the product history screen
  // Products created after the order was captured are appended so they never disappear from the list.
  const orderedHistory = productHistoryViewOrder
    ? [
        ...(productHistoryViewOrder.map((name) => productHistory.find((p) => p.name === name)).filter(Boolean) as typeof productHistory),
        ...productHistory.filter((p) => !productHistoryViewOrder!.includes(p.name)),
      ]
    : productHistory;
  const activeNames = new Set(products.map((item) => item.name));

  const rows = orderedHistory.length
    ? orderedHistory
        .map((product) => {
          const isActive = activeNames.has(product.name);
          const name = escapeHtml(product.name);
          return `
            <div class="product-history-item" style="--product-color: ${escapeHtml(product.color)};">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${name}</strong>
                  <span class="history-meta"><span class="nowrap">Price ${fmt(product.price)}</span> · <span class="nowrap">Cost ${fmt(product.cost)}</span></span>
                </div>
                <div class="product-history-actions">
                  <button class="product-edit-btn" type="button" data-name="${name}" title="Edit ${name}">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn product-delete-btn" type="button" data-name="${name}" title="Delete ${name}">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                  <button class="product-toggle-btn" type="button" data-name="${name}" data-active="${isActive}" aria-pressed="${isActive}">
                    <span class="toggle-label">${isActive ? 'Active' : 'Add'}</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        })
        .join('')
    : '<div class="empty-state">No products have been created yet.</div>';

  el.productHistoryList.innerHTML = rows;
  el.productHistoryList.querySelectorAll<HTMLButtonElement>('.product-edit-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.getAttribute('data-name');
      if (!name) return;
      const index = products.findIndex((product) => product.name === name);
      if (index >= 0) {
        openProductEditor(index);
        return;
      }

      const historyIndex = productHistory.findIndex((p) => p.name === name);
      if (historyIndex < 0) {
        showToast(`${name} not found`);
        return;
      }
      openProductEditor(-1, historyIndex);
    });
  });

  // Toggle add/remove active product to save space (single compact control)
  el.productHistoryList.querySelectorAll<HTMLButtonElement>('.product-toggle-btn').forEach((button) => {
    button.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const name = button.getAttribute('data-name');
      if (!name) return;
      const isActive = products.some((item) => item.name === name);

      if (isActive) {
        // Deactivate: remove from active products but keep history
        for (let i = products.length - 1; i >= 0; i--) {
          if (products[i].name === name) products.splice(i, 1);
        }
        saveProducts();
        rebuildGrid();
        showToast(`${name} removed from counter`);
        render(true);
        return;
      }

      // Activate: add back from history
      const existing = productHistory.find((product) => product.name === name);
      if (!existing) return;
      if (products.some((item) => item.name === name)) {
        showToast(`${name} is already active`);
        return;
      }
      products.push({ ...existing });
      saveProducts();
      rebuildGrid();
      showToast(`${name} added back to counter`);
      render(true);
    });
  });

  el.productHistoryList.querySelectorAll<HTMLButtonElement>('.product-delete-btn').forEach((button) => {
    button.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const name = button.getAttribute('data-name');
      if (!name) return;

      openConfirmModal(`Permanently delete product '${name}'? This cannot be undone.`, 'Delete', () => {
        // Remove from productHistory
        for (let i = productHistory.length - 1; i >= 0; i--) {
          if (productHistory[i].name === name) productHistory.splice(i, 1);
        }

        // Remove from active products
        for (let i = products.length - 1; i >= 0; i--) {
          if (products[i].name === name) products.splice(i, 1);
        }

        // Remove related sales
        for (let i = tx.length - 1; i >= 0; i--) {
          if (tx[i].product === name) tx.splice(i, 1);
        }

        saveProductHistory();
        saveProducts();
        saveSales();
        rebuildGrid();
        render(true);
        showToast(`${name} permanently deleted`);
      });
    });
  });
}

function renderSavedReportHistory(type: 'sales' | 'event', allReports: SavedReport[] = loadSavedReports()) {
  const list = type === 'sales' ? el.salesReportHistoryList : el.eventReportHistoryList;
  if (!list) return;
  const savedReports = allReports.filter((report) => report.type === type);
  const targetScreen = type === 'sales' ? 'reportsScreen' : 'eventScreen';

  const rows = savedReports.length
    ? savedReports
        .map(
          (report) => `
            <div class="sales-report-history-item" data-id="${escapeHtml(report.id)}" tabindex="0" role="button">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${escapeHtml(report.name)}</strong>
                  <span class="history-meta">${new Date(report.createdAt).toLocaleString()}</span>
                </div>
                <div class="product-history-actions">
                  <button class="icon-btn sales-report-edit-btn" type="button" title="Rename report">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn history-item-delete" type="button" title="Delete report">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `,
        )
        .join('')
    : `<div class="empty-state">No saved ${type} reports yet.</div>`;

  list.innerHTML = rows;
  list.querySelectorAll<HTMLElement>('.sales-report-history-item').forEach((item) => {
    const reportId = item.getAttribute('data-id');
    if (!reportId) return;

    item.querySelector<HTMLButtonElement>('.sales-report-edit-btn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      const report = loadSavedReports().find((entry) => entry.id === reportId);
      if (!report) return;
      renamingSavedReportId = reportId;
      el.saveModalTitle.textContent = 'Rename report';
      el.saveModalInput.value = report.name;
      el.saveModalInput.placeholder = 'New report name';
      el.saveModalSaveBtn.textContent = 'Rename';
      el.saveModalSaveBtn.disabled = report.name.trim().length === 0;
      el.saveModalOverlay.classList.add('open');
      el.saveModalInput.focus();
    });

    item.querySelector<HTMLButtonElement>('.history-item-delete')?.addEventListener('click', (event) => {
      event.stopPropagation();
      confirmDeleteSavedReport(reportId);
    });

    item.addEventListener('click', () => {
      const report = loadSavedReports().find((entry) => entry.id === reportId);
      if (!report) return;
      previewReport = report;
      openScreen(targetScreen);
      render();
    });

    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        item.click();
      }
    });
  });
}

function getReportSummary(report: SavedReport) {
  const revenue = report.sales.reduce((sum, item) => sum + item.price, 0);
  const profit = report.sales.reduce((sum, item) => sum + (item.price - item.cost), 0);
  const margin = revenue ? (profit / revenue) * 100 : 0;
  const salesCount = report.sales.length;
  const breakdown = report.products
    .map((product) => {
      const matchingSales = report.sales.filter((sale) => sale.product === product.name);
      const productRevenue = matchingSales.reduce((sum, sale) => sum + sale.price, 0);
      const productProfit = matchingSales.reduce((sum, sale) => sum + (sale.price - sale.cost), 0);
      return {
        name: product.name,
        count: matchingSales.length,
        revenue: productRevenue,
        profit: productProfit,
      };
    })
    .filter((product) => product.count > 0)
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const topProduct = breakdown[0] || null;

  return { revenue, profit, margin, salesCount, breakdown, topProduct };
}

function buildCompareCard(report: SavedReport, label: string, comparisonReport?: SavedReport, productRows: Array<{ name: string; value: number; winner: boolean }> = []) {
  const summary = getReportSummary(report);
  const comparisonSummary = comparisonReport ? getReportSummary(comparisonReport) : null;
  const { revenue, profit, margin, salesCount } = summary;

  const revenueWinner = comparisonSummary ? revenue > comparisonSummary.revenue : false;
  const profitWinner = comparisonSummary ? profit > comparisonSummary.profit : false;
  const marginWinner = comparisonSummary ? margin > comparisonSummary.margin : false;
  const salesWinner = comparisonSummary ? salesCount > comparisonSummary.salesCount : false;

  return `
    <div class="compare-card">
      <div class="compare-card-header">
        ${label ? `<span class="compare-card-tag">${label}</span>` : ''}
        <h3>${escapeHtml(report.name)}</h3>
      </div>
      <div class="compare-metric ${revenueWinner ? 'compare-metric-winner' : ''}"><span>Revenue</span><span>${fmt(revenue)}</span></div>
      <div class="compare-metric ${profitWinner ? 'compare-metric-winner' : ''}"><span>Profit</span><span>${fmt(profit)}</span></div>
      <div class="compare-metric ${marginWinner ? 'compare-metric-winner' : ''}"><span>Margin</span><span>${margin.toFixed(1)}%</span></div>
      <div class="compare-metric ${salesWinner ? 'compare-metric-winner' : ''}"><span>Sales</span><span>${salesCount}</span></div>
      ${productRows.length ? `
        <div class="compare-product-list compare-product-list-inline">
          <div class="compare-product-section-title">Products Sold</div>
          ${productRows
            .map(
              (item) => `
                <div class="compare-product-row">
                  <div class="compare-product-name">
                    <strong>${escapeHtml(item.name)}</strong>
                  </div>
                  <div class="compare-product-side ${item.winner ? 'winner' : ''}">
                    <span class="report-side-value">${item.value}</span>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function buildEventCompareCard(report: SavedReport, label: string, comparisonReport?: SavedReport, productRows: Array<{ name: string; value: number; winner: boolean }> = []) {
  const comparisonSummary = comparisonReport ? getReportSummary(comparisonReport) : null;
  const revenue = report.sales.reduce((sum, item) => sum + item.price, 0);
  const profit = report.sales.reduce((sum, item) => sum + (item.price - item.cost), 0);
  const eventCost = report.eventCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const netProfit = revenue - eventCost;
  const comparisonRevenue = comparisonSummary ? comparisonSummary.revenue : 0;
  const comparisonProfit = comparisonSummary ? comparisonSummary.profit : 0;
  const comparisonCost = comparisonReport ? comparisonReport.eventCosts.reduce((sum, cost) => sum + cost.amount, 0) : 0;
  const comparisonNetProfit = comparisonRevenue - comparisonCost;

  const costWinner = comparisonReport ? eventCost < comparisonCost : false;
  const revenueWinner = comparisonReport ? revenue > comparisonRevenue : false;
  const profitWinner = comparisonReport ? profit > comparisonProfit : false;
  const netProfitWinner = comparisonReport ? netProfit > comparisonNetProfit : false;
  const isDeficit = netProfit < 0;
  const netMetricLabel = isDeficit ? 'Deficit' : 'Net profit';
  const netMetricValueClass = isDeficit ? 'compare-metric-negative' : '';

  const expenseNames = Array.from(new Set([
    ...report.eventCosts.map((cost) => cost.name),
    ...(comparisonReport ? comparisonReport.eventCosts.map((cost) => cost.name) : []),
  ]));

  const expenseRows = expenseNames
    .map((name) => {
      const leftCost = report.eventCosts.find((cost) => cost.name === name)?.amount ?? 0;
      const rightCost = comparisonReport ? comparisonReport.eventCosts.find((cost) => cost.name === name)?.amount ?? 0 : 0;
      return {
        name,
        value: leftCost,
        winner: comparisonReport ? leftCost < rightCost : false,
      };
    })
    .sort((a, b) => b.value - a.value);

  return `
    <div class="compare-card">
      <div class="compare-card-header">
        ${label ? `<span class="compare-card-tag">${label}</span>` : ''}
        <h3>${escapeHtml(report.name)}</h3>
      </div>
      <div class="compare-metric ${costWinner ? 'compare-metric-winner' : ''}"><span>Expenses</span><span>${fmt(eventCost)}</span></div>
      <div class="compare-metric ${revenueWinner ? 'compare-metric-winner' : ''}"><span>Revenue</span><span>${fmt(revenue)}</span></div>
      <div class="compare-metric ${profitWinner ? 'compare-metric-winner' : ''}"><span>Profit</span><span>${fmt(profit)}</span></div>
      <div class="compare-metric ${netProfitWinner ? 'compare-metric-winner' : ''}"><span>${netMetricLabel}</span><span class="${netMetricValueClass}">${fmt(netProfit)}</span></div>
      ${expenseRows.length ? `
        <div class="compare-expense-list compare-product-list-inline">
          <div class="compare-product-section-title">Expenses</div>
          ${expenseRows
            .map(
              (item) => `
                <div class="compare-expense-row ${item.winner ? 'compare-expense-winner' : ''}">
                  <span class="compare-expense-name">${escapeHtml(item.name)}</span>
                  <span class="compare-expense-value">${fmt(item.value)}</span>
                </div>
              `,
            )
            .join('')}
        </div>
      ` : ''}
      ${productRows.length ? `
        <div class="compare-product-list compare-product-list-inline">
          <div class="compare-product-section-title">Products Sold</div>
          ${productRows
            .map(
              (item) => `
                <div class="compare-product-row">
                  <div class="compare-product-name">
                    <strong>${escapeHtml(item.name)}</strong>
                  </div>
                  <div class="compare-product-side ${item.winner ? 'winner' : ''}">
                    <span class="report-side-value">${item.value}</span>
                  </div>
                </div>
              `,
            )
            .join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderCompareSalesPage() {
  if (!el.compareSalesCard) return;
  const savedIds = compareConfirmedIds.sales;
  const selected = loadSavedReports().filter((report) => report.type === 'sales' && savedIds.includes(report.id));
  if (selected.length < 2) {
    el.compareSalesCard.innerHTML = '<div class="empty-state">Select two saved sales reports to compare.</div>';
    return;
  }

  const [left, right] = selected;
  const leftSummary = getReportSummary(left);
  const rightSummary = getReportSummary(right);
  const productNames = Array.from(new Set([...leftSummary.breakdown.map((item) => item.name), ...rightSummary.breakdown.map((item) => item.name)]));
  const productSalesRows = productNames
    .map((name) => {
      const leftProduct = leftSummary.breakdown.find((item) => item.name === name);
      const rightProduct = rightSummary.breakdown.find((item) => item.name === name);
      const leftCount = leftProduct?.count ?? 0;
      const rightCount = rightProduct?.count ?? 0;
      return {
        name,
        leftCount,
        rightCount,
        winner: leftCount === rightCount ? 'equal' : leftCount > rightCount ? 'left' : 'right',
      };
    })
    .sort((a, b) => b.leftCount + b.rightCount - (a.leftCount + a.rightCount))
    .slice(0, 6);

  el.compareSalesCard.innerHTML = `
    <div class="compare-sales-page">
      <div class="compare-report-columns">
        <div class="compare-report-column">
          <div class="compare-report-header">Report A</div>
          ${buildCompareCard(
            left,
            '',
            right,
            productSalesRows.map((item) => ({
              name: item.name,
              value: item.leftCount,
              winner: item.winner === 'left',
            })),
          )}
        </div>
        <div class="compare-report-column">
          <div class="compare-report-header">Report B</div>
          ${buildCompareCard(
            right,
            '',
            left,
            productSalesRows.map((item) => ({
              name: item.name,
              value: item.rightCount,
              winner: item.winner === 'right',
            })),
          )}
        </div>
      </div>
    </div>
  `;
}

function renderCompareEventPage() {
  if (!el.compareEventCard) return;
  const savedIds = compareConfirmedIds.event;
  const selected = loadSavedReports().filter((report) => report.type === 'event' && savedIds.includes(report.id));
  if (selected.length < 2) {
    el.compareEventCard.innerHTML = '<div class="empty-state">Select two saved event reports to compare.</div>';
    return;
  }

  const [left, right] = selected;
  const leftSummary = getReportSummary(left);
  const rightSummary = getReportSummary(right);
  const productNames = Array.from(new Set([...leftSummary.breakdown.map((item) => item.name), ...rightSummary.breakdown.map((item) => item.name)]));
  const productSalesRows = productNames
    .map((name) => {
      const leftProduct = leftSummary.breakdown.find((item) => item.name === name);
      const rightProduct = rightSummary.breakdown.find((item) => item.name === name);
      const leftCount = leftProduct?.count ?? 0;
      const rightCount = rightProduct?.count ?? 0;
      return {
        name,
        leftCount,
        rightCount,
        winner: leftCount === rightCount ? 'equal' : leftCount > rightCount ? 'left' : 'right',
      };
    })
    .sort((a, b) => b.leftCount + b.rightCount - (a.leftCount + a.rightCount))
    .slice(0, 6);

  el.compareEventCard.innerHTML = `
    <div class="compare-sales-page">
      <div class="compare-report-columns">
        <div class="compare-report-column">
          <div class="compare-report-header">Report A</div>
          ${buildEventCompareCard(
            left,
            '',
            right,
            productSalesRows.map((item) => ({
              name: item.name,
              value: item.leftCount,
              winner: item.winner === 'left',
            })),
          )}
        </div>
        <div class="compare-report-column">
          <div class="compare-report-header">Report B</div>
          ${buildEventCompareCard(
            right,
            '',
            left,
            productSalesRows.map((item) => ({
              name: item.name,
              value: item.rightCount,
              winner: item.winner === 'right',
            })),
          )}
        </div>
      </div>
    </div>
  `;
}

const compareConfirmedIds: Record<'sales' | 'event', string[]> = { sales: [], event: [] };
let compareDraftIds: string[] = [];
let compareModalType: 'sales' | 'event' = 'sales';
let productHistoryViewOrder: string[] | null = null;

function renderCompareSelectionList(type: 'sales' | 'event') {
  if (!el.compareModalList) return;
  const reports = loadSavedReports().filter((report) => report.type === type);
  if (!reports.length) {
    el.compareModalList.innerHTML = '<div class="empty-state">No saved reports yet.</div>';
    return;
  }

  el.compareModalList.innerHTML = reports
    .map((report) => `
      <label class="import-item">
        <input type="checkbox" value="${escapeHtml(report.id)}" ${compareDraftIds.includes(report.id) ? 'checked' : ''} />
        <div>
          <strong>${escapeHtml(report.name)}</strong>
          <small>${new Date(report.createdAt).toLocaleString()}</small>
        </div>
      </label>
    `)
    .join('');
}

function openCompareModal(type: 'sales' | 'event') {
  compareModalType = type;
  compareDraftIds = [...compareConfirmedIds[type]];
  const title = type === 'sales' ? 'Compare sales' : 'Compare events';
  if (el.compareModalTitle) el.compareModalTitle.textContent = title;
  renderCompareSelectionList(type);
  el.compareModalConfirmBtn.disabled = compareDraftIds.length !== 2;
  if (el.compareModalOverlay) {
    el.compareModalOverlay.classList.add('open');
  }
}

function closeCompareModal(resetSelection = false) {
  if (el.compareModalOverlay) {
    el.compareModalOverlay.classList.remove('open');
  }
  if (resetSelection) {
    compareDraftIds = [];
  }
}

function confirmCompareSelection() {
  const checked = Array.from(el.compareModalList.querySelectorAll('input[type="checkbox"]'))
    .filter((checkbox) => (checkbox as HTMLInputElement).checked)
    .map((checkbox) => (checkbox as HTMLInputElement).value);

  if (checked.length !== 2) {
    showToast('Select exactly 2 reports');
    return;
  }

  compareDraftIds = checked;
  compareConfirmedIds[compareModalType] = [...checked];
  closeCompareModal(false);
  if (compareModalType === 'sales') {
    renderCompareSalesPage();
    openScreen('compareSalesScreen');
  } else {
    renderCompareEventPage();
    openScreen('compareEventScreen');
  }
  render();
}

function render(bump = false) {
  const s = totals(tx);
  const statRows: Array<[string, number]> = [['Revenue', s.revenue], ['Profit', s.profit]];
  el.headline.textContent = `${fmt(s.revenue)} × ${tx.length}`;
  el.stats.innerHTML = statRows
    .map((x) => `<div class="stat ${bump ? 'bump' : ''}"><span class="label">${x[0]}</span><span class="value">${fmt(x[1])}</span></div>`)
    .join('');
  setTimeout(() => document.querySelectorAll('.stat').forEach((x) => x.classList.remove('bump')), 220);

  const counts = new Map<string, number>();
  for (const sale of tx) {
    const key = `${sale.payment}\u0000${sale.product}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  document.querySelectorAll<HTMLElement>('.tile').forEach((tile) => {
    const product = tile.dataset.product || '';
    tile.querySelectorAll<HTMLElement>('.payment-value[data-counter-for]').forEach((value) => {
      value.textContent = `${counts.get(`${value.dataset.counterFor}\u0000${product}`) ?? 0}`;
    });
  });

  if (bump && animatedProduct && animatedPayment) {
    const product = animatedProduct;
    const payment = animatedPayment;
    requestAnimationFrame(() => {
      document.querySelectorAll('.tile').forEach((tile) => {
        const tileProduct = tile.getAttribute('data-product') || '';
        if (tileProduct === product) {
          const quarters = tile.querySelectorAll('.payment-quarter');
          const matchingQuarter = payment === 'Cash' ? quarters[0] : quarters[1];
          if (matchingQuarter) {
            matchingQuarter.classList.remove('bump');
            void (matchingQuarter as HTMLElement).offsetWidth;
            matchingQuarter.classList.add('bump');
          }
        }
      });
    });
    window.setTimeout(() => document.querySelectorAll('.payment-quarter.bump').forEach((quarter) => quarter.classList.remove('bump')), 260);
    animatedProduct = null;
    animatedPayment = null;
  }

  el.report.innerHTML = buildReportMarkup();
  if (el.eventReport) el.eventReport.innerHTML = buildEventMarkup();
  const savedReports = loadSavedReports();
  buildHistoryMarkup(savedReports);
  renderProductHistory();
  renderSavedReportHistory('sales', savedReports);
  renderSavedReportHistory('event', savedReports);
  updatePreviewHeaders();
}

function isImportSelectionValid() {
  if (!el.importSavedReportsList) return false;
  const checkedInputs = Array.from(el.importSavedReportsList.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[];
  return checkedInputs.some((input) => input.checked);
}

function updateImportModalButton() {
  if (!el.importModalConfirmBtn) return;
  el.importModalConfirmBtn.disabled = !isImportSelectionValid();
}

function renderImportList() {
  const savedSalesReports = loadSavedReports().filter((r) => r.type === 'sales');
  const savedRows = savedSalesReports.length
    ? savedSalesReports
        .map(
          (report) => `
              <label class="import-item">
                <input type="checkbox" value="${escapeHtml(report.id)}" />
                <div>
                  <strong>${escapeHtml(report.name)}</strong>
                  <small>${new Date(report.createdAt).toLocaleString()}</small>
                </div>
              </label>
            `,
        )
        .join('')
    : '<div class="empty-state">No saved sales reports to import.</div>';

  if (el.importSavedReportsList) {
    el.importSavedReportsList.innerHTML = `
      <label class="import-item">
        <input type="checkbox" id="importCurrentLiveReport" value="current-live" />
        <div>
          <strong>Current live report</strong>
          <small>Import active costs from the current session.</small>
        </div>
      </label>
      ${savedRows}
    `;
  }
  updateImportModalButton();
}

function openImportModal() {
  renderImportList();
  if (el.importModalOverlay) {
    el.importModalOverlay.classList.add('open');
  }
}

function closeImportModal() {
  if (el.importModalOverlay) {
    el.importModalOverlay.classList.remove('open');
  }
}

function updatePreviewHeaders() {
  const activeScreen = document.querySelector('.screen.active')?.id;
  if (activeScreen) hideScreenActions(activeScreen);
  const isReportPreview = Boolean(previewReport && previewReport.type === 'sales');
  const isEventPreview = Boolean(previewReport && previewReport.type === 'event');

  if (el.reportPageTitle) el.reportPageTitle.textContent = isReportPreview ? previewReport!.name : 'Reports';
  if (el.eventPageTitle) el.eventPageTitle.textContent = isEventPreview ? previewReport!.name : 'Event';

  if (el.reportBackBtn) el.reportBackBtn.style.display = isReportPreview ? 'inline-grid' : 'none';
  if (el.eventBackBtn) el.eventBackBtn.style.display = isEventPreview ? 'inline-grid' : 'none';
  if (el.reportDeleteBtn) el.reportDeleteBtn.style.display = isReportPreview ? 'inline-grid' : 'none';
  if (el.eventDeleteBtn) el.eventDeleteBtn.style.display = isEventPreview ? 'inline-grid' : 'none';
}

function returnToHistory() {
  previewReport = null;
  openScreen('historyScreen');
  render();
}

el.reportBackBtn?.addEventListener('click', returnToHistory);
el.eventBackBtn?.addEventListener('click', returnToHistory);
el.reportDeleteBtn?.addEventListener('click', () => {
  if (previewReport?.type === 'sales') confirmDeleteSavedReport(previewReport.id, returnToHistory);
});
el.eventDeleteBtn?.addEventListener('click', () => {
  if (previewReport?.type === 'event') confirmDeleteSavedReport(previewReport.id, returnToHistory);
});

function closeOptionsMenu() {
  el.optionsMenu.classList.remove('open');
}

function toggleOptionsMenu() {
  el.optionsMenu.classList.toggle('open');
}

function hideScreenActions(screenId: string) {
  const showOptions = screenId === 'reportsScreen' || screenId === 'eventScreen';
  el.optionsBtn.style.display = showOptions ? 'inline-grid' : 'none';
  const showAddProduct = screenId === 'salesScreen' || screenId === 'productHistoryScreen';
  el.openProductEdit.style.display = showAddProduct ? 'inline-grid' : 'none';
  const isPreview = Boolean(previewReport && ((screenId === 'reportsScreen' && previewReport.type === 'sales') || (screenId === 'eventScreen' && previewReport.type === 'event')));
  const showReset = !isPreview && (screenId === 'salesScreen' || screenId === 'reportsScreen' || screenId === 'eventScreen');
  el.reset.style.display = showReset ? 'inline-grid' : 'none';
  el.reset.title = screenId === 'eventScreen' ? 'Clear event' : 'Clear sales';
  el.reset.setAttribute('aria-label', el.reset.title);
  if (el.productHistoryAddBtn) el.productHistoryAddBtn.style.display = 'none';
  if (!showOptions) closeOptionsMenu();
}

function rebuildGrid() {
  makeTiles();
}

// Sub-screens highlight the bottom-nav tab they belong to.
const PARENT_TAB: Record<string, string> = {
  compareSalesScreen: 'historyScreen',
  compareEventScreen: 'historyScreen',
  productHistoryScreen: 'settingsScreen',
  salesReportHistoryScreen: 'settingsScreen',
  eventReportHistoryScreen: 'settingsScreen',
};

function openScreen(screenId: string) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  // Preserve product history ordering while the user stays on the Product history screen.
  if (screenId === 'productHistoryScreen') {
    productHistoryViewOrder = productHistory.map((p) => p.name);
  } else {
    productHistoryViewOrder = null;
  }

  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');

  // Screen chrome lives here so every navigation path gets the same header, stats bar and tab highlight.
  const tab = document.querySelector(`.nav button[data-tab="${screenId}"]`) ? screenId : PARENT_TAB[screenId];
  if (tab) document.querySelectorAll('.nav button').forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tab));
  if (el.stats) el.stats.style.display = screenId === 'salesScreen' ? '' : 'none';
  hideScreenActions(screenId);
}

// index >= 0 edits an active product; historyIndex edits an inactive one; neither means "add".
function openProductEditor(index: number, historyIndex: number | null = null) {
  const title = document.getElementById('productEditTitle') as HTMLHeadingElement;
  const currentScreen = document.querySelector('.screen.active')?.id || 'salesScreen';
  productEditorReturnScreen = currentScreen === 'productEditScreen' ? productEditorReturnScreen : currentScreen;

  editingIndex = index;
  editingHistoryIndex = index < 0 ? historyIndex : null;
  const source = index >= 0 ? products[index] : historyIndex !== null ? productHistory[historyIndex] : null;
  const currency = loadSettings().currency;
  closeColorPicker();

  if (source) {
    title.textContent = 'Edit product';
    el.editName.value = source.name;
    el.editPrice.value = formatInputNumber(String(source.price), currency);
    el.editCost.value = formatInputNumber(String(source.cost), currency);
    el.editColorHex.textContent = source.color.toUpperCase();
    el.editColorHexInput.value = source.color.toUpperCase();
    el.removeProductBtn.style.display = index >= 0 ? 'grid' : 'none';
  } else {
    title.textContent = 'Add product';
    el.editName.value = '';
    el.editPrice.value = '';
    el.editCost.value = '';
    const startingColor = chooseUniqueColor(products, '#F76495');
    el.editColorHex.textContent = startingColor;
    el.editColorHexInput.value = startingColor;
    el.removeProductBtn.style.display = 'none';
  }

  updateColorInputs(el.editColorHex.textContent || '#F76495');
  openScreen('productEditScreen');
}

function closeProductEditor() {
  editingIndex = -1;
  editingHistoryIndex = null;
  openScreen(productEditorReturnScreen);
  render(true);
}

function renameSales(oldName: string, product: Product) {
  tx.forEach((sale) => {
    if (sale.product === oldName) {
      sale.product = product.name;
      sale.price = product.price;
      sale.cost = product.cost;
    }
  });
}

el.editPrice.addEventListener('input', () => {
  el.editPrice.value = formatInputNumber(el.editPrice.value, loadSettings().currency);
});
el.editCost.addEventListener('input', () => {
  el.editCost.value = formatInputNumber(el.editCost.value, loadSettings().currency);
});

el.removeProductBtn.addEventListener('click', () => {
  if (editingIndex < 0) return;
  const removed = products[editingIndex];
  openConfirmModal(`Remove '${removed.name}' and its recorded sales from the counter?`, 'Remove', () => {
    closeColorPicker();
    const index = products.indexOf(removed);
    if (index >= 0) products.splice(index, 1);
    for (let i = tx.length - 1; i >= 0; i--) {
      if (tx[i].product === removed.name) tx.splice(i, 1);
    }
    saveProducts();
    saveSales();
    showToast(`${removed.name} removed`);
    rebuildGrid();
    closeProductEditor();
  });
});

el.saveProductBtn.addEventListener('click', () => {
  const currency = loadSettings().currency;
  const updatedName = el.editName.value.trim() || `Product ${products.length + 1}`;
  const updatedPrice = parseCurrencyInput(el.editPrice.value, currency) || 0;
  const updatedCost = parseCurrencyInput(el.editCost.value, currency) || 0;
  const colorValue = (el.editColorHex.textContent || '#ffffff').trim();
  const normalizedColor = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;

  const editing = editingIndex >= 0 ? products[editingIndex] : editingHistoryIndex !== null ? productHistory[editingHistoryIndex] : null;
  const originalName = editing?.name ?? null;
  // Product names are the identity key for sales and history, so a clash would silently merge two products.
  const clashesWithActive = products.some((p) => p.name === updatedName && p.name !== originalName);
  const clashesWithHistory = editing !== null && updatedName !== originalName && productHistory.some((p) => p.name === updatedName);
  if (clashesWithActive || clashesWithHistory) {
    showToast(`A product named '${updatedName}' already exists`);
    return;
  }

  if (editingIndex >= 0) {
    const product = products[editingIndex];
    const oldProductName = product.name;
    product.name = updatedName;
    product.price = updatedPrice;
    product.cost = updatedCost;
    product.color = normalizedColor;

    renameSales(oldProductName, product);
    saveProducts();
    saveSales();
    ensureProductHistory(product, productHistory, oldProductName);
    saveProductHistory(productHistory);
    showToast(`${updatedName} saved`);
  } else if (editingHistoryIndex !== null) {
    // Editing an inactive product from history
    const hist = productHistory[editingHistoryIndex];
    const oldName = hist.name;
    hist.name = updatedName;
    hist.price = updatedPrice;
    hist.cost = updatedCost;
    hist.color = normalizedColor;

    // If an active product with the old name exists, update it and related sales
    const active = products.find((p) => p.name === oldName);
    if (active) {
      Object.assign(active, hist);
      renameSales(oldName, active);
      saveProducts();
      saveSales();
    }

    saveProductHistory(productHistory);
    showToast(`${updatedName} saved`);
  } else {
    const finalColor = chooseUniqueColor(products, normalizedColor);
    const newProduct = { name: updatedName, price: updatedPrice, cost: updatedCost, color: finalColor };
    products.push(newProduct);
    saveProducts();
    ensureProductHistory(newProduct, productHistory);
    saveProductHistory(productHistory);
    showToast(`${updatedName} added`);
  }

  rebuildGrid();
  closeProductEditor();
});

let currentHSV: HSV = { h: 340, s: 0.68, v: 0.97 };


function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rr) {
      h = ((gg - bb) / delta) % 6;
    } else if (max === gg) {
      h = (bb - rr) / delta + 2;
    } else {
      h = (rr - gg) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rr = 0;
  let gg = 0;
  let bb = 0;

  if (h >= 0 && h < 60) {
    rr = c; gg = x; bb = 0;
  } else if (h >= 60 && h < 120) {
    rr = x; gg = c; bb = 0;
  } else if (h >= 120 && h < 180) {
    rr = 0; gg = c; bb = x;
  } else if (h >= 180 && h < 240) {
    rr = 0; gg = x; bb = c;
  } else if (h >= 240 && h < 300) {
    rr = x; gg = 0; bb = c;
  } else {
    rr = c; gg = 0; bb = x;
  }

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  };
}

function openColorPicker() {
  el.colorPickerMenu.classList.add('open');
}

function closeColorPicker() {
  el.colorPickerMenu.classList.remove('open');
}

function updateColorInputs(hex: string) {
  const normalized = normalizeHex(hex);
  const rgb = hexToRgb(normalized);
  currentHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const rgbFromHsv = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
  const updatedHex = rgbToHex(rgbFromHsv.r, rgbFromHsv.g, rgbFromHsv.b);
  el.editColorHex.textContent = updatedHex;
  el.editColorHexInput.value = updatedHex;
  el.colorPickerMenu.style.setProperty('--picker-bg', updatedHex);
  el.pickerHexCard.style.setProperty('--picker-bg', updatedHex);
  el.colorPickerMenu.style.setProperty('--picker-text', getContrastColor(updatedHex));
  el.pickerHexCard.style.setProperty('--picker-text', getContrastColor(updatedHex));
  el.hueValue.textContent = `${Math.round(currentHSV.h)}°`;
  setColorField(updatedHex);
  el.pickerSurface.style.setProperty('--picker-hue', `hsl(${currentHSV.h},100%,50%)`);
  el.hueThumb.style.left = `${(currentHSV.h / 360) * 100}%`;
  el.pickerSurfaceThumb.style.left = `${currentHSV.s * 100}%`;
  el.pickerSurfaceThumb.style.top = `${(1 - currentHSV.v) * 100}%`;
}

function updateFromHSV() {
  const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  el.editColorHex.textContent = hex;
  el.editColorHexInput.value = hex;
  el.colorPickerMenu.style.setProperty('--picker-bg', hex);
  el.pickerHexCard.style.setProperty('--picker-bg', hex);
  el.colorPickerMenu.style.setProperty('--picker-text', getContrastColor(hex));
  el.pickerHexCard.style.setProperty('--picker-text', getContrastColor(hex));
  el.hueValue.textContent = `${Math.round(currentHSV.h)}°`;
  setColorField(hex);
  el.pickerSurface.style.setProperty('--picker-hue', `hsl(${currentHSV.h},100%,50%)`);
  el.hueThumb.style.left = `${(currentHSV.h / 360) * 100}%`;
  el.pickerSurfaceThumb.style.left = `${currentHSV.s * 100}%`;
  el.pickerSurfaceThumb.style.top = `${(1 - currentHSV.v) * 100}%`;
}

function updateSurfacePosition(event: PointerEvent) {
  const rect = el.pickerSurface.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  currentHSV.s = x;
  currentHSV.v = 1 - y;
  updateFromHSV();
}

function updateHuePosition(event: PointerEvent) {
  const rect = el.hueSlider.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  currentHSV.h = x * 360;
  updateFromHSV();
}

const settingsCurrencySelect = document.getElementById('currencySelect') as HTMLSelectElement | null;
const settingsCompactToggle = document.getElementById('compactMoneyToggle') as HTMLInputElement | null;

if (settingsCurrencySelect) {
  const savedSettings = loadSettings();
  settingsCurrencySelect.value = savedSettings.currency;
  settingsCurrencySelect.addEventListener('change', () => {
    const nextSettings = { ...loadSettings(), currency: settingsCurrencySelect.value as AppSettings['currency'] };
    saveSettings(nextSettings);
    render();
  });
}

if (settingsCompactToggle) {
  settingsCompactToggle.checked = loadSettings().compactMoney;
  settingsCompactToggle.addEventListener('change', () => {
    const nextSettings = { ...loadSettings(), compactMoney: settingsCompactToggle.checked };
    saveSettings(nextSettings);
    render();
  });
}

el.openProductEdit.addEventListener('click', () => {
  openProductEditor(-1);
});
if (el.productMenuBtn) {
  el.productMenuBtn.addEventListener('click', () => {
    openScreen('productHistoryScreen');
    render();
  });
}
const openSalesReportMenuBtn = document.getElementById('openSalesReportMenuBtn') as HTMLButtonElement | null;
if (openSalesReportMenuBtn) {
  openSalesReportMenuBtn.addEventListener('click', () => {
    openScreen('salesReportHistoryScreen');
    render();
  });
}
if (el.salesReportHistoryBackBtn) {
  el.salesReportHistoryBackBtn.addEventListener('click', () => {
    openScreen('settingsScreen');
    render();
  });
}
const openEventReportMenuBtn = document.getElementById('openEventReportMenuBtn') as HTMLButtonElement | null;
if (openEventReportMenuBtn) {
  openEventReportMenuBtn.addEventListener('click', () => {
    openScreen('eventReportHistoryScreen');
    render();
  });
}
if (el.eventReportHistoryBackBtn) {
  el.eventReportHistoryBackBtn.addEventListener('click', () => {
    openScreen('settingsScreen');
    render();
  });
}
const openAboutMenuBtn = document.getElementById('openAboutMenuBtn') as HTMLButtonElement | null;
if (openAboutMenuBtn) {
  openAboutMenuBtn.addEventListener('click', () => {
    showToast('About coming soon');
  });
}
if (el.productHistoryBackBtn) {
  el.productHistoryBackBtn.addEventListener('click', () => {
    const previousScreen = productEditorReturnScreen === 'productEditScreen' ? 'productHistoryScreen' : 'settingsScreen';
    openScreen(previousScreen);
    render();
  });
}
if (el.compareSalesBtn) {
  el.compareSalesBtn.addEventListener('click', () => openCompareModal('sales'));
}
if (el.compareEventsBtn) {
  el.compareEventsBtn.addEventListener('click', () => openCompareModal('event'));
}
if (el.compareModalConfirmBtn) {
  el.compareModalConfirmBtn.addEventListener('click', confirmCompareSelection);
}
if (el.compareModalCancelBtn) {
  el.compareModalCancelBtn.addEventListener('click', () => closeCompareModal(true));
}
if (el.compareModalCloseBtn) {
  el.compareModalCloseBtn.addEventListener('click', () => closeCompareModal(true));
}
if (el.compareSalesBackBtn) {
  el.compareSalesBackBtn.addEventListener('click', () => {
    compareConfirmedIds.sales = [];
    compareDraftIds = [];
    openScreen('historyScreen');
    render();
  });
}
if (el.compareEventBackBtn) {
  el.compareEventBackBtn.addEventListener('click', () => {
    compareConfirmedIds.event = [];
    compareDraftIds = [];
    openScreen('historyScreen');
    render();
  });
}
if (el.compareModalOverlay) {
  el.compareModalOverlay.addEventListener('click', (event) => {
    if (event.target === el.compareModalOverlay) closeCompareModal(true);
  });
}
if (el.compareModalList) {
  el.compareModalList.addEventListener('change', () => {
    const checked = Array.from(el.compareModalList.querySelectorAll('input[type="checkbox"]'))
      .filter((checkbox) => (checkbox as HTMLInputElement).checked)
      .map((checkbox) => (checkbox as HTMLInputElement).value);
    compareDraftIds = checked;
    el.compareModalConfirmBtn.disabled = checked.length !== 2;
  });
}
if (el.productHistoryAddBtn) {
  el.productHistoryAddBtn.addEventListener('click', () => openProductEditor(-1));
}
el.closeEditBtn.addEventListener('click', () => {
  closeColorPicker();
  closeProductEditor();
});

el.editColorHexInput.addEventListener('input', () => {
  const rawValue = el.editColorHexInput.value;
  if (/^#?[A-Fa-f0-9]{6}$/.test(rawValue.trim())) {
    updateColorInputs(rawValue);
  }
});

el.colorGroup.addEventListener('click', () => {
  openColorPicker();
});

el.pickerSurface.addEventListener('pointerdown', (event) => {
  updateSurfacePosition(event);
  const move = (moveEvent: PointerEvent) => updateSurfacePosition(moveEvent);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

el.hueSlider.addEventListener('pointerdown', (event) => {
  updateHuePosition(event);
  const move = (moveEvent: PointerEvent) => updateHuePosition(moveEvent);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

el.colorPickerMenu.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const preset = target.closest('.color-preset') as HTMLButtonElement | null;
  if (!preset) return;
  const presetColor = preset.style.getPropertyValue('--preset');
  if (presetColor) updateColorInputs(presetColor.trim());
});

document.addEventListener('pointerdown', (event) => {
  if (!el.colorPickerMenu.classList.contains('open')) return;
  const target = event.target as HTMLElement;
  if (el.colorPickerMenu.contains(target) || el.colorGroup.contains(target)) return;
  closeColorPicker();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeColorPicker();
});

function setColorField(hex: string) {
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  el.colorGroup.style.setProperty('--color-field-bg', color);
  el.colorGroup.style.background = color;
  el.editColorHex.style.color = getContrastColor(color);
}

function showToast(msg: string) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout((showToast as typeof showToast & { t?: number }).t);
  (showToast as typeof showToast & { t?: number }).t = window.setTimeout(() => el.toast.classList.remove('show'), 900);
}

el.reset.addEventListener('click', () => {
  const activeScreen = document.querySelector('.screen.active') as HTMLElement | null;
  if (activeScreen?.id === 'eventScreen') {
    if (previewReport?.type === 'event') {
      showToast('Saved reports cannot be cleared');
      return;
    }
    openConfirmModal('Clear the imported event sales and all event expenses?', 'Clear', () => {
      importedEventReport = null;
      saveImportedEventReport(null);
      eventCosts.length = 0;
      saveEventCosts();
      render();
      showToast('Event report cleared');
    });
    return;
  }

  if (!tx.length) {
    showToast('Nothing to clear');
    return;
  }
  openConfirmModal(`Clear all ${tx.length} recorded sales? Save a report first if you need them.`, 'Clear', () => {
    tx.length = 0;
    saveSales();
    render(true);
    showToast('Sales cleared');
  });
});

el.optionsBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  const activeScreen = document.querySelector('.screen.active') as HTMLElement | null;
  if (activeScreen?.id === 'reportsScreen') {
    el.saveReportOption.style.display = 'block';
      el.saveEventReportOption.style.display = 'none';
    } else if (activeScreen?.id === 'eventScreen') {
      el.saveReportOption.style.display = 'none';
      el.saveEventReportOption.style.display = 'block';
    } else {
      el.saveReportOption.style.display = 'none';
      el.saveEventReportOption.style.display = 'none';
    }
    toggleOptionsMenu();
  });

  document.querySelectorAll('.nav button').forEach((b) => {
    b.addEventListener('click', () => {
      const tab = b.getAttribute('data-tab') || '';
      if ((tab === 'reportsScreen' && previewReport?.type === 'sales') || (tab === 'eventScreen' && previewReport?.type === 'event')) {
        previewReport = null;
      }
      openScreen(tab);
      render();
    });
  });

  let saveModalType: 'sales' | 'event' = 'sales';

  const updateSaveModalButton = () => {
    if (!el.saveModalSaveBtn || !el.saveModalInput) return;
    el.saveModalSaveBtn.disabled = el.saveModalInput.value.trim().length === 0;
  };

  const openSaveModal = (type: 'sales' | 'event') => {
    saveModalType = type;
    closeOptionsMenu();
    el.saveModalTitle.textContent = type === 'event' ? 'Save event report' : 'Save report';
    el.saveModalInput.placeholder = type === 'event' ? `Event report ${new Date().toLocaleDateString()}` : `Report ${new Date().toLocaleDateString()}`;
    el.saveModalInput.value = '';
    updateSaveModalButton();
    el.saveModalOverlay.classList.add('open');
    el.saveModalInput.focus();
  };

  const closeSaveModal = () => {
    renamingSavedReportId = null;
    el.saveModalSaveBtn.textContent = 'Save';
    el.saveModalTitle.textContent = 'Save report';
    el.saveModalInput.value = '';
    el.saveModalOverlay.classList.remove('open');
  };

  el.saveReportOption.addEventListener('click', () => openSaveModal('sales'));

  el.saveEventReportOption.addEventListener('click', () => openSaveModal('event'));

  el.saveModalSaveBtn.addEventListener('click', () => {
    const reportName = el.saveModalInput.value.trim();
    if (renamingSavedReportId) {
      renameSavedReport(renamingSavedReportId, reportName);
      closeSaveModal();
      return;
    }
    saveCurrentReport(reportName, saveModalType);
    closeSaveModal();
  });

  el.saveModalCancelBtn.addEventListener('click', closeSaveModal);
  el.saveModalCloseBtn.addEventListener('click', closeSaveModal);

  el.saveModalOverlay.addEventListener('click', (event) => {
    if (event.target === el.saveModalOverlay) closeSaveModal();
  });

  el.saveModalInput.addEventListener('input', () => {
    updateSaveModalButton();
  });

  el.saveModalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!el.saveModalSaveBtn.disabled) el.saveModalSaveBtn.click();
    }
  });

  if (el.importModalCancelBtn) el.importModalCancelBtn.addEventListener('click', closeImportModal);
  if (el.importModalCloseBtn) el.importModalCloseBtn.addEventListener('click', closeImportModal);
  if (el.importModalOverlay) el.importModalOverlay.addEventListener('click', (event) => {
    if (event.target === el.importModalOverlay) closeImportModal();
  });

  if (el.importSavedReportsList) {
    el.importSavedReportsList.addEventListener('change', () => {
      updateImportModalButton();
    });
  }

  if (el.importModalConfirmBtn) el.importModalConfirmBtn.addEventListener('click', () => {
    const currentLiveCheckbox = el.importSavedReportsList.querySelector('#importCurrentLiveReport') as HTMLInputElement | null;
    const selectedIds = Array.from(el.importSavedReportsList.querySelectorAll('input[type="checkbox"]'))
      .filter((input) => (input as HTMLInputElement).checked)
      .map((input) => (input as HTMLInputElement).value)
      .filter((value) => value !== 'current-live');

    const selectedSalesReports = loadSavedReports().filter((r) => r.type === 'sales' && selectedIds.includes(r.id));
    const mergedSales = [
      ...(currentLiveCheckbox?.checked ? tx.map((sale) => ({ ...sale })) : []),
      ...selectedSalesReports.flatMap((report) => report.sales.map((sale) => ({ ...sale })))
    ];
    const mergedCosts = currentLiveCheckbox?.checked
      ? eventCosts.map((cost) => ({ ...cost, id: generateUUID() }))
      : [];

    if (!mergedSales.length && !mergedCosts.length) {
      showToast('Select at least one saved sales report or current live report');
      return;
    }

    const importedProducts = new Map<string, Product>();
    for (const product of [...selectedSalesReports.flatMap((report) => report.products), ...products]) {
      importedProducts.set(product.name, { ...product });
    }
    importedEventReport = {
      sales: mergedSales,
      products: [...importedProducts.values()],
    };
    saveImportedEventReport(importedEventReport);
    previewReport = null;

    closeImportModal();
    render();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && (el.saveModalOverlay.classList.contains('open') || el.importModalOverlay.classList.contains('open') || (el.expenseModalOverlay && el.expenseModalOverlay.classList.contains('open')))) {
      closeSaveModal();
      closeImportModal();
      if (el.expenseModalOverlay?.classList.contains('open')) resetExpenseModal();
    }
  });

  initExpenseModal();
  initEventCardActions();
  makeTiles();
  render();

openScreen(document.querySelector('.screen.active')?.id || 'salesScreen');

if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor-native');
}