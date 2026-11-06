const nodemailer = require('nodemailer');
const config = require('../config');

// Emails sent while running tests, so tests can read the links inside them.
const outbox = [];

let transporter = null;
if (config.email.user && config.email.pass) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.email.user, pass: config.email.pass }
  });
}

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,sans-serif;color:#1f2937">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
    <h1 style="margin:0 0 4px;font-size:20px">ShopCar</h1>
    <h2 style="margin:0 0 20px;font-size:16px;font-weight:normal;color:#6b7280">${title}</h2>
    ${bodyHtml}
    <p style="margin-top:32px;font-size:12px;color:#9ca3af">Nếu bạn không yêu cầu email này, hãy bỏ qua nó.</p>
  </div>
</body></html>`;
}

function button(link, label) {
  return `<p><a href="${link}" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold">${label}</a></p>
<p style="font-size:12px;color:#6b7280;word-break:break-all">Hoặc mở link: ${link}</p>`;
}

async function send({ to, subject, html, text, link }) {
  if (config.isTest) {
    outbox.push({ to, subject, text, link });
    return true;
  }
  if (!transporter) {
    console.log(`\n[email] (EMAIL_USER/EMAIL_PASS not set, not sent)\n  to: ${to}\n  subject: ${subject}\n  ${text}\n`);
    return true;
  }
  try {
    await transporter.sendMail({ from: `ShopCar <${config.email.user}>`, to, subject, html, text });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return false;
  }
}

function sendActivation(customer, token) {
  const link = `${config.clientUrl}/activate?id=${customer._id}&token=${token}`;
  return send({
    to: customer.email,
    subject: 'Kích hoạt tài khoản ShopCar',
    text: `Chào ${customer.name}, mở link sau để kích hoạt tài khoản: ${link}`,
    html: layout('Kích hoạt tài khoản', `<p>Chào <b>${escapeHtml(customer.name)}</b>,</p>
      <p>Cảm ơn bạn đã đăng ký. Bấm nút bên dưới để kích hoạt tài khoản.</p>${button(link, 'Kích hoạt tài khoản')}`),
    link
  });
}

function sendPasswordReset(customer, token) {
  const link = `${config.clientUrl}/reset-password?id=${customer._id}&token=${token}`;
  return send({
    to: customer.email,
    subject: 'Đặt lại mật khẩu ShopCar',
    text: `Chào ${customer.name}, mở link sau trong 30 phút để đặt lại mật khẩu: ${link}`,
    html: layout('Đặt lại mật khẩu', `<p>Chào <b>${escapeHtml(customer.name)}</b>,</p>
      <p>Bấm nút bên dưới để đặt mật khẩu mới. Link có hiệu lực trong 30 phút.</p>${button(link, 'Đặt lại mật khẩu')}`),
    link
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

module.exports = { sendActivation, sendPasswordReset, outbox };
