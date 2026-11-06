const config = require('../config');
const { Admin } = require('../models');
const { checkPassword, hashPassword } = require('../utils/security');

// Keeps the admin account in line with ADMIN_USERNAME / ADMIN_PASSWORD from .env.
// Runs at every start: creates the account on a new database (for example in
// production), and when .env changes, renames it and/or sets the new password.
// Returns what happened: 'created' | 'updated' | 'unchanged'.
async function ensureAdmin() {
  const { username, password, fromEnv } = config.admin;
  const count = await Admin.countDocuments();
  if (count === 0) {
    await Admin.create({ username, password: await hashPassword(password), name: 'Quản trị viên' });
    return 'created';
  }
  // without .env values, keep whatever login the database already has
  if (!fromEnv) return 'unchanged';

  // the showroom has one admin: rename it rather than leaving the old login working
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
