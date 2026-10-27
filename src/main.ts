import '@fontsource-variable/plus-jakarta-sans';
import './style.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { h, render as renderView } from 'preact';
import { generateUUID } from './data';
import { formatInputNumber, parseCurrencyInput } from './formatters';
import { version as packageVersion } from '../package.json';
import { buildBackup, parseBackup, salesCsv } from './backup';
import { DATA_KEYS, DROPPED_KEYS } from './migrate';
import { pickTextFile, saveAutoBackup, saveFile, saveSafetyCopy } from './files';
import { adjustCount } from './events';
import { feedback } from './feedback';
import { plural, totals } from './reports';
import {
  addExpense,
  deletePastEvent,
  endDay,
  endEvent,
  findPastEvent,
  initState,
  liveDayCount,
  liveEventName,
  productColor,
  recordSale,
  removeExpense,
  removeLastSale,
  renameLiveEvent,
  replacePastEvent,
  saveProducts,
  state,
  todayLiveSales,
  updateExpense,
} from './state';
import {
  endTutorialData,
  initStorage,
  loadLastBackup,
  loadSettings,
  markTutorialOffered,
  onStorageProblem,
  replaceAllData,
  saveLastBackup,
  saveSettings,
  startTutorialData,
  storedValues,
  tutorialActive,
  tutorialOffered,
} from './storage';
import { practiceData, runTour, TOUR_SESSION_KEY, TOUR_STEPS, tourRunning } from './tutorial';
import { locale, setLanguage, translateStatic, type Lang } from './i18n';
import { applyTheme } from './theme';
import type { AppSettings, Currency, PastEvent, Product } from './types';
import {
  activeScreenId,
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
import { EventScreen } from './views/EventScreen';
import { EventChecklist, EventList, ProductList, RecentSales } from './views/Lists';
import { SalesGrid, type TapPulse } from './views/SalesGrid';
import { SalesHero } from './views/SalesHero';

// ---- Sales counter ----

/** The last counter change, so only that counter animates. */
let pulse: TapPulse | null = null;
let pulseId = 0;
const isNative = Capacitor.isNativePlatform();

function addSale(product: Product, payment: string) {
  recordSale(product, payment);
  pulse = { product: product.name, payment, direction: 'up', id: ++pulseId };
  feedback('sale');
  render();
  showToast(`${product.name} · ${payment}`);
}

function undoSale(product: Product, payment: string) {
  if (!removeLastSale(product.name, payment)) {
    feedback('warn');
    showToast('Nothing to undo');
    return;
  }
  pulse = { product: product.name, payment, direction: 'down', id: ++pulseId };
  feedback('undo');
  render();
  showToast(`Removed one ${product.name}`);
}

/** Today's counts per product and payment (the Sell tab starts from zero after End day). */
function salesCounts() {
  const counts = new Map<string, number>();
  for (const sale of todayLiveSales()) {
    const key = `${sale.payment}\u0000${sale.product}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

// ---- Rendering ----

/** The past event open in History, and its unsaved edit copy while editing. */
let viewingId: string | null = null;
let draft: PastEvent | null = null;

function render() {
  const today = todayLiveSales();
  const { revenue, profit } = totals(today);
  renderView(h(SalesHero, { revenue, profit, count: today.length, day: liveDayCount() }), el.stats);
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

  renderView(
    h(EventScreen, {
      name: liveEventName(),
      sales: state.sales,
      dayBreaks: state.liveEvent.dayBreaks,
      expenses: state.eventCosts,
      products: state.products,
      colorFor: productColor,
      productsPerDay: loadSettings().productsPerDay,
      live: true,
      onRename: () => openNameSheet('rename-live'),
      onAddExpense: () => openExpenseModal(null),
      onEditExpense: (id: string) => openExpenseModal(id),
      onDeleteExpense: deleteExpense,
      onEndDay: confirmEndDay,
      onEndEvent: () => openNameSheet('end-event'),
    }),
    el.eventReport,
  );
  renderView(h(RecentSales, { sales: state.sales.slice(-8).reverse(), colorFor: productColor }), el.historyRecentSales);
  renderView(h(EventList, { events: state.pastEvents, onOpen: openPastEvent }), el.pastEventList);
  el.compareEventsBtn.disabled = state.pastEvents.length < 2;
  renderPastEvent();
  renderProductList();
  updateHeaderActions();
}

/** The open past event: read-only, or its edit copy with count steppers while editing. */
function renderPastEvent() {
  const stored = viewingId ? findPastEvent(viewingId) : undefined;
  const event = draft ?? stored;
  el.pastEventEditBar.hidden = !draft;
  el.pastEventEditBtn.hidden = el.pastEventDeleteBtn.hidden = el.pastEventBackBtn.hidden = Boolean(draft);
  if (!event) {
    renderView(null, el.pastEventCard);
    return;
  }
  // The name shows (and wraps) just below; a long name would be cut off in the one-line title.
  el.pastEventTitle.textContent = draft ? 'Edit event' : 'Past event';
  // Coloured from the event's own snapshot: a product may since have been renamed or deleted.
  const snapshotColor = (name: string) => event.products.find((product) => product.name === name)?.color || productColor(name);
  renderView(
    h(EventScreen, {
      name: event.name,
      sales: event.sales,
      dayBreaks: event.dayBreaks,
      expenses: event.expenses,
      products: event.products,
      colorFor: snapshotColor,
      productsPerDay: loadSettings().productsPerDay,
      live: false,
      ...(draft
        ? {
            onRename: () => openNameSheet('rename-draft'),
            onAddExpense: () => openExpenseModal(null),
            onEditExpense: (id: string) => openExpenseModal(id),
            onDeleteExpense: deleteExpense,
            edit: { onAdjust: adjustDraft },
          }
        : {}),
    }),
    el.pastEventCard,
  );
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
      onAdd: () => openProductEditor(-1),
    }),
    el.productHistoryList,
  );
  const hidden = state.productHistory.length - state.products.length;
  el.productsSummary.textContent = state.productHistory.length ? `${state.products.length} on the counter · ${hidden} hidden` : 'None yet: add your first product';
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
  feedback('step');
  saveProducts();
  productsChanged();
}

// ---- Live event: End day / End event ----

function confirmEndDay() {
  const day = liveDayCount();
  openConfirmModal(
    `End today? Today's sales are kept as Day ${day} and the Sell counters start again from zero.`,
    'End day',
    () => {
      if (endDay()) {
        feedback('success');
        showToast(`Day ${day} saved`);
      }
      render();
    },
    { title: 'End day?', danger: false },
  );
}

function confirmEndEvent(name: string) {
  openConfirmModal(
    `Move '${name}' to History and start a new event?`,
    'End event',
    () =>
      void withAutoBackup(() => {
        endEvent(name);
        render();
        feedback('success');
        showToast('Moved to History');
      }),
    { title: 'End event?', danger: false },
  );
}

// ---- Past events ----

function openPastEvent(id: string) {
  if (!findPastEvent(id)) return;
  viewingId = id;
  draft = null;
  goTo('pastEventScreen');
}

function closePastEvent() {
  viewingId = null;
  draft = null;
  goTo('historyScreen');
}

/** A deep copy to edit; Save replaces the stored event, Cancel drops it. */
function startEditing() {
  const event = viewingId ? findPastEvent(viewingId) : undefined;
  if (!event) return;
  draft = {
    ...event,
    dayBreaks: [...event.dayBreaks],
    products: event.products.map((product) => ({ ...product })),
    sales: event.sales.map((sale) => ({ ...sale, timestamp: new Date(sale.timestamp) })),
    expenses: event.expenses.map((cost) => ({ ...cost })),
  };
  render();
}

/** True while a past-event save waits for its automatic backup; Save and Cancel are locked meanwhile. */
let saving = false;

function setSaving(on: boolean) {
  saving = on;
  el.pastEventSaveBtn.disabled = el.pastEventCancelBtn.disabled = on;
  el.pastEventSaveBtn.textContent = on ? 'Saving…' : 'Save changes';
}

function cancelEditing() {
  if (saving) return;
  draft = null;
  render();
}

async function saveEditing() {
  const edited = draft;
  if (!edited || saving) return;
  setSaving(true);
  try {
    await withAutoBackup(() => {
      if (replacePastEvent(edited)) {
        feedback('success');
        showToast('Event updated');
      }
      draft = null;
      render();
    });
  } finally {
    setSaving(false);
  }
}

function adjustDraft(day: number, product: string, payment: string, delta: 1 | -1) {
  if (!draft) return;
  draft = adjustCount(draft, day, product, payment, delta);
  feedback('step');
  render();
}

function confirmDeletePastEvent() {
  const event = viewingId ? findPastEvent(viewingId) : undefined;
  if (!event) return;
  openConfirmModal(`Delete event '${event.name}'? This cannot be undone.`, 'Delete', () =>
    void withAutoBackup(() => {
      if (deletePastEvent(event.id)) {
        feedback('remove');
        showToast('Event deleted');
      }
      closePastEvent();
    }),
  );
}

// ---- Name sheet: rename the live event, name it when ending, rename while editing ----

type NameSheetMode = 'rename-live' | 'end-event' | 'rename-draft';
let nameSheetMode: NameSheetMode = 'rename-live';

function updateSaveModalButton() {
  el.saveModalSaveBtn.disabled = el.saveModalInput.value.trim().length === 0;
}

function openNameSheet(mode: NameSheetMode) {
  nameSheetMode = mode;
  const ending = mode === 'end-event';
  el.saveModalTitle.textContent = ending ? 'End event' : 'Rename event';
  el.saveModalText.textContent = ending ? 'Give the event its final name. It moves to History, where you can still view and edit it.' : 'Name this event so you can find it later.';
  el.saveModalSaveBtn.textContent = ending ? 'Next' : 'Save';
  el.saveModalInput.value = mode === 'rename-draft' ? (draft?.name ?? '') : liveEventName();
  updateSaveModalButton();
  el.saveModalOverlay.classList.add('open');
  el.saveModalInput.focus();
}

function closeSaveModal() {
  el.saveModalInput.value = '';
  el.saveModalOverlay.classList.remove('open');
}

function submitSaveModal() {
  const name = el.saveModalInput.value.trim();
  if (!name) return;
  closeSaveModal();
  if (nameSheetMode === 'end-event') {
    confirmEndEvent(name);
    return;
  }
  if (nameSheetMode === 'rename-draft') {
    if (draft) draft = { ...draft, name };
  } else if (renameLiveEvent(name)) {
    showToast('Event renamed');
  }
  render();
}

// ---- Expense dialog: the live event, or the past event being edited ----

let editingExpenseId: string | null = null;

const editingPastEvent = () => draft !== null && activeScreenId() === 'pastEventScreen';
const activeExpenses = () => (editingPastEvent() ? draft!.expenses : state.eventCosts);

function updateExpenseButtonState() {
  const amount = parseCurrencyInput(el.eventCostAmount.value, loadSettings().currency);
  el.addCostBtn.disabled = !el.eventCostName.value.trim() || !(amount > 0);
}

/** Opens the expense dialog to add (`id` null) or edit an expense. */
function openExpenseModal(id: string | null) {
  const cost = id ? activeExpenses().find((item) => item.id === id) : null;
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
  if (editingPastEvent()) {
    const expenses = editingExpenseId
      ? draft!.expenses.map((cost) => (cost.id === editingExpenseId ? { ...cost, name, amount } : cost))
      : [...draft!.expenses, { id: generateUUID(), name, amount }];
    draft = { ...draft!, expenses };
  } else if (editingExpenseId) {
    updateExpense(editingExpenseId, name, amount);
  } else {
    addExpense(name, amount);
  }
  closeExpenseModal();
  render();
}

function deleteExpense(id: string) {
  if (editingPastEvent()) draft = { ...draft!, expenses: draft!.expenses.filter((cost) => cost.id !== id) };
  else removeExpense(id);
  feedback('remove');
  render();
}

// ---- Compare dialog ----

let compareSelection: string[] = [];

function checkedValues(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((input) => input.value);
}

function openCompareModal() {
  renderView(h(EventChecklist, { events: state.pastEvents, checked: compareSelection }), el.compareModalList);
  el.compareModalConfirmBtn.disabled = checkedValues(el.compareModalList).length !== 2;
  el.compareModalOverlay.classList.add('open');
}

function closeCompareModal() {
  el.compareModalOverlay.classList.remove('open');
}

function confirmCompareSelection() {
  const checked = checkedValues(el.compareModalList);
  if (checked.length !== 2) {
    feedback('warn');
    showToast('Select exactly 2 events');
    return;
  }
  compareSelection = checked;
  closeCompareModal();
  const events = state.pastEvents.filter((event) => checked.includes(event.id));
  renderView(h(CompareView, { events }), el.compareEventCard);
  goTo('compareEventScreen');
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
      draft = null; // leaving an unsaved edit drops it
      goTo(button.dataset.tab ?? 'salesScreen');
    });
  });

  onClick(el.openProductsMenuBtn, () => goTo('productHistoryScreen'));
  onClick(el.openAboutMenuBtn, () => goTo('aboutScreen'));
  for (const back of [el.productHistoryBackBtn, el.aboutBackBtn]) {
    onClick(back, () => goTo('settingsScreen'));
  }
  onClick(el.pastEventBackBtn, closePastEvent);
  onClick(el.pastEventEditBtn, startEditing);
  onClick(el.pastEventCancelBtn, cancelEditing);
  onClick(el.pastEventSaveBtn, saveEditing);
  onClick(el.pastEventDeleteBtn, confirmDeletePastEvent);
  onClick(el.compareEventBackBtn, () => goTo('historyScreen'));
}

function wireHeader() {
  onClick(el.openProductEdit, () => openProductEditor(-1));
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
  el.productsPerDayToggle.checked = loadSettings().productsPerDay;
  el.productsPerDayToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), productsPerDay: el.productsPerDayToggle.checked });
    render();
  });
  el.languageSelect.value = loadSettings().language;
  el.languageSelect.addEventListener('change', () => {
    const language = el.languageSelect.value as Lang;
    saveSettings({ ...loadSettings(), language });
    applyLanguage(language);
    updateLastBackupText();
    render();
  });
  el.themeSelect.value = loadSettings().theme;
  el.themeSelect.addEventListener('change', () => {
    const theme = el.themeSelect.value as AppSettings['theme'];
    saveSettings({ ...loadSettings(), theme });
    applyTheme(theme);
  });
  el.soundToggle.checked = loadSettings().sound;
  el.soundToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), sound: el.soundToggle.checked });
    feedback('sale'); // a sample of what it sounds like (silent when just turned off)
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
  onClick(el.compareEventsBtn, openCompareModal);
  onClick(el.compareModalConfirmBtn, confirmCompareSelection);
  onClick(el.compareModalCancelBtn, closeCompareModal);
  onClick(el.compareModalCloseBtn, closeCompareModal);
  onBackdropClick(el.compareModalOverlay, closeCompareModal);
  el.compareModalList.addEventListener('change', () => {
    el.compareModalConfirmBtn.disabled = checkedValues(el.compareModalList).length !== 2;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (el.saveModalOverlay.classList.contains('open')) closeSaveModal();
    if (el.compareModalOverlay.classList.contains('open')) closeCompareModal();
    if (el.expenseModalOverlay.classList.contains('open')) closeExpenseModal();
  });
}

/** Android back (button or gesture): close the top layer, else cancel an edit, else the screen's own back arrow, else go to Sell, else leave the app. */
function goBack() {
  if (tourRunning() || saving) return; // the tour is on rails (Quit tour is the way out); a save is finishing
  const sheet = document.querySelector('.sheet-overlay.open');
  const backBtn = document.querySelector<HTMLElement>('.screen.active .back-btn');
  if (el.colorPickerMenu.classList.contains('open')) closeColorPicker();
  else if (sheet) sheet.querySelector<HTMLElement>('[id$="CloseBtn"]')?.click();
  else if (draft && activeScreenId() === 'pastEventScreen') cancelEditing();
  else if (backBtn?.offsetParent) backBtn.click();
  else if (activeScreenId() !== 'salesScreen') goTo('salesScreen');
  else App.minimizeApp();
}

// ---- Backup ----

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));
const pad = (n: number) => String(n).padStart(2, '0');
const fileStamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
const formatWhen = (iso: string) => new Date(iso).toLocaleString(locale(), { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function updateLastBackupText() {
  const last = loadLastBackup();
  el.lastBackupText.textContent = last ? formatWhen(last) : 'Never';
}

/** Saves a file and reports where it went. Returns true if it was saved somewhere. */
async function exportFile(name: string, text: string, mime: string, what: string) {
  try {
    const saved = await saveFile(name, text, mime);
    if (!saved.location && !saved.shared) {
      feedback('warn');
      showMessage(`${what} not saved`, 'This phone did not allow saving to Documents. Export again and pick an app or folder to save the file in.');
      return false;
    }
    feedback('success');
    showMessage(`${what} saved`, saved.location ? `Saved to ${saved.location} as ${name}. Keep a copy somewhere other than this phone too.` : `${name} was sent from the share sheet.`);
    return true;
  } catch (error) {
    feedback('warn');
    showMessage(`${what} failed`, `The file could not be saved (${errorText(error)}). The phone may be out of storage. Your data was not changed.`);
    return false;
  }
}

/** Backups and restores would mix practice data with real files and data, so they wait until the tour ends. */
function blockedByTutorial() {
  if (!tutorialActive()) return false;
  feedback('warn');
  showToast('Not available during the tutorial');
  return true;
}

async function exportBackup() {
  if (blockedByTutorial()) return;
  const now = new Date();
  const ok = await exportFile(`cntr-backup-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2), 'application/json', 'Backup');
  if (ok) {
    saveLastBackup(now.toISOString());
    updateLastBackupText();
  }
}

function exportCsv() {
  if (blockedByTutorial()) return;
  const now = new Date();
  void exportFile(`cntr-sales-${fileStamp(now)}.csv`, salesCsv(buildBackup(storedValues(), now)), 'text/csv', 'Sales CSV');
}

async function restoreBackup() {
  if (blockedByTutorial()) return;
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
  const { exportedAt, sales, events, products } = parsed.summary;
  const from = exportedAt ? `from ${formatWhen(exportedAt)}` : '';
  openConfirmModal(
    `Replace everything on this phone with the backup ${from}? It has ${plural(sales, 'current sale')}, ${plural(events, 'past event')} and ${plural(products, 'product')}. A copy of your current data is saved first.`,
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

/** Once, when events replace saved reports: keep the old reports in an automatic backup, since exports no longer include them. */
async function backUpDroppedReports() {
  if (!DROPPED_KEYS.some((key) => storedValues(DROPPED_KEYS).has(key))) return;
  const now = new Date();
  const keys = [...DATA_KEYS, ...DROPPED_KEYS];
  try {
    await saveAutoBackup(`cntr-auto-${fileStamp(now)}-saved-reports.json`, JSON.stringify(buildBackup(storedValues(keys), now, keys), null, 2));
  } catch (error) {
    console.error('Could not back up the old saved reports', error); // they also stay in the database, untouched
  }
}

/** Runs a destructive `action` after an automatic backup; if the backup fails, asks before going ahead. */
async function withAutoBackup(action: () => void) {
  if (tutorialActive()) {
    action(); // practice data: no backup files to pile up
    return;
  }
  try {
    await autoBackup();
  } catch (error) {
    feedback('warn');
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

/** Switches every text on screen to `lang`; dynamic views follow on the next render(). */
function applyLanguage(lang: Lang) {
  setLanguage(lang);
  document.documentElement.lang = lang;
  translateStatic(document);
}

// ---- Tutorial ----

const hasOwnData = () => state.productHistory.length > 0 || state.sales.length > 0 || state.pastEvents.length > 0;

async function startTutorial() {
  markTutorialOffered();
  try {
    await startTutorialData(practiceData(loadSettings().currency, new Date(), storedValues().get('cntrSettings')));
  } catch (error) {
    feedback('warn');
    showMessage('Tutorial not started', `${errorText(error)}. Nothing was changed.`);
    return;
  }
  sessionStorage.setItem(TOUR_SESSION_KEY, '1');
  location.reload();
}

/** Puts the real data back and reloads. Returns false (and says so) if that failed; the real data stays safe and is tried again next launch. */
async function endTutorial() {
  sessionStorage.removeItem(TOUR_SESSION_KEY);
  try {
    await endTutorialData();
  } catch (error) {
    feedback('warn');
    showMessage('Practice data not removed yet', `${errorText(error)}. Your own data is safe and comes back the next time CNTR opens.`);
    return false;
  }
  location.reload();
  return true;
}

function confirmStartTutorial() {
  if (tutorialActive()) return;
  if (!hasOwnData()) {
    void startTutorial();
    return;
  }
  openConfirmModal('Your sales, products and events are put aside during the tour and come back exactly as they are when it ends.', 'Start tour', () => void startTutorial(), {
    title: 'Show the tutorial?',
    danger: false,
  });
}

/** First launch on an empty app: offer the tour once. */
function offerTutorial() {
  markTutorialOffered();
  openConfirmModal('Take a 3-minute hands-on tour with practice products. Everything you do in it is wiped afterwards.', 'Start tour', () => void startTutorial(), {
    title: 'New to CNTR?',
    danger: false,
    cancelLabel: 'Skip',
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
  // Practice data without a tour running (the app was closed mid-tour): bring the real data back first.
  if (tutorialActive() && !sessionStorage.getItem(TOUR_SESSION_KEY) && (await endTutorial())) return;
  if (initState() && !tutorialActive()) void backUpDroppedReports();
  applyTheme(loadSettings().theme);
  applyLanguage(loadSettings().language);
  hydrateIcons();
  // The installed app's version on the phone (e.g. 0.1.42 from CI); package.json in the browser.
  el.aboutVersion.textContent = isNative ? (await App.getInfo().catch(() => ({ version: packageVersion }))).version : `${packageVersion} (browser)`;
  wireNavigation();
  wireHeader();
  wireSettings();
  wireDialogs();
  wireBackup();
  initProductEditor(productsChanged);
  onClick(el.startTutorialBtn, confirmStartTutorial);
  openScreen(activeScreenId());
  render();
  if (tutorialActive()) {
    if (sessionStorage.getItem(TOUR_SESSION_KEY)) runTour(TOUR_STEPS, () => void endTutorial());
  } else if (!tutorialOffered() && !hasOwnData()) {
    offerTutorial();
  }
}

void start();
