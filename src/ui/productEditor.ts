// Add / edit / remove a product, or a whole group of variants (Group switch on).
import { ensureProductHistory, generateUUID } from '../data';
import { feedback } from '../feedback';
import { CURRENCY_SYMBOLS, chooseUniqueColor, formatInputNumber, parseCurrencyInput } from '../formatters';
import { DEFAULT_PAYMENTS, FREE_PAYMENT, PAYMENT_METHODS, paymentClass, productPayments, togglePayment } from '../payments';
import { deleteProduct, renameSales, saveProductHistory, saveProducts, saveSales, state } from '../state';
import { loadSettings } from '../storage';
import { closeColorPicker, getPickerColor, initColorPicker, setPickerColor } from './colorPicker';
import { activeScreenId, el, openConfirmModal, openScreen, showToast, wireHold } from './dom';
import { createIconElement } from './icons';
import { t } from '../i18n';
import { MAX_NAME } from '../backup';
import { groupedName, groupMembers, planGroup, ungroup, variantLabel, type VariantRow } from '../groups';
import type { Product } from '../types';

// Exactly one of these is set while editing; neither means "add a new product".
let editingIndex = -1;
let editingHistoryIndex: number | null = null;
/** The group's products when the editor opened (or the product the switch turned into a group): what Save updates or hides. */
let members: Product[] = [];
let returnScreen = 'salesScreen';
let onChange: () => void = () => {};
let selectedPayments: string[] = DEFAULT_PAYMENTS;
/** Selection order, oldest first: which pick a third tap swaps out. */
let paymentPickOrder: string[] = DEFAULT_PAYMENTS;
/** The group form as it opened, so Back can tell whether there is anything to lose. */
let openedForm = '';

const currency = () => loadSettings().currency;
const money = (value: number) => (value ? formatInputNumber(String(value), currency()) : '');
/** A variant cell's number without the currency symbol, which its column header already shows. */
const bare = (raw: string) => formatInputNumber(raw, currency()).replace(/^\S+ /, '');
/** Every product once, active ones first (in Sell order), then hidden ones. */
const allProducts = () => [...new Map([...state.products, ...state.productHistory].map((product) => [product.id ?? product.name, product])).values()];

/** index >= 0 edits an active product; historyIndex edits an inactive one; neither means "add". A grouped product opens its whole group. */
export function openProductEditor(index: number, historyIndex: number | null = null) {
  const currentScreen = activeScreenId();
  if (currentScreen !== 'productEditScreen') returnScreen = currentScreen;

  editingIndex = index;
  editingHistoryIndex = index < 0 ? historyIndex : null;
  const source = editedProduct();
  closeColorPicker();

  el.productEditTitle.textContent = source ? t('product.edit') : t('add_product');
  const symbol = CURRENCY_SYMBOLS[currency()];
  el.editPriceLabel.textContent = el.variantPriceLabel.textContent = t('product.priceLabel', { symbol });
  el.editCostLabel.textContent = t('product.costLabel', { symbol });
  el.variantCostLabel.textContent = t('product.costShort', { symbol });
  el.editName.value = source?.name ?? '';
  el.editPrice.value = money(source?.price ?? 0);
  el.editCost.value = money(source?.cost ?? 0);
  members = source?.group ? groupMembers(allProducts(), source.group) : [];
  el.editGroup.value = members[0]?.group ?? '';
  el.editVariants.replaceChildren(...members.map((member) => variantRow({ id: member.id, variant: variantLabel(member), price: member.price, cost: member.cost })));
  setGroupMode(members.length > 0);
  setPickerColor(source?.color ?? chooseUniqueColor(state.products, '#F76495'));
  selectedPayments = source ? productPayments(source) : DEFAULT_PAYMENTS;
  paymentPickOrder = [...selectedPayments];
  renderPaymentOptions();
  updatePreview();
  el.editGroup.removeAttribute('aria-invalid');
  openedForm = groupForm();
  openScreen('productEditScreen');
}

/** The group's name and filled rows ('' with Group off or nothing typed): what Back compares with how the editor opened. */
function groupForm() {
  const rows = readRows().filter((row) => row.id || row.variant.trim() || row.price || row.cost);
  return el.editGroupToggle.checked && (el.editGroup.value.trim() || rows.length) ? JSON.stringify([el.editGroup.value, rows]) : '';
}

function setGroupMode(on: boolean) {
  el.editGroupToggle.checked = on;
  el.productFields.hidden = on;
  el.groupNameField.hidden = el.variantsField.hidden = !on;
  el.removeProductBtn.hidden = !(editedProduct() || members.length);
  el.removeProductBtn.title = t(on ? 'product.holdDeleteGroup' : 'product.holdDelete');
  el.removeProductBtn.setAttribute('aria-label', el.removeProductBtn.title);
}

/** One variant row: name | price | cost | remove. Its id (if any) ties it to the product it saves into. */
function variantRow(row: VariantRow = { variant: '', price: 0, cost: 0 }) {
  const div = Object.assign(document.createElement('div'), { className: 'variant-row' });
  if (row.id) div.dataset.id = row.id;
  const input = (value: string, label: string, numeric: boolean, placeholder: string) => {
    const field = Object.assign(document.createElement('input'), { className: 'input', type: 'text', value, autocomplete: 'off', maxLength: 1000 });
    field.setAttribute('aria-label', label);
    if (numeric) Object.assign(field, { inputMode: 'numeric', pattern: '[0-9]*' });
    field.placeholder = placeholder;
    return field;
  };
  const remove = Object.assign(document.createElement('button'), { type: 'button', className: 'icon-btn variant-remove hold-delete' });
  remove.setAttribute('aria-label', t('product.removeVariant'));
  const fill = Object.assign(document.createElement('span'), { className: 'hold-fill' });
  fill.setAttribute('aria-hidden', 'true');
  fill.append(createIconElement('close'));
  remove.append(createIconElement('close'), fill);
  // Held like Delete, so Save doesn't ask again. A keyboard press asks first for a saved variant; a new row just goes.
  const removeRow = () => { div.remove(); feedback('step'); updatePreview(); };
  const askRemove = () => {
    if (!div.dataset.id) return removeRow();
    const name = groupedName(el.editGroup.value.trim(), div.querySelector('input')!.value.trim());
    openConfirmModal(t('product.removeVariantsMessage', { names: `'${name}'` }), t('delete'), removeRow, { title: t('product.removeVariantsTitle') });
  };
  wireHold(remove, removeRow, askRemove);
  div.append(
    input(row.variant, t('product.variant'), false, t('product.variantPlaceholder')),
    input(bare(String(row.price || '')), el.variantPriceLabel.textContent ?? '', true, t('product.freePlaceholder')),
    input(bare(String(row.cost || '')), el.variantCostLabel.textContent ?? '', true, '0'),
    remove,
  );
  return div;
}

function readRows(): VariantRow[] {
  return [...el.editVariants.children].map((div) => {
    const [variant, price, cost] = [...div.querySelectorAll('input')].map((input) => input.value);
    return { id: (div as HTMLElement).dataset.id, variant, price: parseCurrencyInput(price, currency()) || 0, cost: parseCurrencyInput(cost, currency()) || 0 };
  });
}

/** Switch on: the product becomes the group's first variant (its real name unchanged) plus an empty row. Off: only with one variant left. */
function onGroupToggle() {
  if (el.editGroupToggle.checked) {
    const edited = editedProduct();
    // Back on after switching off keeps the original members, so the rows removed before still go on Save.
    if (edited && !members.some((member) => member.id === edited.id)) members = [...members, edited];
    el.editGroup.value = el.editName.value.trim();
    const price = parseCurrencyInput(el.editPrice.value, currency()) || 0;
    const cost = parseCurrencyInput(el.editCost.value, currency()) || 0;
    el.editVariants.replaceChildren(variantRow({ id: edited?.id, variant: '', price, cost }), variantRow());
  } else {
    const single = ungroup(el.editGroup.value, readRows());
    if (!single) {
      el.editGroupToggle.checked = true;
      feedback('warn');
      showToast(t('product.ungroupFirst'));
      return;
    }
    // The one variant is now the product being edited; the members whose rows were removed are hidden on Save.
    editingIndex = state.products.findIndex((product) => product.id === single.id);
    const historyIndex = state.productHistory.findIndex((product) => product.id === single.id);
    editingHistoryIndex = editingIndex < 0 && historyIndex >= 0 ? historyIndex : null;
    el.editName.value = single.name;
    el.editPrice.value = money(single.price);
    el.editCost.value = money(single.cost);
  }
  feedback('step');
  setGroupMode(el.editGroupToggle.checked);
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

/** Mirrors the form into the tile preview on the colour field: a product's name and price, or a group's name and variants. */
function updatePreview() {
  if (el.editGroupToggle.checked) {
    el.editPreviewName.textContent = el.editGroup.value.trim() || t('product.groupName');
    el.editPreviewPrice.textContent = readRows().map((row) => row.variant.trim()).filter(Boolean).join(' · ');
    return;
  }
  el.editPreviewName.textContent = el.editName.value.trim() || t('product_name');
  const price = parseCurrencyInput(el.editPrice.value, currency());
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

/** Back: leaving changed group rows asks first (Keep editing / Discard), like a past-event edit. */
function leaveProductEditor() {
  if (groupForm() === openedForm) closeProductEditor();
  else openConfirmModal(t('discard.groupMessage'), t('discard.button'), closeProductEditor, { title: t('discard.title'), cancelLabel: t('discard.keep') });
}


function closeProductEditor() {
  closeColorPicker();
  editingIndex = -1;
  editingHistoryIndex = null;
  members = [];
  openScreen(returnScreen);
  onChange();
}

/** The one place a product (or a whole group) is deleted for good (the Products list only hides it from the counter).
 *  Held Delete deletes at once; a keyboard or screen-reader press (`ask`) confirms in a dialog first. */
function removeEditedProduct(ask: boolean) {
  const group = el.editGroupToggle.checked;
  const removed = group ? members : [editedProduct()].filter((product) => product !== null);
  if (!removed.length) return;
  const name = group ? el.editGroup.value.trim() || removed[0].group || removed[0].name : removed[0].name;
  const remove = () => {
    for (const product of removed) deleteProduct(product.name);
    feedback('remove');
    showToast(t('toast.deleted', { name }));
    closeProductEditor();
  };
  if (!ask) remove();
  else openConfirmModal(t(group ? 'product.deleteGroupMessage' : 'product.deleteMessage', { name }), t('delete'), remove, { title: t(group ? 'product.deleteGroupTitle' : 'product.deleteTitle') });
}

const pickedColor = () => {
  const color = getPickerColor();
  return color.startsWith('#') ? color : `#${color}`;
};

function saveEditedProduct() {
  if (el.editGroupToggle.checked) {
    saveGroup();
    return;
  }
  const name = el.editName.value.trim().slice(0, MAX_NAME) || t('product.defaultName', { n: state.products.length + 1 });
  const price = parseCurrencyInput(el.editPrice.value, currency()) || 0;
  const cost = parseCurrencyInput(el.editCost.value, currency()) || 0;
  const color = pickedColor();

  let editing = editedProduct();
  const originalName = editing?.name ?? null;
  // Product names are the identity key for sales and history, so a clash would silently merge two products (ignoring case, so they never look alike).
  // A new product may still take a hidden product's exact name: that replaces it, as before.
  const others = (list: Product[]) => list.filter((product) => product.id === editing?.id || !members.some((member) => member.id === product.id));
  const clashes = [state.products, editing ? state.productHistory : state.productHistory.filter((product) => product.name !== name)].some((list) =>
    others(list).some((product) => product.name.toLowerCase() === name.toLowerCase() && product.name !== originalName),
  );
  // Only a changed name is checked: older data may hold names differing only in case, and those must stay editable.
  if (name !== originalName && clashes) {
    feedback('warn');
    showToast(t('toast.nameTaken', { name }));
    return;
  }
  // Group switched off: the variants whose rows were removed go, exactly as a removed row does on a group save.
  const removed = members.filter((member) => member.id !== editing?.id);
  for (const member of removed) deleteProduct(member.name);
  // Deleting re-copies the product lists, so the edited product is found again (by id) in them.
  const editedId = editing?.id;
  const active = removed.length ? state.products.find((product) => product.id === editedId) : editingIndex >= 0 ? editing : undefined;
  if (removed.length) editing = active ?? state.productHistory.find((product) => product.id === editedId) ?? null;

  if (editing && originalName !== null) {
    // `group: undefined` (not left out) so ungrouping also clears the history copy; JSON drops it.
    Object.assign(editing, { name, price, cost, color, payments: [...selectedPayments], group: undefined });
    if (active) {
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
    // A new product gets a colour no tile uses yet.
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

const GROUP_ERRORS = { groupName: 'product.groupNameNeeded', noVariant: 'product.noVariant', twice: 'product.variantTwice', nameTaken: 'toast.nameTaken', groupTaken: 'product.groupTaken' } as const;

/** Points at what a refused group save is about: the group name, or the first empty or clashing variant. */
function markInvalid(error: keyof typeof GROUP_ERRORS, name: string) {
  const names = [...el.editVariants.querySelectorAll<HTMLInputElement>('.variant-row input:first-child')];
  const clashing = names.filter((input) => groupedName(el.editGroup.value.trim(), input.value.trim()).slice(0, MAX_NAME).toLowerCase() === name.toLowerCase());
  const field = error === 'groupName' || error === 'groupTaken' ? el.editGroup : error === 'noVariant' ? names[0] : clashing[error === 'twice' ? 1 : 0];
  if (!field) return el.addVariantBtn.focus();
  field.setAttribute('aria-invalid', 'true');
  field.focus();
}

/** Saves every row as a variant of the group, all or nothing; a removed row's product is hidden exactly like Delete. */
function saveGroup() {
  const color = members.length ? pickedColor() : chooseUniqueColor(state.products, pickedColor());
  const ids = new Set(members.map((member) => member.id));
  const plan = planGroup(el.editGroup.value, readRows(), { color, payments: selectedPayments }, members, allProducts().filter((product) => !ids.has(product.id)));
  if (!plan.ok) {
    feedback('warn');
    showToast(t(GROUP_ERRORS[plan.error], { name: plan.name ?? '' }));
    markInvalid(plan.error, plan.name ?? '');
    return;
  }
  // Removed first, so a new row may take a removed variant's name.
  for (const product of plan.remove) deleteProduct(product.name);
  for (const product of plan.save) {
    const before = members.find((member) => member.id === product.id);
    if (!before) {
      state.products.push(product);
      state.productHistory.push({ ...product });
      continue;
    }
    const oldName = before.name;
    for (const list of [state.products, state.productHistory]) for (const item of list) if (item.id === product.id) Object.assign(item, product);
    renameSales(oldName, product);
  }
  saveProducts();
  saveProductHistory();
  saveSales();
  const group = plan.save[0].group ?? '';
  showToast(t(members.length ? 'toast.saved' : 'toast.added', { name: group }));
  feedback('step');
  closeProductEditor();
}

/** Wires the editor's static controls once. `changed` runs after any save, removal or close. */
export function initProductEditor(changed: () => void) {
  onChange = changed;
  initColorPicker();
  for (const input of [el.editPrice, el.editCost]) {
    input.addEventListener('input', () => {
      input.value = formatInputNumber(input.value, currency());
      updatePreview();
    });
  }
  el.editName.addEventListener('input', updatePreview);
  el.editGroup.addEventListener('input', () => {
    el.editGroup.removeAttribute('aria-invalid');
    updatePreview();
  });
  el.editGroupToggle.addEventListener('change', onGroupToggle);
  el.editVariants.addEventListener('input', (event) => {
    const input = event.target as HTMLInputElement;
    if (input.inputMode === 'numeric') input.value = bare(input.value);
    input.removeAttribute('aria-invalid');
    updatePreview();
  });
  el.addVariantBtn.addEventListener('click', () => {
    const row = variantRow();
    el.editVariants.append(row);
    row.querySelector('input')?.focus();
    feedback('step');
  });
  wireHold(el.removeProductBtn, () => removeEditedProduct(false), () => removeEditedProduct(true));
  el.saveProductBtn.addEventListener('click', () => saveEditedProduct());
  el.editPayments.addEventListener('click', onPaymentOptionClick);
  el.closeEditBtn.addEventListener('click', leaveProductEditor);
}
