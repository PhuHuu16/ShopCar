import { create } from 'zustand';

function readTheme() {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export const useUi = create((set, get) => ({
  // chat panel; `chatCar` is a car to attach to the next message
  chatOpen: false,
  chatCar: null,
  openChat: (car = null) => set({ chatOpen: true, chatCar: car || get().chatCar }),
  closeChat: () => set({ chatOpen: false }),
  clearChatCar: () => set({ chatCar: null }),

  theme: readTheme(),
  toggleTheme() {
    const theme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('shopcar-theme', theme);
    } catch {
      // private mode: the choice just is not remembered
    }
    set({ theme });
  }
}));
