import { describe, expect, test } from 'vitest';
import { formatAxisVnd, formatMonth, formatNumber, formatPriceShort } from '../lib/format';
import { ApiError } from '../lib/api';
import * as labels from '../lib/labels';
import constants from '../../../server/src/constants';

describe('format', () => {
  test('chart axis amounts', () => {
    expect(formatAxisVnd(0)).toBe('0');
    expect(formatAxisVnd(300_000_000)).toBe('300 tr');
    expect(formatAxisVnd(1_500_000_000)).toBe('1,5 tỷ');
    expect(formatAxisVnd(999_800_000)).toBe('1 tỷ');
  });

  test('short prices round up to tỷ', () => {
    expect(formatPriceShort(999_700_000)).toBe('1 tỷ');
  });

  test('months and numbers', () => {
    expect(formatMonth('2026-03')).toBe('Tháng 3/2026');
    expect(formatMonth('2026-11', true)).toBe('T11');
    expect(formatNumber(12345)).toBe('12.345');
  });
});

describe('ApiError.fieldErrors', () => {
  test('keeps the first message for each field', () => {
    const err = new ApiError(400, 'Dữ liệu không hợp lệ', [
      { field: 'price', message: 'Giá phải lớn hơn 0' },
      { field: 'price', message: 'Giá phải là số' },
      { field: 'name', message: 'Thông tin này là bắt buộc' }
    ]);
    expect(err.fieldErrors()).toEqual({ price: 'Giá phải lớn hơn 0', name: 'Thông tin này là bắt buộc' });
  });
});

describe('labels match the API', () => {
  test.each([
    ['FUEL', 'FUELS'],
    ['TRANSMISSION', 'TRANSMISSIONS'],
    ['BODY_TYPE', 'BODY_TYPES'],
    ['CONDITION', 'CONDITIONS'],
    ['ORDER_STATUS', 'ORDER_STATUSES'],
    ['CUSTOMER_STATUS', 'CUSTOMER_STATUSES'],
    ['PAYMENT_STATUS', 'PAYMENT_STATUSES']
  ])('%s', (label, constant) => {
    expect(Object.keys(labels[label]).sort()).toEqual([...constants[constant]].sort());
  });
});
