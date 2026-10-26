// Add / edit / remove a product.
import { ensureProductHistory } from '../data';
import { chooseUniqueColor, formatInputNumber, parseCurrencyInput } from '../formatters';
import { renameSales, saveProductHistory, saveProducts, saveSales, state } from '../state';
import { loadSettings } from '../storage';
import { closeColorPicker, getPickerColor, initColorPicker, setPickerColor } from './colorPicker';
import { activeScreenId, el, openConfirmModal, openScreen, showToast } from './dom';

// Exactly one of these is set while editing; neither means "add a new product".
let editingIndex = -1;
let editingHistoryIndex: number | null = null;
let returnScreen = 'salesScreen';
let onChange: () => void = () => {};

/** index >= 0 edits an active product; historyIndex edits an inactive one; neither means "add". */
export function openProductEditor(index: number, historyIndex: number | null = null) {
  const currentScreen = activeScreenId();
  if (currentScreen !== 'productEditScreen') returnScreen = currentScreen;

  editingIndex = index;
  editingHistoryIndex = index < 0 ? historyIndex : null;
  const source = index >= 0 ? state.products[index] : historyIndex !== null ? state.productHistory[historyIndex] : null;
  const currency = loadSettings().currency;
  closeColorPicker();

  el.productEditTitle.textContent = source ? 'Edit product' : 'Add product';
  el.editName.value = source?.name ?? '';
  el.editPrice.value = source ? formatInputNumber(String(source.price), currency) : '';
  el.editCost.value = source ? formatInputNumber(String(source.cost), currency) : '';
  el.removeProductBtn.style.display = index >= 0 ? 'grid' : 'none';
  setPickerColor(source?.color ?? chooseUniqueColor(state.products, '#F76495'));
  updatePreview();
  openScreen('productEditScreen');
}

/** Mirrors the name and price into the tile preview on the colour field. */
function updatePreview() {
  el.editPreviewName.textContent = el.editName.value.trim() || 'Product name';
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
  else showToast(`${name} not found`);
}

function closeProductEditor() {
  closeColorPicker();
  editingIndex = -1;
  editingHistoryIndex = null;
  openScreen(returnScreen);
  onChange();
}

function removeEditedProduct() {
  if (editingIndex < 0) return;
  const removed = state.products[editingIndex];
  openConfirmModal(`Remove '${removed.name}' and its recorded sales from the counter?`, 'Remove', () => {
    state.products.splice(state.products.indexOf(removed), 1);
    state.sales.splice(0, state.sales.length, ...state.sales.filter((sale) => sale.product !== removed.name));
    saveProducts();
    saveSales();
    showToast(`${removed.name} removed`);
    closeProductEditor();
  });
}

function saveEditedProduct() {
  const currency = loadSettings().currency;
  const name = el.editName.value.trim() || `Product ${state.products.length + 1}`;
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
    showToast(`A product named '${name}' already exists`);
    return;
  }

  if (editing && originalName !== null) {
    Object.assign(editing, { name, price, cost, color });
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
    showToast(`${name} saved`);
  } else {
    const newProduct = { name, price, cost, color: chooseUniqueColor(state.products, color) };
    state.products.push(newProduct);
    ensureProductHistory(newProduct, state.productHistory);
    saveProducts();
    saveProductHistory();
    showToast(`${name} added`);
  }

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
  el.closeEditBtn.addEventListener('click', closeProductEditor);
}
