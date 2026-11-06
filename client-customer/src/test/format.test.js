import { describe, expect, test } from 'vitest';
import { formatKm, formatPriceShort, formatVnd, shortId } from '../lib/format';
import * as labels from '../lib/labels';
import constants from '../../../server/src/constants';

// Intl puts a non-breaking space before the currency sign
const plain = (s) => s.replace(/\s/g, ' ');

describe('format', () => {
  test('prices in VND', () => {
    expect(plain(formatVnd(609_000_000))).toBe('609.000.000 ₫');
    expect(plain(formatVnd(undefined))).toBe('0 ₫');
  });

  test('short prices', () => {
    expect(formatPriceShort(545_000_000)).toBe('545 triệu');
    expect(formatPriceShort(1_530_000_000)).toBe('1,53 tỷ');
    expect(formatPriceShort(2_000_000_000)).toBe('2 tỷ');
    expect(formatPriceShort(999_600_000)).toBe('1 tỷ'); // not "1.000 triệu"
  });

  test('km and order codes', () => {
    expect(formatKm(45000)).toBe('45.000 km');
    expect(shortId('6650f1c2a9b3e4d5f6177287')).toBe('#177287');
  });
});

// The website must have a Vietnamese name for every code the API can send
describe('labels match the API', () => {
  test.each([
    ['FUEL', 'FUELS'],
    ['TRANSMISSION', 'TRANSMISSIONS'],
    ['BODY_TYPE', 'BODY_TYPES'],
    ['CONDITION', 'CONDITIONS'],
    ['ORDER_STATUS', 'ORDER_STATUSES'],
    ['PAYMENT_STATUS', 'PAYMENT_STATUSES']
  ])('%s', (label, constant) => {
    expect(Object.keys(labels[label]).sort()).toEqual([...constants[constant]].sort());
  });
});
