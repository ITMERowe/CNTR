// Sell on wide screens (2-3 columns): each column stacks its tiles on its own, so a tall group tile leaves no gap beside it.
// Each tile goes into the shortest column (owner, 0.1.2), placed on a grid of 1px rows; one column (phones) is left to plain CSS.

/** Column and top (px) for each tile, in order: each goes into the shortest column so far (ties: the leftmost). */
export function placeColumns(heights: number[], cols: number, gap: number) {
  const tops = Array<number>(cols).fill(0);
  return heights.map((height) => {
    const col = tops.indexOf(Math.min(...tops));
    const top = tops[col];
    tops[col] += Math.ceil(height) + gap;
    return { col, top };
  });
}

export function initMasonry(grid: HTMLElement) {
  let frame = 0;
  const layout = () => {
    frame = 0;
    // Hidden (another tab): columns read as the unresolved "minmax(0px, 1fr)". Showing it resizes the grid, which lays out again.
    if (!grid.offsetWidth) return;
    const tiles = [...grid.querySelectorAll<HTMLElement>(':scope > .tile')];
    const cols = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    const on = cols > 1 && tiles.length > 0;
    grid.classList.toggle('is-masonry', on);
    if (!on) return tiles.forEach((tile) => (tile.style.gridColumn = tile.style.gridRow = ''));
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    placeColumns(tiles.map((tile) => tile.getBoundingClientRect().height), cols, gap).forEach(({ col, top }, i) => {
      tiles[i].style.gridColumn = String(col + 1);
      tiles[i].style.gridRow = `${top + 1} / span ${Math.max(1, Math.ceil(tiles[i].getBoundingClientRect().height))}`;
    });
  };
  const schedule = () => (frame ||= requestAnimationFrame(layout));
  // Heights change on fold, compact mode, new tiles and screen width; placing a tile never resizes it, so this can't loop.
  const sizes = new ResizeObserver(schedule);
  sizes.observe(grid);
  new MutationObserver(() => {
    grid.querySelectorAll(':scope > .tile').forEach((tile) => sizes.observe(tile));
    schedule();
  }).observe(grid, { childList: true });
}
