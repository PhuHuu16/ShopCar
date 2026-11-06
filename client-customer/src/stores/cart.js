import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_PER_CAR = 10; // same limit as the API

function maxFor(car) {
  return Math.max(0, Math.min(car.stock ?? MAX_PER_CAR, MAX_PER_CAR));
}

// Keeps a small copy of each car for display. The server re-checks prices
// and stock when the order is placed.
function snapshot(car) {
  return {
    _id: car._id,
    slug: car.slug,
    name: car.name,
    price: car.price,
    stock: car.stock,
    image: car.images?.[0]?.thumbUrl || '',
    brand: car.brand?.name || ''
  };
}

export const useCart = create(
  persist(
    (set, get) => ({
      items: [],
      // returns the quantity that was actually added
      add(car, quantity = 1) {
        const items = [...get().items];
        const index = items.findIndex((i) => i.car._id === car._id);
        const current = index >= 0 ? items[index].quantity : 0;
        const next = Math.min(current + quantity, maxFor(car));
        if (index >= 0) items[index] = { car: snapshot(car), quantity: next };
        else if (next > 0) items.push({ car: snapshot(car), quantity: next });
        set({ items });
        return next - current;
      },
      setQuantity(carId, quantity) {
        set({
          items: get().items.map((i) =>
            i.car._id === carId ? { ...i, quantity: Math.max(1, Math.min(quantity, maxFor(i.car))) } : i
          )
        });
      },
      remove(carId) {
        set({ items: get().items.filter((i) => i.car._id !== carId) });
      },
      clear() {
        set({ items: [] });
      }
    }),
    { name: 'shopcar-cart' }
  )
);

export const cartCount = (state) => state.items.reduce((sum, i) => sum + i.quantity, 0);
export const cartTotal = (state) => state.items.reduce((sum, i) => sum + i.car.price * i.quantity, 0);
