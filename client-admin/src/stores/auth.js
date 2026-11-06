import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuth = create(
  persist(
    (set) => ({
      token: null,
      admin: null,
      login: (token, admin) => set({ token, admin }),
      setAdmin: (admin) => set({ admin }),
      logout: () => set({ token: null, admin: null })
    }),
    { name: 'shopcar-admin-auth' }
  )
);
