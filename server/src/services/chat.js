const { z } = require('zod');
const mongoose = require('mongoose');
const { Conversation, Message, Car } = require('../models');
const HttpError = require('../utils/httpError');

const CAR_FIELDS = 'name slug price images';

const sendSchema = z.object({
  text: z.string().trim().min(1, 'Tin nhắn trống').max(2000),
  car: z.string().refine(mongoose.isValidObjectId, 'ID xe không hợp lệ').optional()
});

async function getOrCreateConversation(customerId) {
  return Conversation.findOneAndUpdate(
    { customer: customerId },
    { $setOnInsert: { customer: customerId } },
    { upsert: true, new: true }
  );
}

async function listMessages(conversationId, { before, limit = 50 } = {}) {
  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: new Date(before) };
  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate('car', CAR_FIELDS);
  return messages.reverse();
}

async function saveMessage(conversation, sender, input) {
  const { text, car } = sendSchema.parse(input);
  if (car && !(await Car.exists({ _id: car }))) throw new HttpError(404, 'Không tìm thấy xe');
  const message = await Message.create({ conversation: conversation._id, sender, text, car });
  const unreadField = sender === 'customer' ? 'unreadByAdmin' : 'unreadByCustomer';
  const updated = await Conversation.findByIdAndUpdate(
    conversation._id,
    { lastMessage: { text, sender, at: message.createdAt }, $inc: { [unreadField]: 1 } },
    { new: true }
  ).populate('customer', 'name username email phone');
  await message.populate('car', CAR_FIELDS);
  return { message, conversation: updated };
}

async function markRead(conversationId, reader) {
  const field = reader === 'customer' ? 'unreadByCustomer' : 'unreadByAdmin';
  return Conversation.findByIdAndUpdate(conversationId, { [field]: 0 }, { new: true });
}

// Gửi tin mới cho khách và tất cả quản trị viên đang online
function broadcast(io, conversation, message) {
  if (!io) return;
  const payload = { conversationId: String(conversation._id), conversation, message };
  io.to(`conversation:${conversation._id}`).to('admins').emit('message:new', payload);
}

module.exports = { getOrCreateConversation, listMessages, saveMessage, markRead, broadcast };
