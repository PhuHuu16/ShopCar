const { Admin, Customer } = require('../models');
const { verifyToken } = require('../utils/security');
const HttpError = require('../utils/httpError');

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return req.headers['x-access-token'] || header || null;
}

// Loads the account on every request, so a blocked customer or a deleted
// account is locked out right away instead of when the token expires.
async function loadAccount(token, role) {
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== role) return null;
  if (role === 'admin') return Admin.findById(decoded.id);
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

async function requireCustomer(req, res, next) {
  const customer = await loadAccount(readToken(req), 'customer');
  if (!customer) throw new HttpError(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  req.customer = customer;
  next();
}

module.exports = { requireAdmin, requireCustomer, loadAccount };
