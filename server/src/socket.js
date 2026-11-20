const { Server } = require('socket.io');
const mongoose = require('mongoose');
const config = require('./config');
const { loadAccount } = require('./middleware/auth');
const { Admin, Conversation, Customer } = require('./models');
const permissions = require('./permissions');
const chat = require('./services/chat');
const bot = require('./services/bot');
const realtime = require('./realtime');
const { checkOrderToken, readVisitorToken } = require('./utils/security');

const MESSAGES_PER_MINUTE = 20;

// -- Realtime: chat, trạng thái đơn hàng, tồn kho --
function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: config.isProd ? undefined : { origin: [config.clientUrl, /^http:\/\/localhost:\d+$/] }
  });
  realtime.setIo(io);

  io.use(async (socket, next) => {
    try {
      const { token, role, visitor } = socket.handshake.auth || {};
      if (visitor !== undefined) {
        const visitorId = readVisitorToken(visitor);
        if (!visitorId) return next(new Error('unauthorized'));
        socket.data.role = 'visitor';
        socket.data.visitorId = visitorId;
        return next();
      }
      if (!token && !role) {
        socket.data.role = 'guest';
        return next();
      }
      if (role !== 'customer' && role !== 'admin') return next(new Error('unauthorized'));
      const account = await loadAccount(token, role);
      if (!account) return next(new Error('unauthorized'));
      socket.data.role = role;
      socket.data.accountId = String(account._id);
      if (role === 'admin') socket.data.canChat = permissions.can(account, 'chats.reply');
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const { role, accountId, visitorId } = socket.data;
    let ownConversation = Promise.resolve(null);
    if (role === 'admin') {
      socket.join(['admins', `staff:${accountId}`]);
      if (socket.data.canChat) socket.join('support');
      realtime.supportStatus();
    } else if (role === 'customer') {
      socket.join(`customer:${accountId}`);
      ownConversation = chat.getOrCreateConversation(accountId).then((c) => {
        socket.join(`conversation:${c._id}`);
        return c;
      });
      ownConversation.catch((err) => console.error('[chat]', err));
    } else if (role === 'visitor') {
      socket.join(`visitor:${visitorId}`);
    }
    realtime.supportStatus(socket);

    socket.on('disconnect', () => {
      if (role === 'admin') realtime.supportStatus();
    });

    const sentAt = [];
    function tooFast() {
      const now = Date.now();
      while (sentAt.length && now - sentAt[0] > 60_000) sentAt.shift();
      sentAt.push(now);
      return sentAt.length > MESSAGES_PER_MINUTE;
    }

    socket.on('order:watch', (payload, ack = () => {}) => {
      const list = Array.isArray(payload) ? payload.slice(0, 20) : [payload];
      let watching = 0;
      for (const item of list) {
        if (item && mongoose.isValidObjectId(item.id) && checkOrderToken(item.id, item.token)) {
          socket.join(`order:${item.id}`);
          watching += 1;
        }
      }
      ack({ ok: watching > 0, watching });
    });

    socket.on('message:send', async (payload, ack = () => {}) => {
      if (role === 'guest') return ack({ ok: false, message: 'Hãy tải lại trang để bắt đầu chat' });
      if (role !== 'admin' && tooFast()) return ack({ ok: false, message: 'Bạn gửi nhanh quá, hãy chờ một chút' });
      try {
        const staff = role === 'admin' ? await adminCanChat() : null;
        if (role === 'admin' && !staff) return ack({ ok: false, message: 'Bạn không có quyền chat với khách' });
        const conversation = await conversationFor(payload, true);
        if (!conversation) return ack({ ok: false, message: 'Không tìm thấy cuộc trò chuyện' });
        const sender = role === 'admin' ? 'admin' : 'customer';
        const result = await chat.saveMessage(conversation, sender, payload || {}, staff);
        chat.broadcast(io, result.conversation, result.message);
        ack({ ok: true, message: result.message });
        if (sender === 'customer') {
          const customer = role === 'customer' ? await Customer.findById(accountId) : null;
          bot.respond(io, result.conversation, result.message, { customer });
        }
      } catch (err) {
        ack({ ok: false, message: err.issues ? err.issues[0].message : err.message || 'Gửi tin nhắn thất bại' });
      }
    });

    socket.on('conversation:read', async (payload, ack = () => {}) => {
      if (role === 'guest') return ack({ ok: false });
      try {
        if (role === 'admin' && !(await adminCanChat())) return ack({ ok: false });
        const conversation = await conversationFor(payload, false);
        if (!conversation) return ack({ ok: false });
        await chat.markRead(conversation._id, role);
        ack({ ok: true });
      } catch {
        ack({ ok: false });
      }
    });

    async function adminCanChat() {
      const admin = await Admin.findById(accountId);
      return admin && permissions.can(admin, 'chats.reply') ? admin : null;
    }

    async function conversationFor(payload, create) {
      if (role === 'customer') return ownConversation;
      if (role === 'visitor') {
        return create ? chat.getOrCreateVisitorConversation(visitorId) : chat.findVisitorConversation(visitorId);
      }
      const id = payload && payload.conversationId;
      if (!mongoose.isValidObjectId(id)) return null;
      return Conversation.findById(id);
    }
  });

  return io;
}

module.exports = { attachSocket };
