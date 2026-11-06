const mongoose = require('mongoose');
const {
  FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS, ORDER_STATUSES, CUSTOMER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES
} = require('../constants');

const { Schema, model } = mongoose;
const { ObjectId } = Schema.Types;

// Never put passwords or email tokens into API responses, even by mistake.
const SECRET_FIELDS = ['password', 'activationTokenHash', 'resetTokenHash', 'resetTokenExpires'];
function hideSecrets(schema) {
  schema.set('toJSON', {
    versionKey: false,
    transform(doc, ret) {
      for (const field of SECRET_FIELDS) delete ret[field];
      return ret;
    }
  });
}

const adminSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, default: 'Admin' }
}, { timestamps: true });
hideSecrets(adminSchema);

const customerSchema = new Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  emailVerified: { type: Boolean, default: false },
  status: { type: String, enum: CUSTOMER_STATUSES, default: 'active' }, // admin can block
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
  price: { type: Number, required: true, min: 0 }, // VND
  year: { type: Number, required: true },
  mileage: { type: Number, default: 0, min: 0 }, // km
  fuel: { type: String, enum: FUELS, required: true },
  transmission: { type: String, enum: TRANSMISSIONS, required: true },
  bodyType: { type: String, enum: BODY_TYPES, required: true },
  seats: { type: Number, required: true, min: 1 },
  color: { type: String, default: '' },
  condition: { type: String, enum: CONDITIONS, default: 'new' },
  description: { type: String, default: '' },
  images: { type: [imageSchema], default: [] }, // first image = cover
  stock: { type: Number, default: 1, min: 0 },
  sold: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
carSchema.index({ price: 1 });
carSchema.index({ createdAt: -1 });
carSchema.index({ sold: -1 });
hideSecrets(carSchema);

// Orders keep a copy of the car and customer details at the time of purchase,
// so later edits (or deleting a car) do not change old orders.
const orderItemSchema = new Schema({
  car: { type: ObjectId, ref: 'Car', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 }
}, { _id: false });

// Online deposit for an order. Each payment attempt gets a new txnRef.
const paymentSchema = new Schema({
  method: { type: String, enum: PAYMENT_METHODS, default: 'showroom' },
  status: { type: String, enum: PAYMENT_STATUSES, default: 'none' },
  deposit: { type: Number, default: 0 },
  provider: { type: String, enum: ['vnpay', 'demo'] }, // demo = built-in test payment page
  txnRef: String,
  attempts: { type: Number, default: 0 },
  responseCode: String,
  transactionNo: String,
  bankCode: String,
  paidAt: Date
}, { _id: false });

const orderSchema = new Schema({
  customer: { type: ObjectId, ref: 'Customer', required: true, index: true },
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
  payment: { type: paymentSchema, default: () => ({}) }
}, { timestamps: true });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'payment.txnRef': 1 }, { unique: true, sparse: true });
hideSecrets(orderSchema);

// One conversation per customer with the showroom.
const conversationSchema = new Schema({
  customer: { type: ObjectId, ref: 'Customer', required: true, unique: true },
  lastMessage: {
    text: String,
    sender: { type: String, enum: ['customer', 'admin'] },
    at: Date
  },
  unreadByAdmin: { type: Number, default: 0 },
  unreadByCustomer: { type: Number, default: 0 }
}, { timestamps: true });
conversationSchema.index({ 'lastMessage.at': -1 });
hideSecrets(conversationSchema);

const messageSchema = new Schema({
  conversation: { type: ObjectId, ref: 'Conversation', required: true },
  sender: { type: String, enum: ['customer', 'admin'], required: true },
  text: { type: String, required: true, maxlength: 2000 },
  car: { type: ObjectId, ref: 'Car' } // optional: "I'm interested in this car"
}, { timestamps: true });
messageSchema.index({ conversation: 1, createdAt: -1 });
hideSecrets(messageSchema);

module.exports = {
  Admin: model('Admin', adminSchema),
  Customer: model('Customer', customerSchema),
  Brand: model('Brand', brandSchema),
  Car: model('Car', carSchema),
  Order: model('Order', orderSchema),
  Conversation: model('Conversation', conversationSchema),
  Message: model('Message', messageSchema)
};
