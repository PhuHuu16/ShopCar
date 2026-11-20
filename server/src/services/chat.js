const { z } = require('zod');
const mongoose = require('mongoose');
const { Conversation, Message, Car } = require('../models');
const HttpError = require('../utils/httpError');

const CAR_FIELDS = 'name slug price images stock';
const CUSTOMER_FIELDS = 'name username email phone';

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

async function getOrCreateVisitorConversation(visitorId) {
  return Conversation.findOneAndUpdate(
    { visitorId },
    { $setOnInsert: { visitorId } },
    { upsert: true, new: true }
  );
}

function findVisitorConversation(visitorId) {
  return Conversation.findOne({ visitorId });
}

async function listMessages(conversationId, { before, limit = 50 } = {}) {
  const query = { conversation: conversationId };
  if (before) query.createdAt = { $lt: new Date(before) };
  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 50, 100))
    .populate('car', CAR_FIELDS)
    .populate('cars', CAR_FIELDS);
  return messages.reverse();
}

async function store(conversation, data) {
  const message = await Message.create({ conversation: conversation._id, ...data });
  const unreadField = data.sender === 'customer' ? 'unreadByAdmin' : 'unreadByCustomer';
  const updated = await Conversation.findByIdAndUpdate(
    conversation._id,
    { lastMessage: { text: data.text, sender: data.sender, at: message.createdAt }, $inc: { [unreadField]: 1 } },
    { new: true }
  ).populate('customer', CUSTOMER_FIELDS);
  await message.populate([{ path: 'car', select: CAR_FIELDS }, { path: 'cars', select: CAR_FIELDS }]);
  return { message, conversation: updated };
}

async function saveMessage(conversation, sender, input, staff) {
  const { text, car } = sendSchema.parse(input);
  if (car && !(await Car.exists({ _id: car }))) throw new HttpError(404, 'Không tìm thấy xe');
  const by = sender === 'admin' && staff ? { staff: staff._id, staffName: staff.name || staff.username } : {};
  return store(conversation, { sender, text, car, ...by });
}

function saveBotMessage(conversation, { text, cars, quickReplies, link }) {
  return store(conversation, {
    sender: 'bot',
    text,
    cars: cars?.length ? cars : undefined,
    quickReplies: quickReplies?.length ? quickReplies : undefined,
    link: link || undefined
  });
}

async function markRead(conversationId, reader) {
  const field = reader === 'admin' ? 'unreadByAdmin' : 'unreadByCustomer';
  return Conversation.findByIdAndUpdate(conversationId, { [field]: 0 }, { new: true });
}

function customerRooms(io, conversation) {
  let target = io.to(`conversation:${conversation._id}`);
  if (conversation.visitorId) target = target.to(`visitor:${conversation.visitorId}`);
  return target;
}

function broadcast(io, conversation, message) {
  if (!io) return;
  const payload = { conversationId: String(conversation._id), conversation, message };
  customerRooms(io, conversation).to('admins').emit('message:new', payload);
}

module.exports = {
  getOrCreateConversation,
  getOrCreateVisitorConversation,
  findVisitorConversation,
  listMessages,
  saveMessage,
  saveBotMessage,
  markRead,
  broadcast,
  customerRooms
};
