// -- Đặt hàng không cần đăng nhập (khách vãng lai) --
const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { Order } = require('../models');
const HttpError = require('../utils/httpError');
const security = require('../utils/security');
const email = require('../utils/email');
const realtime = require('../realtime');
const { createOrder, changeStatus } = require('../services/orders');
const payments = require('../services/payments');
const { orderInput, contactInfo } = require('./schemas');

const router = express.Router();

const guestOrderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  skip: () => config.isTest,
  message: { message: 'Bạn đã đặt quá nhiều đơn, hãy thử lại sau hoặc gọi hotline showroom' }
});

const trackLink = (order, token) => `${config.clientUrl}/orders/track/${order._id}?token=${token}`;

router.post('/', guestOrderLimiter, async (req, res) => {
  const { customerInfo, items, note, payment } = orderInput.extend({ customerInfo: contactInfo }).parse(req.body);
  let order = await createOrder(customerInfo, items, note);
  let payUrl;
  if (payment === 'vnpay') ({ order, payUrl } = await payments.startPayment(order, req.ip));
  const token = security.orderToken(order._id);
  realtime.orderChanged(order, 'order:new');
  email.sendOrderConfirmation(order, trackLink(order, token)).catch(() => {});
  res.status(201).json({ ...order.toJSON(), payUrl, trackToken: token });
});

async function findGuestOrder(req) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'ID không hợp lệ');
  const token = req.query.token || req.body?.token;
  if (!security.checkOrderToken(id, token)) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  const order = await Order.findOne({ _id: id, customer: { $exists: false } });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  return order;
}

router.get('/:id', async (req, res) => {
  res.json(await findGuestOrder(req));
});

router.post('/:id/pay', async (req, res) => {
  const order = await findGuestOrder(req);
  const { payUrl } = await payments.startPayment(order, req.ip);
  res.json({ payUrl });
});

router.post('/:id/cancel', async (req, res) => {
  const order = await findGuestOrder(req);
  if (order.status !== 'PENDING') throw new HttpError(409, 'Chỉ hủy được đơn đang chờ xác nhận');
  if (order.payment?.status === 'paid') {
    throw new HttpError(409, 'Đơn đã đặt cọc, hãy liên hệ showroom để được hủy và hoàn cọc');
  }
  res.json(await changeStatus(order._id, 'CANCELED', { reason: 'Khách hủy đơn', by: { kind: 'customer', name: order.customerInfo?.name } }));
});

module.exports = router;
