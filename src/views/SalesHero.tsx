import { useEffect, useRef, useState } from 'preact/hooks';
import { fmt, splitFigure } from '../formatters';
import { t, tn } from '../i18n';

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Counts from the previous value to `value` with an ease-out, so a new sale "lands" in the total. */
function useCountUp(value: number, duration = 200) {
  const [shown, setShown] = useState(value);
  // The number on screen, so a sale landing mid-count continues from there instead of jumping.
  const onScreen = useRef(value);

  useEffect(() => {
    const start = onScreen.current;
    if (start === value || prefersReducedMotion()) {
      onScreen.current = value;
      setShown(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - t) ** 3;
      onScreen.current = Math.round(start + (value - start) * eased);
      setShown(onScreen.current);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return shown;
}

/** Today's totals at the top of the Sell screen. No label (owner, 0.1.2): the figure is clearly revenue; screen readers still hear it. */
export function SalesHero({ revenue, profit, count }: { revenue: number; profit: number; count: number }) {
  const shown = useCountUp(revenue);
  const { sign, symbol, number } = splitFigure(fmt(shown));
  return (
    <>
      <span class="hero-figure" aria-label={`${t('revenue')} ${fmt(revenue)}`} style={{ '--chars': fmt(revenue).length }}>
        {sign}
        <span class="hero-figure-symbol">{symbol}</span> {number}
      </span>
      <span class="hero-meta">
        <span>{tn('count.sale', count)}</span>
        <span class="dot" aria-hidden="true" />
        <span class={profit < 0 ? 'is-negative' : profit > 0 ? 'is-positive' : undefined}>{t('profit.amount', { amount: fmt(profit) })}</span>
      </span>
    </>
  );
}
