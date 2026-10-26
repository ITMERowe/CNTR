// Static elements from index.html and the shared UI chrome: toast, confirm dialog, scroll lock, navigation.
import { state } from '../state';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const el = {
  grid: byId<HTMLDivElement>('grid'),
  stats: byId<HTMLDivElement>('stats'),
  headline: byId<HTMLDivElement>('headline'),
  toast: byId<HTMLDivElement>('toast'),
  reset: byId<HTMLButtonElement>('resetBtn'),
  optionsBtn: byId<HTMLButtonElement>('optionsBtn'),
  optionsMenu: byId<HTMLDivElement>('optionsMenu'),
  saveReportOption: byId<HTMLButtonElement>('saveReportOption'),
  saveEventReportOption: byId<HTMLButtonElement>('saveEventReportOption'),
  openProductEdit: byId<HTMLButtonElement>('openProductEdit'),
  // Product editor
  productEditTitle: byId<HTMLHeadingElement>('productEditTitle'),
  closeEditBtn: byId<HTMLButtonElement>('closeEditBtn'),
  removeProductBtn: byId<HTMLButtonElement>('removeProductBtn'),
  editName: byId<HTMLInputElement>('editName'),
  editPrice: byId<HTMLInputElement>('editPrice'),
  editCost: byId<HTMLInputElement>('editCost'),
  saveProductBtn: byId<HTMLButtonElement>('saveProductBtn'),
  // Colour picker
  colorField: byId<HTMLDivElement>('colorField'),
  editColorHex: byId<HTMLSpanElement>('editColorHex'),
  editColorHexInput: byId<HTMLInputElement>('editColorHexInput'),
  colorPickerMenu: byId<HTMLDivElement>('colorPickerMenu'),
  pickerSurface: byId<HTMLDivElement>('pickerSurface'),
  pickerSurfaceThumb: byId<HTMLDivElement>('pickerSurfaceThumb'),
  hueSlider: byId<HTMLDivElement>('hueSlider'),
  hueThumb: byId<HTMLDivElement>('hueThumb'),
  hueValue: byId<HTMLSpanElement>('hueValue'),
  pickerHexCard: byId<HTMLDivElement>('pickerHexCard'),
  // Report screens
  report: byId<HTMLDivElement>('reportCard'),
  eventReport: byId<HTMLDivElement>('eventCard'),
  reportPageTitle: byId<HTMLHeadingElement>('reportPageTitle'),
  eventPageTitle: byId<HTMLHeadingElement>('eventPageTitle'),
  reportBackBtn: byId<HTMLButtonElement>('reportBackBtn'),
  eventBackBtn: byId<HTMLButtonElement>('eventBackBtn'),
  reportDeleteBtn: byId<HTMLButtonElement>('reportDeleteBtn'),
  eventDeleteBtn: byId<HTMLButtonElement>('eventDeleteBtn'),
  historyRecentSales: byId<HTMLDivElement>('historyRecentPurchase'),
  compareSalesBtn: byId<HTMLButtonElement>('compareSalesBtn'),
  compareEventsBtn: byId<HTMLButtonElement>('compareEventsBtn'),
  compareSalesCard: byId<HTMLDivElement>('compareSalesCard'),
  compareEventCard: byId<HTMLDivElement>('compareEventCard'),
  compareSalesBackBtn: byId<HTMLButtonElement>('compareSalesBackBtn'),
  compareEventBackBtn: byId<HTMLButtonElement>('compareEventBackBtn'),
  // Settings and its sub-screens
  currencySelect: byId<HTMLSelectElement>('currencySelect'),
  compactMoneyToggle: byId<HTMLInputElement>('compactMoneyToggle'),
  openProductsMenuBtn: byId<HTMLButtonElement>('openProductsMenuBtn'),
  openSalesReportMenuBtn: byId<HTMLButtonElement>('openSalesReportMenuBtn'),
  openEventReportMenuBtn: byId<HTMLButtonElement>('openEventReportMenuBtn'),
  openAboutMenuBtn: byId<HTMLButtonElement>('openAboutMenuBtn'),
  salesReportHistoryBackBtn: byId<HTMLButtonElement>('salesReportHistoryBackBtn'),
  eventReportHistoryBackBtn: byId<HTMLButtonElement>('eventReportHistoryBackBtn'),
  productHistoryBackBtn: byId<HTMLButtonElement>('productHistoryBackBtn'),
  productHistoryList: byId<HTMLDivElement>('productHistoryList'),
  salesReportHistoryList: byId<HTMLDivElement>('salesReportHistoryList'),
  eventReportHistoryList: byId<HTMLDivElement>('eventReportHistoryList'),
  // Save / rename dialog
  saveModalOverlay: byId<HTMLDivElement>('saveModalOverlay'),
  saveModalTitle: byId<HTMLHeadingElement>('saveModalTitle'),
  saveModalInput: byId<HTMLInputElement>('saveModalInput'),
  saveModalSaveBtn: byId<HTMLButtonElement>('saveModalSaveBtn'),
  saveModalCancelBtn: byId<HTMLButtonElement>('saveModalCancelBtn'),
  saveModalCloseBtn: byId<HTMLButtonElement>('saveModalCloseBtn'),
  // Compare dialog
  compareModalOverlay: byId<HTMLDivElement>('compareModalOverlay'),
  compareModalTitle: byId<HTMLHeadingElement>('compareModalTitle'),
  compareModalList: byId<HTMLDivElement>('compareModalList'),
  compareModalConfirmBtn: byId<HTMLButtonElement>('compareModalConfirmBtn'),
  compareModalCancelBtn: byId<HTMLButtonElement>('compareModalCancelBtn'),
  compareModalCloseBtn: byId<HTMLButtonElement>('compareModalCloseBtn'),
  // Import dialog
  importModalOverlay: byId<HTMLDivElement>('importModalOverlay'),
  importSavedReportsList: byId<HTMLDivElement>('importSavedReportsList'),
  importModalCancelBtn: byId<HTMLButtonElement>('importModalCancelBtn'),
  importModalConfirmBtn: byId<HTMLButtonElement>('importModalConfirmBtn'),
  importModalCloseBtn: byId<HTMLButtonElement>('importModalCloseBtn'),
  // Expense dialog
  expenseModalOverlay: byId<HTMLDivElement>('expenseModalOverlay'),
  expenseModalTitle: byId<HTMLHeadingElement>('expenseModalTitle'),
  expenseModalCloseBtn: byId<HTMLButtonElement>('expenseModalCloseBtn'),
  expenseModalCancelBtn: byId<HTMLButtonElement>('expenseModalCancelBtn'),
  eventCostName: byId<HTMLInputElement>('eventCostName'),
  eventCostAmount: byId<HTMLInputElement>('eventCostAmount'),
  addCostBtn: byId<HTMLButtonElement>('addCostBtn'),
  // Confirm dialog
  confirmModalOverlay: byId<HTMLDivElement>('confirmModalOverlay'),
  confirmModalMessage: byId<HTMLParagraphElement>('confirmModalMessage'),
  confirmModalCloseBtn: byId<HTMLButtonElement>('confirmModalCloseBtn'),
  confirmModalCancelBtn: byId<HTMLButtonElement>('confirmModalCancelBtn'),
  confirmModalConfirmBtn: byId<HTMLButtonElement>('confirmModalConfirmBtn'),
};

let toastTimer: number | undefined;

export function showToast(message: string) {
  el.toast.textContent = message;
  el.toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.toast.classList.remove('show'), 900);
}

/** Asks before a destructive action; `onConfirm` runs only if the user confirms. */
export function openConfirmModal(message: string, confirmLabel: string, onConfirm: () => void) {
  const { confirmModalOverlay: overlay, confirmModalConfirmBtn: confirmBtn } = el;
  el.confirmModalMessage.textContent = message;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.classList.add('danger');
  overlay.classList.add('open');

  const close = () => {
    overlay.classList.remove('open');
    overlay.onclick = confirmBtn.onclick = el.confirmModalCancelBtn.onclick = el.confirmModalCloseBtn.onclick = null;
  };
  confirmBtn.onclick = () => {
    close();
    onConfirm();
  };
  el.confirmModalCancelBtn.onclick = close;
  el.confirmModalCloseBtn.onclick = close;
  overlay.onclick = (event) => {
    if (event.target === overlay) close();
  };
}

let savedBodyScroll = 0;
let bodyScrollLocked = false;

export function lockBodyScroll() {
  if (bodyScrollLocked) return;
  bodyScrollLocked = true;
  savedBodyScroll = window.scrollY || document.documentElement.scrollTop || 0;
  Object.assign(document.body.style, { position: 'fixed', top: `-${savedBodyScroll}px`, left: '0', right: '0', width: '100%' });
}

export function unlockBodyScroll() {
  if (!bodyScrollLocked) return;
  bodyScrollLocked = false;
  Object.assign(document.body.style, { position: '', top: '', left: '', right: '', width: '' });
  window.scrollTo(0, savedBodyScroll);
  savedBodyScroll = 0;
}

export function closeOptionsMenu() {
  el.optionsMenu.classList.remove('open');
}

export function activeScreenId() {
  return document.querySelector('.screen.active')?.id ?? 'salesScreen';
}

/** Shows the header buttons that make sense for `screenId`. */
export function updateHeaderActions(screenId = activeScreenId()) {
  const preview = state.previewReport;
  const isPreview = Boolean(preview && ((screenId === 'reportsScreen' && preview.type === 'sales') || (screenId === 'eventScreen' && preview.type === 'event')));
  const showOptions = screenId === 'reportsScreen' || screenId === 'eventScreen';
  const showAddProduct = screenId === 'salesScreen' || screenId === 'productHistoryScreen';
  const showReset = !isPreview && (screenId === 'salesScreen' || screenId === 'reportsScreen' || screenId === 'eventScreen');

  el.optionsBtn.style.display = showOptions ? 'inline-grid' : 'none';
  el.openProductEdit.style.display = showAddProduct ? 'inline-grid' : 'none';
  el.reset.style.display = showReset ? 'inline-grid' : 'none';
  el.reset.title = screenId === 'eventScreen' ? 'Clear event' : 'Clear sales';
  el.reset.setAttribute('aria-label', el.reset.title);
  if (!showOptions) closeOptionsMenu();
}

// Sub-screens highlight the bottom-nav tab they belong to.
const PARENT_TAB: Record<string, string> = {
  compareSalesScreen: 'historyScreen',
  compareEventScreen: 'historyScreen',
  productHistoryScreen: 'settingsScreen',
  salesReportHistoryScreen: 'settingsScreen',
  eventReportHistoryScreen: 'settingsScreen',
};

let productListOrder: string[] | null = null;

/** Product order frozen while the Products screen is open, so toggling a product doesn't move rows. */
export function getProductListOrder() {
  return productListOrder;
}

/** The only way to change screens: also sets the tab highlight, stats bar and header buttons. */
export function openScreen(screenId: string) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === screenId));
  productListOrder = screenId === 'productHistoryScreen' ? state.productHistory.map((product) => product.name) : null;

  const tab = document.querySelector(`.nav button[data-tab="${screenId}"]`) ? screenId : PARENT_TAB[screenId];
  if (tab) document.querySelectorAll('.nav button').forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tab));
  el.stats.style.display = screenId === 'salesScreen' ? '' : 'none';
  updateHeaderActions(screenId);
}
