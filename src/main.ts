import './style.css';
import { Capacitor } from '@capacitor/core';
import { h, render as renderView } from 'preact';
import { escapeHtml, fmt, formatInputNumber, parseCurrencyInput } from './formatters';
import { totals } from './reports';
import {
  addExpense,
  clearLiveEvent,
  clearSales,
  deleteProduct,
  deleteSavedReport,
  findSavedReport,
  getEventView,
  importEventSales,
  loadSavedReports,
  productColor,
  recordSale,
  removeExpense,
  removeLastSale,
  renameSavedReport,
  saveCurrentReport,
  saveProducts,
  state,
  updateExpense,
} from './state';
import { loadSettings, saveSettings } from './storage';
import type { Currency, Product, ReportType } from './types';
import {
  activeScreenId,
  closeOptionsMenu,
  el,
  getProductListOrder,
  lockBodyScroll,
  openConfirmModal,
  openScreen,
  showToast,
  unlockBodyScroll,
  updateHeaderActions,
} from './ui/dom';
import { editProductByName, initProductEditor, openProductEditor } from './ui/productEditor';
import { CompareView } from './views/Compare';
import { EventReport } from './views/EventReport';
import { ProductList, RecentSales, ReportChecklist, SavedReportList } from './views/Lists';
import { SalesReport } from './views/SalesReport';

// ---- Sales counter tiles ----

/** Product + payment of the last tap, so render() can animate that counter. */
let lastTap: { product: string; payment: string } | null = null;

function makeTiles() {
  el.grid.innerHTML = '';

  for (const product of state.products) {
    const card = document.createElement('div');
    card.className = 'tile';
    card.style.setProperty('--tile', product.color);
    card.dataset.product = product.name;
    const quarter = (payment: string) => `
          <div class="payment-quarter" data-payment="${payment}">
            <span class="payment-label">${payment}</span>
            <div class="payment-controls">
              <button class="control-btn" type="button" data-payment="${payment}" data-action="minus" aria-label="Remove ${payment} sale"><span class="material-symbols-outlined control-icon">remove</span></button>
              <div class="payment-value-wrap"><span class="payment-value" data-counter-for="${payment}">0</span></div>
              <button class="control-btn" type="button" data-payment="${payment}" data-action="plus" aria-label="Add ${payment} sale"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>`;
    card.innerHTML = `
        <div class="tile-head">
          <div class="product-meta">
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-price">${fmt(product.price)}</div>
          </div>
          <button class="settings-btn" type="button" aria-label="Edit ${escapeHtml(product.name)}"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="tile-bottom">${quarter('Cash')}${quarter('QRIS')}</div>`;

    card.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;
      if (button.classList.contains('settings-btn')) {
        openProductEditor(state.products.indexOf(product));
        return;
      }
      const payment = button.dataset.payment ?? 'Cash';
      rippleFrom(card, button);
      if (button.dataset.action === 'plus') {
        recordSale(product, payment);
        lastTap = { product: product.name, payment };
        render(true);
        showToast(`${product.name} • ${payment}`);
      } else if (removeLastSale(product.name, payment)) {
        lastTap = { product: product.name, payment };
        render(true);
        showToast(`${product.name} removed`);
      } else {
        showToast('Nothing to remove');
      }
    });

    el.grid.appendChild(card);
  }
}

function rippleFrom(card: HTMLElement, button: HTMLElement) {
  const rect = card.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  card.style.setProperty('--x', `${buttonRect.left - rect.left + buttonRect.width / 2}px`);
  card.style.setProperty('--y', `${buttonRect.top - rect.top + buttonRect.height / 2}px`);
  card.classList.add('ripple');
  window.setTimeout(() => card.classList.remove('ripple'), 160);
}

function updateTiles(bump: boolean) {
  const counts = new Map<string, number>();
  for (const sale of state.sales) {
    const key = `${sale.payment}\u0000${sale.product}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  el.grid.querySelectorAll<HTMLElement>('.tile').forEach((tile) => {
    tile.querySelectorAll<HTMLElement>('.payment-value[data-counter-for]').forEach((value) => {
      value.textContent = `${counts.get(`${value.dataset.counterFor}\u0000${tile.dataset.product}`) ?? 0}`;
    });
  });

  if (bump && lastTap) {
    const { product, payment } = lastTap;
    lastTap = null;
    const tile = [...el.grid.querySelectorAll<HTMLElement>('.tile')].find((item) => item.dataset.product === product);
    const quarter = tile?.querySelector<HTMLElement>(`.payment-quarter[data-payment="${payment}"]`);
    if (quarter) {
      quarter.classList.remove('bump');
      void quarter.offsetWidth; // restart the animation
      quarter.classList.add('bump');
      window.setTimeout(() => quarter.classList.remove('bump'), 520);
    }
  }
}

// ---- Rendering ----

function render(bump = false) {
  const { revenue, profit } = totals(state.sales);
  el.headline.textContent = `${fmt(revenue)} × ${state.sales.length}`;
  el.stats.innerHTML = [['Revenue', revenue], ['Profit', profit]]
    .map(([label, value]) => `<div class="stat ${bump ? 'bump' : ''}"><span class="label">${label}</span><span class="value">${fmt(value as number)}</span></div>`)
    .join('');
  if (bump) window.setTimeout(() => el.stats.querySelectorAll('.stat').forEach((stat) => stat.classList.remove('bump')), 220);
  updateTiles(bump);

  const preview = state.previewReport;
  const salesPreview = preview?.type === 'sales' ? preview : null;
  const eventPreview = preview?.type === 'event' ? preview : null;
  const savedReports = loadSavedReports();

  renderView(
    h(SalesReport, {
      sales: salesPreview ? salesPreview.sales : state.sales,
      products: salesPreview ? salesPreview.products : state.products,
      colorFor: productColor,
    }),
    el.report,
  );
  renderView(
    h(EventReport, {
      view: getEventView(),
      colorFor: productColor,
      onAddExpense: () => openExpenseModal(null),
      onEditExpense: (id: string) => openExpenseModal(id),
      onDeleteExpense: (id: string) => {
        removeExpense(id);
        render();
      },
      onImport: openImportModal,
    }),
    el.eventReport,
  );
  renderView(h(RecentSales, { sales: state.sales.slice(-5).reverse() }), el.historyRecentSales);
  renderProductList();
  for (const type of ['sales', 'event'] as const) {
    renderView(
      h(SavedReportList, {
        type,
        reports: savedReports.filter((report) => report.type === type),
        onOpen: (id: string) => openSavedReport(id),
        onRename: (id: string) => openRenameModal(id),
        onDelete: (id: string) => confirmDeleteSavedReport(id),
      }),
      type === 'sales' ? el.salesReportHistoryList : el.eventReportHistoryList,
    );
  }

  el.reportPageTitle.textContent = salesPreview ? salesPreview.name : 'Reports';
  el.eventPageTitle.textContent = eventPreview ? eventPreview.name : 'Event';
  for (const [button, visible] of [
    [el.reportBackBtn, salesPreview],
    [el.reportDeleteBtn, salesPreview],
    [el.eventBackBtn, eventPreview],
    [el.eventDeleteBtn, eventPreview],
  ] as const) {
    button.style.display = visible ? 'inline-grid' : 'none';
  }
  updateHeaderActions();
}

/** Re-renders after the product list changed (tiles are rebuilt too). */
function productsChanged() {
  makeTiles();
  render(true);
}

// ---- Products screen ----

function renderProductList() {
  // While the Products screen is open keep its row order; new products are appended.
  const order = getProductListOrder();
  const history = state.productHistory;
  const ordered = order
    ? [
        ...order.map((name) => history.find((product) => product.name === name)).filter((product): product is Product => Boolean(product)),
        ...history.filter((product) => !order.includes(product.name)),
      ]
    : history;

  renderView(
    h(ProductList, {
      products: ordered,
      activeNames: new Set(state.products.map((product) => product.name)),
      onEdit: editProductByName,
      onToggle: toggleProduct,
      onDelete: (name: string) =>
        openConfirmModal(`Permanently delete product '${name}'? This cannot be undone.`, 'Delete', () => {
          deleteProduct(name);
          productsChanged();
          showToast(`${name} permanently deleted`);
        }),
    }),
    el.productHistoryList,
  );
}

/** Deactivates an active product (keeping its history), or puts an inactive one back on the counter. */
function toggleProduct(name: string) {
  const index = state.products.findIndex((product) => product.name === name);
  if (index >= 0) {
    state.products.splice(index, 1);
    showToast(`${name} removed from counter`);
  } else {
    const existing = state.productHistory.find((product) => product.name === name);
    if (!existing) return;
    state.products.push({ ...existing });
    showToast(`${name} added back to counter`);
  }
  saveProducts();
  productsChanged();
}

// ---- Saved reports ----

function openSavedReport(id: string) {
  const report = findSavedReport(id);
  if (!report) return;
  state.previewReport = report;
  openScreen(report.type === 'event' ? 'eventScreen' : 'reportsScreen');
  render();
}

function confirmDeleteSavedReport(id: string, onDeleted?: () => void) {
  const report = findSavedReport(id);
  if (!report) return;
  openConfirmModal(`Delete report '${report.name}'? This cannot be undone.`, 'Delete', () => {
    if (deleteSavedReport(id)) showToast('Report deleted');
    onDeleted?.();
    render();
  });
}

function returnToHistory() {
  state.previewReport = null;
  openScreen('historyScreen');
  render();
}

// ---- Save / rename dialog ----

let saveModalType: ReportType = 'sales';
let renamingReportId: string | null = null;

function updateSaveModalButton() {
  el.saveModalSaveBtn.disabled = el.saveModalInput.value.trim().length === 0;
}

function showSaveModal(title: string, buttonLabel: string, value: string, placeholder: string) {
  closeOptionsMenu();
  el.saveModalTitle.textContent = title;
  el.saveModalSaveBtn.textContent = buttonLabel;
  el.saveModalInput.value = value;
  el.saveModalInput.placeholder = placeholder;
  updateSaveModalButton();
  el.saveModalOverlay.classList.add('open');
  el.saveModalInput.focus();
}

function openSaveModal(type: ReportType) {
  saveModalType = type;
  renamingReportId = null;
  const date = new Date().toLocaleDateString();
  showSaveModal(type === 'event' ? 'Save event report' : 'Save report', 'Save', '', type === 'event' ? `Event report ${date}` : `Report ${date}`);
}

function openRenameModal(id: string) {
  const report = findSavedReport(id);
  if (!report) return;
  renamingReportId = id;
  showSaveModal('Rename report', 'Rename', report.name, 'New report name');
}

function closeSaveModal() {
  renamingReportId = null;
  el.saveModalInput.value = '';
  el.saveModalOverlay.classList.remove('open');
}

function submitSaveModal() {
  const name = el.saveModalInput.value.trim();
  if (renamingReportId) {
    if (renameSavedReport(renamingReportId, name)) showToast('Report renamed');
  } else {
    const savedName = saveCurrentReport(name, saveModalType);
    showToast(`Saved ${saveModalType === 'event' ? 'event report' : 'report'}: ${savedName}`);
  }
  closeSaveModal();
  render();
}

// ---- Expense dialog ----

let editingExpenseId: string | null = null;

function updateExpenseButtonState() {
  const amount = parseCurrencyInput(el.eventCostAmount.value, loadSettings().currency);
  el.addCostBtn.disabled = !el.eventCostName.value.trim() || !(amount > 0);
}

/** Opens the expense dialog to add (`id` null) or edit an expense on the event screen. */
function openExpenseModal(id: string | null) {
  const cost = id ? getEventView().eventCosts.find((item) => item.id === id) : null;
  if (id && !cost) return;
  editingExpenseId = cost?.id ?? null;
  el.expenseModalTitle.textContent = cost ? 'Edit expense' : 'Add expense';
  el.addCostBtn.textContent = cost ? 'Save changes' : 'Add expense';
  el.eventCostName.value = cost?.name ?? '';
  el.eventCostAmount.value = cost ? formatInputNumber(String(cost.amount), loadSettings().currency) : '';
  updateExpenseButtonState();
  el.expenseModalOverlay.classList.add('open');
  lockBodyScroll();
}

function closeExpenseModal() {
  editingExpenseId = null;
  el.expenseModalOverlay.classList.remove('open');
  unlockBodyScroll();
}

function submitExpense() {
  const name = el.eventCostName.value.trim();
  const amount = parseCurrencyInput(el.eventCostAmount.value, loadSettings().currency);
  if (!name || !(amount > 0)) return;
  if (editingExpenseId) updateExpense(editingExpenseId, name, amount);
  else addExpense(name, amount);
  closeExpenseModal();
  render();
}

// ---- Compare dialog ----

const compareSelection: Record<ReportType, string[]> = { sales: [], event: [] };
let compareModalType: ReportType = 'sales';

function checkedValues(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((input) => input.value);
}

function openCompareModal(type: ReportType) {
  compareModalType = type;
  el.compareModalTitle.textContent = type === 'sales' ? 'Compare sales' : 'Compare events';
  renderView(
    h(ReportChecklist, {
      reports: loadSavedReports().filter((report) => report.type === type),
      checked: compareSelection[type],
      emptyText: 'No saved reports yet.',
    }),
    el.compareModalList,
  );
  el.compareModalConfirmBtn.disabled = checkedValues(el.compareModalList).length !== 2;
  el.compareModalOverlay.classList.add('open');
}

function closeCompareModal() {
  el.compareModalOverlay.classList.remove('open');
}

function renderCompare(type: ReportType) {
  const ids = compareSelection[type];
  const reports = loadSavedReports().filter((report) => report.type === type && ids.includes(report.id));
  renderView(h(CompareView, { type, reports }), type === 'sales' ? el.compareSalesCard : el.compareEventCard);
}

function confirmCompareSelection() {
  const checked = checkedValues(el.compareModalList);
  if (checked.length !== 2) {
    showToast('Select exactly 2 reports');
    return;
  }
  compareSelection[compareModalType] = checked;
  closeCompareModal();
  renderCompare(compareModalType);
  openScreen(compareModalType === 'sales' ? 'compareSalesScreen' : 'compareEventScreen');
  render();
}

// ---- Import dialog ----

function openImportModal() {
  renderView(
    h(ReportChecklist, {
      reports: loadSavedReports().filter((report) => report.type === 'sales'),
      checked: [],
      emptyText: 'No saved sales reports to import.',
      live: { title: 'Current live sales', subtitle: 'Sales recorded on the counter right now.' },
    }),
    el.importSavedReportsList,
  );
  el.importModalConfirmBtn.disabled = true;
  el.importModalOverlay.classList.add('open');
}

function closeImportModal() {
  el.importModalOverlay.classList.remove('open');
}

function confirmImport() {
  const selected = checkedValues(el.importSavedReportsList);
  if (!selected.length) {
    showToast('Select the live sales or at least one saved report');
    return;
  }
  importEventSales(selected.includes('current-live'), selected.filter((id) => id !== 'current-live'));
  closeImportModal();
  render();
}

// ---- Header actions ----

function resetActiveScreen() {
  if (activeScreenId() === 'eventScreen') {
    if (state.previewReport?.type === 'event') {
      showToast('Saved reports cannot be cleared');
      return;
    }
    openConfirmModal('Clear the imported event sales and all event expenses?', 'Clear', () => {
      clearLiveEvent();
      render();
      showToast('Event report cleared');
    });
    return;
  }

  if (!state.sales.length) {
    showToast('Nothing to clear');
    return;
  }
  openConfirmModal(`Clear all ${state.sales.length} recorded sales? Save a report first if you need them.`, 'Clear', () => {
    clearSales();
    render(true);
    showToast('Sales cleared');
  });
}

function toggleOptionsMenu(event: Event) {
  event.stopPropagation();
  const screen = activeScreenId();
  el.saveReportOption.style.display = screen === 'reportsScreen' ? 'block' : 'none';
  el.saveEventReportOption.style.display = screen === 'eventScreen' ? 'block' : 'none';
  el.optionsMenu.classList.toggle('open');
}

// ---- Wiring (static markup, attached once) ----

function onClick(element: HTMLElement, handler: (event: MouseEvent) => void) {
  element.addEventListener('click', handler);
}

/** Closes a dialog when its dimmed backdrop (not the dialog itself) is clicked. */
function onBackdropClick(overlay: HTMLElement, close: () => void) {
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
}

function goTo(screenId: string) {
  openScreen(screenId);
  render();
}

function wireNavigation() {
  document.querySelectorAll<HTMLButtonElement>('.nav button').forEach((button) => {
    onClick(button, () => {
      const tab = button.dataset.tab ?? 'salesScreen';
      // Re-selecting a report tab leaves the saved-report preview and shows live data again.
      if ((tab === 'reportsScreen' && state.previewReport?.type === 'sales') || (tab === 'eventScreen' && state.previewReport?.type === 'event')) {
        state.previewReport = null;
      }
      goTo(tab);
    });
  });

  onClick(el.openProductsMenuBtn, () => goTo('productHistoryScreen'));
  onClick(el.openSalesReportMenuBtn, () => goTo('salesReportHistoryScreen'));
  onClick(el.openEventReportMenuBtn, () => goTo('eventReportHistoryScreen'));
  onClick(el.openAboutMenuBtn, () => showToast('About coming soon'));
  for (const back of [el.productHistoryBackBtn, el.salesReportHistoryBackBtn, el.eventReportHistoryBackBtn]) {
    onClick(back, () => goTo('settingsScreen'));
  }
  onClick(el.reportBackBtn, returnToHistory);
  onClick(el.eventBackBtn, returnToHistory);
  onClick(el.reportDeleteBtn, () => {
    if (state.previewReport?.type === 'sales') confirmDeleteSavedReport(state.previewReport.id, returnToHistory);
  });
  onClick(el.eventDeleteBtn, () => {
    if (state.previewReport?.type === 'event') confirmDeleteSavedReport(state.previewReport.id, returnToHistory);
  });
  onClick(el.compareSalesBackBtn, () => goTo('historyScreen'));
  onClick(el.compareEventBackBtn, () => goTo('historyScreen'));
}

function wireHeader() {
  onClick(el.reset, resetActiveScreen);
  onClick(el.optionsBtn, toggleOptionsMenu);
  onClick(el.openProductEdit, () => openProductEditor(-1));
  onClick(el.saveReportOption, () => openSaveModal('sales'));
  onClick(el.saveEventReportOption, () => openSaveModal('event'));
  document.addEventListener('click', (event) => {
    if (!el.optionsMenu.contains(event.target as Node)) closeOptionsMenu();
  });
}

function wireSettings() {
  el.currencySelect.value = loadSettings().currency;
  el.compactMoneyToggle.checked = loadSettings().compactMoney;
  el.currencySelect.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), currency: el.currencySelect.value as Currency });
    productsChanged(); // tile prices are formatted in the tiles
  });
  el.compactMoneyToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), compactMoney: el.compactMoneyToggle.checked });
    productsChanged();
  });
}

function wireDialogs() {
  // Save / rename
  onClick(el.saveModalSaveBtn, submitSaveModal);
  onClick(el.saveModalCancelBtn, closeSaveModal);
  onClick(el.saveModalCloseBtn, closeSaveModal);
  onBackdropClick(el.saveModalOverlay, closeSaveModal);
  el.saveModalInput.addEventListener('input', updateSaveModalButton);
  el.saveModalInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (!el.saveModalSaveBtn.disabled) submitSaveModal();
    }
  });

  // Expense
  el.eventCostName.addEventListener('input', updateExpenseButtonState);
  el.eventCostAmount.addEventListener('input', () => {
    el.eventCostAmount.value = formatInputNumber(el.eventCostAmount.value, loadSettings().currency);
    updateExpenseButtonState();
  });
  onClick(el.addCostBtn, submitExpense);
  onClick(el.expenseModalCloseBtn, closeExpenseModal);
  onClick(el.expenseModalCancelBtn, closeExpenseModal);
  onBackdropClick(el.expenseModalOverlay, closeExpenseModal);

  // Compare
  onClick(el.compareSalesBtn, () => openCompareModal('sales'));
  onClick(el.compareEventsBtn, () => openCompareModal('event'));
  onClick(el.compareModalConfirmBtn, confirmCompareSelection);
  onClick(el.compareModalCancelBtn, closeCompareModal);
  onClick(el.compareModalCloseBtn, closeCompareModal);
  onBackdropClick(el.compareModalOverlay, closeCompareModal);
  el.compareModalList.addEventListener('change', () => {
    el.compareModalConfirmBtn.disabled = checkedValues(el.compareModalList).length !== 2;
  });

  // Import
  onClick(el.importModalConfirmBtn, confirmImport);
  onClick(el.importModalCancelBtn, closeImportModal);
  onClick(el.importModalCloseBtn, closeImportModal);
  onBackdropClick(el.importModalOverlay, closeImportModal);
  el.importSavedReportsList.addEventListener('change', () => {
    el.importModalConfirmBtn.disabled = checkedValues(el.importSavedReportsList).length === 0;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (el.saveModalOverlay.classList.contains('open')) closeSaveModal();
    if (el.importModalOverlay.classList.contains('open')) closeImportModal();
    if (el.compareModalOverlay.classList.contains('open')) closeCompareModal();
    if (el.expenseModalOverlay.classList.contains('open')) closeExpenseModal();
  });
}

wireNavigation();
wireHeader();
wireSettings();
wireDialogs();
initProductEditor(productsChanged);
makeTiles();
openScreen(activeScreenId());
render();

if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor-native');
}
