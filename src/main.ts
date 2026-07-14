import './style.css';
import { Capacitor } from '@capacitor/core';

interface Product {
  name: string;
  price: number;
  cost: number;
  color: string;
}

interface SaleRecord {
  product: string;
  price: number;
  cost: number;
  payment: string;
  timestamp: Date;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

interface EventCost {
  id: string;
  name: string;
  amount: number;
}

const PRODUCT_STORAGE_KEY = 'cntrProducts';
const TX_STORAGE_KEY = 'cntrSales';
const EVENT_COST_STORAGE_KEY = 'cntrEventCosts';
const SAVED_REPORTS_KEY = 'cntrSavedReports';
const IMPORTED_EVENT_REPORT_KEY = 'cntrImportedEventReport';

const defaultProducts: Product[] = [
  { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
  { name: 'Cheki', price: 35000, cost: 17000, color: '#31b500' },
  { name: 'Poster', price: 30000, cost: 15000, color: '#f16900' },
  { name: 'Photocard', price: 15000, cost: 7000, color: '#d49762' },
  { name: 'Sticker', price: 5000, cost: 1500, color: '#c8070b' },
  { name: 'Acrylic Stand', price: 45000, cost: 25000, color: '#9b48ad' },
  { name: 'Keychain', price: 20000, cost: 9000, color: '#d8b800' },
  { name: 'Tote Bag', price: 50000, cost: 30000, color: '#5f6d77' },
];

const products: Product[] = loadProducts();
console.debug('startup: loaded products count=', products.length);
const payments = ['Cash', 'QRIS'];
const tx: SaleRecord[] = loadSales();
const eventCosts: EventCost[] = loadEventCosts();
let previewReport: SavedReport | null = null;
let importedEventReport: { sales: SaleRecord[]; products: Product[] } | null = loadImportedEventReport();

function loadImportedEventReport() {
  const stored = localStorage.getItem(IMPORTED_EVENT_REPORT_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { sales: Array<{ product: string; price: number; cost: number; payment: string; timestamp: string }>; products: Product[] };
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sales) || !Array.isArray(parsed.products)) return null;
    return {
      sales: parsed.sales.map((item) => ({ ...item, timestamp: new Date(item.timestamp) })),
      products: parsed.products,
    };
  } catch {
    return null;
  }
}

function saveImportedEventReport(report: { sales: SaleRecord[]; products: Product[] } | null) {
  if (report === null) {
    localStorage.removeItem(IMPORTED_EVENT_REPORT_KEY);
  } else {
    localStorage.setItem(IMPORTED_EVENT_REPORT_KEY, JSON.stringify(report));
  }
}

function loadProducts() {
  const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
  if (!stored) {
    console.debug('loadProducts: no stored products — initial empty state');
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as Product[];
    if (!Array.isArray(parsed)) {
      console.debug('loadProducts: stored value is not an array', parsed);
      return [];
    }
    console.debug('loadProducts: parsed products count=', parsed.length);
    return parsed;
  } catch (err) {
    console.debug('loadProducts: parse error', err, stored);
    return [];
  }
}

function saveProducts() {
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
}

function loadSales() {
  const stored = localStorage.getItem(TX_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as Array<{
      product: string;
      price: number;
      cost: number;
      payment: string;
      timestamp: string;
    }>;
    return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
  } catch {
    return [];
  }
}

function saveSales() {
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(tx));
}

function loadEventCosts() {
  const stored = localStorage.getItem(EVENT_COST_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as Array<{ id: string; name: string; amount: number; category?: string }>;
    return Array.isArray(parsed)
      ? parsed.map((item) => ({ id: item.id, name: item.name, amount: item.amount }))
      : [];
  } catch {
    return [];
  }
}

function saveEventCosts() {
  localStorage.setItem(EVENT_COST_STORAGE_KEY, JSON.stringify(eventCosts));
}

interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
  type: 'sales' | 'event';
  products: Product[];
  sales: SaleRecord[];
  eventCosts: EventCost[];
}

function loadSavedReports() {
  const stored = localStorage.getItem(SAVED_REPORTS_KEY);
  if (!stored) return [] as SavedReport[];

  try {
    const parsed = JSON.parse(stored) as SavedReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as SavedReport[];
  }
}

function saveSavedReports(reports: SavedReport[]) {
  localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports));
}

function saveCurrentReport(name: string, type: 'sales' | 'event') {
  const reports = loadSavedReports();
  const reportName = name.trim() || `${type === 'event' ? 'Event report' : 'Report'} ${new Date().toLocaleString()}`;
  reports.push({
    id: crypto.randomUUID(),
    name: reportName,
    createdAt: new Date().toISOString(),
    type,
    products: products.map((p) => ({ ...p })),
    sales: tx.map((sale) => ({ ...sale })),
    eventCosts: eventCosts.map((cost) => ({ ...cost })),
  });
  saveSavedReports(reports);
  showToast(`Saved ${type === 'event' ? 'event report' : 'report'}: ${reportName}`);
  render();
}

function addEventCost(name: string, amount: number) {
  eventCosts.push({ id: crypto.randomUUID(), name, amount });
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

let editingIndex = -1;
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
  hero: document.getElementById('settingsHero') as HTMLDivElement,
  report: document.getElementById('reportCard') as HTMLDivElement,
  eventReport: document.getElementById('eventCard') as HTMLDivElement,
  expenseModalOverlay: document.getElementById('expenseModalOverlay') as HTMLDivElement,
  expenseModalCloseBtn: document.getElementById('expenseModalCloseBtn') as HTMLButtonElement,
  expenseModalCancelBtn: document.getElementById('expenseModalCancelBtn') as HTMLButtonElement,
  reportPageTitle: document.getElementById('reportPageTitle') as HTMLHeadingElement,
  eventPageTitle: document.getElementById('eventPageTitle') as HTMLHeadingElement,
  reportBackBtn: document.getElementById('reportBackBtn') as HTMLButtonElement,
  eventBackBtn: document.getElementById('eventBackBtn') as HTMLButtonElement,
  historySavedReports: document.getElementById('historySavedReports') as HTMLDivElement,
  historySavedEventReports: document.getElementById('historySavedEventReports') as HTMLDivElement,
  historyRecentPurchase: document.getElementById('historyRecentPurchase') as HTMLDivElement,
  saveModalOverlay: document.getElementById('saveModalOverlay') as HTMLDivElement,
  saveModalTitle: document.getElementById('saveModalTitle') as HTMLHeadingElement,
  saveModalInput: document.getElementById('saveModalInput') as HTMLInputElement,
  saveModalSaveBtn: document.getElementById('saveModalSaveBtn') as HTMLButtonElement,
  saveModalCancelBtn: document.getElementById('saveModalCancelBtn') as HTMLButtonElement,
  saveModalCloseBtn: document.getElementById('saveModalCloseBtn') as HTMLButtonElement,
  importModalOverlay: document.getElementById('importModalOverlay') as HTMLDivElement,
  importSavedReportsList: document.getElementById('importSavedReportsList') as HTMLDivElement,
  importModalCancelBtn: document.getElementById('importModalCancelBtn') as HTMLButtonElement,
  importModalConfirmBtn: document.getElementById('importModalConfirmBtn') as HTMLButtonElement,
  importModalCloseBtn: document.getElementById('importModalCloseBtn') as HTMLButtonElement,
  eventImportBtn: document.getElementById('eventImportBtn') as HTMLButtonElement,
};

const fmt = (n: number) => {
  const formatted = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `Rp ${formatted}`;
};
const fmtCompact = (n: number) => {
  if (Math.abs(n) >= 1000000) {
    return `Rp ${(n / 1000000).toFixed(n % 1000000 === 0 ? 0 : 1)}m`;
  }
  if (Math.abs(n) >= 1000) {
    return `Rp ${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  }
  return `Rp ${n}`;
};
const label = (p: number) => p >= 1000 ? `${p / 1000}k` : `${p}`;

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
            <span class="value">${fmtCompact(revenue)}</span>
            <span class="hint">${reportSales.length} total sales</span>
          </div>
          <div class="summary-tile">
            <span class="label">Profit</span>
            <span class="value">${fmtCompact(profit)}</span>
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
                  <span class="revenue">${fmtCompact(item.revenue)} Revenue</span>
                  <span class="sep"> | </span>
                  <span class="profit">${fmtCompact(item.profit)} Profit</span>
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
  }).filter((item) => item.count > 0).sort((a, b) => b.count - a.count || b.revenue - a.revenue);
  const topProducts = allProducts.slice(0, 5);

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
              <button class="icon-btn delete-cost" data-id="${cost.id}" title="Remove cost"><span class="material-symbols-outlined">delete</span></button>
            </div>
          </div>`).join('')}</div>` : '<div class="empty-state">No event costs yet. Add booth cost, transportation, or staffing expenses.</div>'}
      </section>

      <section class="report-section">
        <div class="section-head">
          <h2 class="report-title">Sales</h2>
          <button class="control-btn add-expense-btn" id="eventImportBtn" type="button" title="Import"><span class="material-symbols-outlined control-icon">upload</span></button>
        </div>
        ${topProducts.length ? `<div class="product-columns">${topProducts.map((item) => `
          <div class="product-row">
            <div>
              <strong>${item.name}</strong>
              <span class="history-meta">${item.count} sales · ${fmt(item.revenue)} revenue</span>
            </div>
            <div class="performance-details">
              <span class="profit">${fmt(item.profit)} profit</span>
            </div>
          </div>`).join('')}</div>` : '<div class="empty-state">No product sales yet for event revenue.</div>'}
      </section>
    </div>`;
}

function wireEventActions() {
  const addCostBtn = document.getElementById('addCostBtn') as HTMLButtonElement | null;
  const costName = document.getElementById('eventCostName') as HTMLInputElement | null;
  const costAmount = document.getElementById('eventCostAmount') as HTMLInputElement | null;
  const openAddExpenseBtn = document.getElementById('openAddExpenseBtn') as HTMLButtonElement | null;
  const expensePopover = document.getElementById('expensePopover') as HTMLDivElement | null;

  if (openAddExpenseBtn && expensePopover) {
    openAddExpenseBtn.onclick = (event) => {
      event.stopPropagation();
      const isOpen = expensePopover.classList.toggle('open');
      expensePopover.hidden = !isOpen;
      openAddExpenseBtn.setAttribute('aria-expanded', String(isOpen));
    };
  }

  if (addCostBtn && costName && costAmount) {
    addCostBtn.onclick = () => {
      const name = costName.value.trim();
      const amount = Number(costAmount.value);
      if (!name || Number.isNaN(amount) || amount <= 0) return;
      addEventCost(name, amount);
      costName.value = '';
      costAmount.value = '';
      const expenseOverlayEl = document.getElementById('expenseModalOverlay') as HTMLDivElement | null;
      if (expenseOverlayEl) expenseOverlayEl.classList.remove('open');
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
      try {
        // @ts-ignore
        openImportModal();
      } catch (err) {
        console.debug('Failed to open import modal:', err);
      }
    });
  }

  // Wire the expense modal triggers and close handlers
  const expenseOverlay = document.getElementById('expenseModalOverlay') as HTMLDivElement | null;
  const expenseClose = document.getElementById('expenseModalCloseBtn') as HTMLButtonElement | null;
  const expenseCancel = document.getElementById('expenseModalCancelBtn') as HTMLButtonElement | null;

  if (openAddExpenseBtn && expenseOverlay) {
    openAddExpenseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      expenseOverlay.classList.add('open');
    });
  }

  if (expenseClose) expenseClose.addEventListener('click', () => expenseOverlay && expenseOverlay.classList.remove('open'));
  if (expenseCancel) expenseCancel.addEventListener('click', () => expenseOverlay && expenseOverlay.classList.remove('open'));
  if (expenseOverlay) expenseOverlay.addEventListener('click', (ev) => { if (ev.target === expenseOverlay) expenseOverlay.classList.remove('open'); });

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
              <span class="payment-value" data-counter-for="Cash">0</span>
              <button class="control-btn" data-payment="Cash" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
          <div class="payment-quarter">
            <span class="payment-label">QRIS</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="QRIS" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <span class="payment-value" data-counter-for="QRIS">0</span>
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
  render(true);
  showToast(`${p.name} • ${payment}`);
}

function removeLastMatching(product: string, payment: string) {
  for (let i = tx.length - 1; i >= 0; i--) {
    if (tx[i].product === product && tx[i].payment === payment) {
      tx.splice(i, 1);
      saveSales();
      render(true);
      showToast(`${product} removed`);
      return;
    }
  }
  showToast('Nothing to remove');
}

function totals() {
  return tx.reduce(
    (a, t) => {
      a.revenue += t.price;
      a.profit += t.price - t.cost;
      if (t.payment === 'Cash') a.cash += t.price;
      if (t.payment === 'QRIS') a.qris += t.price;
      return a;
    },
    { revenue: 0, profit: 0, cash: 0, qris: 0 },
  );
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
          <button class="history-item" type="button" data-id="${report.id}" data-type="${report.type}">
            <div>
              <strong>${report.name}</strong>
              <div class="history-meta">${new Date(report.createdAt).toLocaleString()}</div>
            </div>
            <span class="history-badge">${report.type === 'event' ? 'Event' : 'Sales'}</span>
          </button>
        `,
      )
      .join('');
  };

  const attachReportClick = (container: HTMLDivElement | null) => {
    if (!container) return;
    container.querySelectorAll('.history-item').forEach((item) => {
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

function render(bump = false) {
  const s = totals();
  const statRows: Array<[string, number]> = [['Revenue', s.revenue], ['Profit', s.profit], ['Cash', s.cash], ['QRIS', s.qris]];
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
    const qrisValue = tile.querySelector('.payment-value[data-counter-for="QRIS"]') as HTMLSpanElement | null;
    if (cashValue) cashValue.textContent = `${cashCount}`;
    if (qrisValue) qrisValue.textContent = `${qrisCount}`;
  });

  el.hero.textContent = `+${tx.length}`;
  el.report.innerHTML = buildReportMarkup();
  if (el.eventReport) {
    el.eventReport.innerHTML = buildEventMarkup();
    wireEventActions();
  }
  buildHistoryMarkup();
  updatePreviewHeaders();
}

function updatePreviewHeaders() {
  const isReportPreview = Boolean(previewReport && previewReport.type === 'sales');
  const isEventPreview = Boolean(previewReport && previewReport.type === 'event');

  if (el.reportPageTitle) el.reportPageTitle.textContent = isReportPreview ? previewReport!.name : 'Reports';
  if (el.eventPageTitle) el.eventPageTitle.textContent = isEventPreview ? previewReport!.name : 'Event Report';

  if (el.reportBackBtn) el.reportBackBtn.style.display = isReportPreview ? 'inline-grid' : 'none';
  if (el.eventBackBtn) el.eventBackBtn.style.display = isEventPreview ? 'inline-grid' : 'none';
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

function closeOptionsMenu() {
  el.optionsMenu.classList.remove('open');
}

function toggleOptionsMenu() {
  el.optionsMenu.classList.toggle('open');
}

function hideScreenActions(screenId: string) {
  const showOptions = screenId === 'reportsScreen' || screenId === 'eventScreen';
  el.optionsBtn.style.display = showOptions ? 'inline-grid' : 'none';
  el.openProductEdit.style.display = screenId === 'salesScreen' ? 'inline-grid' : 'none';
  el.reset.style.display = screenId === 'historyScreen' ? 'none' : 'inline-grid';
  if (!showOptions) closeOptionsMenu();
}

function rebuildGrid() {
  el.grid.innerHTML = '';
  makeTiles();
  render();
}

function openScreen(screenId: string) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

function openProductEditor(index: number) {
  const title = document.getElementById('productEditTitle') as HTMLHeadingElement;
  if (index >= 0) {
    const product = products[index];
    editingIndex = index;
    title.textContent = 'Edit product';
    el.editName.value = product.name;
    el.editPrice.value = product.price.toString();
    el.editCost.value = product.cost.toString();
    el.editColorHex.textContent = product.color.toUpperCase();
    el.editColorHexInput.value = product.color.toUpperCase();
    el.removeProductBtn.style.display = 'grid';
  } else {
    editingIndex = -1;
    title.textContent = 'Add product';
    el.editName.value = '';
    el.editPrice.value = '';
    el.editCost.value = '';
    el.editColorHex.textContent = '#F76495';
    el.editColorHexInput.value = '#F76495';
    el.removeProductBtn.style.display = 'none';
  }

  updateColorInputs(el.editColorHex.textContent || '#F76495');
  openScreen('productEditScreen');

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
    openScreen('salesScreen');
  };

  el.saveProductBtn.onclick = () => {
    const updatedName = el.editName.value.trim() || `Product ${products.length + 1}`;
    const updatedPrice = Number(el.editPrice.value) || 0;
    const updatedCost = Number(el.editCost.value) || 0;
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
      showToast(`${updatedName} saved`);
    } else {
      products.push({ name: updatedName, price: updatedPrice, cost: updatedCost, color: normalizedColor });
      saveProducts();
      showToast(`${updatedName} added`);
    }

    rebuildGrid();
    render(true);
    openScreen('salesScreen');
  };
}

let currentHSV: HSV = { h: 340, s: 0.68, v: 0.97 };

function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  return `#${hex.toUpperCase()}`;
}

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

el.openProductEdit.addEventListener('click', () => {
  openProductEditor(-1);
});
el.closeEditBtn.addEventListener('click', () => openScreen('salesScreen'));

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

function getContrastColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#071f1d' : '#ffffff';
}

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

  const openSaveModal = (type: 'sales' | 'event') => {
    saveModalType = type;
    closeOptionsMenu();
    el.saveModalTitle.textContent = type === 'event' ? 'Save event report' : 'Save report';
    el.saveModalInput.placeholder = type === 'event' ? `Event report ${new Date().toLocaleDateString()}` : `Report ${new Date().toLocaleDateString()}`;
    el.saveModalInput.value = '';
    el.saveModalOverlay.classList.add('open');
    el.saveModalInput.focus();
  };

  const closeSaveModal = () => {
    el.saveModalOverlay.classList.remove('open');
  };

  el.saveReportOption.addEventListener('click', () => openSaveModal('sales'));

  el.saveEventReportOption.addEventListener('click', () => openSaveModal('event'));

  el.saveModalSaveBtn.addEventListener('click', () => {
    const reportName = el.saveModalInput.value.trim();
    if (!reportName) return;
    saveCurrentReport(reportName, saveModalType);
    closeSaveModal();
  });

  el.saveModalCancelBtn.addEventListener('click', closeSaveModal);
  el.saveModalCloseBtn.addEventListener('click', closeSaveModal);

  el.saveModalOverlay.addEventListener('click', (event) => {
    if (event.target === el.saveModalOverlay) closeSaveModal();
  });

  el.saveModalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      el.saveModalSaveBtn.click();
    }
  });

  const renderImportList = () => {
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

    el.importSavedReportsList.innerHTML = `
      <label class="import-item">
        <input type="checkbox" id="importCurrentLiveReport" value="current-live" />
        <div>
          <strong>Current live event report</strong>
          <small>Import active event costs from the current session.</small>
        </div>
      </label>
      ${savedRows}
    `;
  };

  const openImportModal = () => {
    renderImportList();
    el.importModalOverlay.classList.add('open');
  };

  const closeImportModal = () => {
    el.importModalOverlay.classList.remove('open');
  };

  if (el.importModalCancelBtn) el.importModalCancelBtn.addEventListener('click', closeImportModal);
  if (el.importModalCloseBtn) el.importModalCloseBtn.addEventListener('click', closeImportModal);
  if (el.importModalOverlay) el.importModalOverlay.addEventListener('click', (event) => {
    if (event.target === el.importModalOverlay) closeImportModal();
  });

  if (el.eventImportBtn) el.eventImportBtn.addEventListener('click', openImportModal);

  if (el.importModalConfirmBtn) el.importModalConfirmBtn.addEventListener('click', () => {
    const currentLiveCheckbox = el.importSavedReportsList.querySelector('#importCurrentLiveReport') as HTMLInputElement | null;
    const selectedIds = Array.from(el.importSavedReportsList.querySelectorAll('input[type="checkbox"]'))
      .filter((input) => (input as HTMLInputElement).checked)
      .map((input) => (input as HTMLInputElement).value)
      .filter((value) => value !== 'current-live');

    const selectedSalesReports = loadSavedReports().filter((r) => r.type === 'sales' && selectedIds.includes(r.id));
    const mergedSales = selectedSalesReports.flatMap((report) => report.sales.map((sale) => ({ ...sale })));
    const mergedCosts = currentLiveCheckbox?.checked
      ? eventCosts.map((cost) => ({ ...cost, id: crypto.randomUUID() }))
      : [];

    if (!selectedSalesReports.length && !mergedCosts.length) {
      showToast('Select at least one saved sales report or current live event report');
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
      if (el.expenseModalOverlay) el.expenseModalOverlay.classList.remove('open');
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
