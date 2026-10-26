import { useEffect, useRef, useState } from 'preact/hooks';
import { fmt } from '../formatters';
import { plural } from '../reports';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Counts from the previous value to `value` with an ease-out, so a new sale "lands" in the total. */
function useCountUp(value: number, duration = 420) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);

  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (start === value || prefersReducedMotion()) {
      setShown(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

/** Live totals at the top of the Sell screen. */
export function SalesHero({ revenue, profit, count }: { revenue: number; profit: number; count: number }) {
  const shown = useCountUp(revenue);
  return (
    <>
      <span class="eyebrow">Revenue</span>
      <span class="hero-figure" aria-label={fmt(revenue)}>
        {fmt(shown)}
      </span>
      <span class="hero-meta">
        <span>{plural(count, 'sale')}</span>
        <span class="dot" aria-hidden="true" />
        <span class={profit < 0 ? 'is-negative' : profit > 0 ? 'is-positive' : undefined}>{fmt(profit)} profit</span>
      </span>
    </>
  );
}
