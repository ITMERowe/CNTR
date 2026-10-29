// Static elements from index.html and the shared UI chrome: toast, confirm dialog, scroll lock, navigation.
import { state } from '../state';
import { t } from '../i18n';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export const el = {
  grid: byId<HTMLDivElement>('grid'),
  brand: byId<HTMLDivElement>('brand'),
  stats: byId<HTMLDivElement>('stats'),
  toast: byId<HTMLDivElement>('toast'),
  openProductEdit: byId<HTMLButtonElement>('openProductEdit'),
  sellMenuBtn: byId<HTMLButtonElement>('sellMenuBtn'),
  sellMenu: byId<HTMLDivElement>('sellMenu'),
  autoSortToggle: byId<HTMLInputElement>('autoSortToggle'),
  compactTilesToggle: byId<HTMLInputElement>('compactTilesToggle'),
  // Product editor
  productEditTitle: byId<HTMLHeadingElement>('productEditTitle'),
  closeEditBtn: byId<HTMLButtonElement>('closeEditBtn'),
  removeProductBtn: byId<HTMLButtonElement>('removeProductBtn'),
  editName: byId<HTMLInputElement>('editName'),
  editGroup: byId<HTMLInputElement>('editGroup'),
  editGroupToggle: byId<HTMLInputElement>('editGroupToggle'),
  productFields: byId<HTMLElement>('productFields'),
  groupNameField: byId<HTMLElement>('groupNameField'),
  variantsField: byId<HTMLElement>('variantsField'),
  editVariants: byId<HTMLDivElement>('editVariants'),
  addVariantBtn: byId<HTMLButtonElement>('addVariantBtn'),
  variantPriceLabel: byId<HTMLElement>('variantPriceLabel'),
  variantCostLabel: byId<HTMLElement>('variantCostLabel'),
  editPriceLabel: byId<HTMLElement>('editPriceLabel'),
  editPrice: byId<HTMLInputElement>('editPrice'),
  editCostLabel: byId<HTMLElement>('editCostLabel'),
  editCost: byId<HTMLInputElement>('editCost'),
  saveProductBtn: byId<HTMLButtonElement>('saveProductBtn'),
  editPayments: byId<HTMLDivElement>('editPayments'),
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
  productsPerDayToggle: byId<HTMLInputElement>('productsPerDayToggle'),
  newDayToggle: byId<HTMLInputElement>('newDayToggle'),
  soundToggle: byId<HTMLInputElement>('soundToggle'),
  themeToggle: byId<HTMLInputElement>('themeToggle'),
  themeState: byId<HTMLElement>('themeState'),
  languageSelect: byId<HTMLSelectElement>('languageSelect'),
  productsSummary: byId<HTMLElement>('productsSummary'),
  openAboutMenuBtn: byId<HTMLButtonElement>('openAboutMenuBtn'),
  startTutorialBtn: byId<HTMLButtonElement>('startTutorialBtn'),
  aboutBackBtn: byId<HTMLButtonElement>('aboutBackBtn'),
  aboutVersion: byId<HTMLSpanElement>('aboutVersion'),
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
  expenseProductsField: byId<HTMLDivElement>('expenseProductsField'),
  expenseProducts: byId<HTMLDivElement>('expenseProducts'),
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

let sheetReturnFocus: HTMLElement | null = null;

/** Opens a `.sheet-overlay`: blocks the page behind it (tabs, header, content) and moves focus into the sheet. */
export function openSheet(overlay: HTMLElement) {
  sheetReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  overlay.classList.add('open');
  for (const blocked of document.querySelectorAll<HTMLElement>('.app > header, .app > main, .app > nav')) blocked.inert = true;
  // Cancel (the safe action), not the first input or the primary/destructive button.
  const sheet = overlay.querySelector<HTMLElement>('.sheet');
  // preventScroll: Cancel sits at the bottom; a long sheet must still open at its top (title and first fields).
  (sheet?.querySelector<HTMLElement>('.sheet-actions .btn-secondary') ?? sheet)?.focus({ preventScroll: true });
  if (sheet) sheet.scrollTop = 0;
}

/** Closes a sheet opened with openSheet: unblocks the page and returns focus to what opened it. */
export function closeSheet(overlay: HTMLElement) {
  overlay.classList.remove('open');
  for (const blocked of document.querySelectorAll<HTMLElement>('.app > header, .app > main, .app > nav')) blocked.inert = false;
  sheetReturnFocus?.focus();
  sheetReturnFocus = null;
}

/** Asks before a destructive action; `onConfirm` runs only if the user confirms. */
export function openConfirmModal(message: string, confirmLabel: string, onConfirm: () => void, { title = t('are_you_sure'), danger = true, cancelLabel = t('cancel') } = {}) {
  const { confirmModalOverlay: overlay, confirmModalConfirmBtn: confirmBtn } = el;
  el.confirmModalTitle.textContent = title;
  el.confirmModalMessage.textContent = message;
  confirmBtn.textContent = confirmLabel;
  confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';
  el.confirmModalCancelBtn.textContent = cancelLabel;
  el.confirmModalCancelBtn.hidden = false;
  openSheet(overlay);

  const close = () => {
    closeSheet(overlay);
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
  el.sellMenuBtn.style.display = screenId === 'salesScreen' ? 'inline-grid' : 'none';
  // Screens with no header button (or wordmark) drop the empty 44px row instead of leaving a gap above their title.
  el.brand.parentElement!.hidden = screenId !== 'salesScreen' && screenId !== 'productHistoryScreen';
  if (screenId !== 'salesScreen') closeSellMenu();
}

export function closeSellMenu() {
  // Focus inside the menu would be lost when it hides (Escape, Android back): hand it back to the ⋮ button.
  if (el.sellMenu.contains(document.activeElement)) el.sellMenuBtn.focus();
  el.sellMenu.hidden = true;
  el.sellMenuBtn.setAttribute('aria-expanded', 'false');
}

// Sub-screens highlight the bottom-nav tab they belong to.
const PARENT_TAB: Record<string, string> = {
  pastEventScreen: 'historyScreen',
  compareEventScreen: 'historyScreen',
  aboutScreen: 'settingsScreen',
};

// The entrance animation plays once per screen, not on every tab switch back to it.
const enteredScreens = new Set<string>([document.querySelector('.screen.active')?.id ?? 'salesScreen']);

let productListOrder: string[] | null = null;

/** Product order frozen while the Products screen is open, so toggling a product doesn't move rows. */
export function getProductListOrder() {
  return productListOrder;
}

/** The only way to change screens: also sets the tab highlight, stats bar and header buttons. */
export function openScreen(screenId: string) {
  // Every page opens at its top, not at the previous page's scroll position. The pages scroll inside .content.
  if (screenId !== activeScreenId()) {
    document.querySelector('.content')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll<HTMLElement>('.screen').forEach((screen) => screen.classList.toggle('active', screen.id === screenId));
  const enteringScreen = document.getElementById(screenId);
  if (enteringScreen) enteringScreen.style.animation = enteredScreens.has(screenId) ? 'none' : '';
  enteredScreens.add(screenId);
  productListOrder = screenId === 'productHistoryScreen' ? state.productHistory.map((product) => product.name) : null;

  const tab = document.querySelector(`.tabbar .tab[data-tab="${screenId}"]`) ? screenId : PARENT_TAB[screenId];
  if (tab) document.querySelectorAll('.tabbar .tab').forEach((button) => button.classList.toggle('active', button.getAttribute('data-tab') === tab));
  el.stats.style.display = screenId === 'salesScreen' ? '' : 'none';
  // The "CNTR" wordmark only earns its place on Sell; every other screen has its own title.
  el.brand.style.display = screenId === 'salesScreen' ? '' : 'none';
  updateHeaderActions(screenId);
}
