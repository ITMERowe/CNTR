// Add / edit / remove a product.
import { ensureProductHistory, generateUUID } from '../data';
import { feedback } from '../feedback';
import { chooseUniqueColor, formatInputNumber, parseCurrencyInput } from '../formatters';
import { DEFAULT_PAYMENTS, MAX_PAYMENTS, PAYMENT_METHODS, paymentClass, productPayments, togglePayment } from '../payments';
import { deleteProduct, renameSales, saveProductHistory, saveProducts, saveSales, state } from '../state';
import { loadSettings } from '../storage';
import { closeColorPicker, getPickerColor, initColorPicker, setPickerColor } from './colorPicker';
import { activeScreenId, el, openConfirmModal, openScreen, showToast } from './dom';
import { t } from '../i18n';

// Exactly one of these is set while editing; neither means "add a new product".
let editingIndex = -1;
let editingHistoryIndex: number | null = null;
let returnScreen = 'salesScreen';
let onChange: () => void = () => {};
let selectedPayments: string[] = DEFAULT_PAYMENTS;

/** index >= 0 edits an active product; historyIndex edits an inactive one; neither means "add". */
export function openProductEditor(index: number, historyIndex: number | null = null) {
  const currentScreen = activeScreenId();
  if (currentScreen !== 'productEditScreen') returnScreen = currentScreen;

  editingIndex = index;
  editingHistoryIndex = index < 0 ? historyIndex : null;
  const source = index >= 0 ? state.products[index] : historyIndex !== null ? state.productHistory[historyIndex] : null;
  const currency = loadSettings().currency;
  closeColorPicker();

  el.productEditTitle.textContent = source ? t('product.edit') : t('add_product');
  el.editName.value = source?.name ?? '';
  el.editPrice.value = source ? formatInputNumber(String(source.price), currency) : '';
  el.editCost.value = source ? formatInputNumber(String(source.cost), currency) : '';
  el.removeProductBtn.style.display = source ? 'grid' : 'none';
  setPickerColor(source?.color ?? chooseUniqueColor(state.products, '#F76495'));
  selectedPayments = source ? productPayments(source) : DEFAULT_PAYMENTS;
  renderPaymentOptions();
  updatePreview();
  openScreen('productEditScreen');
}

/** One toggle per method; while 2 are chosen the others are greyed out (aria-disabled, so they still explain on tap). */
function renderPaymentOptions() {
  el.editPayments.replaceChildren(
    ...PAYMENT_METHODS.map((method) => {
      const on = selectedPayments.includes(method);
      const full = !on && selectedPayments.length >= MAX_PAYMENTS;
      const button = Object.assign(document.createElement('button'), { type: 'button', className: `payment-option ${paymentClass(method)}`, textContent: method });
      button.dataset.method = method;
      button.setAttribute('aria-pressed', String(on));
      button.setAttribute('aria-disabled', String(full));
      return button;
    }),
  );
}

function onPaymentOptionClick(event: MouseEvent) {
  const method = (event.target as HTMLElement).closest<HTMLElement>('.payment-option')?.dataset.method;
  if (!method) return;
  const next = togglePayment(selectedPayments, method);
  if (next === selectedPayments) {
    feedback('warn');
    showToast(selectedPayments.includes(method) ? t('payments.needOne') : t('payments.max', { max: MAX_PAYMENTS }));
  } else {
    feedback('step');
  }
  selectedPayments = next;
  renderPaymentOptions();
}

/** Mirrors the name and price into the tile preview on the colour field. */
function updatePreview() {
  el.editPreviewName.textContent = el.editName.value.trim() || t('product_name');
  el.editPreviewPrice.textContent = el.editPrice.value || formatInputNumber('0', loadSettings().currency);
}

/** Opens the editor for a product by name, whether it is active or only in history. */
export function editProductByName(name: string) {
  const index = state.products.findIndex((product) => product.name === name);
  if (index >= 0) {
    openProductEditor(index);
    return;
  }
  const historyIndex = state.productHistory.findIndex((product) => product.name === name);
  if (historyIndex >= 0) openProductEditor(-1, historyIndex);
  else showToast(t('toast.notFound', { name }));
}

function closeProductEditor() {
  closeColorPicker();
  editingIndex = -1;
  editingHistoryIndex = null;
  openScreen(returnScreen);
  onChange();
}

/** The one place a product is deleted for good (the Products list only hides it from the counter). */
function removeEditedProduct() {
  const removed = editingIndex >= 0 ? state.products[editingIndex] : editingHistoryIndex !== null ? state.productHistory[editingHistoryIndex] : null;
  if (!removed) return;
  openConfirmModal(
    t('product.deleteMessage', { name: removed.name }),
    t('delete'),
    () => {
      deleteProduct(removed.name);
      feedback('remove');
      showToast(t('toast.deleted', { name: removed.name }));
      closeProductEditor();
    },
  );
}

function saveEditedProduct() {
  const currency = loadSettings().currency;
  const name = el.editName.value.trim() || t('product.defaultName', { n: state.products.length + 1 });
  const price = parseCurrencyInput(el.editPrice.value, currency) || 0;
  const cost = parseCurrencyInput(el.editCost.value, currency) || 0;
  const pickedColor = getPickerColor();
  const color = pickedColor.startsWith('#') ? pickedColor : `#${pickedColor}`;

  const editing = editingIndex >= 0 ? state.products[editingIndex] : editingHistoryIndex !== null ? state.productHistory[editingHistoryIndex] : null;
  const originalName = editing?.name ?? null;
  // Product names are the identity key for sales and history, so a clash would silently merge two products.
  const clashesWithActive = state.products.some((product) => product.name === name && product.name !== originalName);
  const clashesWithHistory = editing !== null && name !== originalName && state.productHistory.some((product) => product.name === name);
  if (clashesWithActive || clashesWithHistory) {
    feedback('warn');
    showToast(t('toast.nameTaken', { name }));
    return;
  }

  if (editing && originalName !== null) {
    Object.assign(editing, { name, price, cost, color, payments: [...selectedPayments] });
    if (editingIndex >= 0) {
      ensureProductHistory(editing, state.productHistory, originalName);
    } else {
      // An inactive product may still share its name with an active one from older data.
      const active = state.products.find((product) => product.name === originalName);
      if (active) Object.assign(active, editing);
    }
    renameSales(originalName, editing);
    saveProducts();
    saveSales();
    saveProductHistory();
    showToast(t('toast.saved', { name }));
  } else {
    const newProduct = { id: generateUUID(), name, price, cost, color: chooseUniqueColor(state.products, color), payments: [...selectedPayments] };
    state.products.push(newProduct);
    ensureProductHistory(newProduct, state.productHistory);
    saveProducts();
    saveProductHistory();
    showToast(t('toast.added', { name }));
  }

  feedback('step');
  closeProductEditor();
}

/** Wires the editor's static controls once. `changed` runs after any save, removal or close. */
export function initProductEditor(changed: () => void) {
  onChange = changed;
  initColorPicker();
  for (const input of [el.editPrice, el.editCost]) {
    input.addEventListener('input', () => {
      input.value = formatInputNumber(input.value, loadSettings().currency);
      updatePreview();
    });
  }
  el.editName.addEventListener('input', updatePreview);
  el.removeProductBtn.addEventListener('click', removeEditedProduct);
  el.saveProductBtn.addEventListener('click', saveEditedProduct);
  el.editPayments.addEventListener('click', onPaymentOptionClick);
  el.closeEditBtn.addEventListener('click', closeProductEditor);
}
