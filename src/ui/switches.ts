// Every on/off switch: the knob stretches like a drop while it slides, then squishes at the edge (owner's reference, 2026-11-04).
// The slide is a CSS transition on `left`; this is the shape, on `transform` (a transition on the same property would be dropped). Played from a tap because CSS keyframes would replay whenever a screen opens.
const DROP_MS = 340; // --dur-liquid
const DROP: Keyframe[] = [
  { transform: 'scale(1, 1)', easing: 'ease-out' },
  { transform: 'scale(1.55, 0.8)', offset: 0.3, easing: 'ease-in-out' },
  { transform: 'scale(0.82, 1.14)', offset: 0.6, easing: 'ease-out' },
  { transform: 'scale(1.04, 0.98)', offset: 0.8, easing: 'ease-out' },
  { transform: 'scale(1, 1)' },
];

function play(control: Element | null | undefined) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  control?.querySelector('.switch-track')?.animate(DROP, { duration: DROP_MS, pseudoElement: '::before' });
}

export function initSwitches() {
  document.addEventListener('change', (e) => play((e.target as Element).closest('.switch')));
  document.addEventListener('click', (e) => play((e.target as Element).closest('.product-toggle-btn')));
}
