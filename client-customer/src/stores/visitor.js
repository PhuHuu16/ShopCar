import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

// -- Mã khách cho người chat chưa đăng nhập (giống tawk.to: chat gắn với trình duyệt) --
export const useVisitor = create(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clear: () => set({ token: null })
    }),
    { name: 'shopcar-visitor' }
  )
);

let pending = null;

export async function ensureVisitorToken() {
  const current = useVisitor.getState().token;
  if (current) return current;
  pending ??= api('/chat/visitor', { method: 'POST' })
    .then(({ token }) => {
      useVisitor.getState().setToken(token);
      return token;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}
