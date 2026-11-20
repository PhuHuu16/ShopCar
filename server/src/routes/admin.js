const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { Admin, AuditLog, Brand, Car, Customer, Order, Conversation, Contact } = require('../models');
const { requireAdmin, can } = require('../middleware/auth');
const permissions = require('../permissions');
const { uploadImages } = require('../middleware/upload');
const security = require('../utils/security');
const email = require('../utils/email');
const HttpError = require('../utils/httpError');
const { uniqueSlug, escapeRegex } = require('../utils/slug');
const { saveCarImage, deleteImages } = require('../utils/images');
const { listCars, VISIBLE } = require('../services/cars');
const { changeStatus } = require('../services/orders');
const chat = require('../services/chat');
const audit = require('../services/audit');
const realtime = require('../realtime');
const {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_STATUSES, CONTACT_STATUSES, AUDIT_ACTIONS
} = require('../constants');

const router = express.Router();
const objectId = z.string().refine(mongoose.isValidObjectId, 'ID không hợp lệ');
const pageQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20)
};

function checkId(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'ID không hợp lệ');
  return id;
}

// -- Đăng nhập --

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => config.isTest,
  message: { message: 'Bạn thao tác quá nhiều lần, hãy thử lại sau ít phút' }
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = z.object({ username: z.string().trim().min(1), password: z.string().min(1) }).parse(req.body);
  const admin = await Admin.findOne({ username }).select('+password +tokenVersion');
  if (!admin || !(await security.checkPassword(password, admin.password))) {
    if (admin) await audit.record({ ip: req.ip, auditActor: audit.actorOf(admin) }, 'auth.login_failed');
    throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  }
  if (admin.status === 'disabled') throw new HttpError(403, 'Tài khoản đã bị tắt, hãy liên hệ quản trị viên');
  await Admin.updateOne({ _id: admin._id }, { lastLoginAt: new Date() });
  await audit.record({ ip: req.ip, auditActor: audit.actorOf(admin) }, 'auth.login');
  res.json({ token: security.signToken(admin._id, 'admin', admin.tokenVersion), admin: withPermissions(admin) });
});

function withPermissions(admin) {
  return { ...admin.toJSON(), roleLabel: permissions.ROLE_LABELS[admin.role || 'admin'], permissions: permissions.permissionsOf(admin) };
}

router.use(requireAdmin);

router.get('/me', (req, res) => {
  res.json(withPermissions(req.admin));
});

// -- Tài khoản của tôi: đổi tên hiển thị, đổi mật khẩu --
const adminPassword = z.string().min(8, 'Mật khẩu tối thiểu 8 ký tự').max(72, 'Mật khẩu tối đa 72 ký tự');
const adminName = z.string().trim().min(1, 'Hãy nhập họ tên').max(60);

router.put('/me', async (req, res) => {
  const data = z.object({
    name: adminName.optional(),
    currentPassword: z.string().optional(),
    newPassword: adminPassword.optional()
  }).parse(req.body);
  const admin = await Admin.findById(req.admin._id).select('+password +tokenVersion');
  if (data.name !== undefined) admin.name = data.name;

  let token;
  if (data.newPassword) {
    if (admin.isOwner) {
      throw new HttpError(403, 'Tài khoản chủ đổi mật khẩu trong server/.env (ADMIN_PASSWORD) rồi khởi động lại server');
    }
    if (!data.currentPassword || !(await security.checkPassword(data.currentPassword, admin.password))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng');
    }
    if (data.currentPassword === data.newPassword) throw new HttpError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
    admin.password = await security.hashPassword(data.newPassword);
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    token = security.signToken(admin._id, 'admin', admin.tokenVersion);
  }
  await admin.save();
  if (token) await audit.record(req, 'account.password');
  res.json({ admin: withPermissions(admin), token });
  if (token) realtime.disconnectStaff(admin._id);
});

// -- Nhân viên (chỉ quản trị viên) --
const staffTarget = (account) => ({ kind: 'staff', id: account._id, label: `${account.name || account.username} (${account.username})` });
const username = z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,32}$/, 'Tên đăng nhập 3-32 ký tự: chữ không dấu, số, dấu chấm, gạch ngang, gạch dưới');

router.get('/staff', can('staff.manage'), async (req, res) => {
  const accounts = await Admin.find().sort({ isOwner: -1, role: 1, createdAt: 1 });
  res.json(accounts.map(withPermissions));
});

router.post('/staff', can('staff.manage'), async (req, res) => {
  const data = z.object({
    username,
    name: adminName,
    role: z.enum(permissions.ROLES).default('staff'),
    password: adminPassword
  }).parse(req.body);
  if (await Admin.exists({ username: data.username })) throw new HttpError(409, 'Tên đăng nhập đã có người dùng');
  const account = await Admin.create({
    ...data,
    password: await security.hashPassword(data.password)
  });
  await audit.record(req, 'staff.create', staffTarget(account), { role: account.role });
  res.status(201).json(withPermissions(account));
});

router.patch('/staff/:id', can('staff.manage'), async (req, res) => {
  const data = z.object({
    name: adminName.optional(),
    role: z.enum(permissions.ROLES).optional(),
    status: z.enum(['active', 'disabled']).optional(),
    password: adminPassword.optional()
  }).parse(req.body);
  const account = await Admin.findById(checkId(req.params.id)).select('+tokenVersion');
  if (!account) throw new HttpError(404, 'Không tìm thấy tài khoản');
  if (account.isOwner) throw new HttpError(403, 'Tài khoản chủ chỉ đổi được trong server/.env');
  if (String(account._id) === String(req.admin._id)) {
    throw new HttpError(409, 'Không tự sửa vai trò hay khóa chính mình; đổi tên / mật khẩu ở trang Tài khoản của tôi');
  }
  const losesAdmin = account.role === 'admin' && account.status === 'active'
    && ((data.role && data.role !== 'admin') || data.status === 'disabled');
  if (losesAdmin && !(await Admin.exists({ _id: { $ne: account._id }, role: 'admin', status: 'active' }))) {
    throw new HttpError(409, 'Phải còn ít nhất một quản trị viên đang hoạt động');
  }

  const kick = (data.role && data.role !== account.role) || (data.status && data.status !== account.status) || data.password;
  const before = { name: account.name, role: account.role, status: account.status };
  if (data.name !== undefined) account.name = data.name;
  if (data.role) account.role = data.role;
  if (data.status) account.status = data.status;
  if (data.password) {
    account.password = await security.hashPassword(data.password);
    account.tokenVersion = (account.tokenVersion || 0) + 1;
  }
  await account.save();
  const changes = audit.diff(before, account, ['name', 'role', 'status']);
  if (Object.keys(changes).length) await audit.record(req, 'staff.update', staffTarget(account), { changes });
  if (data.password) await audit.record(req, 'staff.reset_password', staffTarget(account));
  if (kick) realtime.disconnectStaff(account._id);
  res.json(withPermissions(account));
});

router.delete('/staff/:id', can('staff.manage'), async (req, res) => {
  const account = await Admin.findById(checkId(req.params.id));
  if (!account) throw new HttpError(404, 'Không tìm thấy tài khoản');
  if (account.isOwner) throw new HttpError(403, 'Không xóa được tài khoản chủ (tài khoản này đặt trong server/.env)');
  if (String(account._id) === String(req.admin._id)) throw new HttpError(409, 'Không tự xóa tài khoản của chính mình');
  const lastAdmin = account.role === 'admin' && account.status === 'active'
    && !(await Admin.exists({ _id: { $ne: account._id }, role: 'admin', status: 'active' }));
  if (lastAdmin) throw new HttpError(409, 'Phải còn ít nhất một quản trị viên đang hoạt động');

  await account.deleteOne();
  await audit.record(req, 'staff.delete', staffTarget(account), { role: account.role, status: account.status });
  realtime.disconnectStaff(account._id);
  res.json({ ok: true });
});

// -- Hãng xe --

const brandSchema = z.object({ name: z.string().trim().min(1, 'Hãy nhập tên hãng').max(60) });

router.get('/brands', can('cars.view'), async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).lean();
  const counts = await Car.aggregate([{ $group: { _id: '$brand', count: { $sum: 1 } } }]);
  const byBrand = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json(brands.map((b) => ({ ...b, carCount: byBrand.get(String(b._id)) || 0 })));
});

router.post('/brands', can('brands.manage'), async (req, res) => {
  const { name } = brandSchema.parse(req.body);
  const brand = await Brand.create({ name, slug: await uniqueSlug(Brand, name) });
  await audit.record(req, 'brand.create', { kind: 'brand', id: brand._id, label: brand.name });
  res.status(201).json(brand);
});

router.put('/brands/:id', can('brands.manage'), async (req, res) => {
  const id = checkId(req.params.id);
  const { name } = brandSchema.parse(req.body);
  const old = await Brand.findById(id);
  if (!old) throw new HttpError(404, 'Không tìm thấy hãng xe');
  const brand = await Brand.findByIdAndUpdate(id, { name, slug: await uniqueSlug(Brand, name, id) }, { new: true });
  if (old.name !== brand.name) {
    await audit.record(req, 'brand.rename', { kind: 'brand', id: brand._id, label: brand.name }, { changes: { name: [old.name, brand.name] } });
  }
  res.json(brand);
});

router.delete('/brands/:id', can('brands.manage'), async (req, res) => {
  const id = checkId(req.params.id);
  if (await Car.exists({ brand: id })) throw new HttpError(409, 'Hãng này đã có xe (kể cả xe đã ẩn), không thể xóa');
  const brand = await Brand.findByIdAndDelete(id);
  if (!brand) throw new HttpError(404, 'Không tìm thấy hãng xe');
  await audit.record(req, 'brand.delete', { kind: 'brand', id: brand._id, label: brand.name });
  res.json({ message: 'Đã xóa hãng xe' });
});

// -- Ảnh xe --

router.post('/uploads', can('cars.edit'), uploadImages, async (req, res) => {
  if (!req.files || req.files.length === 0) throw new HttpError(400, 'Chưa chọn ảnh');
  const images = [];
  for (const file of req.files) {
    try {
      images.push(await saveCarImage(file.buffer));
    } catch {
      await deleteImages(images);
      throw new HttpError(400, `Không đọc được ảnh ${file.originalname}`);
    }
  }
  res.status(201).json(images);
});

// -- Xe --

const imageUrl = z.string().regex(/^(\/uploads\/|https?:\/\/)/, 'Đường dẫn ảnh không hợp lệ');
const carSchema = z.object({
  name: z.string().trim().min(2, 'Tên xe tối thiểu 2 ký tự').max(120),
  brand: z.string().min(1, 'Hãy chọn hãng xe').pipe(objectId),
  price: z.coerce.number({ invalid_type_error: 'Hãy nhập giá xe' }).int('Giá phải là số nguyên').min(1, 'Hãy nhập giá xe'),
  year: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().int().min(0).default(0),
  fuel: z.enum(FUELS),
  transmission: z.enum(TRANSMISSIONS),
  bodyType: z.enum(BODY_TYPES),
  seats: z.coerce.number().int().min(1).max(60),
  color: z.string().trim().max(40).default(''),
  condition: z.enum(CONDITIONS).default('new'),
  description: z.string().trim().max(5000).default(''),
  stock: z.coerce.number().int().min(0).default(1),
  images: z.array(z.object({ url: imageUrl, thumbUrl: imageUrl }), { required_error: 'Hãy thêm ít nhất một ảnh xe' }).min(1, 'Hãy thêm ít nhất một ảnh xe').max(20, 'Mỗi xe tối đa 20 ảnh')
});

router.get('/cars', can('cars.view'), async (req, res) => {
  res.json(await listCars(req.query, { admin: true }));
});

router.get('/cars/:id', can('cars.view'), async (req, res) => {
  const car = await Car.findById(checkId(req.params.id)).populate('brand', 'name slug');
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  res.json(car);
});

router.post('/cars', can('cars.edit'), async (req, res) => {
  const data = carSchema.parse(req.body);
  if (!(await Brand.exists({ _id: data.brand }))) throw new HttpError(400, 'Hãng xe không tồn tại');
  const car = await Car.create({ ...data, slug: await uniqueSlug(Car, `${data.name} ${data.year}`) });
  await audit.record(req, 'car.create', carTarget(car), { price: car.price, stock: car.stock });
  res.status(201).json(await car.populate('brand', 'name slug'));
});

router.put('/cars/:id', can('cars.edit'), async (req, res) => {
  const id = checkId(req.params.id);
  const data = carSchema.parse(req.body);
  if (!(await Brand.exists({ _id: data.brand }))) throw new HttpError(400, 'Hãng xe không tồn tại');
  const old = await Car.findById(id);
  if (!old) throw new HttpError(404, 'Không tìm thấy xe');
  const car = await Car.findByIdAndUpdate(
    id,
    { ...data, slug: await uniqueSlug(Car, `${data.name} ${data.year}`, id) },
    { new: true, runValidators: true }
  ).populate('brand', 'name slug');
  const kept = new Set(data.images.map((i) => i.url));
  const removed = old.images.filter((i) => !kept.has(i.url));
  const inOrders = new Set(removed.length
    ? await Order.distinct('items.image', { 'items.image': { $in: removed.map((i) => i.thumbUrl) } })
    : []);
  await deleteImages(removed.filter((i) => !inOrders.has(i.thumbUrl)));
  if (old.stock !== car.stock) await realtime.stockChanged([car._id]);
  await recordCarUpdate(req, old, car);
  res.json(car);
});

const carTarget = (car) => ({ kind: 'car', id: car._id, label: car.name });
const CAR_DIFF_FIELDS = ['name', 'price', 'stock', 'year', 'mileage', 'seats', 'color', 'fuel', 'transmission', 'bodyType', 'condition'];

async function recordCarUpdate(req, old, car) {
  const changes = audit.diff(old, car, CAR_DIFF_FIELDS);
  const oldBrand = String(old.brand);
  const newBrand = String(car.brand?._id || car.brand);
  if (oldBrand !== newBrand) {
    const names = new Map((await Brand.find({ _id: { $in: [oldBrand, newBrand] } }).select('name')).map((b) => [String(b._id), b.name]));
    changes.brand = [names.get(oldBrand) || null, names.get(newBrand) || null];
  }
  const edited = [];
  if (old.description !== car.description) edited.push('description');
  if (JSON.stringify(old.images.map((i) => i.url)) !== JSON.stringify(car.images.map((i) => i.url))) edited.push('images');
  if (!Object.keys(changes).length && !edited.length) return;
  await audit.record(req, 'car.update', carTarget(car), { changes, ...(edited.length ? { edited } : {}) });
}

router.patch('/cars/:id/visibility', can('cars.hide'), async (req, res) => {
  const { hidden } = z.object({ hidden: z.boolean() }).parse(req.body);
  const car = await Car.findByIdAndUpdate(
    checkId(req.params.id),
    hidden ? { hidden: true, hiddenAt: new Date() } : { hidden: false, $unset: { hiddenAt: 1 } },
    { new: true }
  ).populate('brand', 'name slug');
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  await audit.record(req, hidden ? 'car.hide' : 'car.show', carTarget(car));
  res.json(car);
});

// -- Đơn hàng --

router.get('/orders', can('orders.view'), async (req, res) => {
  const q = z.object({
    status: z.enum(ORDER_STATUSES).optional(),
    customer: objectId.optional(),
    payment: z.enum(PAYMENT_STATUSES).optional(),
    q: z.string().trim().max(100).optional(),
    ...pageQuery
  }).parse(req.query);
  const filter = {};
  if (q.status) filter.status = q.status;
  if (q.customer) filter.customer = q.customer;
  if (q.payment) filter['payment.status'] = q.payment;
  if (q.q) {
    const re = { $regex: escapeRegex(q.q.replace(/^#/, '')), $options: 'i' };
    filter.$or = [{ 'customerInfo.name': re }, { 'customerInfo.phone': re }, { 'customerInfo.email': re }];
    if (/^#?[0-9a-f]{4,24}$/i.test(q.q)) {
      filter.$or.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: escapeRegex(q.q.replace(/^#/, '')), options: 'i' } } });
    }
  }
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Order.countDocuments(filter)
  ]);
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

router.get('/orders/:id', can('orders.view'), async (req, res) => {
  const order = await Order.findById(checkId(req.params.id));
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

router.patch('/orders/:id/status', can('orders.view'), async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'CANCELED']) }).parse(req.body);
  const need = status === 'APPROVED' ? 'orders.approve' : 'orders.cancel';
  if (!permissions.can(req.admin, need)) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này');
  if (status === 'CANCELED' && !permissions.can(req.admin, 'orders.cancelPaid')) {
    const order = await Order.findById(checkId(req.params.id)).select('payment.status');
    if (order?.payment?.status === 'paid') {
      throw new HttpError(403, 'Đơn đã đặt cọc, chỉ quản trị viên được hủy (cần hoàn cọc cho khách)');
    }
  }
  const order = await changeStatus(req.params.id, status, {
    reason: status === 'CANCELED' ? 'Showroom hủy đơn' : undefined,
    by: audit.stamp(req.admin)
  });
  const paid = order.payment?.status === 'paid';
  await audit.record(
    req,
    status === 'APPROVED' ? 'order.approve' : 'order.cancel',
    { kind: 'order', id: order._id, label: `#${String(order._id).slice(-6).toUpperCase()} · ${order.customerInfo?.name || 'khách'}` },
    { total: order.total, ...(paid ? { deposit: order.payment.deposit } : {}) }
  );
  res.json(order);
});

// -- Khách hàng --
const customerTarget = (c) => ({ kind: 'customer', id: c._id, label: `${c.name || c.username} (${c.username})` });

router.get('/customers', can('customers.view'), async (req, res) => {
  const q = z.object({ q: z.string().trim().max(100).optional(), ...pageQuery }).parse(req.query);
  const filter = {};
  if (q.q) {
    const re = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ name: re }, { username: re }, { email: re }, { phone: re }];
  }
  const [customers, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    Customer.countDocuments(filter)
  ]);
  const stats = await Order.aggregate([
    { $match: { customer: { $in: customers.map((c) => c._id) } } },
    {
      $group: {
        _id: '$customer',
        orders: { $sum: 1 },
        spent: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, '$total', 0] } }
      }
    }
  ]);
  const byCustomer = new Map(stats.map((row) => [String(row._id), row]));
  const items = customers.map((c) => {
    const row = byCustomer.get(String(c._id));
    return { ...c.toJSON(), orderCount: row?.orders || 0, totalSpent: row?.spent || 0 };
  });
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

router.get('/customers/:id', can('customers.view'), async (req, res) => {
  const customer = await Customer.findById(checkId(req.params.id));
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  res.json(customer);
});

router.patch('/customers/:id/status', can('customers.block'), async (req, res) => {
  const { status } = z.object({ status: z.enum(CUSTOMER_STATUSES) }).parse(req.body);
  const old = await Customer.findById(checkId(req.params.id));
  if (!old) throw new HttpError(404, 'Không tìm thấy khách hàng');
  const customer = await Customer.findByIdAndUpdate(old._id, { status }, { new: true });
  if (old.status !== status) {
    await audit.record(req, status === 'blocked' ? 'customer.block' : 'customer.unblock', customerTarget(customer));
  }
  res.json(customer);
});

router.post('/customers/:id/resend-activation', can('customers.view'), async (req, res) => {
  const customer = await Customer.findById(checkId(req.params.id));
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  if (customer.emailVerified) throw new HttpError(409, 'Tài khoản này đã kích hoạt');
  const { token, hash } = security.createEmailToken();
  await Customer.updateOne({ _id: customer._id }, { activationTokenHash: hash });
  const sent = await email.sendActivation(customer, token);
  if (!sent) throw new HttpError(502, 'Không gửi được email');
  await audit.record(req, 'customer.resend_activation', customerTarget(customer));
  res.json({ message: 'Đã gửi lại email kích hoạt' });
});

// -- Tổng quan --

router.get('/stats', can('dashboard.view'), async (req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);

  const [brands, cars, customers, ordersByStatus, revenue, revenueByMonth, topCars, lowStock, unreadChats, recentOrders, deposits, newContacts] = await Promise.all([
    Brand.countDocuments(),
    Car.countDocuments(VISIBLE),
    Customer.countDocuments(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { status: 'APPROVED' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { status: 'APPROVED', approvedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$approvedAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Car.find({ sold: { $gt: 0 } }).sort({ sold: -1 }).limit(5).select('name slug sold price images'),
    Car.find({ ...VISIBLE, stock: { $lte: 1 } }).sort({ stock: 1 }).limit(10).select('name slug stock images'),
    Conversation.countDocuments({ unreadByAdmin: { $gt: 0 } }),
    Order.find().sort({ createdAt: -1 }).limit(6),
    Order.aggregate([
      { $match: { 'payment.status': 'paid' } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$payment.deposit' },
          toRefund: { $sum: { $cond: [{ $eq: ['$status', 'CANCELED'] }, '$payment.deposit', 0] } }
        }
      }
    ]),
    Contact.countDocuments({ status: 'new' })
  ]);

  const months = [];
  const byMonth = new Map(revenueByMonth.map((m) => [m._id, m]));
  for (let i = 0; i < 12; i++) {
    const d = new Date(since.getFullYear(), since.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ month: key, revenue: byMonth.get(key)?.revenue || 0, orders: byMonth.get(key)?.orders || 0 });
  }

  const orders = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const row of ordersByStatus) orders[row._id] = row.count;

  const stats = {
    counts: { brands, cars, customers, orders: Object.values(orders).reduce((a, b) => a + b, 0) },
    orders,
    topCars,
    lowStock,
    unreadChats,
    newContacts,
    recentOrders
  };
  if (permissions.can(req.admin, 'stats.revenue')) {
    Object.assign(stats, {
      revenue: revenue[0]?.total || 0,
      revenueByMonth: months,
      deposits: { count: deposits[0]?.count || 0, total: deposits[0]?.total || 0, toRefund: deposits[0]?.toRefund || 0 }
    });
  }
  res.json(stats);
});

// -- Liên hệ từ khách (không cần tài khoản) --

router.get('/contacts', can('contacts.handle'), async (req, res) => {
  const q = z.object({ status: z.enum(CONTACT_STATUSES).optional(), ...pageQuery }).parse(req.query);
  const filter = q.status ? { status: q.status } : {};
  const [items, total] = await Promise.all([
    Contact.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).populate('car', 'name slug price images'),
    Contact.countDocuments(filter)
  ]);
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

router.patch('/contacts/:id', can('contacts.handle'), async (req, res) => {
  const { status } = z.object({ status: z.enum(CONTACT_STATUSES) }).parse(req.body);
  const contact = await Contact.findByIdAndUpdate(
    checkId(req.params.id),
    status === 'done'
      ? { status, handledAt: new Date(), handledBy: audit.stamp(req.admin) }
      : { status, $unset: { handledAt: 1, handledBy: 1 } },
    { new: true }
  ).populate('car', 'name slug price images');
  if (!contact) throw new HttpError(404, 'Không tìm thấy lời nhắn');
  await audit.record(req, status === 'done' ? 'contact.done' : 'contact.reopen', { kind: 'contact', id: contact._id, label: `${contact.name} · ${contact.phone}` });
  realtime.toAdmins('contact:updated', contact);
  res.json(contact);
});

// -- Chat --

router.get('/chats', can('chats.reply'), async (req, res) => {
  const conversations = await Conversation.find({ lastMessage: { $exists: true } })
    .sort({ 'lastMessage.at': -1 })
    .limit(100)
    .populate('customer', 'name username email phone');
  res.json(conversations);
});

router.post('/chats/with/:customerId', can('chats.reply'), async (req, res) => {
  const customer = await Customer.exists({ _id: checkId(req.params.customerId) });
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  const conversation = await chat.getOrCreateConversation(req.params.customerId);
  res.json(await conversation.populate('customer', 'name username email phone'));
});

async function findConversation(id) {
  const conversation = await Conversation.findById(checkId(id)).populate('customer', 'name username email phone');
  if (!conversation) throw new HttpError(404, 'Không tìm thấy cuộc trò chuyện');
  return conversation;
}

router.get('/chats/:id/messages', can('chats.reply'), async (req, res) => {
  const conversation = await findConversation(req.params.id);
  res.json({ conversation, messages: await chat.listMessages(conversation._id, req.query) });
});

router.post('/chats/:id/messages', can('chats.reply'), async (req, res) => {
  const conversation = await findConversation(req.params.id);
  const result = await chat.saveMessage(conversation, 'admin', req.body, req.admin);
  chat.broadcast(req.app.get('io'), result.conversation, result.message);
  res.status(201).json(result.message);
});

router.post('/chats/:id/read', can('chats.reply'), async (req, res) => {
  const conversation = await findConversation(req.params.id);
  res.json(await chat.markRead(conversation._id, 'admin'));
});

// -- Nhật ký thao tác --

const AUDIT_GROUPS = [...new Set(AUDIT_ACTIONS.map((a) => a.split('.')[0]))];

router.get('/audit', can('audit.view'), async (req, res) => {
  const q = z.object({
    actor: objectId.optional(),
    target: objectId.optional(),
    action: z.enum(AUDIT_ACTIONS).optional(),
    group: z.enum(AUDIT_GROUPS).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    ...pageQuery
  }).parse(req.query);
  const filter = {};
  if (q.actor) filter['actor.account'] = q.actor;
  if (q.target) filter['target.id'] = q.target;
  if (q.action) filter.action = q.action;
  else if (q.group) filter.action = { $in: AUDIT_ACTIONS.filter((a) => a.startsWith(`${q.group}.`)) };
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = q.from;
    if (q.to) filter.createdAt.$lte = q.to;
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1, _id: -1 }).skip((q.page - 1) * q.limit).limit(q.limit),
    AuditLog.countDocuments(filter)
  ]);
  res.json({ items, total, page: q.page, pages: Math.ceil(total / q.limit) });
});

module.exports = router;
