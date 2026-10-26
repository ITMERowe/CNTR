// Static elements from index.html and the shared UI chrome: toast, confirm dialog, scroll lock, navigation.
import { state } from '../state';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const el = {
  grid: byId<HTMLDivElement>('grid'),
  stats: byId<HTMLDivElement>('stats'),
  toast: byId<HTMLDivElement>('toast'),
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
  editPreviewName: byId<HTMLSpanElement>('editPreviewName'),
  editPreviewPrice: byId<HTMLSpanElement>('editPreviewPrice'),
  editColorHexInput: byId<HTMLInputElement>('editColorHexInput'),
  colorPickerMenu: byId<HTMLDivElement>('colorPickerMenu'),
  pickerSurface: byId<HTMLDivElement>('pickerSurface'),
  pickerSurfaceThumb: byId<HTMLDivElement>('pickerSurfaceThumb'),
  hueSlider: byId<HTMLDivElement>('hueSlider'),
  hueThumb: byId<HTMLDivElement>('hueThumb'),
  hueValue: byId<HTMLSpanElement>('hueValue'),
  // Report screens
  eventReport: byId<HTMLDivElement>('eventCard'),
  historyRecentSales: byId<HTMLDivElement>('historyRecentPurchase'),
  pastEventList: byId<HTMLDivElement>('pastEventList'),
  pastEventCard: byId<HTMLDivElement>('pastEventCard'),
  pastEventTitle: byId<HTMLHeadingElement>('pastEventTitle'),
  pastEventBackBtn: byId<HTMLButtonElement>('pastEventBackBtn'),
  pastEventEditBtn: byId<HTMLButtonElement>('pastEventEditBtn'),
  pastEventDeleteBtn: byId<HTMLButtonElement>('pastEventDeleteBtn'),
  pastEventEditBar: byId<HTMLDivElement>('pastEventEditBar'),
  pastEventSaveBtn: byId<HTMLButtonElement>('pastEventSaveBtn'),
  pastEventCancelBtn: byId<HTMLButtonElement>('pastEventCancelBtn'),
  compareEventsBtn: byId<HTMLButtonElement>('compareEventsBtn'),
  compareEventCard: byId<HTMLDivElement>('compareEventCard'),
  compareEventBackBtn: byId<HTMLButtonElement>('compareEventBackBtn'),
  // Settings and its sub-screens
  currencySelect: byId<HTMLSelectElement>('currencySelect'),
  compactMoneyToggle: byId<HTMLInputElement>('compactMoneyToggle'),
  openProductsMenuBtn: byId<HTMLButtonElement>('openProductsMenuBtn'),
  openAboutMenuBtn: byId<HTMLButtonElement>('openAboutMenuBtn'),
  aboutBackBtn: byId<HTMLButtonElement>('aboutBackBtn'),
  aboutVersion: byId<HTMLSpanElement>('aboutVersion'),
  productHistoryBackBtn: byId<HTMLButtonElement>('productHistoryBackBtn'),
  productHistoryList: byId<HTMLDivElement>('productHistoryList'),
  // Backup
  exportBackupBtn: byId<HTMLButtonElement>('exportBackupBtn'),
  exportCsvBtn: byId<HTMLButtonElement>('exportCsvBtn'),
  restoreBackupBtn: byId<HTMLButtonElement>('restoreBackupBtn'),
  restoreFileInput: byId<HTMLInputElement>('restoreFileInput'),
  lastBackupText: byId<HTMLElement>('lastBackupText'),
  storageAlert: byId<HTMLParagraphElement>('storageAlert'),
  // Save / rename dialog
  saveModalOverlay: byId<HTMLDivElement>('saveModalOverlay'),
  saveModalTitle: byId<HTMLHeadingElement>('saveModalTitle'),
  saveModalText: byId<HTMLParagraphElement>('saveModalText'),
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
  confirmModalTitle: byId<HTMLHeadingElement>('confirmModalTitle'),
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
export function openConfirmModal(message: string, confirmLabel: string, onConfirm: () => void, { title = 'Are you sure?', danger = true } = {}) {
  const { confirmModalOverlay: overlay, confirmModalConfirmBtn: confirmBtn } = el;
  el.confirmModalTitle.textContent = title;
  el.confirmModalMessage.textContent = message;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  el.confirmModalCancelBtn.hidden = false;
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

/** A message that must not vanish like a toast (errors, results). One OK button. */
export function showMessage(title: string, message: string) {
  openConfirmModal(message, 'OK', () => {}, { title, danger: false });
  el.confirmModalCancelBtn.hidden = true;
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

export function activeScreenId() {
  return document.querySelector('.screen.active')?.id ?? 'salesScreen';
}

/** Shows the header buttons that make sense for `screenId`. */
export function updateHeaderActions(screenId = activeScreenId()) {
  el.openProductEdit.style.display = screenId === 'salesScreen' || screenId === 'productHistoryScreen' ? 'inline-grid' : 'none';
}

// Sub-screens highlight the bottom-nav tab they belong to.
const PARENT_TAB: Record<string, string> = {
  pastEventScreen: 'historyScreen',
  compareEventScreen: 'historyScreen',
  productHistoryScreen: 'settingsScreen',
  aboutScreen: 'settingsScreen',
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

  const tab = document.querySelector(`.tabbar .tab[data-tab="${screenId}"]`) ? screenId : PARENT_TAB[screenId];
  if (tab) document.querySelectorAll('.tabbar .tab').forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tab));
  el.stats.style.display = screenId === 'salesScreen' ? '' : 'none';
  updateHeaderActions(screenId);
}
