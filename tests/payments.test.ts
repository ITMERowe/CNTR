// Payment methods per product. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PAYMENT_METHODS, paymentClass, paymentsInUse, productPayments, togglePayment } from '../src/payments.ts';
import type { SaleRecord } from '../src/types.ts';

const sale = (payment: string): SaleRecord => ({ product: 'Poster', price: 1, cost: 0, payment, timestamp: new Date(0) });

test('the methods on offer, in their fixed order', () => {
  assert.deepEqual(PAYMENT_METHODS, ['Cash', 'QRIS', 'Transfer', 'Card', 'E-wallet']);
});

test('a product saved before payment methods existed takes Cash and QRIS', () => {
  assert.deepEqual(productPayments({ name: 'Old', price: 1, cost: 0, color: '#000000' }), ['Cash', 'QRIS']);
  assert.deepEqual(productPayments({ name: 'New', price: 1, cost: 0, color: '#000000', payments: ['Transfer'] }), ['Transfer']);
});

test('choosing methods: at most 2, never none, kept in the fixed order', () => {
  assert.deepEqual(togglePayment(['Cash'], 'Card'), ['Cash', 'Card']);
  assert.deepEqual(togglePayment(['Card'], 'Cash'), ['Cash', 'Card'], 'fixed order, not tap order');
  assert.deepEqual(togglePayment(['Cash', 'QRIS'], 'Card'), ['QRIS', 'Card'], 'a third swaps out the oldest (default: the first)');
  assert.deepEqual(togglePayment(['Cash', 'QRIS'], 'Card', 'QRIS'), ['Cash', 'Card'], 'a third swaps out the given oldest pick');
  assert.deepEqual(togglePayment(['Cash', 'QRIS'], 'QRIS'), ['Cash']);
  assert.deepEqual(togglePayment(['Cash'], 'Cash'), ['Cash'], 'the last one cannot be removed');
});

test('methods used in a set of sales: fixed order first, then any unknown ones', () => {
  assert.deepEqual(paymentsInUse([sale('E-wallet'), sale('Cash'), sale('Gift card'), sale('Cash')]), ['Cash', 'E-wallet', 'Gift card']);
  assert.deepEqual(paymentsInUse([]), []);
});

test('each method has a CSS class for its colour', () => {
  assert.deepEqual(PAYMENT_METHODS.map(paymentClass), ['pay-cash', 'pay-qris', 'pay-transfer', 'pay-card', 'pay-ewallet']);
});
