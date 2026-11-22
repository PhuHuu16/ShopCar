import { createJSONStorage } from 'zustand/middleware';

// -- Lưu theo tab: còn khi tải lại trang (F5), mất khi đóng tab hoặc tắt trình duyệt --
export const tabStorage = createJSONStorage(() => sessionStorage);

const LEGACY_KEYS = ['shopcar-cart', 'shopcar-compare', 'shopcar-guest-orders', 'shopcar-visitor'];

try {
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
} catch {}
