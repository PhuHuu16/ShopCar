// VNPay payment URL signing and checking (protocol version 2.1.0).
// Parameters are sorted by name, URL-encoded (spaces as "+") and signed with
// HMAC-SHA512 using the merchant's hash secret.
const crypto = require('crypto');

const VERSION = '2.1.0';

const encode = (value) => encodeURIComponent(String(value)).replace(/%20/g, '+');

// "a=1&b=2" over the sorted vnp_* parameters, as VNPay signs them
function signData(params) {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encode(params[key])}`)
    .join('&');
}

function sign(params, secret) {
  return crypto.createHmac('sha512', secret).update(Buffer.from(signData(params), 'utf-8')).digest('hex');
}

// yyyyMMddHHmmss in Vietnam time (GMT+7), the format VNPay expects
function vnDate(date = new Date()) {
  const d = new Date(date.getTime() + 7 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

// Removes accents: VNPay only accepts plain ASCII in vnp_OrderInfo
function plainText(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeIp(ip = '') {
  const clean = ip.replace(/^::ffff:/, '');
  return clean === '::1' || !clean ? '127.0.0.1' : clean;
}

// Builds the address the customer is sent to for paying.
function buildPaymentUrl({ gatewayUrl, tmnCode, secret, txnRef, amount, orderInfo, returnUrl, ipAddr, now = new Date() }) {
  const params = {
    vnp_Version: VERSION,
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Amount: String(Math.round(amount) * 100), // VNPay amounts are in 1/100 VND
    vnp_CurrCode: 'VND',
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: plainText(orderInfo),
    vnp_OrderType: 'other',
    vnp_Locale: 'vn',
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: normalizeIp(ipAddr),
    vnp_CreateDate: vnDate(now),
    vnp_ExpireDate: vnDate(new Date(now.getTime() + 15 * 60 * 1000))
  };
  const hash = sign(params, secret);
  return `${gatewayUrl}?${signData(params)}&vnp_SecureHash=${hash}`;
}

// Checks the signature of parameters coming back from VNPay (return URL / IPN).
// Returns the vnp_* parameters without the hash, or null if the signature is wrong.
function verify(query, secret) {
  const params = {};
  for (const [key, value] of Object.entries(query || {})) {
    if (key.startsWith('vnp_') && key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType') {
      params[key] = Array.isArray(value) ? value[0] : value;
    }
  }
  const given = String(query?.vnp_SecureHash || '').toLowerCase();
  const expected = sign(params, secret);
  if (given.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected)) ? params : null;
}

// Messages for VNPay response codes, shown to the customer
const RESPONSE_MESSAGES = {
  '00': 'Giao dịch thành công',
  '07': 'Giao dịch bị nghi ngờ gian lận',
  '09': 'Thẻ/tài khoản chưa đăng ký dịch vụ Internet Banking',
  10: 'Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần',
  11: 'Đã hết hạn chờ thanh toán',
  12: 'Thẻ/tài khoản bị khóa',
  13: 'Mật khẩu xác thực giao dịch (OTP) không đúng',
  24: 'Bạn đã hủy giao dịch',
  51: 'Tài khoản không đủ số dư',
  65: 'Tài khoản đã vượt quá hạn mức giao dịch trong ngày',
  75: 'Ngân hàng thanh toán đang bảo trì',
  79: 'Nhập sai mật khẩu thanh toán quá số lần quy định',
  99: 'Giao dịch không thành công'
};

function responseMessage(code) {
  return RESPONSE_MESSAGES[code] || RESPONSE_MESSAGES[99];
}

module.exports = { buildPaymentUrl, verify, sign, signData, vnDate, plainText, responseMessage };
