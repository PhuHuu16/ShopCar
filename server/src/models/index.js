const mongoose = require('mongoose');
const {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, CONTACT_STATUSES, AUDIT_ACTIONS
} = require('../constants');

const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

const SECRET_FIELDS = ['password', 'activationTokenHash', 'resetTokenHash', 'resetTokenExpires', 'tokenVersion'];
function hideSecrets(schema, internal = []) {
  schema.set('toJSON', {
    versionKey: false,
    transform(doc, ret) {
      for (const field of SECRET_FIELDS) delete ret[field];
      for (const pathName of internal) {
        const [head, tail] = pathName.split('.');
        if (!tail) delete ret[head];
        else if (ret[head]) delete ret[head][tail];
      }
      return ret;
    }
  });
}

const actorStampSchema = new Schema({
  kind: { type: String, enum: ['admin', 'customer', 'system'], required: true },
  account: { type: ObjectId, ref: 'Admin' },
  name: String
}, { _id: false });

const adminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, default: 'Admin' },
  role: { type: String, enum: ['admin', 'staff'], default: 'admin' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  isOwner: { type: Boolean, default: false },
  lastLoginAt: Date,
  tokenVersion: { type: Number, default: 0 }
}, { timestamps: true });
hideSecrets(adminSchema);

const customerSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: CUSTOMER_STATUSES, default: 'active' },
  activationTokenHash: { type: String, select: false },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false }
}, { timestamps: true });
hideSecrets(customerSchema);

const brandSchema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, required: true, unique: true }
}, { timestamps: true });
hideSecrets(brandSchema);

const imageSchema = new Schema({
  url: { type: String, required: true },
  thumbUrl: { type: String, required: true }
}, { _id: false });

const carSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true },
  brand: { type: ObjectId, ref: 'Brand', required: true, index: true },
  price: { type: Number, required: true, min: 0 },
  year: { type: Number, required: true },
  mileage: { type: Number, default: 0, min: 0 },
  fuel: { type: String, enum: FUELS, required: true },
  transmission: { type: String, enum: TRANSMISSIONS, required: true },
  bodyType: { type: String, enum: BODY_TYPES, required: true },
  seats: { type: Number, required: true, min: 1 },
  color: { type: String, default: '' },
  condition: { type: String, enum: CONDITIONS, default: 'new' },
  description: { type: String, default: '' },
  images: { type: [imageSchema], default: [] },
  stock: { type: Number, default: 1, min: 0 },
  sold: { type: Number, default: 0, min: 0 },
  hidden: { type: Boolean, default: false },
  hiddenAt: Date
}, { timestamps: true });
carSchema.index({ hidden: 1 });
carSchema.index({ price: 1 });
carSchema.index({ createdAt: -1 });
carSchema.index({ sold: -1 });
hideSecrets(carSchema);

const orderItemSchema = new Schema({
  car: { type: ObjectId, ref: 'Car', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// -- Đặt cọc online --
const paymentSchema = new Schema({
  method: { type: String, enum: PAYMENT_METHODS, default: 'showroom' },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'none' },
  deposit: { type: Number, default: 0 },
  provider: { type: String, enum: ['vnpay', 'demo'] },
  txnRef: String,
  attempts: { type: Number, default: 0 },
  responseCode: String,
  transactionNo: String,
  bankCode: String,
  paidAt: Date
}, { _id: false });

const orderSchema = new Schema({
  customer: { type: ObjectId, ref: 'Customer', index: true },
  customerInfo: {
    name: String,
    phone: String,
    email: String
  },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true },
  note: { type: String, default: '' },
  status: { type: String, enum: ORDER_STATUSES, default: 'PENDING', index: true },
  approvedAt: Date,
  approvedBy: actorStampSchema,
  canceledAt: Date,
  canceledBy: actorStampSchema,
  cancelReason: String,
  stockHeld: { type: Boolean, default: false },
  holdUntil: Date,
  payment: { type: paymentSchema, default: () => ({}) }
}, { timestamps: true });
orderSchema.index({ holdUntil: 1 }, { sparse: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.txnRef': 1 }, { unique: true, sparse: true });
hideSecrets(orderSchema, ['approvedBy.account', 'canceledBy.account']);

// -- Liên hệ / để lại lời nhắn, không cần tài khoản --
const contactSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: '' },
  message: { type: String, required: true, maxlength: 2000 },
  car: { type: ObjectId, ref: 'Car' },
  customer: { type: ObjectId, ref: 'Customer' },
  status: { type: String, enum: CONTACT_STATUSES, default: 'new', index: true },
  handledAt: Date,
  handledBy: actorStampSchema
}, { timestamps: true });
contactSchema.index({ createdAt: -1 });
hideSecrets(contactSchema, ['handledBy.account']);

// -- Chat: mỗi khách (có tài khoản hoặc chưa đăng nhập) một cuộc trò chuyện --
const SENDERS = ['customer', 'admin', 'bot'];

const conversationSchema = new Schema({
  customer: { type: ObjectId, ref: 'Customer' },
  visitorId: String,
  visitor: { name: String, phone: String },
  lastMessage: {
    text: String,
    sender: { type: String, enum: SENDERS },
    at: Date
  },
  unreadByAdmin: { type: Number, default: 0 },
  unreadByCustomer: { type: Number, default: 0 }
}, { timestamps: true });
conversationSchema.index({ customer: 1 }, { unique: true, partialFilterExpression: { customer: { $type: 'objectId' } } });
conversationSchema.index({ visitorId: 1 }, { unique: true, partialFilterExpression: { visitorId: { $type: 'string' } } });
conversationSchema.index({ 'lastMessage.at': -1 });
hideSecrets(conversationSchema);

const messageSchema = new Schema({
  conversation: { type: ObjectId, ref: 'Conversation', required: true },
  sender: { type: String, enum: SENDERS, required: true },
  text: { type: String, required: true, maxlength: 2000 },
  car: { type: ObjectId, ref: 'Car' },
  cars: { type: [{ type: ObjectId, ref: 'Car' }], default: undefined },
  quickReplies: { type: [String], default: undefined },
  link: { label: String, to: String },
  staff: { type: ObjectId, ref: 'Admin' },
  staffName: String
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: -1 });
hideSecrets(messageSchema, ['staff']);

// -- Nhật ký thao tác trang quản trị (services/audit.js). Không xóa, không sửa. --
const auditLogSchema = new Schema({
  actor: {
    account: { type: ObjectId, ref: 'Admin' },
    name: String,
    username: String,
    role: String
  },
  action: { type: String, enum: AUDIT_ACTIONS, required: true },
  target: {
    kind: { type: String, enum: ['car', 'brand', 'order', 'customer', 'contact', 'staff'] },
    id: ObjectId,
    label: String
  },
  details: Schema.Types.Mixed,
  ip: String
}, { timestamps: { createdAt: true, updatedAt: false } });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ 'actor.account': 1, createdAt: -1 });
auditLogSchema.index({ 'target.id': 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
hideSecrets(auditLogSchema);

module.exports = {
  Admin: model('Admin', adminSchema),
  Customer: model('Customer', customerSchema),
  Brand: model('Brand', brandSchema),
  Car: model('Car', carSchema),
  Order: model('Order', orderSchema),
  Contact: model('Contact', contactSchema),
  Conversation: model('Conversation', conversationSchema),
  Message: model('Message', messageSchema),
  AuditLog: model('AuditLog', auditLogSchema)
};
