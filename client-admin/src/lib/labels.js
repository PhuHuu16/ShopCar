// -- Tên tiếng Việt cho các mã từ API --
export const FUEL = { gasoline: 'Xăng', diesel: 'Dầu', hybrid: 'Hybrid', electric: 'Điện' };
export const TRANSMISSION = { automatic: 'Số tự động', manual: 'Số sàn' };
export const BODY_TYPE = { sedan: 'Sedan', suv: 'SUV', crossover: 'Crossover', hatchback: 'Hatchback', mpv: 'MPV', pickup: 'Bán tải', coupe: 'Coupe' };
export const CONDITION = { new: 'Xe mới', used: 'Đã qua sử dụng' };

export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', dot: 'bg-amber-500', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  APPROVED: { label: 'Đã xác nhận', dot: 'bg-emerald-500', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  CANCELED: { label: 'Đã hủy', dot: 'bg-slate-400', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300' }
};

export const CUSTOMER_STATUS = {
  active: { label: 'Hoạt động', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  blocked: { label: 'Đã khóa', className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' }
};

export const CAR_SORTS = [
  { value: 'newest', label: 'Mới thêm' },
  { value: 'popular', label: 'Bán chạy' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'name_asc', label: 'Tên A → Z' }
];

export const toOptions = (map) => Object.entries(map).map(([value, label]) => ({ value, label }));

export const PAYMENT_STATUS = {
  none: { label: 'Trả tại showroom', className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
  pending: { label: 'Chờ đặt cọc', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  paid: { label: 'Đã cọc', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  failed: { label: 'Cọc lỗi', className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' }
};
