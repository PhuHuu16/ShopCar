// -- Schema dùng chung giữa các router --
const mongoose = require('mongoose');
const { z } = require('zod');
const { PAYMENT_METHODS } = require('../constants');

const objectId = z.string().refine(mongoose.isValidObjectId, 'ID không hợp lệ');
const phone = z.string().trim().regex(/^[0-9+\s.-]{8,15}$/, 'Số điện thoại không hợp lệ');
const name = z.string().trim().min(1, 'Hãy nhập họ tên').max(80);

const orderInput = z.object({
  items: z.array(z.object({ car: objectId, quantity: z.coerce.number().int().min(1).max(10) })).min(1, 'Giỏ hàng trống').max(20),
  note: z.string().trim().max(500).optional(),
  payment: z.enum(PAYMENT_METHODS).default('showroom')
});

const contactInfo = z.object({
  name,
  phone,
  email: z.string().trim().toLowerCase().email('Email không hợp lệ')
});

module.exports = { objectId, phone, name, orderInput, contactInfo };
