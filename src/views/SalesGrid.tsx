import { fmt, needsDarkText } from '../formatters';
import { productPayments } from '../payments';
import type { Product } from '../types';
import type { IconName } from '../ui/icons';
import { Icon } from './Icon';

const PAYMENT_ICONS: Record<string, IconName> = { Cash: 'banknote', QRIS: 'qr', Transfer: 'landmark', Card: 'credit-card', 'E-wallet': 'wallet' };

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
}

export function SalesGrid({ products, counts, pulse, onAdd, onUndo, onEdit }: Props) {
  if (!products.length) {
    return (
      <div class="grid-empty">
        <strong>No products on the counter</strong>
        <span>Tap + to add one, or turn one on in Settings → Products.</span>
      </div>
    );
  }

  return (
    <>
      {products.map((product, index) => {
        const payments = productPayments(product);
        return (
          <article class={needsDarkText(product.color) ? 'tile on-light' : 'tile'} key={product.name} data-product={product.name} style={{ '--tile': product.color, '--i': index }}>
            <div class="tile-head">
              <div class="tile-meta">
                <h2 class="product-name">{product.name}</h2>
                <span class="product-price">{fmt(product.price)}</span>
              </div>
              <button class="tile-edit settings-btn" type="button" aria-label={`Edit ${product.name}`} onClick={() => onEdit(product)}>
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
                      aria-label={`Add ${payment} sale of ${product.name}, ${count} so far`}
                      onClick={() => onAdd(product, payment)}
                    >
                      <span class="pay-label">
                        <Icon name={PAYMENT_ICONS[payment] ?? 'banknote'} />
                        {payment}
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
                      aria-label={`Undo last ${payment} sale of ${product.name}`}
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
