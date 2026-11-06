import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// -- Phiên đăng nhập của khách hàng --
export const useAuth = create(
  persist(
    (set) => ({
      token: null,
      customer: null,
      login: (token, customer) => set({ token, customer }),
      setCustomer: (customer) => set({ customer }),
      logout: () => set({ token: null, customer: null })
    }),
    { name: 'shopcar-auth' }
  )
);
