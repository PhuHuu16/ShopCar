const { Server } = require('socket.io');
const mongoose = require('mongoose');
const config = require('./config');
const { loadAccount } = require('./middleware/auth');
const { Conversation } = require('./models');
const chat = require('./services/chat');

// -- Chat thời gian thực --
function attachSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: config.isProd ? undefined : { origin: [config.clientUrl, /^http:\/\/localhost:\d+$/] }
  });

  io.use(async (socket, next) => {
    try {
      const { token, role } = socket.handshake.auth || {};
      if (role !== 'customer' && role !== 'admin') return next(new Error('unauthorized'));
      const account = await loadAccount(token, role);
      if (!account) return next(new Error('unauthorized'));
      socket.data.role = role;
      socket.data.accountId = String(account._id);
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const { role, accountId } = socket.data;
    // Gắn listener ngay, nếu không tin gửi ngay sau khi kết nối sẽ bị mất
    let ownConversation = Promise.resolve(null);
    if (role === 'admin') {
      socket.join('admins');
    } else {
      ownConversation = chat.getOrCreateConversation(accountId).then((c) => {
        socket.join(`conversation:${c._id}`);
        return c;
      });
      ownConversation.catch((err) => console.error('[chat]', err));
    }

    async function conversationFor(payload) {
      if (role === 'customer') return ownConversation;
      const id = payload && payload.conversationId;
      if (!mongoose.isValidObjectId(id)) return null;
      return Conversation.findById(id);
    }

    socket.on('message:send', async (payload, ack = () => {}) => {
      try {
        const conversation = await conversationFor(payload);
        if (!conversation) return ack({ ok: false, message: 'Không tìm thấy cuộc trò chuyện' });
        const result = await chat.saveMessage(conversation, role, payload || {});
        chat.broadcast(io, result.conversation, result.message);
        ack({ ok: true, message: result.message });
      } catch (err) {
        ack({ ok: false, message: err.issues ? err.issues[0].message : err.message || 'Gửi tin nhắn thất bại' });
      }
    });

    socket.on('conversation:read', async (payload, ack = () => {}) => {
      try {
        const conversation = await conversationFor(payload);
        if (!conversation) return ack({ ok: false });
        await chat.markRead(conversation._id, role);
        ack({ ok: true });
      } catch {
        ack({ ok: false });
      }
    });
  });

  return io;
}

module.exports = { attachSocket };
