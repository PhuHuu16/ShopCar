import { create } from 'zustand';

function readTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export const useUi = create((set, get) => ({
  sidebarOpen: false,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  theme: readTheme(),
  toggleTheme() {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('shopcar-theme', theme);
    } catch {
      // chế độ ẩn danh: không lưu được lựa chọn
    }
    set({ theme });
  }
}));
