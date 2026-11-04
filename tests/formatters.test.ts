// Money formatting and typed amounts. Run with `npm test`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatInputNumber, formatMoney, parseCurrencyInput } from '../src/money.ts';
import type { Currency } from '../src/types.ts';

const ALL: Currency[] = ['IDR', 'USD', 'EUR', 'SGD', 'AUD', 'GBP', 'JPY', 'MYR'];

test('a typed decimal keeps its value in currencies with cents', () => {
  assert.equal(formatInputNumber('2.50', 'USD'), '$ 2.50');
  assert.equal(parseCurrencyInput(formatInputNumber('2.50', 'USD'), 'USD'), 2.5);
  assert.equal(formatInputNumber('2,50', 'EUR'), '€ 2,50');
  assert.equal(parseCurrencyInput(formatInputNumber('2,50', 'EUR'), 'EUR'), 2.5);
  assert.equal(formatInputNumber('1250.5', 'GBP'), '£ 1,250.5');
});

test('typing a separator keeps it, so the cents can follow', () => {
  assert.equal(formatInputNumber('$ 2.', 'USD'), '$ 2.');
  assert.equal(formatInputNumber('.', 'USD'), '$ 0.');
  // The phone keyboard may offer the other separator: pressed last, it means the decimal.
  assert.equal(formatInputNumber('€ 2.', 'EUR'), '€ 2,');
  assert.equal(formatInputNumber('$ 2,', 'USD'), '$ 2.');
});

test('at most 2 decimals and one decimal separator', () => {
  assert.equal(formatInputNumber('$ 2.505', 'USD'), '$ 2.50');
  assert.equal(formatInputNumber('$ 2.5.', 'USD'), '$ 2.5');
});

test('IDR and JPY stay whole numbers', () => {
  assert.equal(formatInputNumber('25000', 'IDR'), 'Rp 25.000');
  assert.equal(formatInputNumber('Rp 25.000,5', 'IDR'), 'Rp 250.005');
  assert.equal(formatInputNumber('1500.', 'JPY'), '¥ 1,500');
});

test('a stored amount fills the field in its currency', () => {
  assert.equal(formatInputNumber(2.5, 'USD'), '$ 2.5');
  assert.equal(formatInputNumber(2.5, 'EUR'), '€ 2,5');
  assert.equal(formatInputNumber(25000, 'IDR'), 'Rp 25.000');
  assert.equal(formatInputNumber('', 'USD'), '');
});

test('every currency: a filled field reads back as the same amount', () => {
  for (const currency of ALL) {
    for (const amount of [0.5, 7, 1234, 98765.25]) {
      const expected = currency === 'IDR' || currency === 'JPY' ? Math.round(amount) : amount;
      assert.equal(parseCurrencyInput(formatInputNumber(expected, currency), currency), expected, `${currency} ${amount}`);
    }
  }
});

test('compact money rounds by the shown unit', () => {
  assert.equal(formatMoney(999500, 'IDR', true), 'Rp\u00a01M');
  assert.equal(formatMoney(-1500, 'USD', true), '-$\u00a01.5K');
});
