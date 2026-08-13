import './style.css';
import { Capacitor } from '@capacitor/core';
import { defaultProducts, ensureProductHistory, generateUUID, totals } from './data';
import {
  chooseUniqueColor,
  fmt,
  fmtCompact,
  formatInputNumber,
  formatMoney,
  getContrastColor,
  getUnusedPresetColor,
  label,
  normalizeHex,
  parseCurrencyInput,
  PRESET_COLORS,
} from './formatters';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type AppSettings } from './storage';
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

  // If no active products and no history, seed with defaults.
  // Do NOT repopulate active products from history when the user intentionally removed all products.
  if (products.length === 0 && productHistory.length === 0) {
    products.push(...defaultProducts.map((product) => ({ ...product })));
  }
}

syncProductState();
console.debug('startup: loaded products count=', products.length);
const payments = ['Cash', 'QRIS'];
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

function getCurrentEventSnapshot() {
  const activeScreen = document.querySelector('.screen.active')?.id;

  if (activeScreen === 'eventScreen') {
    if (importedEventReport) {
      return {
        sales: importedEventReport.sales.map((sale) => ({ ...sale })),
        products: importedEventReport.products.map((product) => ({ ...product })),
        eventCosts: eventCosts.map((cost) => ({ ...cost })),
      };
    }

    return {
      sales: tx.map((sale) => ({ ...sale })),
      products: products.map((product) => ({ ...product })),
      eventCosts: eventCosts.map((cost) => ({ ...cost })),
    };
  }

  if (previewReport && previewReport.type === 'event') {
    return {
      sales: previewReport.sales.map((sale) => ({ ...sale })),
      products: previewReport.products.map((product) => ({ ...product })),
      eventCosts: previewReport.eventCosts.map((cost) => ({ ...cost })),
    };
  }

  if (importedEventReport) {
    return {
      sales: importedEventReport.sales.map((sale) => ({ ...sale })),
      products: importedEventReport.products.map((product) => ({ ...product })),
      eventCosts: eventCosts.map((cost) => ({ ...cost })),
    };
  }

  return {
    sales: tx.map((sale) => ({ ...sale })),
    products: products.map((product) => ({ ...product })),
    eventCosts: eventCosts.map((cost) => ({ ...cost })),
  };
}

function saveCurrentReport(name: string, type: 'sales' | 'event') {
  const reports = loadSavedReports();
  const reportName = name.trim() || `${type === 'event' ? 'Event report' : 'Report'} ${new Date().toLocaleString()}`;

  if (type === 'event') {
    const snapshot = getCurrentEventSnapshot();
    if (!previewReport) {
      importedEventReport = {
        sales: snapshot.sales,
        products: snapshot.products,
      };
      saveImportedEventReport(importedEventReport);
    }

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
  eventCosts.push({ id: generateUUID(), name, amount });
  saveEventCosts();
  render();
}

function removeEventCost(id: string) {
  const index = eventCosts.findIndex((cost) => cost.id === id);
  if (index >= 0) {
    eventCosts.splice(index, 1);
    saveEventCosts();
    render();
  }
}

function openExpenseModalForEdit(id: string) {
  const cost = eventCosts.find((item) => item.id === id);
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
  updateExpenseButtonState();
}

let editingIndex = -1;
let editingExpenseId: string | null = null;
let editingHistoryIndex: number | null = null;
let editingHistoryOldName: string | null = null;
let productEditorReturnScreen = 'salesScreen';
let animatedProduct: string | null = null;
let animatedPayment: string | null = null;
let _savedBodyScroll = 0;

function lockBodyScroll() {
  _savedBodyScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${_savedBodyScroll}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockBodyScroll() {
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
  eventImportBtn: document.getElementById('eventImportBtn') as HTMLButtonElement,
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

function buildReportMarkup() {
  const reportSales = previewReport && previewReport.type === 'sales' ? previewReport.sales : tx;
  const reportProducts = previewReport && previewReport.type === 'sales' ? previewReport.products : products;
  const isPreview = Boolean(previewReport && previewReport.type === 'sales');
  const revenue = reportSales.reduce((sum, item) => sum + item.price, 0);
  const profit = reportSales.reduce((sum, item) => sum + (item.price - item.cost), 0);
  const cashSales = reportSales.filter((item) => item.payment === 'Cash').length;
  const qrisSales = reportSales.filter((item) => item.payment === 'QRIS').length;
  const cashRevenue = reportSales.reduce((sum, item) => item.payment === 'Cash' ? sum + item.price : sum, 0);
  const qrisRevenue = reportSales.reduce((sum, item) => item.payment === 'QRIS' ? sum + item.price : sum, 0);
  const reportSalesCount = reportSales.length;
  const productTotals = reportSales.reduce<Record<string, { count: number; revenue: number; profit: number }>>((acc, item) => {
    const key = item.product;
    if (!acc[key]) acc[key] = { count: 0, revenue: 0, profit: 0 };
    acc[key].count += 1;
    acc[key].revenue += item.price;
    acc[key].profit += item.price - item.cost;
    return acc;
  }, {});

  const allProducts = reportProducts.map((product) => {
    const sales = productTotals[product.name] || { count: 0, revenue: 0, profit: 0 };
    return { name: product.name, count: sales.count, revenue: sales.revenue, profit: sales.profit, color: product.color };
  }).sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const topProducts = allProducts.slice(0, 5);

  const averageTicket = reportSalesCount ? revenue / reportSalesCount : 0;
  const grossMargin = revenue ? (profit / revenue) * 100 : 0;
  const bestProduct = topProducts[0];
  const totalUnits = reportSalesCount;

  return `
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Sales Overview</h2>
            <p class="report-subtitle">${reportSales.length ? 'A complete snapshot of revenue, profit, payment mix, and best-selling products for the day.' : 'Every sale you log will appear here with real-time summaries, trends, and insights.'}</p>
          </div>
        </div>
        <div class="summary-grid">
          <div class="summary-tile">
            <span class="label">Revenue</span>
            <span class="value">${fmt(revenue)}</span>
            <span class="hint">${reportSales.length} total sales</span>
          </div>
          <div class="summary-tile">
            <span class="label">Profit</span>
            <span class="value">${fmt(profit)}</span>
            <span class="hint">${grossMargin.toFixed(1)}% margin</span>
          </div>
          <div class="summary-tile">
            <span class="label">Cash</span>
            <span class="value">${cashSales}</span>
            <span class="hint">${fmt(cashRevenue)} by cash</span>
          </div>
          <div class="summary-tile">
            <span class="label">QRIS</span>
            <span class="value">${qrisSales}</span>
            <span class="hint">${fmt(qrisRevenue)} by qris</span>
          </div>
        </div>
      </section>

      <section class="report-section product-grid-section">
        <div class="section-head">
          <h2 class="report-title">Product distribution</h2>
        </div>
        ${allProducts.length ? `<div class="product-columns">${allProducts.map((item) => {
          const share = totalUnits ? (item.count / totalUnits) * 100 : 0;
          const fillColor = item.color || 'var(--accent)';
          return `
            <div class="product-row">
              <div class="performance-item">
                <div class="performance-top">
                  <strong>${item.name}</strong>
                </div>
                <div class="performance-details">
                  <span class="profit">${fmt(item.profit)} Profit</span>
                </div>
              </div>
              <div class="distribution-item">
                <div class="distribution-line">
                  <span class="distribution-sales">${item.count} sales</span>
                  <span class="distribution-value">${share.toFixed(0)}%</span>
                </div>
                <div class="distribution-track">
                  <div class="distribution-fill" style="width:${share > 0 ? Math.max(6, share) : 0}%;background:${fillColor}"></div>
                </div>
              </div>
            </div>`;
        }).join('')}</div>` : '<div class="empty-state">No distribution data yet.</div>'}
      </section>

    </div>`;
}

function buildEventMarkup() {
  const activeSavedEventReport = previewReport && previewReport.type === 'event' ? previewReport : null;
  const activeImportedReport = !activeSavedEventReport ? importedEventReport : null;
  const hasReport = Boolean(activeSavedEventReport || activeImportedReport);
  const reportCosts = activeSavedEventReport ? activeSavedEventReport.eventCosts : eventCosts;
  const reportSales = activeSavedEventReport ? activeSavedEventReport.sales : (activeImportedReport ? activeImportedReport.sales : []);
  const reportProducts = activeSavedEventReport ? activeSavedEventReport.products : (activeImportedReport ? activeImportedReport.products : []);
  const totalCost = reportCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const revenue = reportSales.reduce((sum, sale) => sum + sale.price, 0);
  const profit = reportSales.reduce((sum, sale) => sum + (sale.price - sale.cost), 0);
  const netProfit = revenue - totalCost;
  const reportCostCount = reportCosts.length;
  const reportSalesCount = reportSales.length;
  const grossMargin = revenue ? (profit / revenue) * 100 : 0;
  const netProfitLabel = netProfit < 0 ? 'Deficit' : 'Net profit';
  const netProfitValueClass = netProfit < 0 ? 'value deficit' : 'value profit';
  const productTotals = reportSales.reduce<Record<string, { count: number; revenue: number; profit: number }>>((acc, item) => {
    const key = item.product;
    if (!acc[key]) acc[key] = { count: 0, revenue: 0, profit: 0 };
    acc[key].count += 1;
    acc[key].revenue += item.price;
    acc[key].profit += item.price - item.cost;
    return acc;
  }, {});

  const allProducts = reportProducts.map((product) => {
    const sales = productTotals[product.name] || { count: 0, revenue: 0, profit: 0 };
    return { name: product.name, count: sales.count, revenue: sales.revenue, profit: sales.profit, color: product.color };
  }).filter((item) => item.count > 0).sort((a, b) => b.profit - a.profit || b.revenue - a.revenue || b.count - a.count);
  const topProducts = allProducts.slice(0, 5);
  const totalProfit = topProducts.reduce((sum, item) => sum + Math.abs(item.profit), 0) || 1;

  return `
    <div class="report-shell">
      <section class="report-hero">
        <div class="report-hero-heading">
          <div>
            <h2 class="report-title">Event Report</h2>
            <p class="report-subtitle">${hasReport ? 'Track booth cost and revenue with profit and distribution metrics.' : 'Import a saved sales report to view event revenue and profit.'}</p>
          </div>
        </div>
        ${hasReport ? `
        <div class="summary-grid">
          <div class="summary-tile">
            <span class="label">Revenue</span>
            <span class="value">${fmt(revenue)}</span>
            <span class="hint">${reportSalesCount} sales</span>
          </div>
          <div class="summary-tile">
            <span class="label">Profit</span>
            <span class="value">${fmt(profit)}</span>
            <span class="hint">Margin ${grossMargin.toFixed(0)}%</span>
          </div>
          <div class="summary-tile">
            <span class="label">Event cost</span>
            <span class="value">${fmt(totalCost)}</span>
            <span class="hint">${reportCostCount} items</span>
          </div>
          <div class="summary-tile">
            <span class="label">${netProfitLabel}</span>
            <span class="${netProfitValueClass}">${fmt(netProfit)}</span>
            <span class="hint">Revenue − costs</span>
          </div>
        </div>
        ` : ''}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Expense</h2>
          <button class="control-btn add-expense-btn" id="openAddExpenseBtn" type="button" aria-expanded="false" title="Add Expense"><span class="material-symbols-outlined control-icon">add</span></button>
        </div>
        <!-- Expense input moved to a modal overlay: #expenseModalOverlay -->
        ${reportCostCount ? `<div class="cost-list">${reportCosts.map((cost) => `
          <div class="cost-item">
            <div>
              <strong>${cost.name}</strong>
            </div>
            <div class="cost-actions">
              <span class="cost-amount">${fmt(cost.amount)}</span>
              <button class="history-item-delete edit-cost" data-id="${cost.id}" title="Edit cost"><span class="material-symbols-outlined">edit</span></button>
              <button class="history-item-delete delete-cost" data-id="${cost.id}" title="Remove cost"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>`).join('')}</div>` : '<div class="empty-state">No event costs yet. Add booth cost, transportation, or staffing expenses.</div>'}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Sales</h2>
          <button class="control-btn add-expense-btn" id="eventImportBtn" type="button" title="Import"><span class="material-symbols-outlined control-icon">upload</span></button>
        </div>
        ${topProducts.length ? `<div class="event-product-columns">${topProducts.map((item) => {
          const share = totalProfit ? (Math.abs(item.profit) / totalProfit) * 100 : 0;
          const barWidth = Math.max(8, share);
          return `
            <div class="product-row event-product-row">
              <div class="performance-item">
                <div class="performance-top">
                  <strong>${item.name}</strong>
                </div>
                <div class="performance-details">
                  <span class="distribution-sales">${item.count} sales · ${fmt(item.revenue)} revenue</span>
                </div>
              </div>
              <div class="distribution-item">
                <div class="distribution-line">
                  <span class="profit">${fmt(item.profit)} Profit</span>
                  <span class="distribution-value">${share.toFixed(0)}%</span>
                </div>
                <div class="distribution-track">
                  <div class="distribution-fill" style="width:${barWidth}%;background:${item.color || 'var(--highlight)'}"></div>
                </div>
              </div>
            </div>`;
        }).join('')}</div>` : '<div class="empty-state">No product sales yet for event revenue.</div>'}
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
  if (title) title.textContent = 'Add Expense';
  if (nameInput) nameInput.value = '';
  if (amountInput) amountInput.value = '';
  if (addBtn) {
    addBtn.textContent = 'Add Expense';
    addBtn.disabled = true;
  }
}

function wireEventActions() {
  const addCostBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;
  const costName = document.getElementById('eventCostName') as HTMLInputElement | null;
  const costAmount = document.getElementById('eventCostAmount') as HTMLInputElement | null;
  const openAddExpenseBtn = document.getElementById('openAddExpenseBtn') as HTMLButtonElement | null;
  const expensePopover = document.getElementById('expensePopover') as HTMLDivElement | null;

  const updateExpenseButton = () => {
    updateExpenseButtonState();
  };

  if (openAddExpenseBtn && expensePopover) {
    openAddExpenseBtn.onclick = (event) => {
      event.stopPropagation();
      const isOpen = expensePopover.classList.toggle('open');
      expensePopover.hidden = !isOpen;
      openAddExpenseBtn.setAttribute('aria-expanded', String(isOpen));
      updateExpenseButton();
    };
  }

  if (costName) {
    costName.addEventListener('input', updateExpenseButton);
  }

  if (costAmount) {
    costAmount.addEventListener('input', () => {
      const nextValue = formatInputNumber(costAmount.value, loadSettings().currency);
      costAmount.value = nextValue;
      updateExpenseButton();
    });
  }

  if (addCostBtn && costName && costAmount) {
    updateExpenseButton();
    addCostBtn.onclick = () => {
      const name = costName.value.trim();
      const amount = parseCurrencyInput(costAmount.value, loadSettings().currency);
      if (!name || Number.isNaN(amount) || amount <= 0) return;

      if (editingExpenseId) {
        const cost = eventCosts.find((item) => item.id === editingExpenseId);
        if (cost) {
          cost.name = name;
          cost.amount = amount;
          saveEventCosts();
        }
      } else {
        addEventCost(name, amount);
      }

      resetExpenseModal();
      if (openAddExpenseBtn) openAddExpenseBtn.setAttribute('aria-expanded', 'false');
      if (el.eventReport) {
        el.eventReport.innerHTML = buildEventMarkup();
        wireEventActions();
      }
    };
  }

  // Wire the import button inside the event markup (it's rendered dynamically)
  const eventImportBtnEl = document.getElementById('eventImportBtn') as HTMLButtonElement | null;
  if (eventImportBtnEl) {
    eventImportBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openImportModal();
    });
  }

  // Wire the expense modal triggers and close handlers
  const expenseOverlay = document.getElementById('expenseModalOverlay') as HTMLDivElement | null;
  const expenseClose = document.getElementById('expenseModalCloseBtn') as HTMLButtonElement | null;
  const expenseCancel = document.getElementById('expenseModalCancelBtn') as HTMLButtonElement | null;

  if (openAddExpenseBtn && expenseOverlay) {
    openAddExpenseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      resetExpenseModal();
      expenseOverlay.classList.add('open');
      lockBodyScroll();
      updateExpenseButtonState();
    });
  }

  if (expenseClose) expenseClose.addEventListener('click', () => { resetExpenseModal(); });
  if (expenseCancel) expenseCancel.addEventListener('click', () => { resetExpenseModal(); });
  if (expenseOverlay) expenseOverlay.addEventListener('click', (ev) => { if (ev.target === expenseOverlay) resetExpenseModal(); });

  document.querySelectorAll('.edit-cost').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const id = target.getAttribute('data-id');
      if (id) openExpenseModalForEdit(id);
    });
  });

  document.querySelectorAll('.delete-cost').forEach((button) => {
    button.addEventListener('click', (event) => {
      const target = event.currentTarget as HTMLElement;
      const id = target.getAttribute('data-id');
      if (id) removeEventCost(id);
    });
  });
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
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
            <div class="product-name">${p.name}</div>
            <div class="product-price">${fmt(p.price)}</div>
          </div>
          <button class="settings-btn" aria-label="Edit ${p.name}"><span class="material-symbols-outlined">edit</span></button>
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

function buildHistoryMarkup() {
  const savedReports = loadSavedReports().filter((r) => r.type === 'sales');
  const savedEventReports = loadSavedReports().filter((r) => r.type === 'event');
  const recentPurchases = tx.slice(-5).reverse();

  const renderReportList = (reports: SavedReport[]) => {
    if (!reports.length) return '<div class="empty-state">No saved reports yet.</div>';
    return reports
      .map(
        (report) => `
          <div class="history-item" data-id="${report.id}" data-type="${report.type}" tabindex="0" role="button">
            <div>
              <strong>${report.name}</strong>
              <div class="history-meta">${new Date(report.createdAt).toLocaleString()}</div>
            </div>
            <div class="history-item-actions">
              <button class="icon-btn history-item-delete" type="button" title="Delete report" data-delete-id="${report.id}">
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
          deleteSavedReport(reportId);
        });
      }

      item.addEventListener('click', () => {
        const reportId = item.getAttribute('data-id');
        if (!reportId) return;
        const report = loadSavedReports().find((r) => r.id === reportId);
        if (!report) return;
        previewReport = report;
        const targetTab = report.type === 'event' ? 'eventScreen' : 'reportsScreen';
        const tabButton = document.querySelector(`.nav button[data-tab="${targetTab}"]`) as HTMLButtonElement | null;
        if (tabButton) {
          document.querySelectorAll('.nav button').forEach((x) => x.classList.remove('active'));
          tabButton.classList.add('active');
          openScreen(targetTab);
          if (el.stats) el.stats.style.display = 'none';
          hideScreenActions(targetTab);
          render();
        } else {
          render();
        }
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
    if (!purchases.length) return '<div class="empty-state">No recent purchases yet.</div>';
    return purchases
      .map(
        (purchase) => `
          <div class="history-item">
            <div>
              <strong>${purchase.product}</strong>
              <div class="history-meta">${purchase.payment} · ${fmt(purchase.price)}</div>
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
  const orderedHistory = productHistoryViewOrder
    ? productHistoryViewOrder.map((name) => productHistory.find((p) => p.name === name)).filter(Boolean) as typeof productHistory
    : productHistory;

  const rows = orderedHistory.length
    ? orderedHistory
        .map((product) => {
          const isActive = products.some((item) => item.name === product.name);
          const productIndex = products.findIndex((item) => item.name === product.name);
          return `
            <div class="product-history-item" style="--product-color: ${product.color};">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${product.name}</strong>
                  <span class="history-meta">Price ${fmt(product.price)} · Cost ${fmt(product.cost)}</span>
                </div>
                <div class="product-history-actions">
                  <button class="product-edit-btn" type="button" data-name="${product.name}" title="Edit ${product.name}">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn product-delete-btn" type="button" data-name="${product.name}" title="Delete ${product.name}">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                  <button class="product-toggle-btn" type="button" data-name="${product.name}" data-active="${isActive}" aria-pressed="${isActive}">
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

      // Open editor in "add" mode but prefill with history data so inactive products can be edited
      const hist = productHistory[historyIndex];
      // Remember where the user came from so the back button returns correctly
      const currentScreen = document.querySelector('.screen.active')?.id || 'salesScreen';
      productEditorReturnScreen = currentScreen === 'productEditScreen' ? productEditorReturnScreen : currentScreen;
      editingHistoryIndex = historyIndex;
      editingHistoryOldName = hist.name;
      editingIndex = -1;
      const title = document.getElementById('productEditTitle') as HTMLHeadingElement;
      if (title) title.textContent = 'Edit product';
      el.editName.value = hist.name;
      el.editPrice.value = formatInputNumber(String(hist.price), loadSettings().currency);
      el.editCost.value = formatInputNumber(String(hist.cost), loadSettings().currency);
      el.editColorHex.textContent = hist.color.toUpperCase();
      el.editColorHexInput.value = hist.color.toUpperCase();
      el.removeProductBtn.style.display = 'none';
      updateColorInputs(el.editColorHex.textContent || '#F76495');
      openScreen('productEditScreen');
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

function renderSavedSalesReportHistory() {
  if (!el.salesReportHistoryList) return;
  const savedReports = loadSavedReports().filter((report) => report.type === 'sales');

  const rows = savedReports.length
    ? savedReports
        .map(
          (report) => `
            <div class="sales-report-history-item" data-id="${report.id}" tabindex="0" role="button">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${report.name}</strong>
                  <span class="history-meta">${new Date(report.createdAt).toLocaleString()}</span>
                </div>
                <div class="product-history-actions">
                  <button class="icon-btn sales-report-edit-btn" type="button" data-edit-id="${report.id}" title="Rename report">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn history-item-delete" type="button" data-delete-id="${report.id}" title="Delete report">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">No saved sales reports yet.</div>';

  el.salesReportHistoryList.innerHTML = rows;
  el.salesReportHistoryList.querySelectorAll<HTMLElement>('.sales-report-history-item').forEach((item) => {
    const reportId = item.getAttribute('data-id');
    if (!reportId) return;

    const editBtn = item.querySelector<HTMLButtonElement>('.sales-report-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (event) => {
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
    }

    const deleteBtn = item.querySelector<HTMLButtonElement>('.history-item-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteSavedReport(reportId);
      });
    }

    item.addEventListener('click', () => {
      const report = loadSavedReports().find((entry) => entry.id === reportId);
      if (!report) return;
      previewReport = report;
      openScreen('reportsScreen');
      hideScreenActions('reportsScreen');
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

function renderSavedEventReportHistory() {
  if (!el.eventReportHistoryList) return;
  const savedReports = loadSavedReports().filter((report) => report.type === 'event');

  const rows = savedReports.length
    ? savedReports
        .map(
          (report) => `
            <div class="sales-report-history-item" data-id="${report.id}" tabindex="0" role="button">
              <div class="product-row product-row-compact">
                <div class="product-history-main">
                  <strong>${report.name}</strong>
                  <span class="history-meta">${new Date(report.createdAt).toLocaleString()}</span>
                </div>
                <div class="product-history-actions">
                  <button class="icon-btn sales-report-edit-btn" type="button" data-edit-id="${report.id}" title="Rename report">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="icon-btn history-item-delete" type="button" data-delete-id="${report.id}" title="Delete report">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </div>
          `,
        )
        .join('')
    : '<div class="empty-state">No saved event reports yet.</div>';

  el.eventReportHistoryList.innerHTML = rows;
  el.eventReportHistoryList.querySelectorAll<HTMLElement>('.sales-report-history-item').forEach((item) => {
    const reportId = item.getAttribute('data-id');
    if (!reportId) return;

    const editBtn = item.querySelector<HTMLButtonElement>('.sales-report-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', (event) => {
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
    }

    const deleteBtn = item.querySelector<HTMLButtonElement>('.history-item-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        deleteSavedReport(reportId);
      });
    }

    item.addEventListener('click', () => {
      const report = loadSavedReports().find((entry) => entry.id === reportId);
      if (!report) return;
      previewReport = report;
      openScreen('eventScreen');
      hideScreenActions('eventScreen');
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
        <h3>${report.name}</h3>
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
                    <strong>${item.name}</strong>
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
        <h3>${report.name}</h3>
      </div>
      <div class="compare-metric ${costWinner ? 'compare-metric-winner' : ''}"><span>Event cost</span><span>${fmt(eventCost)}</span></div>
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
                  <span class="compare-expense-name">${item.name}</span>
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
                    <strong>${item.name}</strong>
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
  const savedIds = compareConfirmedIds.length ? compareConfirmedIds : (() => {
    try {
      return JSON.parse(el.compareSalesCard.dataset.compareIds || '[]');
    } catch {
      return [] as string[];
    }
  })();
  const selected = loadSavedReports().filter((report) => report.type === 'sales' && savedIds.includes(report.id));
  if (selected.length < 2) {
    el.compareSalesCard.innerHTML = '<div class="empty-state">Select two saved sales reports to compare.</div>';
    return;
  }

  el.compareSalesCard.dataset.compareIds = JSON.stringify(savedIds);
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
  const savedIds = compareConfirmedIds.length ? compareConfirmedIds : (() => {
    try {
      return JSON.parse(el.compareEventCard.dataset.compareIds || '[]');
    } catch {
      return [] as string[];
    }
  })();
  const selected = loadSavedReports().filter((report) => report.type === 'event' && savedIds.includes(report.id));
  if (selected.length < 2) {
    el.compareEventCard.innerHTML = '<div class="empty-state">Select two saved event reports to compare.</div>';
    return;
  }

  el.compareEventCard.dataset.compareIds = JSON.stringify(savedIds);
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

let compareReportIds: string[] = [];
let compareConfirmedIds: string[] = [];
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
        <input type="checkbox" value="${report.id}" ${compareDraftIds.includes(report.id) ? 'checked' : ''} />
        <div>
          <strong>${report.name}</strong>
          <small>${new Date(report.createdAt).toLocaleString()}</small>
        </div>
      </label>
    `)
    .join('');
}

function openCompareModal(type: 'sales' | 'event') {
  compareModalType = type;
  compareDraftIds = [...compareConfirmedIds];
  compareReportIds = [...compareConfirmedIds];
  const title = type === 'sales' ? 'Compare sales' : 'Compare events';
  if (el.compareModalTitle) el.compareModalTitle.textContent = title;
  renderCompareSelectionList(type);
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
  compareConfirmedIds = [...checked];
  compareReportIds = [...checked];
  if (compareModalType === 'sales' && el.compareSalesCard) {
    el.compareSalesCard.dataset.compareIds = JSON.stringify(checked);
  }
  if (compareModalType === 'event' && el.compareEventCard) {
    el.compareEventCard.dataset.compareIds = JSON.stringify(checked);
  }
  closeCompareModal(false);
  if (compareModalType === 'sales') {
    renderCompareSalesPage();
    openScreen('compareSalesScreen');
    hideScreenActions('compareSalesScreen');
  } else {
    renderCompareEventPage();
    openScreen('compareEventScreen');
    hideScreenActions('compareEventScreen');
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

  document.querySelectorAll('.tile').forEach((tile) => {
    const product = tile.getAttribute('data-product') || '';
    const cashCount = tx.filter((t) => t.product === product && t.payment === 'Cash').length;
    const qrisCount = tx.filter((t) => t.product === product && t.payment === 'QRIS').length;
    const cashValue = tile.querySelector('.payment-value[data-counter-for="Cash"]') as HTMLSpanElement | null;
    const cashWrap = tile.querySelector('.payment-value-wrap') as HTMLDivElement | null;
    const qrisValue = tile.querySelector('.payment-value[data-counter-for="QRIS"]') as HTMLSpanElement | null;
    const qrisWrap = tile.querySelectorAll('.payment-value-wrap')[1] as HTMLDivElement | null;
    if (cashValue) cashValue.textContent = `${cashCount}`;
    if (qrisValue) qrisValue.textContent = `${qrisCount}`;
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
  if (el.eventReport) {
    el.eventReport.innerHTML = buildEventMarkup();
    wireEventActions();
  }
  buildHistoryMarkup();
  renderProductHistory();
  renderSavedSalesReportHistory();
  renderSavedEventReportHistory();
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
                <input type="checkbox" value="${report.id}" />
                <div>
                  <strong>${report.name}</strong>
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
  const isReportPreview = Boolean(previewReport && previewReport.type === 'sales');
  const isEventPreview = Boolean(previewReport && previewReport.type === 'event');

  if (el.reportPageTitle) el.reportPageTitle.textContent = isReportPreview ? previewReport!.name : 'Reports';
  if (el.eventPageTitle) el.eventPageTitle.textContent = isEventPreview ? previewReport!.name : 'Event Report';

  if (el.reportBackBtn) el.reportBackBtn.style.display = isReportPreview ? 'inline-grid' : 'none';
  if (el.eventBackBtn) el.eventBackBtn.style.display = isEventPreview ? 'inline-grid' : 'none';
  if (el.reportDeleteBtn) el.reportDeleteBtn.style.display = isReportPreview ? 'inline-grid' : 'none';
  if (el.eventDeleteBtn) el.eventDeleteBtn.style.display = isEventPreview ? 'inline-grid' : 'none';
}

if (el.reportBackBtn) {
  el.reportBackBtn.addEventListener('click', () => {
    previewReport = null;
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    const historyButton = document.querySelector('.nav button[data-tab="historyScreen"]') as HTMLButtonElement | null;
    if (historyButton) historyButton.classList.add('active');
    openScreen('historyScreen');
    if (el.stats) el.stats.style.display = 'none';
    hideScreenActions('historyScreen');
    render();
  });
}

if (el.eventBackBtn) {
  el.eventBackBtn.addEventListener('click', () => {
    previewReport = null;
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    const historyButton = document.querySelector('.nav button[data-tab="historyScreen"]') as HTMLButtonElement | null;
    if (historyButton) historyButton.classList.add('active');
    openScreen('historyScreen');
    if (el.stats) el.stats.style.display = 'none';
    hideScreenActions('historyScreen');
    render();
  });
}

if (el.reportDeleteBtn) {
  el.reportDeleteBtn.addEventListener('click', () => {
    if (!previewReport || previewReport.type !== 'sales') return;
    deleteSavedReport(previewReport.id);
    previewReport = null;
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    const historyButton = document.querySelector('.nav button[data-tab="historyScreen"]') as HTMLButtonElement | null;
    if (historyButton) historyButton.classList.add('active');
    openScreen('historyScreen');
    if (el.stats) el.stats.style.display = 'none';
    hideScreenActions('historyScreen');
    render();
  });
}

if (el.eventDeleteBtn) {
  el.eventDeleteBtn.addEventListener('click', () => {
    if (!previewReport || previewReport.type !== 'event') return;
    deleteSavedReport(previewReport.id);
    previewReport = null;
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    const historyButton = document.querySelector('.nav button[data-tab="historyScreen"]') as HTMLButtonElement | null;
    if (historyButton) historyButton.classList.add('active');
    openScreen('historyScreen');
    if (el.stats) el.stats.style.display = 'none';
    hideScreenActions('historyScreen');
    render();
  });
}

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
  const showReset = screenId !== 'historyScreen' && screenId !== 'settingsScreen' && screenId !== 'productHistoryScreen';
  el.reset.style.display = showReset ? 'inline-grid' : 'none';
  if (el.productHistoryAddBtn) {
    el.productHistoryAddBtn.style.display = showAddProduct ? 'none' : 'none';
  }
  if (!showOptions) closeOptionsMenu();
}

function rebuildGrid() {
  el.grid.innerHTML = '';
  makeTiles();
  render();
}

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
}

function openProductEditor(index: number) {
  const title = document.getElementById('productEditTitle') as HTMLHeadingElement;
  const currentScreen = document.querySelector('.screen.active')?.id || 'salesScreen';
  productEditorReturnScreen = currentScreen === 'productEditScreen' ? productEditorReturnScreen : currentScreen;

  if (index >= 0) {
    const product = products[index];
    editingIndex = index;
    title.textContent = 'Edit product';
    el.editName.value = product.name;
    el.editPrice.value = formatInputNumber(String(product.price), loadSettings().currency);
    el.editCost.value = formatInputNumber(String(product.cost), loadSettings().currency);
    el.editColorHex.textContent = product.color.toUpperCase();
    el.editColorHexInput.value = product.color.toUpperCase();
    el.removeProductBtn.style.display = 'grid';
  } else {
    editingIndex = -1;
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

  el.editPrice.addEventListener('input', () => {
    el.editPrice.value = formatInputNumber(el.editPrice.value, loadSettings().currency);
  });
  el.editCost.addEventListener('input', () => {
    el.editCost.value = formatInputNumber(el.editCost.value, loadSettings().currency);
  });

  el.removeProductBtn.onclick = () => {
    if (editingIndex < 0) return;
    closeColorPicker();
    const removed = products.splice(editingIndex, 1)[0];
    for (let i = tx.length - 1; i >= 0; i--) {
      if (tx[i].product === removed.name) tx.splice(i, 1);
    }
    saveProducts();
    saveSales();
    showToast(`${removed.name} removed`);
    editingIndex = -1;
    rebuildGrid();
    render(true);
    openScreen(productEditorReturnScreen);
    hideScreenActions(productEditorReturnScreen);
  };

  el.saveProductBtn.onclick = () => {
    const updatedName = el.editName.value.trim() || `Product ${products.length + 1}`;
    const updatedPrice = parseCurrencyInput(el.editPrice.value, loadSettings().currency) || 0;
    const updatedCost = parseCurrencyInput(el.editCost.value, loadSettings().currency) || 0;
    const colorValue = (el.editColorHex.textContent || '#ffffff').trim();
    const normalizedColor = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;

    if (editingIndex >= 0) {
      const product = products[editingIndex];
      const oldProductName = product.name;
      product.name = updatedName;
      product.price = updatedPrice;
      product.cost = updatedCost;
      product.color = normalizedColor;

      tx.forEach((sale) => {
        if (sale.product === oldProductName) {
          sale.product = updatedName;
          sale.price = updatedPrice;
          sale.cost = updatedCost;
        }
      });

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
      const activeIdx = products.findIndex((p) => p.name === oldName);
      if (activeIdx >= 0) {
        const p = products[activeIdx];
        p.name = updatedName;
        p.price = updatedPrice;
        p.cost = updatedCost;
        p.color = normalizedColor;
        tx.forEach((sale) => {
          if (sale.product === oldName) {
            sale.product = updatedName;
            sale.price = updatedPrice;
            sale.cost = updatedCost;
          }
        });
        saveProducts();
        saveSales();
      }

      saveProductHistory(productHistory);
      showToast(`${updatedName} saved`);
      editingHistoryIndex = null;
      editingHistoryOldName = null;
    } else {
      const finalColor = chooseUniqueColor(products, normalizedColor);
      if (finalColor !== normalizedColor) {
        updateColorInputs(finalColor);
      }
      const newProduct = { name: updatedName, price: updatedPrice, cost: updatedCost, color: finalColor };
      products.push(newProduct);
      saveProducts();
      ensureProductHistory(newProduct, productHistory);
      saveProductHistory(productHistory);
      showToast(`${updatedName} added`);
    }

    rebuildGrid();
    render(true);
    openScreen(productEditorReturnScreen);
    hideScreenActions(productEditorReturnScreen);
  };
}

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
    hideScreenActions('productHistoryScreen');
    render();
  });
}
const openSalesReportMenuBtn = document.getElementById('openSalesReportMenuBtn') as HTMLButtonElement | null;
if (openSalesReportMenuBtn) {
  openSalesReportMenuBtn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    openScreen('salesReportHistoryScreen');
    hideScreenActions('salesReportHistoryScreen');
    render();
  });
}
if (el.salesReportHistoryBackBtn) {
  el.salesReportHistoryBackBtn.addEventListener('click', () => {
    openScreen('settingsScreen');
    hideScreenActions('settingsScreen');
    render();
  });
}
const openEventReportMenuBtn = document.getElementById('openEventReportMenuBtn') as HTMLButtonElement | null;
if (openEventReportMenuBtn) {
  openEventReportMenuBtn.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach((button) => button.classList.remove('active'));
    openScreen('eventReportHistoryScreen');
    hideScreenActions('eventReportHistoryScreen');
    render();
  });
}
if (el.eventReportHistoryBackBtn) {
  el.eventReportHistoryBackBtn.addEventListener('click', () => {
    openScreen('settingsScreen');
    hideScreenActions('settingsScreen');
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
    hideScreenActions(previousScreen);
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
    compareConfirmedIds = [];
    compareReportIds = [];
    compareDraftIds = [];
    openScreen('historyScreen');
    hideScreenActions('historyScreen');
    render();
  });
}
if (el.compareEventBackBtn) {
  el.compareEventBackBtn.addEventListener('click', () => {
    compareConfirmedIds = [];
    compareReportIds = [];
    compareDraftIds = [];
    openScreen('historyScreen');
    hideScreenActions('historyScreen');
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
  openScreen(productEditorReturnScreen);
  hideScreenActions(productEditorReturnScreen);
  render();
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
    importedEventReport = null;
    saveImportedEventReport(null);
    eventCosts.length = 0;
    saveEventCosts();
    render();
    showToast('Event report cleared');
    return;
  }

  tx.length = 0;
  saveSales();
  render(true);
  showToast('Sales cleared');
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
      document.querySelectorAll('.nav button').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
      const target = document.getElementById(b.getAttribute('data-tab') || '') as HTMLElement;
      if (target) target.classList.add('active');
      // Show top counters only on the sales screen
      if (el.stats) {
        if (target && target.id === 'salesScreen') el.stats.style.display = '';
        else el.stats.style.display = 'none';
      }
      if (target) {
        hideScreenActions(target.id);
        if ((target.id === 'reportsScreen' && previewReport?.type === 'sales') || (target.id === 'eventScreen' && previewReport?.type === 'event')) {
          previewReport = null;
        }
      }
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
    render();
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

    importedEventReport = {
      sales: mergedSales,
      products: products.map((p) => ({ ...p })),
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
      if (el.expenseModalOverlay) {
        el.expenseModalOverlay.classList.remove('open');
        try { unlockBodyScroll(); } catch (e) { /* ignore */ }
      }
    }
  });

  makeTiles();
  render();

// Ensure stats and action button visibility match the initial active screen
(() => {
  const active = document.querySelector('.screen.active') as HTMLElement | null;
  if (el.stats) {
    if (active && active.id === 'salesScreen') el.stats.style.display = '';
    else el.stats.style.display = 'none';
  }
  if (active) hideScreenActions(active.id);
})();

if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor-native');
}