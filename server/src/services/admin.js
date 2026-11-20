const config = require('../config');
const { Admin } = require('../models');
const { checkPassword, hashPassword } = require('../utils/security');

// -- Đồng bộ tài khoản chủ (owner) với .env mỗi lần khởi động --
async function ensureAdmin() {
  const { username, password, fromEnv } = config.admin;
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({ username, password: await hashPassword(password), name: 'Quản trị viên', role: 'admin', isOwner: true });
    return 'created';
  }

  const owner = (await Admin.findOne({ username }).select('+password +tokenVersion'))
    || (await Admin.findOne({ isOwner: true }).select('+password +tokenVersion'))
    || (count === 1 ? await Admin.findOne().select('+password +tokenVersion') : null);

  if (!owner) {
    if (!fromEnv) return 'unchanged';
    await Admin.create({ username, password: await hashPassword(password), name: 'Quản trị viên', role: 'admin', isOwner: true });
    await Admin.updateMany({ username: { $ne: username }, isOwner: true }, { isOwner: false });
    return 'created';
  }

  let loginChanged = false;
  if (fromEnv) {
    if (owner.username !== username) {
      owner.username = username;
      loginChanged = true;
    }
    if (!(await checkPassword(password, owner.password))) {
      owner.password = await hashPassword(password);
      loginChanged = true;
    }
  }
  if (loginChanged) owner.tokenVersion = (owner.tokenVersion || 0) + 1;
  const repaired = !owner.isOwner || owner.role !== 'admin' || owner.status !== 'active';
  owner.isOwner = true;
  owner.role = 'admin';
  owner.status = 'active';
  if (loginChanged || repaired) await owner.save();
  await Admin.updateMany({ _id: { $ne: owner._id }, isOwner: true }, { isOwner: false });
  return loginChanged ? 'updated' : 'unchanged';
}

module.exports = { ensureAdmin };
