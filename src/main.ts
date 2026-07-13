import './style.css';
import { Capacitor } from '@capacitor/core';

interface Product {
  name: string;
  price: number;
  cost: number;
  color: string;
}

interface SaleRecord {
  product: string;
  price: number;
  cost: number;
  payment: string;
  timestamp: Date;
}

interface HSV {
  h: number;
  s: number;
  v: number;
}

const PRODUCT_STORAGE_KEY = 'cntrProducts';
const TX_STORAGE_KEY = 'cntrSales';

const defaultProducts: Product[] = [
  { name: 'Gacha', price: 25000, cost: 12000, color: '#f76495' },
  { name: 'Cheki', price: 35000, cost: 17000, color: '#31b500' },
  { name: 'Poster', price: 30000, cost: 15000, color: '#f16900' },
  { name: 'Photocard', price: 15000, cost: 7000, color: '#d49762' },
  { name: 'Sticker', price: 5000, cost: 1500, color: '#c8070b' },
  { name: 'Acrylic Stand', price: 45000, cost: 25000, color: '#9b48ad' },
  { name: 'Keychain', price: 20000, cost: 9000, color: '#d8b800' },
  { name: 'Tote Bag', price: 50000, cost: 30000, color: '#5f6d77' },
];

const products: Product[] = loadProducts();
const payments = ['Cash', 'QRIS'];
const tx: SaleRecord[] = loadSales();

function loadProducts() {
  const stored = localStorage.getItem(PRODUCT_STORAGE_KEY);
  if (!stored) return [...defaultProducts];

  try {
    const parsed = JSON.parse(stored) as Product[];
    return Array.isArray(parsed) ? parsed : [...defaultProducts];
  } catch {
    return [...defaultProducts];
  }
}

function saveProducts() {
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products));
}

function loadSales() {
  const stored = localStorage.getItem(TX_STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored) as Array<{
      product: string;
      price: number;
      cost: number;
      payment: string;
      timestamp: string;
    }>;
    return parsed.map((item) => ({ ...item, timestamp: new Date(item.timestamp) }));
  } catch {
    return [];
  }
}

function saveSales() {
  localStorage.setItem(TX_STORAGE_KEY, JSON.stringify(tx));
}

let editingIndex = -1;
const el = {
  grid: document.getElementById('grid') as HTMLDivElement,
  stats: document.getElementById('stats') as HTMLDivElement,
  headline: document.getElementById('headline') as HTMLDivElement,
  toast: document.getElementById('toast') as HTMLDivElement,
  reset: document.getElementById('resetBtn') as HTMLButtonElement,
  openProductEdit: document.getElementById('openProductEdit') as HTMLButtonElement,
  closeEditBtn: document.getElementById('closeEditBtn') as HTMLButtonElement,
  removeProductBtn: document.getElementById('removeProductBtn') as HTMLButtonElement,
  editName: document.getElementById('editName') as HTMLInputElement,
  editPrice: document.getElementById('editPrice') as HTMLInputElement,
  editCost: document.getElementById('editCost') as HTMLInputElement,
  editColorHex: document.getElementById('editColorHex') as HTMLSpanElement,
  editColorHexInput: document.getElementById('editColorHexInput') as HTMLInputElement,
  colorGroup: document.querySelector('.color-input-group') as HTMLDivElement,
  colorPickerMenu: document.getElementById('colorPickerMenu') as HTMLDivElement,
  pickerSurface: document.getElementById('pickerSurface') as HTMLDivElement,
  pickerSurfaceThumb: document.getElementById('pickerSurfaceThumb') as HTMLDivElement,
  hueSlider: document.getElementById('hueSlider') as HTMLDivElement,
  hueThumb: document.getElementById('hueThumb') as HTMLDivElement,
  hueValue: document.getElementById('hueValue') as HTMLSpanElement,
  pickerHexCard: document.getElementById('pickerHexCard') as HTMLDivElement,
  saveProductBtn: document.getElementById('saveProductBtn') as HTMLButtonElement,
  hero: document.getElementById('settingsHero') as HTMLDivElement,
  report: document.getElementById('reportCard') as HTMLDivElement,
};

const fmt = (n: number) => n >= 1000000 ? `Rp ${(n / 1000000).toFixed(n % 1000000 ? 1 : 0)}m` : n >= 1000 ? `Rp ${Math.round(n / 1000)}k` : `Rp ${n}`;
const label = (p: number) => p >= 1000 ? `${p / 1000}k` : `${p}`;

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function makeTiles() {
  products.forEach((p) => {
    const card = document.createElement('div');
    card.className = 'tile';
    card.style.setProperty('--tile', p.color);
    card.dataset.product = p.name;
    card.innerHTML = `
        <div class="tile-head">
          <div class="product-meta">
            <div class="product-name">${p.name}</div>
            <div class="product-price">${fmt(p.price)}</div>
          </div>
          <button class="settings-btn" aria-label="Edit ${p.name}"><span class="material-symbols-outlined">edit</span></button>
        </div>
        <div class="tile-bottom">
          <div class="payment-quarter">
            <span class="payment-label">Cash</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="Cash" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <span class="payment-value">0</span>
              <button class="control-btn" data-payment="Cash" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
          <div class="payment-quarter">
            <span class="payment-label">QRIS</span>
            <div class="payment-controls">
              <button class="control-btn" data-payment="QRIS" data-action="minus"><span class="material-symbols-outlined control-icon">remove</span></button>
              <span class="payment-value">0</span>
              <button class="control-btn" data-payment="QRIS" data-action="plus"><span class="material-symbols-outlined control-icon">add</span></button>
            </div>
          </div>
        </div>`;

    card.querySelectorAll('.control-btn').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const payment = target.getAttribute('data-payment') || 'Cash';
        const action = target.getAttribute('data-action');
        const rect = card.getBoundingClientRect();
        const buttonRect = target.getBoundingClientRect();
        card.style.setProperty('--x', `${buttonRect.left - rect.left + buttonRect.width / 2}px`);
        card.style.setProperty('--y', `${buttonRect.top - rect.top + buttonRect.height / 2}px`);
        card.classList.add('ripple');
        setTimeout(() => card.classList.remove('ripple'), 160);
        if (action === 'plus') {
          recordSale(p, payment);
        } else {
          removeLastMatching(p.name, payment);
        }
      });
    });

    const settingsBtn = card.querySelector('.settings-btn') as HTMLButtonElement;
    settingsBtn.addEventListener('click', () => {
      openProductEditor(products.findIndex((item) => item.name === p.name));
    });

    el.grid.appendChild(card);
  });
}

function recordSale(p: Product, payment: string) {
  tx.push({ product: p.name, price: p.price, cost: p.cost, payment, timestamp: new Date() });
  saveSales();
  render(true);
  showToast(`${p.name} • ${payment}`);
}

function removeLastMatching(product: string, payment: string) {
  for (let i = tx.length - 1; i >= 0; i--) {
    if (tx[i].product === product && tx[i].payment === payment) {
      tx.splice(i, 1);
      saveSales();
      render(true);
      showToast(`${product} removed`);
      return;
    }
  }
  showToast('Nothing to remove');
}

function totals() {
  return tx.reduce(
    (a, t) => {
      a.revenue += t.price;
      a.profit += t.price - t.cost;
      if (t.payment === 'Cash') a.cash += t.price;
      if (t.payment === 'QRIS') a.qris += t.price;
      return a;
    },
    { revenue: 0, profit: 0, cash: 0, qris: 0 },
  );
}

function render(bump = false) {
  const s = totals();
  const statRows: Array<[string, number]> = [['Revenue', s.revenue], ['Profit', s.profit], ['Cash', s.cash], ['QRIS', s.qris]];
  el.headline.textContent = `${fmt(s.revenue)} × ${tx.length}`;
  el.stats.innerHTML = statRows
    .map((x) => `<div class="stat ${bump ? 'bump' : ''}"><span class="label">${x[0]}</span><span class="value">${fmt(x[1])}</span></div>`)
    .join('');
  setTimeout(() => document.querySelectorAll('.stat').forEach((x) => x.classList.remove('bump')), 220);

  document.querySelectorAll('.tile').forEach((tile) => {
    const product = tile.getAttribute('data-product') || '';
    const cashCount = tx.filter((t) => t.product === product && t.payment === 'Cash').length;
    const qrisCount = tx.filter((t) => t.product === product && t.payment === 'QRIS').length;
    const cashValue = tile.querySelector('.payment-quarter:nth-child(1) .payment-value') as HTMLSpanElement;
    const qrisValue = tile.querySelector('.payment-quarter:nth-child(2) .payment-value') as HTMLSpanElement;
    if (cashValue) cashValue.textContent = `${cashCount}`;
    if (qrisValue) qrisValue.textContent = `${qrisCount}`;
  });

  el.hero.textContent = `+${tx.length}`;
  el.report.innerHTML = `<div class="report-line"><span>Revenue</span><strong>${fmt(s.revenue)}</strong></div><div class="report-line"><span>Profit</span><strong>${fmt(s.profit)}</strong></div><div class="report-line"><span>Sales</span><strong>${tx.length}</strong></div>`;
}

function rebuildGrid() {
  el.grid.innerHTML = '';
  makeTiles();
  render();
}

function openScreen(screenId: string) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.add('active');
}

function openProductEditor(index: number) {
  const title = document.getElementById('productEditTitle') as HTMLHeadingElement;
  if (index >= 0) {
    const product = products[index];
    editingIndex = index;
    title.textContent = 'Edit product';
    el.editName.value = product.name;
    el.editPrice.value = product.price.toString();
    el.editCost.value = product.cost.toString();
    el.editColorHex.textContent = product.color.toUpperCase();
    el.editColorHexInput.value = product.color.toUpperCase();
    el.removeProductBtn.style.display = 'grid';
  } else {
    editingIndex = -1;
    title.textContent = 'Add product';
    el.editName.value = '';
    el.editPrice.value = '0';
    el.editCost.value = '0';
    el.editColorHex.textContent = '#F76495';
    el.editColorHexInput.value = '#F76495';
    el.removeProductBtn.style.display = 'none';
  }

  updateColorInputs(el.editColorHex.textContent || '#F76495');
  openScreen('productEditScreen');

  el.removeProductBtn.onclick = () => {
    if (editingIndex < 0) return;
    closeColorPicker();
    const removed = products.splice(editingIndex, 1)[0];
    for (let i = tx.length - 1; i >= 0; i--) {
      if (tx[i].product === removed.name) tx.splice(i, 1);
    }
    saveProducts();
    saveSales();
    showToast(`${removed.name} removed`);
    editingIndex = -1;
    rebuildGrid();
    render(true);
    openScreen('salesScreen');
  };

  el.saveProductBtn.onclick = () => {
    const updatedName = el.editName.value.trim() || `Product ${products.length + 1}`;
    const updatedPrice = Number(el.editPrice.value) || 0;
    const updatedCost = Number(el.editCost.value) || 0;
    const colorValue = (el.editColorHex.textContent || '#ffffff').trim();
    const normalizedColor = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;

    if (editingIndex >= 0) {
      const product = products[editingIndex];
      const oldProductName = product.name;
      product.name = updatedName;
      product.price = updatedPrice;
      product.cost = updatedCost;
      product.color = normalizedColor;

      tx.forEach((sale) => {
        if (sale.product === oldProductName) {
          sale.product = updatedName;
          sale.price = updatedPrice;
          sale.cost = updatedCost;
        }
      });

      saveProducts();
      saveSales();
      showToast(`${updatedName} saved`);
    } else {
      products.push({ name: updatedName, price: updatedPrice, cost: updatedCost, color: normalizedColor });
      saveProducts();
      showToast(`${updatedName} added`);
    }

    rebuildGrid();
    render(true);
    openScreen('salesScreen');
  };
}

let currentHSV: HSV = { h: 340, s: 0.68, v: 0.97 };

function normalizeHex(value: string) {
  const hex = value.trim().replace(/^#/, '').slice(0, 6);
  return `#${hex.toUpperCase()}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rr) {
      h = ((gg - bb) / delta) % 6;
    } else if (max === gg) {
      h = (bb - rr) / delta + 2;
    } else {
      h = (rr - gg) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h, s, v };
}

function hsvToRgb(h: number, s: number, v: number) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rr = 0;
  let gg = 0;
  let bb = 0;

  if (h >= 0 && h < 60) {
    rr = c; gg = x; bb = 0;
  } else if (h >= 60 && h < 120) {
    rr = x; gg = c; bb = 0;
  } else if (h >= 120 && h < 180) {
    rr = 0; gg = c; bb = x;
  } else if (h >= 180 && h < 240) {
    rr = 0; gg = x; bb = c;
  } else if (h >= 240 && h < 300) {
    rr = x; gg = 0; bb = c;
  } else {
    rr = c; gg = 0; bb = x;
  }

  return {
    r: Math.round((rr + m) * 255),
    g: Math.round((gg + m) * 255),
    b: Math.round((bb + m) * 255),
  };
}

function openColorPicker() {
  el.colorPickerMenu.classList.add('open');
}

function closeColorPicker() {
  el.colorPickerMenu.classList.remove('open');
}

function updateColorInputs(hex: string) {
  const normalized = normalizeHex(hex);
  const rgb = hexToRgb(normalized);
  currentHSV = rgbToHsv(rgb.r, rgb.g, rgb.b);
  const rgbFromHsv = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
  const updatedHex = rgbToHex(rgbFromHsv.r, rgbFromHsv.g, rgbFromHsv.b);
  el.editColorHex.textContent = updatedHex;
  el.editColorHexInput.value = updatedHex;
  el.colorPickerMenu.style.setProperty('--picker-bg', updatedHex);
  el.pickerHexCard.style.setProperty('--picker-bg', updatedHex);
  el.colorPickerMenu.style.setProperty('--picker-text', getContrastColor(updatedHex));
  el.pickerHexCard.style.setProperty('--picker-text', getContrastColor(updatedHex));
  el.hueValue.textContent = `${Math.round(currentHSV.h)}°`;
  setColorField(updatedHex);
  el.pickerSurface.style.setProperty('--picker-hue', `hsl(${currentHSV.h},100%,50%)`);
  el.hueThumb.style.left = `${(currentHSV.h / 360) * 100}%`;
  el.pickerSurfaceThumb.style.left = `${currentHSV.s * 100}%`;
  el.pickerSurfaceThumb.style.top = `${(1 - currentHSV.v) * 100}%`;
}

function updateFromHSV() {
  const rgb = hsvToRgb(currentHSV.h, currentHSV.s, currentHSV.v);
  const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
  el.editColorHex.textContent = hex;
  el.editColorHexInput.value = hex;
  el.colorPickerMenu.style.setProperty('--picker-bg', hex);
  el.pickerHexCard.style.setProperty('--picker-bg', hex);
  el.colorPickerMenu.style.setProperty('--picker-text', getContrastColor(hex));
  el.pickerHexCard.style.setProperty('--picker-text', getContrastColor(hex));
  el.hueValue.textContent = `${Math.round(currentHSV.h)}°`;
  setColorField(hex);
  el.pickerSurface.style.setProperty('--picker-hue', `hsl(${currentHSV.h},100%,50%)`);
  el.hueThumb.style.left = `${(currentHSV.h / 360) * 100}%`;
  el.pickerSurfaceThumb.style.left = `${currentHSV.s * 100}%`;
  el.pickerSurfaceThumb.style.top = `${(1 - currentHSV.v) * 100}%`;
}

function updateSurfacePosition(event: PointerEvent) {
  const rect = el.pickerSurface.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  currentHSV.s = x;
  currentHSV.v = 1 - y;
  updateFromHSV();
}

function updateHuePosition(event: PointerEvent) {
  const rect = el.hueSlider.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  currentHSV.h = x * 360;
  updateFromHSV();
}

el.openProductEdit.addEventListener('click', () => {
  openProductEditor(-1);
});
el.closeEditBtn.addEventListener('click', () => openScreen('salesScreen'));

el.editColorHexInput.addEventListener('input', () => {
  const rawValue = el.editColorHexInput.value;
  if (/^#?[A-Fa-f0-9]{6}$/.test(rawValue.trim())) {
    updateColorInputs(rawValue);
  }
});

el.colorGroup.addEventListener('click', () => {
  openColorPicker();
});

el.pickerSurface.addEventListener('pointerdown', (event) => {
  updateSurfacePosition(event);
  const move = (moveEvent: PointerEvent) => updateSurfacePosition(moveEvent);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

el.hueSlider.addEventListener('pointerdown', (event) => {
  updateHuePosition(event);
  const move = (moveEvent: PointerEvent) => updateHuePosition(moveEvent);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
});

el.colorPickerMenu.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const preset = target.closest('.color-preset') as HTMLButtonElement | null;
  if (!preset) return;
  const presetColor = preset.style.getPropertyValue('--preset');
  if (presetColor) updateColorInputs(presetColor.trim());
});

document.addEventListener('pointerdown', (event) => {
  if (!el.colorPickerMenu.classList.contains('open')) return;
  const target = event.target as HTMLElement;
  if (el.colorPickerMenu.contains(target) || el.colorGroup.contains(target)) return;
  closeColorPicker();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeColorPicker();
});

function getContrastColor(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (r * 0.299 + g * 0.587 + b * 0.114) > 160 ? '#071f1d' : '#ffffff';
}

function setColorField(hex: string) {
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  el.colorGroup.style.setProperty('--color-field-bg', color);
  el.colorGroup.style.background = color;
  el.editColorHex.style.color = getContrastColor(color);
}

function showToast(msg: string) {
  el.toast.textContent = msg;
  el.toast.classList.add('show');
  clearTimeout((showToast as typeof showToast & { t?: number }).t);
  (showToast as typeof showToast & { t?: number }).t = window.setTimeout(() => el.toast.classList.remove('show'), 900);
}

document.querySelectorAll('.nav button').forEach((b) => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.nav button').forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const target = document.getElementById(b.getAttribute('data-tab') || '') as HTMLElement;
    if (target) target.classList.add('active');
  });
});

el.reset.addEventListener('click', () => {
  tx.length = 0;
  saveSales();
  render(true);
  showToast('Sales cleared');
});

makeTiles();
render();

if (Capacitor.isNativePlatform()) {
  document.body.classList.add('capacitor-native');
}
