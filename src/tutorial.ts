// The hands-on tour: practice data to play with, the steps, and the hint bubble that walks through them.
import { feedback } from './feedback';
import { t, type Key } from './i18n';
import { liveDayCount, state, todayLiveSales } from './state';
import type { Currency, PastEvent, Product } from './types';
import { activeScreenId, el } from './ui/dom';

/** Set in sessionStorage just before the reload that starts the tour; a launch without it ends the tutorial. */
export const TOUR_SESSION_KEY = 'cntrTourRunning';

/** Two products and two finished events, priced for `currency`. `settings` (the stored JSON) carries over as is. */
export function practiceData(currency: Currency, now: Date, settings?: string) {
  const unit = currency === 'IDR' ? 5000 : currency === 'JPY' ? 100 : 1;
  const products: Product[] = [
    { name: 'Sticker', price: 2 * unit, cost: unit, color: '#f76495', payments: ['Cash', 'QRIS'] },
    { name: 'Keychain', price: 5 * unit, cost: 2 * unit, color: '#4f6eff', payments: ['Cash', 'QRIS'] },
  ];
  const event = (id: string, name: string, daysAgo: number, sold: [string, string, number][], rent: number): PastEvent => {
    const start = new Date(now);
    start.setDate(start.getDate() - daysAgo);
    start.setHours(10, 0, 0, 0);
    const sales = sold.flatMap(([product, payment, count]) => Array.from({ length: count }, () => ({ product, payment })));
    return {
      id,
      name,
      startedAt: start.toISOString(),
      endedAt: new Date(start.getTime() + 8 * 3600_000).toISOString(),
      dayBreaks: [],
      products,
      sales: sales.map(({ product, payment }, i) => {
        const { price, cost } = products.find((item) => item.name === product)!;
        return { product, price, cost, payment, timestamp: new Date(start.getTime() + (i + 1) * 9 * 60_000) };
      }),
      expenses: [{ id: `${id}-rent`, name: t('practice.rent'), amount: rent * unit }],
    };
  };
  const events = [
    event('practice-spring', t('practice.spring'), 14, [['Sticker', 'Cash', 12], ['Sticker', 'QRIS', 8], ['Keychain', 'Cash', 5], ['Keychain', 'QRIS', 6]], 10),
    event('practice-comic', t('practice.comic'), 7, [['Sticker', 'Cash', 7], ['Sticker', 'QRIS', 11], ['Keychain', 'Cash', 9], ['Keychain', 'QRIS', 8]], 12),
  ];
  const values = new Map([
    ['cntrProducts', JSON.stringify(products)],
    ['cntrProductHistory', JSON.stringify(products)],
    ['cntrEvents', JSON.stringify(events)],
  ]);
  if (settings) values.set('cntrSettings', settings);
  return values;
}

// ---- Steps ----

export interface TourStep {
  id: string;
  /** What to point at; the first visible match. None: the bubble just sits at the bottom. */
  target?: string;
  /** "Do" step: moves on once this is true. Without it (and without `tap`) the step has a Next button. */
  done?: () => boolean;
  /** "Do" step: moves on once the target is tapped. */
  tap?: boolean;
  /** Also tappable besides the target (the tour is on rails: everything else ignores taps). */
  allow?: string[];
  enter?: () => void;
}

const tile = (product: string, payment: string, action: 'plus' | 'minus') => `.tile[data-product="${product}"] [data-payment="${payment}"][data-action="${action}"]`;
const tab = (screen: string) => `.tabbar .tab[data-tab="${screen}"]`;
const sold = (product: string, payment: string) => todayLiveSales().filter((sale) => sale.product === product && sale.payment === payment).length;
const on = (screen: string) => () => activeScreenId() === screen;
const isOpen = (overlay: HTMLElement) => () => overlay.classList.contains('open');
let base = 0;

export const TOUR_STEPS: TourStep[] = [
  { id: 'sell-cash', target: tile('Sticker', 'Cash', 'plus'), done: () => sold('Sticker', 'Cash') > 0 },
  { id: 'sell-qris', target: tile('Sticker', 'QRIS', 'plus'), done: () => sold('Sticker', 'QRIS') > 0 },
  { id: 'undo', target: tile('Sticker', 'Cash', 'minus'), enter: () => (base = sold('Sticker', 'Cash')), done: () => sold('Sticker', 'Cash') < base },
  { id: 'totals', target: '#stats' },
  { id: 'add-open', target: '#openProductEdit', done: on('productEditScreen') },
  { id: 'add-details', target: '#editName', allow: ['#editPrice', '#editCost'] },
  { id: 'add-payments', target: '#editPayments' },
  { id: 'add-color', target: '#colorField', allow: ['#colorPickerMenu'] },
  { id: 'add-save', target: '#saveProductBtn', enter: () => (base = state.productHistory.length), done: () => state.productHistory.length > base },
  { id: 'event-tab', target: tab('eventScreen'), done: on('eventScreen') },
  { id: 'event-name', target: '#eventNameBtn' },
  { id: 'expense', target: '#openAddExpenseBtn', done: isOpen(el.expenseModalOverlay) },
  { id: 'expense-form', target: '#expenseModalOverlay .sheet', enter: () => (base = state.eventCosts.length), done: () => state.eventCosts.length > base },
  { id: 'end-day', target: '#endDayBtn', done: isOpen(el.confirmModalOverlay) },
  { id: 'end-day-confirm', target: '#confirmModalConfirmBtn', enter: () => (base = liveDayCount()), done: () => liveDayCount() > base },
  { id: 'end-event', target: '#endEventBtn', done: isOpen(el.saveModalOverlay) },
  { id: 'end-event-name', target: '#saveModalOverlay .sheet', done: isOpen(el.confirmModalOverlay) },
  { id: 'end-event-confirm', target: '#confirmModalConfirmBtn', enter: () => (base = state.pastEvents.length), done: () => state.pastEvents.length > base },
  { id: 'history-tab', target: tab('historyScreen'), done: on('historyScreen') },
  { id: 'history-open', target: '#pastEventList .event-row', done: on('pastEventScreen') },
  { id: 'history-edit', target: '#pastEventEditBtn', done: () => !el.pastEventEditBar.hidden },
  { id: 'history-adjust', target: '#pastEventCard [data-adjust][data-delta="1"]', tap: true },
  { id: 'history-save', target: '#pastEventSaveBtn', done: () => el.pastEventEditBar.hidden },
  { id: 'history-back', target: '#pastEventBackBtn', done: on('historyScreen') },
  { id: 'compare-open', target: '#compareEventsBtn', done: isOpen(el.compareModalOverlay) },
  { id: 'compare-pick', target: '#compareModalOverlay .sheet', done: on('compareEventScreen') },
  { id: 'compare-view', target: '#compareEventCard' },
  { id: 'done' },
];

// ---- The hint bubble, on rails ----

const visible = (element: Element) => element.getClientRects().length > 0;
// Ways out of a step that would leave the tour behind; never tappable unless a step targets them.
const EXITS = '[id$="CancelBtn"], [id$="CloseBtn"], .back-btn, #closeEditBtn';
const GUARDED = ['click', 'pointerdown', 'pointerup', 'mousedown', 'mouseup', 'dblclick', 'contextmenu'];
let running = false;

/** True while the tour is on screen (Android back does nothing then). */
export const tourRunning = () => running;

/**
 * Walks through `steps`; `onEnd(true)` after the last one, `onEnd(false)` on Quit. Like a game tutorial it is on
 * rails: only the bubble and the step's target (plus its `allow` list) take taps, and the rest of the screen is dimmed.
 */
export function runTour(steps: TourStep[], onEnd: (finished: boolean) => void) {
  const ring = Object.assign(document.createElement('div'), { className: 'tour-ring' });
  const bubble = Object.assign(document.createElement('div'), { className: 'tour-bubble' });
  bubble.setAttribute('role', 'dialog');
  bubble.setAttribute('aria-label', t('tutorial.label'));
  bubble.innerHTML =
    '<p class="tour-count"></p><p class="tour-text" aria-live="polite"></p>' +
    '<div class="tour-actions"><button type="button" class="btn btn-secondary" id="tourQuitBtn"></button><button type="button" class="btn btn-primary" id="tourNextBtn"></button></div>';
  const count = bubble.querySelector<HTMLElement>('.tour-count')!;
  const text = bubble.querySelector<HTMLElement>('.tour-text')!;
  const next = bubble.querySelector<HTMLButtonElement>('#tourNextBtn')!;
  const quit = bubble.querySelector<HTMLButtonElement>('#tourQuitBtn')!;
  quit.textContent = t('tutorial.quit');
  document.body.append(ring, bubble);
  running = true;

  let index = 0;
  let tapped = false;
  let missingSince = 0;
  const step = () => steps[index];
  const isDo = () => Boolean(step().done || step().tap);
  const target = () => (step().target ? [...document.querySelectorAll(step().target!)].find(visible) : undefined);

  function tappable(node: Element) {
    if (bubble.contains(node)) return true;
    const { target: selector, allow = [] } = step();
    if (selector && node.closest(selector)) {
      // Inside the target: its own ways out (a dialog's Cancel) stay off, unless the way out is the target itself.
      const exit = node.closest(EXITS);
      return !exit || exit.matches(selector);
    }
    return !node.closest(EXITS) && allow.some((s) => node.closest(s));
  }
  /** Swallows any tap that is not on the bubble or the step's target, before the app sees it. */
  function guard(event: Event) {
    if (event.target instanceof Element && tappable(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
  // Escape would close a dialog mid-step.
  function guardKeys(event: KeyboardEvent) {
    if (event.key === 'Escape') event.stopImmediatePropagation();
  }

  let placed = '';
  /** Runs every frame, so the ring follows a sliding sheet or a scroll; it only writes styles when something moved. */
  function place() {
    const found = target();
    const sheet = document.querySelector('.sheet-overlay.open');
    const rect = found && (!sheet || sheet.contains(found)) ? found.getBoundingClientRect() : null;
    const where = rect ? `${rect.top},${rect.left},${rect.width},${rect.height},${bubble.offsetHeight},${innerHeight}` : 'full';
    if (where === placed) return;
    placed = where;
    ring.classList.toggle('tour-ring-full', !rect);
    if (!rect) {
      // Nothing to point at (a look-only step): dim everything and show the bubble mid-screen.
      Object.assign(ring.style, { transform: '', width: '100%', height: '100%' });
      Object.assign(bubble.style, { top: '50%', transform: 'translateY(-50%)' });
      return;
    }
    // Moved with transform (no layout, cheap to animate on a phone), not top/left.
    Object.assign(ring.style, { transform: `translate(${rect.left - 4}px, ${rect.top - 4}px)`, width: `${rect.width + 8}px`, height: `${rect.height + 8}px` });
    bubble.style.transform = '';
    // The bubble goes on whichever side of the target has more room, but never under the status bar, a camera
    // cutout or the gesture bar (the safe-area insets): a target taller than the room left makes it overlap instead.
    const height = bubble.offsetHeight;
    const y = rect.top > innerHeight - rect.bottom ? rect.top - 12 - height : rect.bottom + 12;
    bubble.style.top = `max(calc(env(safe-area-inset-top) + 12px), min(${y}px, calc(${innerHeight - height - 12}px - env(safe-area-inset-bottom))))`;
  }

  function updateNext() {
    // "Do" steps have no Skip: only if their target cannot be found for 2 s (something unexpected is in the way).
    const stuck = isDo() && missingSince > 0 && Date.now() - missingSince > 2000;
    next.hidden = isDo() && !stuck;
    next.textContent = index === steps.length - 1 ? t('tutorial.finish') : stuck ? t('skip') : t('next');
  }

  function show(i: number) {
    index = i;
    tapped = false;
    missingSince = 0;
    step().enter?.();
    bubble.dataset.step = step().id;
    count.textContent = t('tutorial.count', { n: i + 1, total: steps.length });
    text.textContent = t(`tutorial.${step().id}` as Key);
    quit.hidden = i === steps.length - 1; // the last step only has Finish
    updateNext();
    target()?.scrollIntoView({ block: 'center' });
    place();
    // The new hint fades in (opacity only: smooth on any phone).
    bubble.classList.remove('tour-in');
    void bubble.offsetWidth;
    bubble.classList.add('tour-in');
  }

  function end(finished: boolean) {
    window.clearInterval(timer);
    cancelAnimationFrame(frame);
    for (const type of GUARDED) window.removeEventListener(type, guard, true);
    window.removeEventListener('keydown', guardKeys, true);
    document.removeEventListener('click', onTap, true);
    ring.remove();
    bubble.remove();
    running = false;
    onEnd(finished);
  }

  const advance = () => (index === steps.length - 1 ? end(true) : show(index + 1));
  function onTap(event: MouseEvent) {
    const selector = step().target;
    if (step().tap && selector && (event.target as Element).closest?.(selector)) tapped = true;
  }

  // Polling keeps the steps simple: the step moves on however its state comes about.
  const timer = window.setInterval(() => {
    const s = step();
    if ((s.tap && tapped) || s.done?.()) {
      feedback('step');
      advance();
      return;
    }
    if (target()) missingSince = 0;
    else missingSince ||= Date.now();
    updateNext();
  }, 250);
  let frame = 0;
  const follow = () => {
    place();
    frame = requestAnimationFrame(follow);
  };
  frame = requestAnimationFrame(follow);
  for (const type of GUARDED) window.addEventListener(type, guard, true);
  window.addEventListener('keydown', guardKeys, true);
  document.addEventListener('click', onTap, true);
  next.addEventListener('click', advance);
  quit.addEventListener('click', () => end(false));
  show(0);
}
