// Vietnamese names for the codes stored by the API
export const FUEL = { gasoline: 'Xăng', diesel: 'Dầu', hybrid: 'Hybrid', electric: 'Điện' };
export const TRANSMISSION = { automatic: 'Số tự động', manual: 'Số sàn' };
export const BODY_TYPE = { sedan: 'Sedan', suv: 'SUV', crossover: 'Crossover', hatchback: 'Hatchback', mpv: 'MPV', pickup: 'Bán tải', coupe: 'Coupe' };
export const CONDITION = { new: 'Xe mới', used: 'Xe đã qua sử dụng' };

export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  APPROVED: { label: 'Đã xác nhận', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  CANCELED: { label: 'Đã hủy', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300' }
};

export const SORTS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'popular', label: 'Bán chạy' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
  { value: 'year_desc', label: 'Đời xe mới nhất' },
  { value: 'name_asc', label: 'Tên A → Z' }
];

export const PRICE_RANGES = [
  { label: 'Dưới 600 triệu', max: 600000000 },
  { label: '600 triệu - 1 tỷ', min: 600000000, max: 1000000000 },
  { label: '1 - 1,5 tỷ', min: 1000000000, max: 1500000000 },
  { label: 'Trên 1,5 tỷ', min: 1500000000 }
];

// Online deposit state of an order (payment.status)
export const PAYMENT_STATUS = {
  none: { label: 'Thanh toán tại showroom', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  pending: { label: 'Chờ thanh toán cọc', className: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300' },
  paid: { label: 'Đã đặt cọc', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  failed: { label: 'Đặt cọc chưa thành công', className: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300' }
};
