const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { Customer, Order } = require('../models');
const { requireCustomer } = require('../middleware/auth');
const security = require('../utils/security');
const email = require('../utils/email');
const HttpError = require('../utils/httpError');
const { createOrder, changeStatus } = require('../services/orders');
const chat = require('../services/chat');
const payments = require('../services/payments');
const { PAYMENT_METHODS } = require('../constants');

const router = express.Router();

// Slows down password guessing and email spam from one IP address.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skip: () => config.isTest,
  message: { message: 'Bạn thao tác quá nhiều lần, hãy thử lại sau ít phút' }
});

const objectId = z.string().refine(mongoose.isValidObjectId, 'ID không hợp lệ');
const password = z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(72);
const phone = z.string().trim().regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');

const signupSchema = z.object({
  username: z.string().trim().min(3, 'Tên đăng nhập tối thiểu 3 ký tự').max(30)
    .regex(/^[a-zA-Z0-9_.]+$/, 'Tên đăng nhập chỉ gồm chữ, số, dấu chấm và gạch dưới'),
  password,
  name: z.string().trim().min(1, 'Hãy nhập họ tên').max(80),
  phone,
  email: z.string().trim().toLowerCase().email('Email không hợp lệ')
});

// ---------- account ----------

router.post('/signup', authLimiter, async (req, res) => {
  const data = signupSchema.parse(req.body);
  const exists = await Customer.findOne({ $or: [{ username: data.username }, { email: data.email }] });
  if (exists) {
    throw new HttpError(409, exists.email === data.email ? 'Email đã được sử dụng' : 'Tên đăng nhập đã tồn tại');
  }
  const { token, hash } = security.createEmailToken();
  const customer = await Customer.create({
    ...data,
    password: await security.hashPassword(data.password),
    activationTokenHash: hash
  });
  const sent = await email.sendActivation(customer, token);
  res.status(201).json({
    message: sent
      ? 'Đăng ký thành công. Hãy kiểm tra email để kích hoạt tài khoản.'
      : 'Đăng ký thành công nhưng chưa gửi được email kích hoạt. Hãy thử gửi lại sau.'
  });
});

router.post('/activate', async (req, res) => {
  const { id, token } = z.object({ id: objectId, token: z.string().min(1) }).parse(req.body);
  const customer = await Customer.findOneAndUpdate(
    { _id: id, activationTokenHash: security.hashEmailToken(token) },
    { emailVerified: true, $unset: { activationTokenHash: 1 } },
    { new: true }
  );
  if (!customer) throw new HttpError(400, 'Link kích hoạt không hợp lệ hoặc đã được dùng');
  res.json({ message: 'Kích hoạt thành công. Bạn có thể đăng nhập.' });
});

router.post('/resend-activation', authLimiter, async (req, res) => {
  const { email: address } = z.object({ email: z.string().trim().toLowerCase().email('Email không hợp lệ') }).parse(req.body);
  const customer = await Customer.findOne({ email: address });
  if (customer && !customer.emailVerified) {
    const { token, hash } = security.createEmailToken();
    await Customer.updateOne({ _id: customer._id }, { activationTokenHash: hash });
    await email.sendActivation(customer, token);
  }
  // Same answer either way, so this cannot be used to find out who has an account.
  res.json({ message: 'Nếu email thuộc một tài khoản chưa kích hoạt, chúng tôi đã gửi lại link kích hoạt.' });
});

router.post('/login', authLimiter, async (req, res) => {
  const { username, password: pw } = z.object({ username: z.string().trim().min(1), password: z.string().min(1) }).parse(req.body);
  const customer = await Customer.findOne({ username }).select('+password');
  if (!customer || !(await security.checkPassword(pw, customer.password))) {
    throw new HttpError(401, 'Sai tên đăng nhập hoặc mật khẩu');
  }
  if (!customer.emailVerified) throw new HttpError(403, 'Tài khoản chưa được kích hoạt. Hãy kiểm tra email.');
  if (customer.status !== 'active') throw new HttpError(403, 'Tài khoản đã bị khóa. Hãy liên hệ showroom.');
  res.json({ token: security.signToken(customer._id, 'customer'), customer });
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email: address } = z.object({ email: z.string().trim().toLowerCase().email('Email không hợp lệ') }).parse(req.body);
  const customer = await Customer.findOne({ email: address });
  if (customer) {
    const { token, hash } = security.createEmailToken();
    await Customer.updateOne({ _id: customer._id }, {
      resetTokenHash: hash,
      resetTokenExpires: new Date(Date.now() + 30 * 60 * 1000)
    });
    await email.sendPasswordReset(customer, token);
  }
  res.json({ message: 'Nếu email này đã đăng ký, chúng tôi đã gửi link đặt lại mật khẩu.' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const data = z.object({ id: objectId, token: z.string().min(1), password }).parse(req.body);
  const customer = await Customer.findOneAndUpdate(
    { _id: data.id, resetTokenHash: security.hashEmailToken(data.token), resetTokenExpires: { $gt: new Date() } },
    {
      password: await security.hashPassword(data.password),
      emailVerified: true, // opening the email link proves they own the address
      $unset: { resetTokenHash: 1, resetTokenExpires: 1, activationTokenHash: 1 }
    },
    { new: true }
  );
  if (!customer) throw new HttpError(400, 'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  res.json({ message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập.' });
});

// ---------- profile (logged in) ----------

router.get('/me', requireCustomer, (req, res) => {
  res.json(req.customer);
});

router.put('/me', requireCustomer, async (req, res) => {
  const data = z.object({
    name: z.string().trim().min(1, 'Hãy nhập họ tên').max(80),
    phone,
    currentPassword: z.string().optional(),
    newPassword: password.optional().or(z.literal(''))
  }).parse(req.body);

  const update = { name: data.name, phone: data.phone };
  if (data.newPassword) {
    const withPw = await Customer.findById(req.customer._id).select('+password');
    if (!(await security.checkPassword(data.currentPassword, withPw.password))) {
      throw new HttpError(400, 'Mật khẩu hiện tại không đúng');
    }
    update.password = await security.hashPassword(data.newPassword);
  }
  res.json(await Customer.findByIdAndUpdate(req.customer._id, update, { new: true }));
});

// ---------- orders ----------

router.post('/orders', requireCustomer, async (req, res) => {
  const { items, note, payment } = z.object({
    items: z.array(z.object({ car: objectId, quantity: z.coerce.number().int().min(1).max(10) })).min(1, 'Giỏ hàng trống').max(20),
    note: z.string().trim().max(500).optional(),
    payment: z.enum(PAYMENT_METHODS).default('showroom')
  }).parse(req.body);
  let order = await createOrder(req.customer, items, note);
  let payUrl;
  if (payment === 'vnpay') ({ order, payUrl } = await payments.startPayment(order, req.ip));
  req.app.get('io')?.to('admins').emit('order:new', order);
  res.status(201).json({ ...order.toJSON(), payUrl });
});

router.get('/orders', requireCustomer, async (req, res) => {
  res.json(await Order.find({ customer: req.customer._id }).sort({ createdAt: -1 }));
});

async function findOwnOrder(req) {
  if (!mongoose.isValidObjectId(req.params.id)) throw new HttpError(400, 'ID không hợp lệ');
  const order = await Order.findOne({ _id: req.params.id, customer: req.customer._id });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  return order;
}

router.get('/orders/:id', requireCustomer, async (req, res) => {
  res.json(await findOwnOrder(req));
});

// Pay (or retry paying) the online deposit for one of your pending orders.
router.post('/orders/:id/pay', requireCustomer, async (req, res) => {
  const order = await findOwnOrder(req);
  const { payUrl } = await payments.startPayment(order, req.ip);
  res.json({ payUrl });
});

// Customers may cancel while the showroom has not confirmed yet.
router.post('/orders/:id/cancel', requireCustomer, async (req, res) => {
  const order = await findOwnOrder(req);
  if (order.status !== 'PENDING') throw new HttpError(409, 'Chỉ hủy được đơn đang chờ xác nhận');
  if (order.payment?.status === 'paid') {
    throw new HttpError(409, 'Đơn đã đặt cọc, hãy nhắn tin cho showroom để được hủy và hoàn cọc');
  }
  res.json(await changeStatus(order._id, 'CANCELED'));
});

// ---------- chat with the showroom ----------

router.get('/chat', requireCustomer, async (req, res) => {
  const conversation = await chat.getOrCreateConversation(req.customer._id);
  const messages = await chat.listMessages(conversation._id, req.query);
  res.json({ conversation, messages });
});

router.post('/chat/messages', requireCustomer, async (req, res) => {
  const conversation = await chat.getOrCreateConversation(req.customer._id);
  const result = await chat.saveMessage(conversation, 'customer', req.body);
  chat.broadcast(req.app.get('io'), result.conversation, result.message);
  res.status(201).json(result.message);
});

router.post('/chat/read', requireCustomer, async (req, res) => {
  const conversation = await chat.getOrCreateConversation(req.customer._id);
  res.json(await chat.markRead(conversation._id, 'customer'));
});

module.exports = router;
