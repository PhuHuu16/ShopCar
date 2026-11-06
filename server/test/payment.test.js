const { startTestServer, login } = require('./helpers');
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const vnpay = require('../src/utils/vnpay');
const { Car, Order } = require('../src/models');

let ctx;
let api;
let customerToken;
let adminToken;

before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
  customerToken = await login(api, 'customer', 'tranbinh', 'demo123');
  adminToken = await login(api, 'admin', 'admin', 'admin123');
});
after(() => ctx.stop());

const asCustomer = (req) => req.set('Authorization', `Bearer ${customerToken}`);
const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);

// "http://localhost:5173/api/payment/..." -> "/api/payment/..." for supertest
const localPath = (url) => url.replace(config.clientUrl, '');

// Opens the demo payment page and returns the "pay" or "cancel" link on it
async function gatewayLink(payUrl, choice) {
  const page = await api.get(localPath(payUrl));
  assert.equal(page.status, 200);
  const label = choice === 'pay' ? 'Thanh toán thành công' : 'Hủy giao dịch';
  const match = page.text.match(new RegExp(`href="([^"]+)">${label}<`));
  assert.ok(match, `link "${label}" on the demo page`);
  return match[1].replace(/&amp;/g, '&');
}

// The website forwards VNPay's answer to the API exactly like this
function returnPath(answerUrl) {
  return `/api/payment/vnpay/return${new URL(answerUrl).search}`;
}

async function orderWithDeposit(quantity = 1) {
  const car = await Car.findOne({ stock: { $gte: quantity } });
  const res = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity }], payment: 'vnpay' });
  assert.equal(res.status, 201);
  return res.body;
}

describe('VNPay signing', () => {
  const secret = 'TESTSECRET';
  const url = vnpay.buildPaymentUrl({
    gatewayUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    tmnCode: 'TESTCODE',
    secret,
    txnRef: 'abc01',
    amount: 10_000_000,
    orderInfo: 'Đặt cọc đơn hàng #ABC',
    returnUrl: 'http://localhost:5173/payment/result',
    ipAddr: '::1'
  });
  const query = Object.fromEntries(new URL(url).searchParams);

  test('builds a signed URL in VNPay format', () => {
    assert.equal(query.vnp_Amount, '1000000000'); // x100
    assert.equal(query.vnp_OrderInfo, 'Dat coc don hang ABC'); // ASCII only
    assert.equal(query.vnp_IpAddr, '127.0.0.1');
    assert.match(query.vnp_CreateDate, /^\d{14}$/);
    assert.match(query.vnp_SecureHash, /^[0-9a-f]{128}$/);
    assert.ok(url.includes('vnp_OrderInfo=Dat+coc+don+hang+ABC'), 'spaces encoded as +');
  });

  test('accepts its own signature and rejects changed values or another secret', () => {
    assert.ok(vnpay.verify(query, secret));
    assert.equal(vnpay.verify({ ...query, vnp_Amount: '100' }, secret), null);
    assert.equal(vnpay.verify(query, 'OTHER'), null);
    assert.equal(vnpay.verify({ ...query, vnp_SecureHash: 'x' }, secret), null);
  });
});

describe('online deposit', () => {
  test('payment config is public', async () => {
    const res = await api.get('/api/payment/config');
    assert.deepEqual(res.body, { depositPerCar: config.payment.depositPerCar, provider: 'demo' });
  });

  test('order with deposit -> pay on the demo page -> order is marked paid once', async () => {
    const order = await orderWithDeposit(2);
    assert.equal(order.payment.status, 'pending');
    assert.equal(order.payment.deposit, 2 * config.payment.depositPerCar);
    const query = Object.fromEntries(new URL(order.payUrl).searchParams);
    assert.equal(query.vnp_Amount, String(order.payment.deposit * 100));

    const answer = await gatewayLink(order.payUrl, 'pay');
    const res = await api.get(returnPath(answer));
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'paid');
    assert.equal(res.body.order.deposit, order.payment.deposit);

    // the same answer again (refresh, or the IPN arriving later) changes nothing
    const again = await api.get(returnPath(answer));
    assert.equal(again.body.status, 'paid');
    const ipn = await api.get(`/api/payment/vnpay/ipn${new URL(answer).search}`);
    assert.deepEqual(ipn.body, { RspCode: '02', Message: 'Order already confirmed' });

    const saved = await Order.findById(order._id);
    assert.equal(saved.payment.status, 'paid');
    assert.ok(saved.payment.transactionNo);

    const cancel = await asCustomer(api.post(`/api/customer/orders/${order._id}/cancel`));
    assert.equal(cancel.status, 409, 'paid orders are cancelled through the showroom');
  });

  test('cancelled payment can be retried with a new transaction', async () => {
    const order = await orderWithDeposit();
    const res = await api.get(returnPath(await gatewayLink(order.payUrl, 'cancel')));
    assert.equal(res.body.status, 'failed');
    assert.equal(res.body.message, 'Bạn đã hủy giao dịch');

    const retry = await asCustomer(api.post(`/api/customer/orders/${order._id}/pay`));
    assert.equal(retry.status, 200);
    const ref = new URL(retry.body.payUrl).searchParams.get('vnp_TxnRef');
    assert.equal(ref, `${order._id}02`);
    const paid = await api.get(returnPath(await gatewayLink(retry.body.payUrl, 'pay')));
    assert.equal(paid.body.status, 'paid');

    const payAgain = await asCustomer(api.post(`/api/customer/orders/${order._id}/pay`));
    assert.equal(payAgain.status, 409);
  });

  test('forged or changed answers are refused', async () => {
    const order = await orderWithDeposit();
    const answer = new URL(await gatewayLink(order.payUrl, 'pay'));
    answer.searchParams.set('vnp_Amount', '100');
    const res = await api.get(returnPath(answer.toString()));
    assert.equal(res.status, 400);
    const ipn = await api.get(`/api/payment/vnpay/ipn${answer.search}`);
    assert.equal(ipn.body.RspCode, '97');
    assert.equal((await Order.findById(order._id)).payment.status, 'pending');
  });

  test('IPN confirms a payment when the customer never returns to the site', async () => {
    const order = await orderWithDeposit();
    const answer = await gatewayLink(order.payUrl, 'pay');
    const ipn = await api.get(`/api/payment/vnpay/ipn${new URL(answer).search}`);
    assert.deepEqual(ipn.body, { RspCode: '00', Message: 'Confirm Success' });
    assert.equal((await Order.findById(order._id)).payment.status, 'paid');
  });

  test('another customer cannot start payment for my order', async () => {
    const order = await orderWithDeposit();
    const otherToken = await login(api, 'customer', 'demo', 'demo123');
    const res = await api.post(`/api/customer/orders/${order._id}/pay`).set('Authorization', `Bearer ${otherToken}`);
    assert.equal(res.status, 404);
  });

  test('admin sees deposits in stats and can filter paid orders', async () => {
    const stats = await asAdmin(api.get('/api/admin/stats'));
    assert.ok(stats.body.deposits.count > 0);
    assert.ok(stats.body.deposits.total > 0);
    const paid = await asAdmin(api.get('/api/admin/orders').query({ payment: 'paid' }));
    assert.ok(paid.body.total > 0);
    assert.ok(paid.body.items.every((o) => o.payment.status === 'paid'));
  });

  test('pay-at-showroom orders need no online payment', async () => {
    const car = await Car.findOne({ stock: { $gt: 0 } });
    const res = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity: 1 }] });
    assert.equal(res.status, 201);
    assert.equal(res.body.payment.method, 'showroom');
    assert.equal(res.body.payment.status, 'none');
    assert.equal(res.body.payUrl, undefined);
  });
});
