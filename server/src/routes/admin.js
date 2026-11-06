const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { Admin, Brand, Car, Customer, Order, Conversation } = require('../models');
const { requireAdmin } = require('../middleware/auth');
const { uploadImages } = require('../middleware/upload');
const security = require('../utils/security');
const email = require('../utils/email');
const HttpError = require('../utils/httpError');
const { uniqueSlug, escapeRegex } = require('../utils/slug');
const { saveCarImage, deleteImages } = require('../utils/images');
const { listCars } = require('../services/cars');
const { changeStatus } = require('../services/orders');
const chat = require('../services/chat');
const {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_STATUSES
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
  const admin = await Admin.findOne({ username }).select('+password');
  if (!admin || !(await security.checkPassword(password, admin.password))) {
    throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  }
  res.json({ token: security.signToken(admin._id, 'admin'), admin });
});

// Các route bên dưới cần token quản trị
router.use(requireAdmin);

router.get('/me', (req, res) => {
  res.json(req.admin);
});

// -- Hãng xe --

const brandSchema = z.object({ name: z.string().trim().min(1, 'Hãy nhập tên hãng').max(60) });

router.get('/brands', async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 }).lean();
  const counts = await Car.aggregate([{ $group: { _id: '$brand', count: { $sum: 1 } } }]);
  const byBrand = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json(brands.map((b) => ({ ...b, carCount: byBrand.get(String(b._id)) || 0 })));
});

router.post('/brands', async (req, res) => {
  const { name } = brandSchema.parse(req.body);
  res.status(201).json(await Brand.create({ name, slug: await uniqueSlug(Brand, name) }));
});

router.put('/brands/:id', async (req, res) => {
  const id = checkId(req.params.id);
  const { name } = brandSchema.parse(req.body);
  const brand = await Brand.findByIdAndUpdate(id, { name, slug: await uniqueSlug(Brand, name, id) }, { new: true });
  if (!brand) throw new HttpError(404, 'Không tìm thấy hãng xe');
  res.json(brand);
});

router.delete('/brands/:id', async (req, res) => {
  const id = checkId(req.params.id);
  if (await Car.exists({ brand: id })) throw new HttpError(409, 'Hãng này vẫn còn xe, hãy xóa hoặc chuyển xe trước');
  const brand = await Brand.findByIdAndDelete(id);
  if (!brand) throw new HttpError(404, 'Không tìm thấy hãng xe');
  res.json({ message: 'Đã xóa hãng xe' });
});

// -- Ảnh xe --

router.post('/uploads', uploadImages, async (req, res) => {
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

router.get('/cars', async (req, res) => {
  res.json(await listCars(req.query));
});

router.get('/cars/:id', async (req, res) => {
  const car = await Car.findById(checkId(req.params.id)).populate('brand', 'name slug');
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  res.json(car);
});

router.post('/cars', async (req, res) => {
  const data = carSchema.parse(req.body);
  if (!(await Brand.exists({ _id: data.brand }))) throw new HttpError(400, 'Hãng xe không tồn tại');
  const car = await Car.create({ ...data, slug: await uniqueSlug(Car, `${data.name} ${data.year}`) });
  res.status(201).json(await car.populate('brand', 'name slug'));
});

router.put('/cars/:id', async (req, res) => {
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
  await deleteImages(old.images.filter((i) => !kept.has(i.url)));
  res.json(car);
});

router.delete('/cars/:id', async (req, res) => {
  const car = await Car.findByIdAndDelete(checkId(req.params.id));
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  await deleteImages(car.images);
  res.json({ message: 'Đã xóa xe' });
});

// -- Đơn hàng --

router.get('/orders', async (req, res) => {
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

router.get('/orders/:id', async (req, res) => {
  const order = await Order.findById(checkId(req.params.id));
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  res.json(order);
});

router.patch('/orders/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(['APPROVED', 'CANCELED']) }).parse(req.body);
  res.json(await changeStatus(req.params.id, status));
});

// -- Khách hàng --

router.get('/customers', async (req, res) => {
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

router.get('/customers/:id', async (req, res) => {
  const customer = await Customer.findById(checkId(req.params.id));
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  res.json(customer);
});

router.patch('/customers/:id/status', async (req, res) => {
  const { status } = z.object({ status: z.enum(CUSTOMER_STATUSES) }).parse(req.body);
  const customer = await Customer.findByIdAndUpdate(checkId(req.params.id), { status }, { new: true });
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  res.json(customer);
});

router.post('/customers/:id/resend-activation', async (req, res) => {
  const customer = await Customer.findById(checkId(req.params.id));
  if (!customer) throw new HttpError(404, 'Không tìm thấy khách hàng');
  if (customer.emailVerified) throw new HttpError(409, 'Tài khoản này đã kích hoạt');
  const { token, hash } = security.createEmailToken();
  await Customer.updateOne({ _id: customer._id }, { activationTokenHash: hash });
  const sent = await email.sendActivation(customer, token);
  if (!sent) throw new HttpError(502, 'Không gửi được email');
  res.json({ message: 'Đã gửi lại email kích hoạt' });
});

// -- Tổng quan --

router.get('/stats', async (req, res) => {
  const since = new Date();
  since.setMonth(since.getMonth() - 11, 1);
  since.setHours(0, 0, 0, 0);

  const [brands, cars, customers, ordersByStatus, revenue, revenueByMonth, topCars, lowStock, unreadChats, recentOrders, deposits] = await Promise.all([
    Brand.countDocuments(),
    Car.countDocuments(),
    Customer.countDocuments(),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { status: 'APPROVED' } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
    Order.aggregate([
      { $match: { status: 'APPROVED', approvedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$approvedAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Car.find({ sold: { $gt: 0 } }).sort({ sold: -1 }).limit(5).select('name slug sold price images'),
    Car.find({ stock: { $lte: 1 } }).sort({ stock: 1 }).limit(10).select('name slug stock images'),
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
    ])
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

  res.json({
    counts: { brands, cars, customers, orders: Object.values(orders).reduce((a, b) => a + b, 0) },
    orders,
    revenue: revenue[0]?.total || 0,
    revenueByMonth: months,
    topCars,
    lowStock,
    unreadChats,
    recentOrders,
    deposits: { count: deposits[0]?.count || 0, total: deposits[0]?.total || 0, toRefund: deposits[0]?.toRefund || 0 }
  });
});

// -- Chat --

router.get('/chats', async (req, res) => {
  const conversations = await Conversation.find({ lastMessage: { $exists: true } })
    .sort({ 'lastMessage.at': -1 })
    .limit(100)
    .populate('customer', 'name username email phone');
  res.json(conversations);
});

router.post('/chats/with/:customerId', async (req, res) => {
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

router.get('/chats/:id/messages', async (req, res) => {
  const conversation = await findConversation(req.params.id);
  res.json({ conversation, messages: await chat.listMessages(conversation._id, req.query) });
});

router.post('/chats/:id/messages', async (req, res) => {
  const conversation = await findConversation(req.params.id);
  const result = await chat.saveMessage(conversation, 'admin', req.body);
  chat.broadcast(req.app.get('io'), result.conversation, result.message);
  res.status(201).json(result.message);
});

router.post('/chats/:id/read', async (req, res) => {
  const conversation = await findConversation(req.params.id);
  res.json(await chat.markRead(conversation._id, 'admin'));
});

module.exports = router;
