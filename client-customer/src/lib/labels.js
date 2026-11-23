// -- Tên tiếng Việt cho các mã từ API --
export const FUEL = { gasoline: 'Xăng', diesel: 'Dầu', hybrid: 'Hybrid', electric: 'Điện' };
export const TRANSMISSION = { automatic: 'Số tự động', manual: 'Số sàn' };
export const BODY_TYPE = { sedan: 'Sedan', suv: 'SUV', crossover: 'Crossover', hatchback: 'Hatchback', mpv: 'MPV', pickup: 'Bán tải', coupe: 'Coupe' };
export const CONDITION = { new: 'Xe mới', used: 'Xe đã qua sử dụng' };

export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', className: 'bg-warn-soft text-warn  ' },
  APPROVED: { label: 'Đã xác nhận', className: 'bg-success-soft text-success  ' },
  CANCELED: { label: 'Đã hủy', className: 'bg-paper-3 text-ink-2  ' }
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

export const PAYMENT_STATUS = {
  none: { label: 'Thanh toán tại showroom', className: 'bg-paper-2 text-ink-2  ' },
  pending: { label: 'Chờ thanh toán cọc', className: 'bg-warn-soft text-warn  ' },
  paid: { label: 'Đã đặt cọc', className: 'bg-success-soft text-success  ' },
  failed: { label: 'Đặt cọc chưa thành công', className: 'bg-error-soft text-error  ' }
};
