import assert from 'node:assert/strict';
import { test } from 'node:test';
import { en, id, initialLanguage, locale, setLanguage, t } from '../src/i18n.ts';

test('a fresh install follows an Indonesian phone; everything else starts in English', () => {
  assert.equal(initialLanguage('id-ID', true), 'id');
  assert.equal(initialLanguage('id', true), 'id');
  assert.equal(initialLanguage('en-US', true), 'en');
  assert.equal(initialLanguage('ms-MY', true), 'en');
  // Updating from an older version: English until the user picks Indonesian, whatever the phone says.
  assert.equal(initialLanguage('id-ID', false), 'en');
});

test('every English text has an Indonesian one with the same {placeholders}', () => {
  const holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    assert.ok(id[key]?.trim(), `${key} has no Indonesian text`);
    assert.equal(holes(id[key]), holes(en[key]), `${key} placeholders differ`);
  }
  assert.deepEqual(Object.keys(id).sort(), Object.keys(en).sort());
});

test('t() fills placeholders and follows the language; locale() follows too', () => {
  setLanguage('en');
  assert.equal(t('event.defaultName', { date: '1 Nov 2026' }), 'Event 1 Nov 2026');
  assert.equal(locale(), 'en-GB');
  setLanguage('id');
  assert.equal(t('event.defaultName', { date: '1 Nov 2026' }), 'Acara 1 Nov 2026');
  assert.equal(locale(), 'id-ID');
  setLanguage('en');
});
