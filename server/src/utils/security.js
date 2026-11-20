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

function signToken(id, role, version = 0) {
  const payload = { id: String(id), role };
  if (version) payload.v = version;
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}

function createEmailToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashEmailToken(token) };
}

function hashEmailToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function orderToken(orderId) {
  return crypto.createHmac('sha256', config.jwtSecret).update(`order:${orderId}`).digest('base64url').slice(0, 32);
}

function checkOrderToken(orderId, token) {
  if (typeof token !== 'string' || !token) return false;
  const expected = Buffer.from(orderToken(orderId));
  const given = Buffer.from(token);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function visitorSignature(visitorId) {
  return crypto.createHmac('sha256', config.jwtSecret).update(`visitor:${visitorId}`).digest('base64url').slice(0, 32);
}

function createVisitorToken() {
  const visitorId = crypto.randomBytes(12).toString('hex');
  return { visitorId, token: `${visitorId}.${visitorSignature(visitorId)}` };
}

function readVisitorToken(token) {
  if (typeof token !== 'string') return null;
  const [visitorId, signature] = token.split('.');
  if (!/^[0-9a-f]{24}$/.test(visitorId || '') || !signature) return null;
  const expected = Buffer.from(visitorSignature(visitorId));
  const given = Buffer.from(signature);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected) ? visitorId : null;
}

module.exports = {
  hashPassword, checkPassword, signToken, verifyToken, createEmailToken, hashEmailToken, orderToken, checkOrderToken,
  createVisitorToken, readVisitorToken
};
