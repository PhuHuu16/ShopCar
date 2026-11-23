// -- Tên tiếng Việt cho các mã từ API --
export const FUEL = { gasoline: 'Xăng', diesel: 'Dầu', hybrid: 'Hybrid', electric: 'Điện' };
export const TRANSMISSION = { automatic: 'Số tự động', manual: 'Số sàn' };
export const BODY_TYPE = { sedan: 'Sedan', suv: 'SUV', crossover: 'Crossover', hatchback: 'Hatchback', mpv: 'MPV', pickup: 'Bán tải', coupe: 'Coupe' };
export const CONDITION = { new: 'Xe mới', used: 'Đã qua sử dụng' };

export const ORDER_STATUS = {
  PENDING: { label: 'Chờ xác nhận', dot: 'bg-warn', className: 'bg-warn-soft text-warn  ' },
  APPROVED: { label: 'Đã xác nhận', dot: 'bg-success', className: 'bg-success-soft text-success  ' },
  CANCELED: { label: 'Đã hủy', dot: 'bg-rule', className: 'bg-paper-3 text-ink-2  ' }
};

export const CUSTOMER_STATUS = {
  active: { label: 'Hoạt động', className: 'bg-success-soft text-success  ' },
  blocked: { label: 'Đã khóa', className: 'bg-error-soft text-error  ' }
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
  none: { label: 'Trả tại showroom', className: 'bg-paper-2 text-ink-2  ' },
  pending: { label: 'Chờ đặt cọc', className: 'bg-warn-soft text-warn  ' },
  paid: { label: 'Đã cọc', className: 'bg-success-soft text-success  ' },
  failed: { label: 'Cọc lỗi', className: 'bg-error-soft text-error  ' }
};

// -- Tài khoản trang quản trị (khớp server/src/permissions.js) --
export const ADMIN_ROLE = {
  admin: {
    label: 'Quản trị viên',
    hint: 'Doanh thu, sửa giá và ẩn xe, hủy đơn đã cọc, khóa khách, quản lý nhân viên. Không chat với khách, việc này do nhân viên tư vấn.',
    className: 'bg-paper-2 text-accent  '
  },
  staff: {
    label: 'Nhân viên tư vấn',
    hint: 'Chat với khách, xử lý liên hệ, xem và xác nhận đơn, hủy đơn chưa cọc. Không xem doanh thu, không sửa xe.',
    className: 'bg-info-soft text-accent  '
  }
};

export const ADMIN_STATUS = {
  active: { label: 'Hoạt động', className: 'bg-success-soft text-success  ' },
  disabled: { label: 'Đã tắt', className: 'bg-paper-3 text-ink-2  ' }
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
