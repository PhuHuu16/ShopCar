import { useEffect } from 'react';

export function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ShopCar` : 'ShopCar - Showroom ô tô';
  }, [title]);
}
