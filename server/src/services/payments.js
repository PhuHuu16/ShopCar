// Online deposits through VNPay. Without VNPay merchant settings the same flow
// runs against a built-in demo payment page (see routes/payment.js).
const crypto = require('crypto');
const config = require('../config');
const { Order } = require('../models');
const HttpError = require('../utils/httpError');
const vnpay = require('../utils/vnpay');

// Secret for the demo page. Derived from JWT_SECRET so nobody outside the
// server can forge a "paid" answer, even in demo mode.
const demoSecret = crypto.createHmac('sha256', config.jwtSecret).update('shopcar-demo-payment').digest('hex');

function provider() {
  const { tmnCode, hashSecret, url } = config.payment.vnpay;
  if (tmnCode && hashSecret) return { name: 'vnpay', tmnCode, secret: hashSecret, gatewayUrl: url };
  return { name: 'demo', tmnCode: 'SHOPCARDEMO', secret: demoSecret, gatewayUrl: `${config.clientUrl}/api/payment/demo-gateway` };
}

function depositFor(order) {
  const cars = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return Math.min(order.total, cars * config.payment.depositPerCar);
}

const shortCode = (id) => String(id).slice(-6).toUpperCase();

// Gives the order a new payment attempt and returns the address to pay at.
async function startPayment(order, ipAddr) {
  if (order.status !== 'PENDING') throw new HttpError(409, 'Chỉ đặt cọc được cho đơn đang chờ xác nhận');
  if (order.payment?.status === 'paid') throw new HttpError(409, 'Đơn hàng này đã được đặt cọc');

  const p = provider();
  const attempt = (order.payment?.attempts || 0) + 1;
  const txnRef = `${order._id}${String(attempt).padStart(2, '0')}`;
  const deposit = depositFor(order);
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: 'PENDING', 'payment.status': { $ne: 'paid' } },
    {
      $set: {
        'payment.method': 'vnpay',
        'payment.status': 'pending',
        'payment.deposit': deposit,
        'payment.provider': p.name,
        'payment.txnRef': txnRef,
        'payment.attempts': attempt
      },
      $unset: { 'payment.responseCode': 1 }
    },
    { new: true }
  );
  if (!updated) throw new HttpError(409, 'Đơn hàng vừa được cập nhật, hãy tải lại');

  const payUrl = vnpay.buildPaymentUrl({
    gatewayUrl: p.gatewayUrl,
    tmnCode: p.tmnCode,
    secret: p.secret,
    txnRef,
    amount: deposit,
    orderInfo: `Dat coc don hang ${shortCode(order._id)}`,
    returnUrl: `${config.clientUrl}/payment/result`,
    ipAddr
  });
  return { order: updated, payUrl };
}

// Applies the answer VNPay sends back (to the return page and to the IPN).
// Safe to call twice for the same payment: only the first call changes the order.
// code: ok | invalid (bad signature) | not_found | amount | already
async function applyResult(query) {
  const p = provider();
  const params = vnpay.verify(query, p.secret);
  if (!params) return { code: 'invalid' };

  const order = await Order.findOne({ 'payment.txnRef': params.vnp_TxnRef });
  if (!order) return { code: 'not_found' };
  if (Number(params.vnp_Amount) !== order.payment.deposit * 100) return { code: 'amount', order };
  if (order.payment.status !== 'pending') return { code: 'already', order };

  const paid = params.vnp_ResponseCode === '00' && (params.vnp_TransactionStatus ?? '00') === '00';
  const changes = paid
    ? {
        'payment.status': 'paid',
        'payment.paidAt': new Date(),
        'payment.responseCode': params.vnp_ResponseCode,
        'payment.transactionNo': params.vnp_TransactionNo,
        'payment.bankCode': params.vnp_BankCode
      }
    : { 'payment.status': 'failed', 'payment.responseCode': params.vnp_ResponseCode };
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, 'payment.txnRef': params.vnp_TxnRef, 'payment.status': 'pending' },
    { $set: changes },
    { new: true }
  );
  if (!updated) return { code: 'already', order: await Order.findById(order._id) };
  return { code: 'ok', order: updated, paid, responseCode: params.vnp_ResponseCode };
}

module.exports = { provider, depositFor, startPayment, applyResult, demoSecret };
