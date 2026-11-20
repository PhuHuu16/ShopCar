// -- Các mã lưu trong database --
const FUELS = ['gasoline', 'diesel', 'hybrid', 'electric'];
const TRANSMISSIONS = ['automatic', 'manual'];
const BODY_TYPES = ['sedan', 'suv', 'crossover', 'hatchback', 'mpv', 'pickup', 'coupe'];
const CONDITIONS = ['new', 'used'];
const ORDER_STATUSES = ['PENDING', 'APPROVED', 'CANCELED'];
const CUSTOMER_STATUSES = ['active', 'blocked'];
const PAYMENT_METHODS = ['showroom', 'vnpay'];
const PAYMENT_STATUSES = ['none', 'pending', 'paid', 'failed'];
const CONTACT_STATUSES = ['new', 'done'];
const AUDIT_ACTIONS = [
  'auth.login', 'auth.login_failed', 'account.password',
  'staff.create', 'staff.update', 'staff.reset_password', 'staff.delete',
  'car.create', 'car.update', 'car.hide', 'car.show',
  'brand.create', 'brand.rename', 'brand.delete',
  'order.approve', 'order.cancel',
  'customer.block', 'customer.unblock', 'customer.resend_activation',
  'contact.done', 'contact.reopen'
];

module.exports = {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, CONTACT_STATUSES, AUDIT_ACTIONS
};
