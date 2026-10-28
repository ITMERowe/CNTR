import { fmt, needsDarkText } from '../formatters';
import { FREE_PAYMENT, productPayments } from '../payments';
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
  onAddProduct: () => void;
}

export function SalesGrid({ products, counts, pulse, onAdd, onUndo, onEdit, onAddProduct }: Props) {
  if (!products.length) {
    return (
      <button class="grid-empty" type="button" onClick={onAddProduct}>
        <strong>{t('sell.empty')}</strong>
        <span>{t('sell.emptyText')}</span>
      </button>
    );
  }

  return (
    <>
      {products.map((product, index) => {
        // A free product has nothing to pay with: one plain counter instead of per-payment-method buttons.
        const payments = product.price === 0 ? [FREE_PAYMENT] : productPayments(product);
        return (
          <article class={needsDarkText(product.color) ? 'tile on-light' : 'tile'} key={product.name} data-product={product.name} style={{ '--tile': product.color, '--i': index }}>
            <div class="tile-head">
              <div class="tile-meta">
                <h2 class={nameClass(product.name)}>{product.name}</h2>
                <span class="product-price">{product.price === 0 ? FREE_PAYMENT : fmt(product.price)}</span>
              </div>
              <button class="tile-edit settings-btn" type="button" aria-label={t('edit.named', { name: product.name })} onClick={() => onEdit(product)}>
                <Icon name="pencil" />
              </button>
            </div>
            <div class={payments.length === 1 ? 'tile-pay tile-pay-single' : 'tile-pay'}>
              {payments.map((payment) => {
                const count = counts.get(`${payment}\u0000${product.name}`) ?? 0;
                const pulsed = pulse && pulse.product === product.name && pulse.payment === payment ? pulse : null;
                return (
                  <div class="pay" data-payment={payment} key={payment}>
                    <button
                      class="pay-add"
                      type="button"
                      data-payment={payment}
                      data-action="plus"
                      aria-label={t('sell.addLabel', { payment, name: product.name, count })}
                      onClick={() => onAdd(product, payment)}
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
                      onClick={() => onUndo(product, payment)}
                    >
                      <Icon name="minus" />
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
        );
      })}
    </>
  );
}
