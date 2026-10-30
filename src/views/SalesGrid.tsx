import { fmt, needsDarkText } from '../formatters';
import { FREE_PAYMENT, productPayments } from '../payments';
import { groupTiles, variantLabel } from '../groups';
import type { Product } from '../types';
import type { IconName } from '../ui/icons';
import { Icon } from './Icon';
import { t } from '../i18n';

const PAYMENT_ICONS: Record<string, IconName> = { Cash: 'banknote', QRIS: 'qr', Transfer: 'landmark', Card: 'credit-card', 'E-wallet': 'wallet', [FREE_PAYMENT]: 'gift' };

/** A long name shrinks first; a very long one also wraps to 2 lines, so it never grows the tile past the screen. */
function nameClass(name: string) {
  if (name.length > 22) return 'product-name is-long is-wrap';
  if (name.length > 14) return 'product-name is-long';
  return 'product-name';
}

/** When a group last folded or unfolded: the tiles under the finger just moved, so a tap right after is a stray, not a sale. */
let toggledAt = 0;
const justToggled = () => Date.now() - toggledAt < 400;

/** The last counter change, so only that counter animates and in the right direction. */
export interface TapPulse {
  product: string;
  payment: string;
  direction: 'up' | 'down';
  id: number;
}

interface Props {
  products: Product[];
  /** Sales count per `${payment}\u0000${product}`. */
  counts: Map<string, number>;
  pulse: TapPulse | null;
  onAdd: (product: Product, payment: string) => void;
  onUndo: (product: Product, payment: string) => void;
  onEdit: (product: Product) => void;
  /** Groups folded to their header row (lowercased names). */
  collapsed: string[];
  onToggleGroup: (group: string) => void;
  onAddProduct: () => void;
}

export function SalesGrid({ products, counts, pulse, onAdd, onUndo, onEdit, collapsed, onToggleGroup, onAddProduct }: Props) {
  if (!products.length) {
    return (
      <button class="grid-empty" type="button" onClick={onAddProduct}>
        <strong>{t('sell.empty')}</strong>
        <span>{t('sell.emptyText')}</span>
      </button>
    );
  }

  const row = (product: Product) => <TilePay product={product} counts={counts} pulse={pulse} onAdd={onAdd} onUndo={onUndo} />;
  const head = (product: Product) => (
    <div class="tile-head">
      <div class="tile-meta">
        <h2 class={nameClass(product.name)}>{product.name}</h2>
        <span class="product-price">{product.price === 0 ? FREE_PAYMENT : fmt(product.price)}</span>
      </div>
      <button class="tile-edit settings-btn" type="button" aria-label={t('edit.named', { name: product.name })} onClick={() => onEdit(product)}>
        <Icon name="pencil" />
      </button>
    </div>
  );

  return (
    <>
      {groupTiles(products).map((tile, index) => {
        const [first] = tile;
        const className = needsDarkText(first.color) ? 'tile on-light' : 'tile';
        const style = { '--tile': first.color, '--i': index };
        if (!first.group) {
          return (
            <article class={className} key={first.name} data-product={first.name} style={style}>
              {head(first)}
              {row(first)}
            </article>
          );
        }
        // A group: its name and one pencil once, then one tight row per variant (each its own product, sold and undone on its own).
        // Compact tiles show the payment labels once, as column headers, so the rows hold only counts.
        const paid = tile.find((variant) => variant.price !== 0);
        const payments = paid ? productPayments(paid) : [];
        const folded = collapsed.includes(first.group.toLowerCase());
        const sold = tile.reduce((sum, variant) => sum + payMethods(variant).reduce((n, payment) => n + (counts.get(`${payment}\u0000${variant.name}`) ?? 0), 0), 0);
        return (
          <article class={`${className} tile-group${folded ? ' is-folded' : ''}`} key={`group:${first.group.toLowerCase()}`} data-product={first.name} data-group={first.group} style={style}>
            <div class="tile-group-head">
              <div class="tile-group-title">
                {/* Folding is a disclosure: the heading holds the toggle; the pencil beside it never folds. */}
                <h2 class="tile-group-heading">
                  <button
                    class="tile-group-toggle"
                    type="button"
                    aria-expanded={!folded}
                    aria-label={folded ? `${first.group}, ${t('sell.groupSold', { count: sold })}` : undefined}
                    onClick={() => {
                      toggledAt = Date.now();
                      onToggleGroup(first.group!);
                    }}
                  >
                    <span class={`${nameClass(first.group)} group-name`}>{first.group}</span>
                    {folded && <span class="tile-group-sold">{t('sell.groupSold', { count: sold })}</span>}
                    <Icon name="chevron-down" />
                  </button>
                </h2>
                <button class="tile-edit settings-btn" type="button" aria-label={t('edit.named', { name: first.group })} onClick={() => onEdit(first)}>
                  <Icon name="pencil" />
                </button>
              </div>
              {!folded && (
                <div class={payments.length === 1 ? 'tile-group-pays tile-pay-single' : 'tile-group-pays'} aria-hidden="true">
                  {payments.map((payment) => (
                    <span class="pay-label" key={payment}>
                      <Icon name={PAYMENT_ICONS[payment] ?? 'banknote'} />
                      <span class="pay-name">{payment}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {!folded && tile.map((variant) => {
              const label = variantLabel(variant);
              return (
                <section class="variant" key={variant.name} data-variant={variant.name}>
                  <div class="variant-meta">
                    <h3 class={nameClass(label)}>{label}</h3>
                    <span class="product-price">{variant.price === 0 ? FREE_PAYMENT : fmt(variant.price)}</span>
                  </div>
                  {row(variant)}
                </section>
              );
            })}
          </article>
        );
      })}
    </>
  );
}

/** A free product has nothing to pay with: one plain counter instead of per-payment-method buttons. */
const payMethods = (product: Product) => (product.price === 0 ? [FREE_PAYMENT] : productPayments(product));

/** A product's payment buttons: one per method (or one Free counter), each with its count and undo. */
function TilePay({ product, counts, pulse, onAdd, onUndo }: { product: Product; counts: Props['counts']; pulse: TapPulse | null; onAdd: Props['onAdd']; onUndo: Props['onUndo'] }) {
  const payments = payMethods(product);
  return (
    <div class={payments.length === 1 ? 'tile-pay tile-pay-single' : 'tile-pay'}>
      {payments.map((payment) => {
        const count = counts.get(`${payment}\u0000${product.name}`) ?? 0;
        const pulsed = pulse && pulse.product === product.name && pulse.payment === payment ? pulse : null;
        return (
          <div class={count ? 'pay is-sold' : 'pay'} data-payment={payment} key={payment}>
            <button
              class="pay-add"
              type="button"
              data-payment={payment}
              data-action="plus"
              aria-label={t('sell.addLabel', { payment, name: product.name, count })}
              onClick={() => justToggled() || onAdd(product, payment)}
            >
              <span class="pay-label">
                <Icon name={PAYMENT_ICONS[payment] ?? 'banknote'} />
                <span class="pay-name">{payment}</span>
              </span>
              <span class="pay-count" aria-hidden="true">
                {/* Re-keying on each change restarts the roll animation. */}
                <span key={`${count}-${pulsed?.id ?? 0}`} class={`payment-value roll-${pulsed?.direction ?? 'none'}`} data-counter-for={payment}>
                  {count}
                </span>
              </span>
              <span class="pay-plus" aria-hidden="true">
                <Icon name="plus" />
              </span>
            </button>
            <button
              class="pay-undo"
              type="button"
              data-payment={payment}
              data-action="minus"
              aria-label={t('sell.undoLabel', { payment, name: product.name })}
              disabled={count === 0}
              onClick={() => justToggled() || onUndo(product, payment)}
            >
              <Icon name="minus" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
