// -- Hiển thị nhật ký thao tác (server/src/services/audit.js) --
import { formatNumber, formatVnd } from './format';
import { ADMIN_ROLE, ADMIN_STATUS, BODY_TYPE, CONDITION, FUEL, TRANSMISSION } from './labels';

export const AUDIT_ACTION = {
  'auth.login': 'Đăng nhập',
  'auth.login_failed': 'Đăng nhập sai mật khẩu',
  'account.password': 'Đổi mật khẩu của mình',
  'staff.create': 'Tạo tài khoản nhân viên',
  'staff.update': 'Sửa tài khoản nhân viên',
  'staff.reset_password': 'Đặt lại mật khẩu nhân viên',
  'staff.delete': 'Xóa tài khoản nhân viên',
  'car.create': 'Thêm xe',
  'car.update': 'Sửa xe',
  'car.hide': 'Ẩn xe khỏi web',
  'car.show': 'Hiện lại xe',
  'brand.create': 'Thêm hãng xe',
  'brand.rename': 'Đổi tên hãng xe',
  'brand.delete': 'Xóa hãng xe',
  'order.approve': 'Xác nhận đơn',
  'order.cancel': 'Hủy đơn',
  'customer.block': 'Khóa tài khoản khách',
  'customer.unblock': 'Mở khóa tài khoản khách',
  'customer.resend_activation': 'Gửi lại email kích hoạt',
  'contact.done': 'Đã gọi lại khách',
  'contact.reopen': 'Mở lại lời nhắn'
};

export const AUDIT_GROUP = {
  auth: 'Đăng nhập',
  account: 'Tài khoản của tôi',
  staff: 'Nhân viên',
  car: 'Xe',
  brand: 'Hãng xe',
  order: 'Đơn hàng',
  customer: 'Khách hàng',
  contact: 'Liên hệ'
};

const DANGER = ['auth.login_failed', 'order.cancel', 'customer.block', 'brand.delete', 'car.hide', 'staff.reset_password', 'staff.delete'];
export function actionClass(action) {
  if (DANGER.includes(action)) return 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300';
  if (action.startsWith('auth.') || action.startsWith('account.')) return 'bg-slate-200 text-slate-700 dark:bg-slate-700/60 dark:text-slate-300';
  return 'bg-brand-100 text-brand-800 dark:bg-brand-500/15 dark:text-brand-300';
}

const FIELD = {
  name: ['Tên'], price: ['Giá', formatVnd], stock: ['Tồn kho', formatNumber], year: ['Năm'], mileage: ['Số km', formatNumber],
  seats: ['Số chỗ'], color: ['Màu'], fuel: ['Nhiên liệu', FUEL], transmission: ['Hộp số', TRANSMISSION],
  bodyType: ['Kiểu dáng', BODY_TYPE], condition: ['Tình trạng', CONDITION], brand: ['Hãng'],
  role: ['Vai trò', ADMIN_ROLE], status: ['Trạng thái', ADMIN_STATUS]
};
const EDITED = { description: 'mô tả', images: 'ảnh' };

function show(field, value) {
  if (value === null || value === undefined || value === '') return '(trống)';
  const format = FIELD[field]?.[1];
  if (typeof format === 'function') return format(value);
  if (format) return format[value]?.label || format[value] || String(value);
  return String(value);
}

export function describeDetails(entry) {
  const d = entry.details || {};
  const lines = [];
  for (const [field, [from, to]] of Object.entries(d.changes || {})) {
    lines.push(`${FIELD[field]?.[0] || field}: ${show(field, from)} → ${show(field, to)}`);
  }
  if (d.edited?.length) lines.push(`Sửa ${d.edited.map((f) => EDITED[f] || f).join(', ')}`);
  if ((entry.action === 'staff.create' || entry.action === 'staff.delete') && d.role) lines.push(`Vai trò: ${show('role', d.role)}`);
  if (entry.action === 'staff.delete' && d.status === 'disabled') lines.push('Đã tắt trước khi xóa');
  if (entry.action === 'car.create') {
    if (d.price) lines.push(`Giá: ${formatVnd(d.price)}`);
    if (d.stock !== undefined) lines.push(`Tồn kho: ${formatNumber(d.stock)}`);
  }
  if (d.total) lines.push(`Tổng đơn: ${formatVnd(d.total)}`);
  if (d.deposit) lines.push(entry.action === 'order.cancel' ? `Đã cọc ${formatVnd(d.deposit)}, cần hoàn cho khách` : `Đã cọc ${formatVnd(d.deposit)}`);
  return lines;
}

export function targetLink(target) {
  if (!target?.id) return null;
  switch (target.kind) {
    case 'car': return `/cars/${target.id}`;
    case 'order': return `/orders?id=${target.id}`;
    case 'staff': return '/staff';
    case 'brand': return '/brands';
    case 'contact': return '/contacts?status=';
    case 'customer': {
      const username = /\(([^)]+)\)$/.exec(target.label || '')?.[1];
      return username ? `/customers?q=${encodeURIComponent(username)}` : '/customers';
    }
    default: return null;
  }
}

export function actorName(by) {
  if (!by) return '';
  if (by.kind === 'system') return 'hệ thống (hết hạn giữ xe)';
  if (by.kind === 'customer') return `khách${by.name ? ` (${by.name})` : ''}`;
  return by.name || 'nhân viên';
}
