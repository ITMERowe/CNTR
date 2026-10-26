import '@fontsource-variable/plus-jakarta-sans';
import './style.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { h, render as renderView } from 'preact';
import { formatInputNumber, parseCurrencyInput } from './formatters';
import { version as packageVersion } from '../package.json';
import { buildBackup, parseBackup, salesCsv } from './backup';
import { pickTextFile, saveAutoBackup, saveFile, saveSafetyCopy } from './files';
import { plural, totals } from './reports';
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
  initState,
  saveProducts,
  state,
  updateExpense,
} from './state';
import { initStorage, loadLastBackup, loadSettings, onStorageProblem, replaceAllData, saveLastBackup, saveSettings, storedValues } from './storage';
import type { Currency, Product, ReportType } from './types';
import {
  activeScreenId,
  closeOptionsMenu,
  el,
  getProductListOrder,
  lockBodyScroll,
  openConfirmModal,
  openScreen,
  showMessage,
  showToast,
  unlockBodyScroll,
  updateHeaderActions,
} from './ui/dom';
import { closeColorPicker } from './ui/colorPicker';
import { hydrateIcons } from './ui/icons';
import { editProductByName, initProductEditor, openProductEditor } from './ui/productEditor';
import { CompareView } from './views/Compare';
import { EventReport } from './views/EventReport';
import { ProductList, RecentSales, ReportChecklist, SavedReportList } from './views/Lists';
import { SalesGrid, type TapPulse } from './views/SalesGrid';
import { SalesHero } from './views/SalesHero';
import { SalesReport } from './views/SalesReport';

// ---- Sales counter ----

/** The last counter change, so only that counter animates. */
let pulse: TapPulse | null = null;
let pulseId = 0;
const isNative = Capacitor.isNativePlatform();

/** A short tap on the phone's motor; harmless no-op in the browser. */
function haptic(style: ImpactStyle) {
  if (isNative) Haptics.impact({ style }).catch(() => {});
}

function addSale(product: Product, payment: string) {
  recordSale(product, payment);
  pulse = { product: product.name, payment, direction: 'up', id: ++pulseId };
  haptic(ImpactStyle.Light);
  render();
  showToast(`${product.name} · ${payment}`);
}

function undoSale(product: Product, payment: string) {
  if (!removeLastSale(product.name, payment)) {
    showToast('Nothing to undo');
    return;
  }
  pulse = { product: product.name, payment, direction: 'down', id: ++pulseId };
  haptic(ImpactStyle.Medium);
  render();
  showToast(`Removed one ${product.name}`);
}

function salesCounts() {
  const counts = new Map<string, number>();
  for (const sale of state.sales) {
    const key = `${sale.payment}\u0000${sale.product}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// ---- Rendering ----

function render() {
  const { revenue, profit } = totals(state.sales);
  renderView(h(SalesHero, { revenue, profit, count: state.sales.length }), el.stats);
  renderView(
    h(SalesGrid, {
      products: state.products,
      counts: salesCounts(),
      pulse,
      onAdd: addSale,
      onUndo: undoSale,
      onEdit: (product: Product) => openProductEditor(state.products.indexOf(product)),
    }),
    el.grid,
  );

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
  renderView(h(RecentSales, { sales: state.sales.slice(-8).reverse(), colorFor: productColor }), el.historyRecentSales);
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

/** Re-renders after products, prices or currency changed. */
function productsChanged() {
  render();
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
  openConfirmModal(`Delete report '${report.name}'? This cannot be undone.`, 'Delete', () =>
    void withAutoBackup(() => {
      if (deleteSavedReport(id)) showToast('Report deleted');
      onDeleted?.();
      render();
    }),
  );
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
    autoBackup().catch((error) => showMessage('Automatic backup failed', `The report is saved, but the automatic backup could not be written (${errorText(error)}). Export a backup from Settings.`));
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
    openConfirmModal('Clear the imported event sales and all event expenses?', 'Clear', () =>
      void withAutoBackup(() => {
        clearLiveEvent();
        render();
        showToast('Event report cleared');
      }),
    );
    return;
  }

  if (!state.sales.length) {
    showToast('Nothing to clear');
    return;
  }
  openConfirmModal(`Clear all ${state.sales.length} recorded sales? Save a report first if you need them.`, 'Clear', () =>
    void withAutoBackup(() => {
      clearSales();
      render();
      showToast('Sales cleared');
    }),
  );
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
  document.querySelectorAll<HTMLButtonElement>('.tabbar .tab').forEach((button) => {
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
  onClick(el.openAboutMenuBtn, () => goTo('aboutScreen'));
  for (const back of [el.productHistoryBackBtn, el.salesReportHistoryBackBtn, el.eventReportHistoryBackBtn, el.aboutBackBtn]) {
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

/** Android back (button or gesture): close the top layer, else the screen's own back arrow, else go to Sell, else leave the app. */
function goBack() {
  const sheet = document.querySelector('.sheet-overlay.open');
  const backBtn = document.querySelector<HTMLElement>('.screen.active .back-btn');
  if (el.colorPickerMenu.classList.contains('open')) closeColorPicker();
  else if (el.optionsMenu.classList.contains('open')) closeOptionsMenu();
  else if (sheet) sheet.querySelector<HTMLElement>('[id$="CloseBtn"]')?.click();
  else if (backBtn?.offsetParent) backBtn.click();
  else if (activeScreenId() !== 'salesScreen') goTo('salesScreen');
  else App.minimizeApp();
}

// ---- Backup ----

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const pad = (n: number) => String(n).padStart(2, '0');
const fileStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const formatWhen = (iso: string) => new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function updateLastBackupText() {
  const last = loadLastBackup();
  el.lastBackupText.textContent = last ? `Last backup ${formatWhen(last)}` : 'No backup yet';
}

/** Saves a file and reports where it went. Returns true if it was saved somewhere. */
async function exportFile(name: string, text: string, mime: string, what: string) {
  try {
    const saved = await saveFile(name, text, mime);
    if (!saved.location && !saved.shared) {
      showMessage(`${what} not saved`, 'This phone did not allow saving to Documents. Export again and pick an app or folder to save the file in.');
      return false;
    }
    showMessage(`${what} saved`, saved.location ? `Saved to ${saved.location} as ${name}. Keep a copy somewhere other than this phone too.` : `${name} was sent from the share sheet.`);
    return true;
  } catch (error) {
    showMessage(`${what} failed`, `The file could not be saved (${errorText(error)}). The phone may be out of storage. Your data was not changed.`);
    return false;
  }
}

async function exportBackup() {
  const now = new Date();
  const ok = await exportFile(`cntr-backup-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2), 'application/json', 'Backup');
  if (ok) {
    saveLastBackup(now.toISOString());
    updateLastBackupText();
  }
}

function exportCsv() {
  const now = new Date();
  void exportFile(`cntr-sales-${fileStamp(now)}.csv`, salesCsv(buildBackup(storedValues(), now)), 'text/csv', 'Sales CSV');
}

async function restoreBackup() {
  let text: string | null;
  try {
    text = await pickTextFile(el.restoreFileInput);
  } catch (error) {
    showMessage('Could not read the file', `${errorText(error)}. Nothing was changed.`);
    return;
  }
  if (text === null) return;

  const parsed = parseBackup(text);
  if (!parsed.ok) {
    showMessage('Cannot restore this file', parsed.error);
    return;
  }
  const { exportedAt, sales, savedReports, products } = parsed.summary;
  const from = exportedAt ? `from ${formatWhen(exportedAt)}` : '';
  openConfirmModal(
    `Replace everything on this phone with the backup ${from}? It has ${plural(sales, 'current sale')}, ${plural(savedReports, 'saved report')} and ${plural(products, 'product')}. A copy of your current data is saved first.`,
    'Restore',
    () => void applyRestore(parsed.values),
    { title: 'Restore backup?' },
  );
}

async function applyRestore(values: Map<string, string>) {
  const now = new Date();
  try {
    await saveSafetyCopy(`cntr-before-restore-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2));
  } catch (error) {
    showMessage('Restore cancelled', `A copy of your current data could not be saved first (${errorText(error)}), so nothing was changed. Free up space and try again.`);
    return;
  }
  try {
    await replaceAllData(values);
  } catch (error) {
    showMessage('Restore failed', `Nothing was changed; your current data is still here (${errorText(error)}).`);
    return;
  }
  location.reload(); // start fresh from the restored data
}

/** Writes an automatic backup on the phone (Documents/CNTR/auto). Throws if it could not be saved. */
async function autoBackup() {
  const now = new Date();
  await saveAutoBackup(`cntr-auto-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2));
}

/** Runs a destructive `action` after an automatic backup; if the backup fails, asks before going ahead. */
async function withAutoBackup(action: () => void) {
  try {
    await autoBackup();
  } catch (error) {
    openConfirmModal(`The automatic backup failed (${errorText(error)}), so nothing was changed yet. Continue anyway?`, 'Continue', action, { title: 'Backup failed' });
    return;
  }
  action();
}

function wireBackup() {
  updateLastBackupText();
  onClick(el.exportBackupBtn, () => void exportBackup());
  onClick(el.exportCsvBtn, exportCsv);
  onClick(el.restoreBackupBtn, () => void restoreBackup());
  onStorageProblem((message) => {
    el.storageAlert.hidden = !message;
    el.storageAlert.textContent = message ?? '';
  });
}

/** Shown instead of the app when its data cannot be loaded; the data is left untouched. */
function showStartupError(message: string) {
  const box = Object.assign(document.createElement('div'), { className: 'startup-error', role: 'alert' });
  const text = Object.assign(document.createElement('p'), { textContent: message });
  const retry = Object.assign(document.createElement('button'), { className: 'btn btn-primary', type: 'button', textContent: 'Try again' });
  retry.addEventListener('click', () => location.reload());
  box.append(text, retry);
  document.body.replaceChildren(box);
}

async function start() {
  if (isNative) {
    document.body.classList.add('capacitor-native');
    App.addListener('backButton', goBack);
  }
  const startup = await initStorage(isNative);
  if (!startup.ok) {
    showStartupError(startup.error);
    return;
  }
  initState();
  hydrateIcons();
  // The installed app's version on the phone (e.g. 1.0.42 from CI); package.json in the browser.
  el.aboutVersion.textContent = isNative ? (await App.getInfo().catch(() => ({ version: packageVersion }))).version : `${packageVersion} (browser)`;
  wireNavigation();
  wireHeader();
  wireSettings();
  wireDialogs();
  wireBackup();
  initProductEditor(productsChanged);
  openScreen(activeScreenId());
  render();
}

void start();
