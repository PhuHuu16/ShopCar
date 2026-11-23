const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
const rateLimit = require('express-rate-limit');
const { Brand, Car, Contact } = require('../models');
const { loadAccount } = require('../middleware/auth');
const realtime = require('../realtime');
const { objectId, phone, name } = require('./schemas');
const { listCars, suggestCars, getFilterOptions, VISIBLE } = require('../services/cars');
const HttpError = require('../utils/httpError');

const router = express.Router();

router.get('/brands', async (req, res) => {
  res.json(await Brand.find().sort({ name: 1 }));
});

router.get('/cars', async (req, res) => {
  res.json(await listCars(req.query));
});

router.get('/cars/featured', async (req, res) => {
  const [newest, popular] = await Promise.all([
    Car.find(VISIBLE).sort({ createdAt: -1 }).limit(8).populate('brand', 'name slug'),
    Car.find({ ...VISIBLE, sold: { $gt: 0 } }).sort({ sold: -1 }).limit(8).populate('brand', 'name slug')
  ]);
  res.json({ newest, popular });
});

router.get('/cars/suggest', async (req, res) => {
  const { q } = z.object({ q: z.string().max(100).default('') }).parse(req.query);
  res.json(await suggestCars(q));
});

router.get('/cars/filters', async (req, res) => {
  res.json(await getFilterOptions());
});

router.get('/cars/:slugOrId', async (req, res) => {
  const key = req.params.slugOrId;
  const query = mongoose.isValidObjectId(key) ? { _id: key } : { slug: key };
  const car = await Car.findOne(query).populate('brand', 'name slug');
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  if (car.hidden) return res.json({ car, related: [] });
  const related = await Car.find({ ...VISIBLE, _id: { $ne: car._id }, $or: [{ brand: car.brand._id }, { bodyType: car.bodyType }] })
    .sort({ sold: -1, createdAt: -1 })
    .limit(4)
    .populate('brand', 'name slug');
  res.json({ car, related });
});

// -- Liên hệ / để lại lời nhắn: không cần đăng nhập --

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: { message: 'Bạn đã gửi nhiều lời nhắn, hãy chờ showroom phản hồi hoặc gọi hotline' }
});

const contactSchema = z.object({
  name,
  phone,
  email: z.string().trim().toLowerCase().email('Email không hợp lệ').optional().or(z.literal('')),
  message: z.string().trim().min(5, 'Hãy nhập nội dung (ít nhất 5 ký tự)').max(2000),
  car: objectId.optional()
});

router.post('/contact', contactLimiter, async (req, res) => {
  const data = contactSchema.parse(req.body);
  if (data.car && !(await Car.exists({ _id: data.car }))) throw new HttpError(404, 'Không tìm thấy xe');
  const header = req.headers.authorization || '';
  const customer = header.startsWith('Bearer ') ? await loadAccount(header.slice(7), 'customer') : null;
  const contact = await Contact.create({ ...data, customer: customer?._id });
  await contact.populate('car', 'name slug price images');
  realtime.toAdmins('contact:new', contact);
  res.status(201).json({ message: 'Đã gửi lời nhắn. Showroom sẽ liên hệ lại với bạn sớm nhất.', contact });
});

module.exports = router;
