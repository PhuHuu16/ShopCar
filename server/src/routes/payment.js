const express = require('express');
const crypto = require('crypto');
const config = require('../config');
const payments = require('../services/payments');
const vnpay = require('../utils/vnpay');

const router = express.Router();

const shortCode = (id) => `#${String(id).slice(-6).toUpperCase()}`;

function notifyAdmins(req, order) {
  req.app.get('io')?.to('admins').emit('order:paid', order);
}

router.get('/config', (req, res) => {
  res.json({ depositPerCar: config.payment.depositPerCar, provider: payments.provider().name });
});

// -- Trang kết quả: web chuyển kết quả VNPay về đây để kiểm tra --
router.get('/vnpay/return', async (req, res) => {
  const result = await payments.applyResult(req.query);
  if (result.code === 'invalid') return res.status(400).json({ status: 'invalid', message: 'Dữ liệu thanh toán không hợp lệ' });
  if (result.code === 'not_found') return res.status(404).json({ status: 'invalid', message: 'Không tìm thấy giao dịch' });
  if (result.code === 'ok' && result.paid) notifyAdmins(req, result.order);

  const { order } = result;
  const status = result.code === 'amount' ? 'invalid' : order.payment.status;
  res.json({
    status,
    message: result.code === 'amount' ? 'Số tiền thanh toán không khớp' : vnpay.responseMessage(req.query.vnp_ResponseCode),
    order: { _id: order._id, code: shortCode(order._id), total: order.total, deposit: order.payment.deposit, paidAt: order.payment.paidAt }
  });
});

// -- IPN: VNPay gọi trực tiếp để xác nhận thanh toán --
router.get('/vnpay/ipn', async (req, res) => {
  try {
    const result = await payments.applyResult(req.query);
    if (result.code === 'ok' && result.paid) notifyAdmins(req, result.order);
    const answers = {
      invalid: ['97', 'Invalid signature'],
      not_found: ['01', 'Order not found'],
      amount: ['04', 'Invalid amount'],
      already: ['02', 'Order already confirmed'],
      ok: ['00', 'Confirm Success']
    };
    const [RspCode, Message] = answers[result.code];
    res.json({ RspCode, Message });
  } catch (err) {
    console.error('[vnpay ipn]', err);
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// -- Trang thanh toán thử nghiệm (khi chưa cấu hình VNPay) --

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function answerUrl(params, returnUrl, secret, success) {
  const answer = {
    vnp_Amount: params.vnp_Amount,
    vnp_BankCode: 'NCB',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: params.vnp_OrderInfo,
    vnp_PayDate: vnpay.vnDate(),
    vnp_ResponseCode: success ? '00' : '24',
    vnp_TmnCode: params.vnp_TmnCode,
    vnp_TransactionNo: success ? String(crypto.randomInt(10_000_000, 99_999_999)) : '0',
    vnp_TransactionStatus: success ? '00' : '02',
    vnp_TxnRef: params.vnp_TxnRef
  };
  return `${returnUrl}?${vnpay.signData(answer)}&vnp_SecureHash=${vnpay.sign(answer, secret)}`;
}

function page(title, body) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title><style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;padding:16px;box-sizing:border-box}
.card{background:#fff;border-radius:20px;box-shadow:0 20px 50px -20px rgba(15,23,42,.35);max-width:420px;width:100%;overflow:hidden}
.top{background:#005baa;color:#fff;padding:20px 24px}.top b{font-size:18px}.top small{display:block;opacity:.85;margin-top:4px}
.body{padding:24px}.row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid #e2e8f0;font-size:14px}
.row span{color:#64748b}.amount{font-size:30px;font-weight:800;margin:4px 0 16px}
.note{background:#fef3c7;color:#92400e;border-radius:12px;padding:12px 14px;font-size:13px;margin:16px 0;line-height:1.5}
a.btn{display:block;text-align:center;text-decoration:none;font-weight:700;border-radius:12px;padding:14px;margin-top:10px}
.pay{background:#16a34a;color:#fff}.cancel{background:#fff;color:#b91c1c;border:1px solid #fecaca}
</style></head><body><div class="card">${body}</div></body></html>`;
}

router.get('/demo-gateway', (req, res) => {
  const p = payments.provider();
  if (p.name !== 'demo') return res.status(404).json({ message: 'Không tìm thấy' });
  const params = vnpay.verify(req.query, p.secret);
  const returnUrl = String(req.query.vnp_ReturnUrl || '');
  // Chỉ chuyển về đúng web của mình
  if (!params || !returnUrl.startsWith(`${config.clientUrl}/`)) {
    return res.status(400).type('html').send(page('Lỗi thanh toán', '<div class="body"><h2>Liên kết thanh toán không hợp lệ</h2></div>'));
  }
  const expired = params.vnp_ExpireDate && params.vnp_ExpireDate < vnpay.vnDate();
  const amount = Number(params.vnp_Amount) / 100;
  const body = `
    <div class="top"><b>Cổng thanh toán thử nghiệm</b><small>Mô phỏng VNPay · không trừ tiền thật</small></div>
    <div class="body">
      <div style="font-size:14px;color:#64748b">Số tiền đặt cọc</div>
      <div class="amount">${escapeHtml(amount.toLocaleString('vi-VN'))} ₫</div>
      <div class="row"><span>Nội dung</span><b>${escapeHtml(params.vnp_OrderInfo)}</b></div>
      <div class="row"><span>Mã giao dịch</span><b>${escapeHtml(params.vnp_TxnRef.slice(-8).toUpperCase())}</b></div>
      <div class="row"><span>Đơn vị</span><b>ShopCar Showroom</b></div>
      ${expired
        ? '<div class="note">Phiên thanh toán đã hết hạn (15 phút). Hãy quay lại ShopCar và thanh toán lại.</div>'
        : '<div class="note">Đây là trang demo vì máy chủ chưa cấu hình tài khoản VNPay. Khi có <b>VNPAY_TMN_CODE</b> và <b>VNPAY_HASH_SECRET</b>, khách sẽ được chuyển sang VNPay sandbox thật.</div>'}
      ${expired ? '' : `<a class="btn pay" href="${escapeHtml(answerUrl(params, returnUrl, p.secret, true))}">Thanh toán thành công</a>`}
      <a class="btn cancel" href="${escapeHtml(answerUrl(params, returnUrl, p.secret, false))}">Hủy giao dịch</a>
    </div>`;
  res.type('html').send(page('Thanh toán đặt cọc · ShopCar', body));
});

module.exports = router;
