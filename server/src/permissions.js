// -- Phân quyền trang quản trị: vai trò cố định, mỗi vai trò là một bộ quyền --

const PERMISSIONS = {
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

const ROLES = ['admin', 'staff'];

const ROLE_LABELS = { admin: 'Quản trị viên', staff: 'Nhân viên tư vấn' };

const ROLE_PERMISSIONS = {
  admin: Object.keys(PERMISSIONS),
  staff: [
    'dashboard.view',
    'cars.view',
    'orders.view',
    'orders.approve',
    'orders.cancel',
    'customers.view',
    'contacts.handle',
    'chats.reply'
  ]
};

function permissionsOf(account) {
  if (!account || account.status === 'disabled') return [];
  return ROLE_PERMISSIONS[account.role || 'admin'] || [];
}

function can(account, permission) {
  return permissionsOf(account).includes(permission);
}

module.exports = { PERMISSIONS, ROLES, ROLE_LABELS, ROLE_PERMISSIONS, permissionsOf, can };
