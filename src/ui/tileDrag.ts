// Sell: hold a tile, then drag it to move it (up/down in one column; anywhere on tablets' multi-column grid). A plain tap still sells; a hold never does.
// shortcut: the page doesn't scroll while dragging, so a tile moves only within what's on screen; add edge auto-scroll if long lists need it.
import { feedback } from '../feedback';

const HOLD_MS = 400;
/** A finger that moves this far before the hold is up is scrolling, not picking up a tile. */
const SLOP_PX = 8;

interface Drag {
  tile: HTMLElement;
  tiles: HTMLElement[];
  /** Each tile's box when it was picked up (the page can't scroll mid-drag). */
  rects: DOMRect[];
  /** Grid columns: 1 on phones in portrait, more on wide screens (see .sales-grid in style.css). */
  cols: number;
  /** How far the other tiles slide to make room: the held tile's height plus the grid gap. */
  step: number;
  startX: number;
  startY: number;
  from: number;
  to: number;
}

/** `enabled` is read on each touch (off while tiles are auto-sorted); `onDrop` gets the product name and its new index. */
export function initTileDrag(grid: HTMLElement, enabled: () => boolean, onDrop: (name: string, to: number) => void) {
  let timer = 0;
  let down: { x: number; y: number } | null = null;
  let drag: Drag | null = null;
  // The click that ends a hold must not count as a sale (or open the editor).
  let swallowClick = false;

  function pickUp(tile: HTMLElement, x: number, y: number) {
    const tiles = [...grid.querySelectorAll<HTMLElement>('.tile')];
    const rects = tiles.map((node) => node.getBoundingClientRect());
    const from = tiles.indexOf(tile);
    const style = getComputedStyle(grid);
    const cols = style.gridTemplateColumns.split(' ').length;
    drag = { tile, tiles, rects, cols, step: rects[from].height + parseFloat(style.rowGap), startX: x, startY: y, from, to: from };
    swallowClick = true;
    grid.classList.add('is-reordering');
    tile.classList.add('is-dragging');
    feedback('step');
  }

  function move(x: number, y: number) {
    if (!drag) return;
    const { tile, tiles, rects, cols, step, startX, startY, from } = drag;
    const mid = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const dy = y - startY;
    if (cols === 1) {
      // One column: it passes a tile once its middle passes that tile's middle; the others slide by its height.
      tile.style.transform = `translateY(${dy}px)`;
      const centre = mid(rects[from]).y + dy;
      const to = (drag.to = rects.filter((r, i) => i !== from && mid(r).y < centre).length);
      tiles.forEach((node, i) => {
        if (i === from) return;
        const shift = from < to && i > from && i <= to ? -step : to < from && i >= to && i < from ? step : 0;
        node.style.transform = shift ? `translateY(${shift}px)` : '';
      });
      return;
    }
    // Several columns: it goes to the slot whose middle is nearest its own; the tiles in between move one slot along.
    const dx = x - startX;
    tile.style.transform = `translate(${dx}px, ${dy}px)`;
    const centre = { x: mid(rects[from]).x + dx, y: mid(rects[from]).y + dy };
    const gaps = rects.map((r) => Math.hypot(mid(r).x - centre.x, mid(r).y - centre.y));
    const to = (drag.to = gaps.indexOf(Math.min(...gaps)));
    tiles.forEach((node, i) => {
      if (i === from) return;
      const slot = from < to && i > from && i <= to ? i - 1 : to < from && i >= to && i < from ? i + 1 : i;
      node.style.transform = slot === i ? '' : `translate(${rects[slot].left - rects[i].left}px, ${rects[slot].top - rects[i].top}px)`;
    });
  }

  function release() {
    window.clearTimeout(timer);
    down = null;
    if (!drag) return;
    const { tile, tiles, from, to } = drag;
    drag = null;
    tiles.forEach((node) => (node.style.transform = ''));
    grid.classList.remove('is-reordering');
    tile.classList.remove('is-dragging');
    feedback('step');
    if (to !== from) onDrop(tile.dataset.product!, to);
    // The click (if any) comes right after pointerup; after that, taps sell again.
    window.setTimeout(() => (swallowClick = false));
  }

  grid.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || !enabled()) return;
    const tile = (event.target as Element).closest<HTMLElement>('.tile');
    if (!tile) return;
    down = { x: event.clientX, y: event.clientY };
    timer = window.setTimeout(() => pickUp(tile, event.clientX, event.clientY), HOLD_MS);
  });
  window.addEventListener('pointermove', (event) => {
    if (drag) move(event.clientX, event.clientY);
    else if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > SLOP_PX) release();
  });
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  // While a tile is held the page must not scroll under it.
  grid.addEventListener('touchmove', (event) => drag && event.preventDefault(), { passive: false });
  grid.addEventListener('contextmenu', (event) => event.preventDefault());
  grid.addEventListener(
    'click',
    (event) => {
      if (!swallowClick) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
}
