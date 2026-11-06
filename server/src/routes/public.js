const express = require('express');
const mongoose = require('mongoose');
const { Brand, Car } = require('../models');
const { listCars, getFilterOptions } = require('../services/cars');
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
    Car.find().sort({ createdAt: -1 }).limit(8).populate('brand', 'name slug'),
    Car.find({ sold: { $gt: 0 } }).sort({ sold: -1 }).limit(8).populate('brand', 'name slug')
  ]);
  res.json({ newest, popular });
});

router.get('/cars/filters', async (req, res) => {
  res.json(await getFilterOptions());
});

router.get('/cars/:slugOrId', async (req, res) => {
  const key = req.params.slugOrId;
  const query = mongoose.isValidObjectId(key) ? { _id: key } : { slug: key };
  const car = await Car.findOne(query).populate('brand', 'name slug');
  if (!car) throw new HttpError(404, 'Không tìm thấy xe');
  const related = await Car.find({ _id: { $ne: car._id }, $or: [{ brand: car.brand._id }, { bodyType: car.bodyType }] })
    .sort({ sold: -1, createdAt: -1 })
    .limit(4)
    .populate('brand', 'name slug');
  res.json({ car, related });
});

module.exports = router;
