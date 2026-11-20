const { Admin, Customer } = require('../models');
const { verifyToken } = require('../utils/security');
const HttpError = require('../utils/httpError');
const permissions = require('../permissions');

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.headers['x-access-token'] || header || null;
}

async function loadAccount(token, role) {
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== role) return null;
  if (role === 'admin') {
    const admin = await Admin.findById(decoded.id).select('+tokenVersion');
    if (!admin || admin.status === 'disabled' || (decoded.v || 0) !== (admin.tokenVersion || 0)) return null;
    return admin;
  }
  const customer = await Customer.findById(decoded.id);
  if (!customer || customer.status !== 'active' || !customer.emailVerified) return null;
  return customer;
}

async function requireAdmin(req, res, next) {
  const admin = await loadAccount(readToken(req), 'admin');
  if (!admin) throw new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  req.admin = admin;
  next();
}

function can(permission) {
  return (req, res, next) => {
    if (!permissions.can(req.admin, permission)) throw new HttpError(403, 'Bạn không có quyền thực hiện thao tác này');
    next();
  };
}

async function requireCustomer(req, res, next) {
  const customer = await loadAccount(readToken(req), 'customer');
  if (!customer) throw new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  req.customer = customer;
  next();
}

module.exports = { requireAdmin, requireCustomer, loadAccount, can };
