// HSV colour picker used by the product editor.
import { inkFor, normalizeHex } from '../formatters';
import type { HSV } from '../types';
import { el } from './dom';

let currentHSV: HSV = { h: 340, s: 0.68, v: 0.97 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex);
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function rgbToHsv(r: number, g: number, b: number): HSV {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const delta = max - Math.min(rr, gg, bb);
  let h = 0;

  if (delta !== 0) {
    if (max === rr) h = ((gg - bb) / delta) % 6;
    else if (max === gg) h = (bb - rr) / delta + 2;
    else h = (rr - gg) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: HSV) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [rr, gg, bb] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: Math.round((rr + m) * 255), g: Math.round((gg + m) * 255), b: Math.round((bb + m) * 255) };
}

/** Renders `currentHSV` into the colour field, hex input and picker controls. */
function applyCurrentColor() {
  const { r, g, b } = hsvToRgb(currentHSV);
  const hex = rgbToHex(r, g, b);

  el.editColorHex.textContent = hex;
  el.editColorHexInput.value = hex;
  // The colour field doubles as a live preview of the product tile.
  el.colorField.style.setProperty('--tile', hex);
  el.colorField.style.setProperty('--ink', inkFor(hex));
  el.hueValue.textContent = `${Math.round(currentHSV.h)}°`;
  el.pickerSurface.style.setProperty('--picker-hue', `hsl(${currentHSV.h},100%,50%)`);
  el.hueThumb.style.left = `${(currentHSV.h / 360) * 100}%`;
  el.pickerSurfaceThumb.style.left = `${currentHSV.s * 100}%`;
  el.pickerSurfaceThumb.style.top = `${(1 - currentHSV.v) * 100}%`;
}

export function setPickerColor(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  currentHSV = rgbToHsv(r, g, b);
  applyCurrentColor();
}

export function getPickerColor() {
  return (el.editColorHex.textContent || '#FFFFFF').trim();
}

export function closeColorPicker() {
  el.colorPickerMenu.classList.remove('open');
}

/** Calls `update` with the pointer position (0..1) relative to `area`, until the pointer is released. */
function trackPointer(area: HTMLElement, update: (x: number, y: number) => void) {
  area.addEventListener('pointerdown', (event) => {
    const move = (e: PointerEvent) => {
      const rect = area.getBoundingClientRect();
      update(clamp((e.clientX - rect.left) / rect.width, 0, 1), clamp((e.clientY - rect.top) / rect.height, 0, 1));
      applyCurrentColor();
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    move(event);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

export function initColorPicker() {
  el.colorField.addEventListener('click', () => el.colorPickerMenu.classList.add('open'));

  el.editColorHexInput.addEventListener('input', () => {
    const value = el.editColorHexInput.value.trim();
    if (/^#?[A-Fa-f0-9]{6}$/.test(value)) setPickerColor(value);
  });

  trackPointer(el.pickerSurface, (x, y) => {
    currentHSV.s = x;
    currentHSV.v = 1 - y;
  });
  trackPointer(el.hueSlider, (x) => {
    currentHSV.h = x * 360;
  });

  el.colorPickerMenu.addEventListener('click', (event) => {
    const preset = (event.target as HTMLElement).closest<HTMLElement>('.color-preset');
    const color = preset?.style.getPropertyValue('--preset').trim();
    if (color) setPickerColor(color);
  });

  // Close when tapping outside the picker or pressing Escape.
  document.addEventListener('pointerdown', (event) => {
    if (!el.colorPickerMenu.classList.contains('open')) return;
    const target = event.target as Node;
    if (!el.colorPickerMenu.contains(target) && !el.colorField.contains(target)) closeColorPicker();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeColorPicker();
  });
}
