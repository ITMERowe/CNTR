// Add / edit / remove a product.
import { ensureProductHistory, generateUUID } from '../data';
import { feedback } from '../feedback';
import { CURRENCY_SYMBOLS, chooseUniqueColor, formatInputNumber, parseCurrencyInput } from '../formatters';
import { DEFAULT_PAYMENTS, FREE_PAYMENT, PAYMENT_METHODS, paymentClass, productPayments, togglePayment } from '../payments';
import { deleteProduct, renameSales, saveProductHistory, saveProducts, saveSales, state } from '../state';
import { loadSettings } from '../storage';
import { closeColorPicker, getPickerColor, initColorPicker, setPickerColor } from './colorPicker';
import { activeScreenId, el, openConfirmModal, openScreen, showToast } from './dom';
import { t } from '../i18n';
import { MAX_NAME } from '../backup';
import { groupedName, groupMembers, nameTaken, syncGroup, variantLabel } from '../groups';

// Exactly one of these is set while editing; neither means "add a new product".
let editingIndex = -1;
let editingHistoryIndex: number | null = null;
let returnScreen = 'salesScreen';
let onChange: () => void = () => {};
let selectedPayments: string[] = DEFAULT_PAYMENTS;
/** Selection order, oldest first: which pick a third tap swaps out. */
let paymentPickOrder: string[] = DEFAULT_PAYMENTS;

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
  const symbol = CURRENCY_SYMBOLS[currency];
  el.editPriceLabel.textContent = t('product.priceLabel', { symbol });
  el.editCostLabel.textContent = t('product.costLabel', { symbol });
  el.editGroup.value = source?.group ?? '';
  el.editName.value = source ? variantLabel(source) : '';
  // Suggests the existing groups, so a variant joins one with a tap instead of a retyped (maybe misspelt) name.
  el.editGroupList.replaceChildren(...[...new Set(allProducts().map((product) => product.group).filter(Boolean))].map((group) => Object.assign(document.createElement('option'), { value: group })));
  el.editPrice.value = source ? formatInputNumber(String(source.price), currency) : '';
  el.editCost.value = source ? formatInputNumber(String(source.cost), currency) : '';
  el.removeProductBtn.style.display = source ? 'grid' : 'none';
  setPickerColor(source?.color ?? chooseUniqueColor(state.products, '#F76495'));
  selectedPayments = source ? productPayments(source) : DEFAULT_PAYMENTS;
  paymentPickOrder = [...selectedPayments];
  renderPaymentOptions();
  updatePreview();
  openScreen('productEditScreen');
}

const allProducts = () => [...state.products, ...state.productHistory];

/** Another product already in the typed group (not the one being edited), whose colour and payments the group has. */
function groupMember() {
  return groupMembers(allProducts(), el.editGroup.value.trim(), editedProduct()?.name ?? null)[0];
}

/** Typing an existing group's name joins it: the editor takes the group's colour and payment methods. */
function onGroupInput() {
  // Clearing the group keeps the full name ("Poster A4"), not just the variant, so reports don't see a rename.
  const edited = editedProduct();
  if (!el.editGroup.value.trim() && edited?.group && el.editName.value.trim() === variantLabel(edited)) el.editName.value = edited.name;
  const member = groupMember();
  if (member) {
    setPickerColor(member.color);
    selectedPayments = productPayments(member);
    paymentPickOrder = [...selectedPayments];
    renderPaymentOptions();
  }
  updatePreview();
}

/** One toggle per method; a third tap swaps out the oldest pick, so every chip stays readable and tappable. */
function renderPaymentOptions() {
  el.editPayments.replaceChildren(
    ...PAYMENT_METHODS.map((method) => {
      const button = Object.assign(document.createElement('button'), { type: 'button', className: `payment-option ${paymentClass(method)}`, textContent: method });
      button.dataset.method = method;
      button.setAttribute('aria-pressed', String(selectedPayments.includes(method)));
      return button;
    }),
  );
}

function onPaymentOptionClick(event: MouseEvent) {
  const method = (event.target as HTMLElement).closest<HTMLElement>('.payment-option')?.dataset.method;
  if (!method) return;
  if (selectedPayments.includes(method) && selectedPayments.length === 1) {
    feedback('warn');
    showToast(t('payments.needOne'));
    return;
  }
  selectedPayments = togglePayment(selectedPayments, method, paymentPickOrder[0]);
  paymentPickOrder = [...paymentPickOrder.filter((item) => selectedPayments.includes(item)), ...selectedPayments.filter((item) => !paymentPickOrder.includes(item))];
  feedback('step');
  renderPaymentOptions();
}

/** Mirrors the name and price into the tile preview on the colour field. */
function updatePreview() {
  const group = groupMember()?.group ?? el.editGroup.value.trim();
  el.editNameLabel.textContent = group ? t('product.variant') : t('name');
  el.editName.placeholder = group ? t('product.variantPlaceholder') : t('product_name');
  el.editPreviewName.textContent = groupedName(group, el.editName.value.trim()) || t('product_name');
  const price = parseCurrencyInput(el.editPrice.value, loadSettings().currency);
  el.editPreviewPrice.textContent = price > 0 ? el.editPrice.value : FREE_PAYMENT;
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

/** The product being edited, or null when adding. */
function editedProduct() {
  return editingIndex >= 0 ? state.products[editingIndex] : editingHistoryIndex !== null ? state.productHistory[editingHistoryIndex] : null;
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
  const removed = editedProduct();
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
  // Joining an existing group keeps that group's spelling; the real name is "Group Variant" (capped like any name, so backups restore).
  const member = groupMember();
  const group = member?.group ?? el.editGroup.value.trim();
  const name = groupedName(group, el.editName.value.trim()).slice(0, MAX_NAME) || t('product.defaultName', { n: state.products.length + 1 });
  const price = parseCurrencyInput(el.editPrice.value, currency) || 0;
  const cost = parseCurrencyInput(el.editCost.value, currency) || 0;
  const pickedColor = getPickerColor();
  const color = pickedColor.startsWith('#') ? pickedColor : `#${pickedColor}`;

  const editing = editedProduct();
  const originalName = editing?.name ?? null;
  // Product names are the identity key for sales and history, so a clash would silently merge two products (ignoring case, so they never look alike).
  // A new product may still take a hidden product's exact name: that replaces it, as before.
  const clashesWithActive = nameTaken(name, state.products, originalName);
  const clashesWithHistory = nameTaken(name, editing ? state.productHistory : state.productHistory.filter((product) => product.name !== name), originalName);
  // Only a changed name is checked: older data may hold names differing only in case, and those must stay editable.
  if (name !== originalName && (clashesWithActive || clashesWithHistory)) {
    feedback('warn');
    showToast(t('toast.nameTaken', { name }));
    return;
  }

  if (editing && originalName !== null) {
    // `group: undefined` (not left out) so ungrouping also clears the history copy; JSON drops it.
    Object.assign(editing, { name, price, cost, color, payments: [...selectedPayments], group: group || undefined });
    if (editingIndex >= 0) {
      ensureProductHistory(editing, state.productHistory, originalName);
    } else {
      // An inactive product may still share its name with an active one from older data.
      const active = state.products.find((product) => product.name === originalName);
      if (active) Object.assign(active, editing);
    }
    renameSales(originalName, editing);
    syncAndSave(group, color);
    saveSales();
    saveProductHistory();
    showToast(t('toast.saved', { name }));
  } else {
    // A variant keeps its group's colour; a new product otherwise gets one no tile uses yet.
    const newProduct = { id: generateUUID(), name, price, cost, color: member ? color : chooseUniqueColor(state.products, color), payments: [...selectedPayments], ...(group && { group }) };
    state.products.push(newProduct);
    ensureProductHistory(newProduct, state.productHistory);
    syncAndSave(group, newProduct.color);
    saveProductHistory();
    showToast(t('toast.added', { name }));
  }

  feedback('step');
  closeProductEditor();
}

/** A group's colour and payments are the group's: the saved ones reach every variant, active or hidden. */
function syncAndSave(group: string, color: string) {
  if (group) for (const list of [state.products, state.productHistory]) syncGroup(list, group, color, selectedPayments);
  saveProducts();
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
  el.editGroup.addEventListener('input', onGroupInput);
  el.removeProductBtn.addEventListener('click', removeEditedProduct);
  el.saveProductBtn.addEventListener('click', saveEditedProduct);
  el.editPayments.addEventListener('click', onPaymentOptionClick);
  el.closeEditBtn.addEventListener('click', closeProductEditor);
}
