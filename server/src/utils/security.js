const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

const SALT_ROUNDS = 10;

function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function checkPassword(password, hash) {
  if (typeof password !== 'string' || typeof hash !== 'string') return Promise.resolve(false);
  return bcrypt.compare(password, hash);
}

function signToken(id, role) {
  return jwt.sign({ id: String(id), role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

// Chỉ lưu mã băm của token email, lộ database cũng không dùng được
function createEmailToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashEmailToken(token) };
}

function hashEmailToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

module.exports = { hashPassword, checkPassword, signToken, verifyToken, createEmailToken, hashEmailToken };
