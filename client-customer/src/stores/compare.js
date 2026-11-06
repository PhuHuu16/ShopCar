import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const MAX_COMPARE = 3;

// Cars picked for side-by-side comparison (kept in the browser)
export const useCompare = create(
  persist(
    (set, get) => ({
      items: [], // [{ _id, slug, name, image }]
      has: (id) => get().items.some((c) => c._id === id),
      // returns 'added' | 'removed' | 'full'
      toggle(car) {
        const { items } = get();
        if (items.some((c) => c._id === car._id)) {
          set({ items: items.filter((c) => c._id !== car._id) });
          return 'removed';
        }
        if (items.length >= MAX_COMPARE) return 'full';
        set({ items: [...items, { _id: car._id, slug: car.slug, name: car.name, image: car.images?.[0]?.thumbUrl || '' }] });
        return 'added';
      },
      remove: (id) => set({ items: get().items.filter((c) => c._id !== id) }),
      clear: () => set({ items: [] })
    }),
    { name: 'shopcar-compare' }
  )
);
