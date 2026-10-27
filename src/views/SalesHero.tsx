import { useEffect, useRef, useState } from 'preact/hooks';
import { fmt } from '../formatters';
import { t, tn } from '../i18n';

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

/** Today's totals at the top of the Sell screen; after End day the label says which day. */
export function SalesHero({ revenue, profit, count, day }: { revenue: number; profit: number; count: number; day: number }) {
  const shown = useCountUp(revenue);
  return (
    <>
      <span class="eyebrow">{day > 1 ? t('hero.dayRevenue', { day }) : t('revenue')}</span>
      <span class="hero-figure" aria-label={fmt(revenue)} style={{ '--chars': fmt(revenue).length }}>
        {fmt(shown)}
      </span>
      <span class="hero-meta">
        <span>{tn('count.sale', count)}</span>
        <span class="dot" aria-hidden="true" />
        <span class={profit < 0 ? 'is-negative' : profit > 0 ? 'is-positive' : undefined}>{t('profit.amount', { amount: fmt(profit) })}</span>
      </span>
    </>
  );
}
