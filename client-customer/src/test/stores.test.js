import { beforeEach, describe, expect, test } from 'vitest';
import { cartCount, cartTotal, useCart } from '../stores/cart';
import { MAX_COMPARE, useCompare } from '../stores/compare';

const car = (id, extra = {}) => ({
  _id: id,
  slug: `car-${id}`,
  name: `Car ${id}`,
  price: 500_000_000,
  stock: 3,
  images: [{ thumbUrl: `/t/${id}.webp` }],
  brand: { name: 'Mazda' },
  ...extra
});

describe('cart', () => {
  beforeEach(() => useCart.getState().clear());

  test('never holds more cars than are in stock', () => {
    const { add } = useCart.getState();
    expect(add(car('a'), 2)).toBe(2);
    expect(add(car('a'), 5)).toBe(1); // only 3 in stock
    expect(add(car('a'))).toBe(0);
    expect(useCart.getState().items[0].quantity).toBe(3);
  });

  test('keeps a small copy of each car and adds up totals', () => {
    const { add, setQuantity } = useCart.getState();
    add(car('a'));
    add(car('b', { price: 1_000_000_000 }), 2);
    setQuantity('b', 99); // clamped to stock
    const state = useCart.getState();
    expect(state.items[0].car).toEqual({
      _id: 'a', slug: 'car-a', name: 'Car a', price: 500_000_000, stock: 3, image: '/t/a.webp', brand: 'Mazda'
    });
    expect(cartCount(state)).toBe(4);
    expect(cartTotal(state)).toBe(3_500_000_000);
  });

  test('out-of-stock cars are not added', () => {
    expect(useCart.getState().add(car('x', { stock: 0 }))).toBe(0);
    expect(useCart.getState().items).toHaveLength(0);
  });
});

describe('compare', () => {
  beforeEach(() => useCompare.getState().clear());

  test(`toggles cars and stops at ${MAX_COMPARE}`, () => {
    const { toggle } = useCompare.getState();
    expect(toggle(car('a'))).toBe('added');
    expect(toggle(car('b'))).toBe('added');
    expect(toggle(car('c'))).toBe('added');
    expect(toggle(car('d'))).toBe('full');
    expect(toggle(car('b'))).toBe('removed');
    expect(useCompare.getState().items.map((c) => c._id)).toEqual(['a', 'c']);
    expect(useCompare.getState().has('c')).toBe(true);
  });
});
