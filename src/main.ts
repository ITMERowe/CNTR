import '@fontsource-variable/plus-jakarta-sans';
import './style.css';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { h, render as renderView } from 'preact';
import { generateUUID } from './data';
import { fmt, formatInputNumber, parseCurrencyInput } from './formatters';
import { version as packageVersion } from '../package.json';
import { buildBackup, parseBackup, salesCsv } from './backup';
import { DATA_KEYS, DROPPED_KEYS } from './migrate';
import { pickTextFile, saveAutoBackup, saveDayBackup, saveFile, saveSafetyCopy } from './files';
import { adjustCount, withLinkedCosts } from './events';
import { feedback } from './feedback';
import { totals } from './reports';
import {
  addExpense,
  expenseRecord,
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
import { initialLanguage, language, locale, setLanguage, t, tn, translateStatic, type Lang } from './i18n';
import { applyTheme } from './theme';
import type { AppSettings, Currency, PastEvent, Product } from './types';
import {
  activeScreenId,
  closeSellMenu,
  closeSheet,
  el,
  getProductListOrder,
  lockBodyScroll,
  openConfirmModal,
  openScreen,
  openSheet,
  showMessage,
  showToast,
  unlockBodyScroll,
  updateHeaderActions,
} from './ui/dom';
import { closeColorPicker } from './ui/colorPicker';
import { hydrateIcons } from './ui/icons';
import { editProductByName, initProductEditor, openProductEditor } from './ui/productEditor';
import { groupTiles } from './groups';
import { initTileDrag } from './ui/tileDrag';
import { CompareView } from './views/Compare';
import { EventScreen } from './views/EventScreen';
import { EventChecklist, EventList, ProductChecklist, ProductList, RecentSales } from './views/Lists';
import { SalesGrid, type TapPulse } from './views/SalesGrid';
import { SalesHero } from './views/SalesHero';

// ---- Sales counter ----

/** The last counter change, so only that counter animates. */
let pulse: TapPulse | null = null;
let pulseId = 0;
const isNative = Capacitor.isNativePlatform();

function addSale(product: Product, payment: string) {
  const newDay = recordSale(product, payment);
  pulse = { product: product.name, payment, direction: 'up', id: ++pulseId };
  feedback('sale');
  render();
  showToast(newDay ? t('toast.newDay', { day: liveDayCount() }) : `${product.name} · ${payment}`);
}

function undoSale(product: Product, payment: string) {
  if (!removeLastSale(product.name, payment)) {
    feedback('warn');
    showToast(t('toast.nothingToUndo'));
    return;
  }
  pulse = { product: product.name, payment, direction: 'down', id: ++pulseId };
  feedback('undo');
  render();
  showToast(t('toast.removedOne', { name: product.name }));
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

/** Best-sellers order, frozen while Sell is on screen so a tile never moves from under a thumb mid-rush. */
let sellOrder: string[] | null = null;
// By id, so renaming a product while the order is frozen keeps its tile in place.
const sortKey = (product: Product) => product.id ?? product.name;

/** The tiles in Sell's order: the hand-made order, or best sellers today first (ties keep the hand-made order). */
function sellProducts() {
  if (!loadSettings().autoSort) return state.products;
  if (!sellOrder || activeScreenId() !== 'salesScreen') {
    const sold = new Map<string, number>();
    for (const sale of todayLiveSales()) sold.set(sale.product, (sold.get(sale.product) ?? 0) + 1);
    // A group sorts by its variants' units together, and stays one tile.
    const units = (tile: Product[]) => tile.reduce((sum, product) => sum + (sold.get(product.name) ?? 0), 0);
    sellOrder = groupTiles(state.products).sort((a, b) => units(b) - units(a)).flat().map(sortKey);
  }
  const order = sellOrder;
  const rank = (product: Product) => {
    const i = order.indexOf(sortKey(product));
    return i < 0 ? order.length : i;
  };
  return [...state.products].sort((a, b) => rank(a) - rank(b));
}

/** Drag-and-drop on Sell: moves the tile holding the product (a group moves whole) to tile `to` in the hand-made order. */
function moveProduct(name: string, to: number) {
  const tiles = groupTiles(state.products);
  const from = tiles.findIndex((tile) => tile.some((product) => product.name === name));
  if (from < 0) return;
  tiles.splice(to, 0, ...tiles.splice(from, 1));
  state.products.splice(0, state.products.length, ...tiles.flat());
  saveProducts();
  render();
}

// ---- Rendering ----

/** The past event open in History, and its unsaved edit copy while editing. */
let viewingId: string | null = null;
let draft: PastEvent | null = null;

/** Folds or unfolds a Sell group; names of groups that no longer exist drop out of the list. */
function toggleGroup(group: string) {
  const key = group.toLowerCase();
  const live = new Set(state.products.map((product) => product.group?.toLowerCase()));
  const list = loadSettings().collapsedGroups.filter((name) => live.has(name));
  saveSettings({ ...loadSettings(), collapsedGroups: list.includes(key) ? list.filter((name) => name !== key) : [...list, key] });
  feedback('step');
  render();
}

function render() {
  const today = todayLiveSales();
  const { revenue, profit } = totals(withLinkedCosts(today, state.eventCosts, [...state.products, ...state.productHistory]));
  renderView(h(SalesHero, { revenue, profit, count: today.length, day: liveDayCount() }), el.stats);
  renderView(
    h(SalesGrid, {
      products: sellProducts(),
      counts: salesCounts(),
      pulse,
      onAdd: addSale,
      onUndo: undoSale,
      onEdit: (product: Product) => openProductEditor(state.products.indexOf(product)),
      collapsed: loadSettings().collapsedGroups,
      onToggleGroup: toggleGroup,
      onAddProduct: () => openProductEditor(-1),
    }),
    el.grid,
  );
  el.grid.classList.toggle('is-compact', loadSettings().compactTiles);

  renderView(
    h(EventScreen, {
      name: liveEventName(),
      sales: state.sales,
      dayBreaks: state.liveEvent.dayBreaks,
      expenses: state.eventCosts,
      products: state.products,
      // Hidden products too, so a linked expense still covers their sales.
      costProducts: [...state.products, ...state.productHistory],
      colorFor: productColor,
      productsPerDay: loadSettings().productsPerDay,
      live: true,
      onRename: () => openNameSheet('rename-live'),
      onAddExpense: () => openExpenseModal(null),
      onEditExpense: (id: string) => openExpenseModal(id),
      onDeleteExpense: deleteExpense,
      onEndDay: confirmEndDay,
      onEndEvent: () => openNameSheet('end-event'),
      onGoToSell: () => goTo('salesScreen'),
    }),
    el.eventReport,
  );
  renderView(h(RecentSales, { sales: state.sales.slice(-8).reverse(), colorFor: productColor }), el.historyRecentSales);
  renderView(h(EventList, { events: state.pastEvents, onOpen: openPastEvent }), el.pastEventList);
  el.compareEventsBtn.hidden = state.pastEvents.length < 2;
  renderPastEvent();
  renderProductList();
  updateHeaderActions();
}

/** The open past event: read-only, or its edit copy with count steppers while editing. */
function renderPastEvent() {
  const stored = viewingId ? findPastEvent(viewingId) : undefined;
  const event = draft ?? stored;
  el.pastEventEditBar.hidden = !draft;
  document.body.classList.toggle('is-editing-event', Boolean(draft));
  el.pastEventEditBtn.hidden = el.pastEventDeleteBtn.hidden = el.pastEventBackBtn.hidden = Boolean(draft);
  if (!event) {
    renderView(null, el.pastEventCard);
    return;
  }
  // The name shows (and wraps) just below; a long name would be cut off in the one-line title.
  el.pastEventTitle.textContent = draft ? t('edit_event') : t('past_event');
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
      dates: { startedAt: event.startedAt, endedAt: event.endedAt },
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
  el.productsSummary.textContent = state.productHistory.length ? t('products.summary', { count: state.products.length, hidden }) : t('products.none');
}

/** Deactivates an active product (keeping its history), or puts an inactive one back on the counter. */
function toggleProduct(name: string) {
  const index = state.products.findIndex((product) => product.name === name);
  if (index >= 0) {
    state.products.splice(index, 1);
    showToast(t('toast.offCounter', { name }));
  } else {
    const existing = state.productHistory.find((product) => product.name === name);
    if (!existing) return;
    state.products.push({ ...existing });
    showToast(t('toast.backOnCounter', { name }));
  }
  feedback('step');
  saveProducts();
  productsChanged();
}

// ---- Live event: End day / End event ----

function confirmEndDay() {
  const day = liveDayCount();
  openConfirmModal(
    t('endDay.message', { day }),
    t('endDay.button'),
    () =>
      void withAutoBackup(() => {
        if (endDay()) {
          feedback('success');
          showToast(t('toast.daySaved', { day }));
        }
        render();
      }, dayBackup),
    { title: t('endDay.title'), danger: false },
  );
}

function confirmEndEvent(name: string) {
  openConfirmModal(
    t('endEvent.message', { name }),
    t('endEvent.button'),
    () =>
      void withAutoBackup(() => {
        endEvent(name);
        render();
        feedback('success');
        showToast(t('toast.movedToHistory'));
      }),
    { title: t('endEvent.title'), danger: false },
  );
}

/** If the live event's last sale is over 3 days old, offers to end it before the next con's sales land in it. */
function checkStaleEvent() {
  const lastSale = state.sales.reduce<Date | null>((max, sale) => (!max || sale.timestamp > max ? sale.timestamp : max), null);
  if (!lastSale || Date.now() - lastSale.getTime() <= 3 * 24 * 60 * 60 * 1000) return;
  const name = liveEventName();
  openConfirmModal(
    t('staleEvent.message'),
    t('staleEvent.endIt'),
    () =>
      void withAutoBackup(() => {
        endEvent(name);
        render();
        feedback('success');
        showToast(t('toast.movedToHistory'));
      }),
    { title: t('staleEvent.title', { name }), danger: false, cancelLabel: t('staleEvent.sameEvent') },
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
  el.pastEventSaveBtn.textContent = on ? t('saving') : t('save_changes');
}

function cancelEditing() {
  if (saving) return;
  draft = null;
  render();
}

/** Runs `leave` after dropping the edit copy; if it has unsaved changes, asks first (Keep editing / Discard). */
function leaveEditing(leave: () => void) {
  const stored = viewingId ? findPastEvent(viewingId) : undefined;
  if (!draft || saving || JSON.stringify(draft) === JSON.stringify(stored)) {
    if (!saving) draft = null;
    leave();
    return;
  }
  openConfirmModal(
    t('discard.message'),
    t('discard.button'),
    () => {
      draft = null;
      leave();
    },
    { title: t('discard.title'), cancelLabel: t('discard.keep') },
  );
}

async function saveEditing() {
  const edited = draft;
  if (!edited || saving) return;
  setSaving(true);
  try {
    await withAutoBackup(() => {
      if (replacePastEvent(edited)) {
        feedback('success');
        showToast(t('toast.eventUpdated'));
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
  openConfirmModal(t('deleteEvent.message', { name: event.name }), t('delete'), () =>
    void withAutoBackup(() => {
      if (deletePastEvent(event.id)) {
        feedback('remove');
        showToast(t('toast.eventDeleted'));
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
  el.saveModalTitle.textContent = ending ? t('endEvent.button') : t('rename_event');
  const noExpenses = ending && state.eventCosts.length === 0 ? ` ${t('endEvent.noExpenses')}` : '';
  el.saveModalText.textContent = (ending ? t('endEvent.nameText') : t('name_this_event_so_you_can_find_it_later')) + noExpenses;
  el.saveModalSaveBtn.textContent = ending ? t('next') : t('save');
  el.saveModalInput.value = mode === 'rename-draft' ? (draft?.name ?? '') : liveEventName();
  updateSaveModalButton();
  openSheet(el.saveModalOverlay);
  el.saveModalInput.focus();
}

function closeSaveModal() {
  el.saveModalInput.value = '';
  closeSheet(el.saveModalOverlay);
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
    showToast(t('toast.eventRenamed'));
  }
  render();
}

// ---- Expense dialog: the live event, or the past event being edited ----

let editingExpenseId: string | null = null;

const editingPastEvent = () => draft !== null && activeScreenId() === 'pastEventScreen';
const activeExpenses = () => (editingPastEvent() ? draft!.expenses : state.eventCosts);
/** The products an expense can be linked to: the counter's live, the event's snapshot when editing History. */
const linkableProducts = () => (editingPastEvent() ? draft!.products : state.products);

function updateExpenseButtonState() {
  const amount = parseCurrencyInput(el.eventCostAmount.value, loadSettings().currency);
  el.addCostBtn.disabled = !el.eventCostName.value.trim() || !(amount > 0);
}

/** Opens the expense dialog to add (`id` null) or edit an expense. */
function openExpenseModal(id: string | null) {
  const cost = id ? activeExpenses().find((item) => item.id === id) : null;
  if (id && !cost) return;
  editingExpenseId = cost?.id ?? null;
  el.expenseModalTitle.textContent = cost ? t('expense.edit') : t('add_expense');
  el.addCostBtn.textContent = cost ? t('save_changes') : t('add_expense');
  el.eventCostName.value = cost?.name ?? '';
  el.eventCostAmount.value = cost ? formatInputNumber(String(cost.amount), loadSettings().currency) : '';
  const products = linkableProducts();
  el.expenseProductsField.hidden = !products.length;
  renderView(h(ProductChecklist, { products, checked: cost?.productIds ?? [] }), el.expenseProducts);
  // Most expenses aren't for products: the list stays folded unless this one already links some.
  el.expenseProductsBody.hidden = !(el.expenseProductsToggle.checked = !!cost?.productIds?.length);
  updateExpenseButtonState();
  openSheet(el.expenseModalOverlay);
  lockBodyScroll();
}

function closeExpenseModal() {
  editingExpenseId = null;
  closeSheet(el.expenseModalOverlay);
  unlockBodyScroll();
}

function submitExpense() {
  const name = el.eventCostName.value.trim();
  const amount = parseCurrencyInput(el.eventCostAmount.value, loadSettings().currency);
  if (!name || !(amount > 0)) return;
  // Ticked rows are indexes into the listed products; links to products no longer listed are kept.
  let products = linkableProducts();
  // A group's own box (value "on") is not a product: its variants' boxes carry the picks.
  // Switched off, the expense links nothing (earlier links included).
  const linking = el.expenseProductsToggle.checked;
  const ticked = new Set(linking ? checkedValues(el.expenseProducts).map(Number).filter(Number.isInteger) : []);
  if (editingPastEvent() && ticked.size) {
    // A snapshot from before ids gets them only when linked (saved with the edit): its sales' id, else a new one.
    products = products.map((product, index) => (product.id || !ticked.has(index) ? product : { ...product, id: draft!.sales.find((sale) => sale.product === product.name && sale.productId)?.productId ?? generateUUID() }));
    draft = { ...draft!, products };
  }
  const listed = new Set(products.map((product) => product.id));
  const previous = activeExpenses().find((cost) => cost.id === editingExpenseId)?.productIds ?? [];
  const productIds = !linking ? [] : [...previous.filter((id) => !listed.has(id)), ...products.filter((_, index) => ticked.has(index)).map((product) => product.id!)];
  if (editingPastEvent()) {
    const expenses = editingExpenseId
      ? draft!.expenses.map((cost) => (cost.id === editingExpenseId ? expenseRecord(cost.id, name, amount, productIds) : cost))
      : [...draft!.expenses, expenseRecord(generateUUID(), name, amount, productIds)];
    draft = { ...draft!, expenses };
  } else if (editingExpenseId) {
    updateExpense(editingExpenseId, name, amount, productIds);
  } else {
    addExpense(name, amount, productIds);
  }
  closeExpenseModal();
  render();
}

function deleteExpense(id: string) {
  const cost = activeExpenses().find((item) => item.id === id);
  if (!cost) return;
  openConfirmModal(t('expense.deleteText', { name: cost.name, amount: fmt(cost.amount) }), t('delete'), () => {
    if (editingPastEvent()) draft = { ...draft!, expenses: draft!.expenses.filter((item) => item.id !== id) };
    else removeExpense(id);
    feedback('remove');
    render();
  }, { title: t('expense.delete') });
}

// ---- Compare dialog ----

let compareSelection: string[] = [];

function checkedValues(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked')].map((input) => input.value);
}

function openCompareModal() {
  renderView(h(EventChecklist, { events: state.pastEvents, checked: compareSelection }), el.compareModalList);
  el.compareModalConfirmBtn.disabled = checkedValues(el.compareModalList).length !== 2;
  openSheet(el.compareModalOverlay);
}

function closeCompareModal() {
  closeSheet(el.compareModalOverlay);
}

function confirmCompareSelection() {
  const checked = checkedValues(el.compareModalList);
  if (checked.length !== 2) {
    feedback('warn');
    showToast(t('toast.pickTwo'));
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
    onClick(button, () => leaveEditing(() => goTo(button.dataset.tab ?? 'salesScreen')));
  });

  onClick(el.openAboutMenuBtn, () => goTo('aboutScreen'));
  onClick(el.aboutBackBtn, () => goTo('settingsScreen'));
  onClick(el.pastEventBackBtn, closePastEvent);
  onClick(el.pastEventEditBtn, startEditing);
  onClick(el.pastEventCancelBtn, cancelEditing);
  onClick(el.pastEventSaveBtn, saveEditing);
  onClick(el.pastEventDeleteBtn, confirmDeletePastEvent);
  onClick(el.compareEventBackBtn, () => goTo('historyScreen'));
}

function wireHeader() {
  onClick(el.openProductEdit, () => openProductEditor(-1));

  // Sell's ⋮ menu: Sort by best sellers, Compact tiles. Closes on a tap outside it, Escape or Android back.
  onClick(el.sellMenuBtn, () => {
    const open = el.sellMenu.hidden;
    el.sellMenu.hidden = !open;
    el.sellMenuBtn.setAttribute('aria-expanded', String(open));
  });
  // The tap that closes the menu does only that: it doesn't also sell on the tile under it.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Node;
      if (el.sellMenu.hidden || el.sellMenu.contains(target) || el.sellMenuBtn.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      closeSellMenu();
    },
    true,
  );
  document.addEventListener('keydown', (event) => event.key === 'Escape' && closeSellMenu());
  el.autoSortToggle.checked = loadSettings().autoSort;
  el.autoSortToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), autoSort: el.autoSortToggle.checked });
    sellOrder = null; // sort now, while the menu is open, not on the next visit
    render();
  });
  el.compactTilesToggle.checked = loadSettings().compactTiles;
  el.compactTilesToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), compactTiles: el.compactTilesToggle.checked });
    render();
  });

  initTileDrag(el.grid, () => !loadSettings().autoSort, moveProduct);
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
  el.newDayToggle.checked = loadSettings().newDayOnDateChange;
  el.newDayToggle.addEventListener('change', () => {
    saveSettings({ ...loadSettings(), newDayOnDateChange: el.newDayToggle.checked });
  });
  el.languageSelect.value = loadSettings().language;
  el.languageSelect.addEventListener('change', () => {
    const language = el.languageSelect.value as Lang;
    saveSettings({ ...loadSettings(), language });
    // A dialog's text is set when it opens; close it so none stays in the old language.
    document.querySelectorAll<HTMLElement>('.sheet-overlay.open [id$="CloseBtn"]').forEach((button) => button.click());
    applyLanguage(language);
    updateLastBackupText();
    updateThemeState();
    render();
  });
  el.themeToggle.checked = loadSettings().theme === 'dark';
  updateThemeState();
  el.themeToggle.addEventListener('change', () => {
    const theme: AppSettings['theme'] = el.themeToggle.checked ? 'dark' : 'light';
    saveSettings({ ...loadSettings(), theme });
    applyTheme(theme);
    updateThemeState();
    feedback('step');
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
  el.expenseProducts.addEventListener('change', () => feedback('step'));
  el.expenseProductsToggle.addEventListener('change', () => {
    el.expenseProductsBody.hidden = !el.expenseProductsToggle.checked;
    feedback('step');
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
    const count = checkedValues(el.compareModalList).length;
    el.compareModalConfirmBtn.disabled = count !== 2;
    if (count === 2) confirmCompareSelection(); // compares as soon as the 2nd event is ticked; the button still works as a fallback
  });

  // Enter (the keyboard's arrow key) moves to the next field on the same screen or sheet; on the last one it closes
  // the keyboard. The key shows "next" or "done" to match. Inputs with their own Enter (event name) prevent this.
  const nextField = (input: HTMLInputElement) => {
    const fields = [...(input.closest('.sheet, .screen') ?? document).querySelectorAll<HTMLInputElement>('input[type="text"]')].filter((field) => field.getClientRects().length);
    return fields[fields.indexOf(input) + 1];
  };
  const isTextInput = (target: EventTarget | null): target is HTMLInputElement => target instanceof HTMLInputElement && target.type === 'text';
  document.addEventListener('focusin', (event) => {
    if (isTextInput(event.target)) event.target.enterKeyHint = nextField(event.target) ? 'next' : 'done';
  });
  // The keyboard shrinks the page only after a field is focused, which can leave that field under it: bring it back into view.
  window.addEventListener('resize', () => {
    const field = document.activeElement;
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) field.scrollIntoView({ block: 'center' });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.defaultPrevented || !isTextInput(event.target)) return;
    event.preventDefault();
    const next = nextField(event.target);
    if (next) next.focus();
    else event.target.blur();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (el.saveModalOverlay.classList.contains('open')) closeSaveModal();
    if (el.compareModalOverlay.classList.contains('open')) closeCompareModal();
    if (el.expenseModalOverlay.classList.contains('open')) closeExpenseModal();
    if (el.confirmModalOverlay.classList.contains('open')) el.confirmModalCloseBtn.click();
  });
}

/** Android back (button or gesture): close the top layer, else cancel an edit, else the screen's own back arrow, else go to Sell, else leave the app. */
function goBack() {
  if (tourRunning() || saving) return; // the tour is on rails (Quit tour is the way out); a save is finishing
  const sheet = document.querySelector('.sheet-overlay.open');
  const backBtn = document.querySelector<HTMLElement>('.screen.active .back-btn');
  if (!el.sellMenu.hidden) closeSellMenu();
  else if (el.colorPickerMenu.classList.contains('open')) closeColorPicker();
  else if (sheet) sheet.querySelector<HTMLElement>('[id$="CloseBtn"]')?.click();
  else if (draft && activeScreenId() === 'pastEventScreen') leaveEditing(render);
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
  el.lastBackupText.textContent = last ? formatWhen(last) : t('never');
}

function updateThemeState() {
  el.themeState.textContent = t(el.themeToggle.checked ? 'theme.dark' : 'theme.light');
}

/** Saves a file and reports where it went. Returns true if it was saved somewhere. */
async function exportFile(name: string, text: string, mime: string, what: string) {
  try {
    const saved = await saveFile(name, text, mime);
    if (!saved.location && !saved.shared) {
      feedback('warn');
      showMessage(t('export.notSaved', { what }), t('export.notSavedText'));
      return false;
    }
    feedback('success');
    showMessage(t('export.saved', { what }), saved.location ? t('export.savedTo', { location: saved.location, name }) : t('export.shared', { name }));
    return true;
  } catch (error) {
    feedback('warn');
    showMessage(t('export.failed', { what }), t('export.failedText', { error: errorText(error) }));
    return false;
  }
}

/** Backups and restores would mix practice data with real files and data, so they wait until the tour ends. */
function blockedByTutorial() {
  if (!tutorialActive()) return false;
  feedback('warn');
  showToast(t('toast.notInTutorial'));
  return true;
}

async function exportBackup() {
  if (blockedByTutorial()) return;
  const now = new Date();
  const ok = await exportFile(`cntr-backup-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2), 'application/json', t('backup'));
  if (ok) {
    saveLastBackup(now.toISOString());
    updateLastBackupText();
  }
}

function exportCsv() {
  if (blockedByTutorial()) return;
  const now = new Date();
  void exportFile(`cntr-sales-${fileStamp(now)}.csv`, salesCsv(buildBackup(storedValues(), now)), 'text/csv', t('export.salesCsv'));
}

async function restoreBackup() {
  if (blockedByTutorial()) return;
  let text: string | null;
  try {
    text = await pickTextFile(el.restoreFileInput);
  } catch (error) {
    showMessage(t('restore.unreadable'), t('nothingChanged', { error: errorText(error) }));
    return;
  }
  if (text === null) return;

  const parsed = parseBackup(text);
  if (!parsed.ok) {
    showMessage(t('restore.cannot'), parsed.error);
    return;
  }
  const { exportedAt, sales, events, products } = parsed.summary;
  const from = exportedAt ? t('restore.from', { date: formatWhen(exportedAt) }) : '';
  // Backups from before events (1.0.21 and older) have none: say History will be emptied, not just "0 past events".
  const emptiesHistory = events === 0 && state.pastEvents.length > 0 ? ` ${t('restore.emptiesHistory')}` : '';
  openConfirmModal(
    t('restore.message', { from, sales: tn('count.currentSale', sales), events: tn('count.pastEvent', events), products: tn('count.product', products) }) + emptiesHistory,
    t('restore.button'),
    () => void applyRestore(parsed.values),
    { title: t('restore.title') },
  );
}

async function applyRestore(values: Map<string, string>) {
  const now = new Date();
  try {
    await saveSafetyCopy(`cntr-before-restore-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2));
  } catch (error) {
    showMessage(t('restore.cancelled'), t('restore.cancelledText', { error: errorText(error) }));
    return;
  }
  // Backups from before 0.1 have no language; keep the current one instead of falling back to English.
  const settings = JSON.parse(values.get('cntrSettings') ?? '{}') as Partial<AppSettings>;
  if (!settings.language) values.set('cntrSettings', JSON.stringify({ ...settings, language: language() }));
  lockForReload(true);
  try {
    await replaceAllData(values);
  } catch (error) {
    lockForReload(false);
    showMessage(t('restore.failed'), t('restore.failedText', { error: errorText(error) }));
    return;
  }
  location.reload(); // start fresh from the restored data
}

/** Blocks taps from a data swap until its reload: a sale written in between would land in the wrong data. */
function lockForReload(locked: boolean) {
  document.body.inert = locked;
  document.body.style.pointerEvents = locked ? 'none' : ''; // older WebViews without `inert`
}

/** Writes an automatic backup on the phone (Documents/CNTR/auto). Throws if it could not be saved. */
async function autoBackup() {
  const now = new Date();
  await saveAutoBackup(`cntr-auto-${fileStamp(now)}.json`, JSON.stringify(buildBackup(storedValues(), now), null, 2));
}

/** Writes (replacing) the End day safety backup. Throws if it could not be saved. */
async function dayBackup() {
  await saveDayBackup(JSON.stringify(buildBackup(storedValues(), new Date()), null, 2));
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

/** Runs a destructive `action` after a safety backup (`backup`, default the full timestamped one); if the backup fails, asks before going ahead. */
async function withAutoBackup(action: () => void, backup: () => Promise<void> = autoBackup) {
  if (tutorialActive()) {
    action(); // practice data: no backup files to pile up
    return;
  }
  try {
    await backup();
  } catch (error) {
    feedback('warn');
    openConfirmModal(t('autoBackup.failedText', { error: errorText(error) }), t('continue'), action, { title: t('autoBackup.failed') });
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

// The session marker says "starting" only for the launch right after Start tour; once the tour runs it says "running".
const TOUR_STARTING = 'starting';

const hasOwnData = () => state.productHistory.length > 0 || state.sales.length > 0 || state.pastEvents.length > 0;

async function startTutorial() {
  markTutorialOffered();
  lockForReload(true);
  try {
    await startTutorialData(practiceData(loadSettings().currency, new Date(), storedValues().get('cntrSettings')));
  } catch (error) {
    lockForReload(false);
    feedback('warn');
    showMessage(t('tutorial.notStarted'), t('nothingChanged', { error: errorText(error) }));
    return;
  }
  sessionStorage.setItem(TOUR_SESSION_KEY, TOUR_STARTING);
  location.reload();
}

/**
 * Puts the real data back and reloads. If that fails, the app is blocked with a Try again screen: running on
 * practice data would put new sales there, and they would be dropped when the real data comes back.
 */
async function endTutorial() {
  sessionStorage.removeItem(TOUR_SESSION_KEY);
  lockForReload(true);
  try {
    await endTutorialData();
  } catch (error) {
    lockForReload(false);
    feedback('warn');
    showStartupError(t('tutorial.endFailed', { error: errorText(error) }));
    return;
  }
  location.reload();
}

function confirmStartTutorial() {
  if (tutorialActive()) return;
  if (!hasOwnData()) {
    void startTutorial();
    return;
  }
  openConfirmModal(t('tutorial.replayText'), t('tutorial.start'), () => void startTutorial(), {
    title: t('tutorial.replayTitle'),
    danger: false,
  });
}

/** First launch on an empty app: offer the tour once. */
function offerTutorial() {
  markTutorialOffered();
  openConfirmModal(t('tutorial.offerText'), t('tutorial.start'), () => void startTutorial(), {
    title: t('tutorial.offerTitle'),
    danger: false,
    cancelLabel: t('skip'),
  });
}

/** Shown instead of the app when its data cannot be loaded; the data is left untouched. */
function showStartupError(message: string) {
  const box = Object.assign(document.createElement('div'), { className: 'startup-error', role: 'alert' });
  const text = Object.assign(document.createElement('p'), { textContent: message });
  const retry = Object.assign(document.createElement('button'), { className: 'btn btn-primary', type: 'button', textContent: t('tryAgain') });
  retry.addEventListener('click', () => location.reload());
  box.append(text, retry);
  document.body.replaceChildren(box);
}

async function start() {
  if (isNative) {
    document.body.classList.add('capacitor-native');
    App.addListener('backButton', goBack);
  }
  setLanguage(initialLanguage(navigator.language, true)); // the phone's language until the saved one can be read
  const startup = await initStorage(isNative);
  if (!startup.ok) {
    showStartupError(startup.error);
    return;
  }
  applyLanguage(loadSettings().language);
  // Practice data without a tour just starting (the app was closed, or reloaded, mid-tour): bring the real data back.
  // The tour does not resume: its practice data has moved on from step 1.
  if (tutorialActive() && sessionStorage.getItem(TOUR_SESSION_KEY) !== TOUR_STARTING) {
    await endTutorial(); // reloads, or blocks with Try again
    return;
  }
  if (initState() && !tutorialActive()) void backUpDroppedReports();
  applyTheme(loadSettings().theme);
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
    sessionStorage.setItem(TOUR_SESSION_KEY, 'running');
    runTour(TOUR_STEPS, () => void endTutorial());
  } else if (!tutorialOffered() && !hasOwnData()) {
    offerTutorial();
  } else {
    checkStaleEvent();
  }
}

void start();
