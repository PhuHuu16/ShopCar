const config = require('../config');
const { Admin } = require('../models');
const { checkPassword, hashPassword } = require('../utils/security');

// -- Đồng bộ tài khoản quản trị với .env mỗi lần khởi động --
async function ensureAdmin() {
  const { username, password, fromEnv } = config.admin;
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({ username, password: await hashPassword(password), name: 'Quản trị viên' });
    return 'created';
  }
  if (!fromEnv) return 'unchanged';

  // Chỉ có một quản trị viên: đổi tên để tài khoản cũ không còn dùng được
  const admin = (await Admin.findOne({ username }).select('+password'))
    || (count === 1 ? await Admin.findOne().select('+password') : null);
  if (!admin) {
    await Admin.create({ username, password: await hashPassword(password), name: 'Quản trị viên' });
    return 'created';
  }
  if (admin.username === username && (await checkPassword(password, admin.password))) return 'unchanged';
  admin.username = username;
  admin.password = await hashPassword(password);
  await admin.save();
  return 'updated';
}

module.exports = { ensureAdmin };
