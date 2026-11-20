import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const MAX_ORDERS = 20;

// -- Đơn đặt không cần đăng nhập trên máy này (mã đơn + mã theo dõi) --
export const useGuestOrders = create(
  persist(
    (set, get) => ({
      orders: [],
      info: { name: '', phone: '', email: '' },
      add(id, token) {
        const rest = get().orders.filter((o) => o.id !== id);
        set({ orders: [{ id, token }, ...rest].slice(0, MAX_ORDERS) });
      },
      remove(id) {
        set({ orders: get().orders.filter((o) => o.id !== id) });
      },
      setInfo(info) {
        set({ info: { ...get().info, ...info } });
      }
    }),
    { name: 'shopcar-guest-orders' }
  )
);
