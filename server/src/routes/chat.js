// -- Chat cho khách chưa đăng nhập (như tawk.to) --
const express = require('express');
const rateLimit = require('express-rate-limit');
const HttpError = require('../utils/httpError');
const { createVisitorToken, readVisitorToken } = require('../utils/security');
const chat = require('../services/chat');

const router = express.Router();

const visitorLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  message: { message: 'Bạn thao tác quá nhiều lần, hãy thử lại sau' }
});

router.post('/visitor', visitorLimiter, (req, res) => {
  res.status(201).json({ token: createVisitorToken().token });
});

function requireVisitor(req, res, next) {
  const visitorId = readVisitorToken(req.get('x-visitor-token'));
  if (!visitorId) throw new HttpError(401, 'Mã khách không hợp lệ, hãy tải lại trang');
  req.visitorId = visitorId;
  next();
}

router.get('/', requireVisitor, async (req, res) => {
  const conversation = await chat.findVisitorConversation(req.visitorId);
  const messages = conversation ? await chat.listMessages(conversation._id, req.query) : [];
  res.json({ conversation, messages });
});

router.post('/read', requireVisitor, async (req, res) => {
  const conversation = await chat.findVisitorConversation(req.visitorId);
  res.json(conversation ? await chat.markRead(conversation._id, 'customer') : null);
});

module.exports = router;
