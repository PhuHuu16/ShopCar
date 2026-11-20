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

// -- Tài khoản trang quản trị (khớp server/src/permissions.js) --
export const ADMIN_ROLE = {
  admin: {
    label: 'Quản trị viên',
    hint: 'Toàn quyền: doanh thu, sửa giá và ẩn xe, hủy đơn đã cọc, khóa khách, quản lý nhân viên.',
    className: 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300'
  },
  staff: {
    label: 'Nhân viên tư vấn',
    hint: 'Chat với khách, xử lý liên hệ, xem và xác nhận đơn, hủy đơn chưa cọc. Không xem doanh thu, không sửa xe.',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300'
  }
};

export const ADMIN_STATUS = {
  active: { label: 'Hoạt động', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' },
  disabled: { label: 'Đã tắt', className: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200' }
};

export const PERMISSION = {
  'dashboard.view': 'Xem tổng quan: đơn chờ, tin chưa đọc, xe sắp hết',
  'stats.revenue': 'Xem doanh thu, tiền cọc, biểu đồ doanh thu',
  'cars.view': 'Xem xe và hãng xe',
  'cars.edit': 'Thêm / sửa xe, giá, tồn kho, ảnh',
  'cars.hide': 'Ẩn xe khỏi web (ngừng bán) / hiện lại',
  'brands.manage': 'Thêm / sửa / xóa hãng xe',
  'orders.view': 'Xem đơn hàng',
  'orders.approve': 'Xác nhận đơn',
  'orders.cancel': 'Hủy đơn chưa đặt cọc',
  'orders.cancelPaid': 'Hủy đơn đã đặt cọc (phải hoàn tiền)',
  'customers.view': 'Xem khách hàng, gửi lại email kích hoạt',
  'customers.block': 'Khóa / mở khóa tài khoản khách',
  'contacts.handle': 'Xem và xử lý lời nhắn liên hệ',
  'chats.reply': 'Chat với khách',
  'staff.manage': 'Quản lý tài khoản nhân viên',
  'audit.view': 'Xem nhật ký thao tác'
};
