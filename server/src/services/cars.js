const { z } = require('zod');
const mongoose = require('mongoose');
const { Car, Brand } = require('../models');
const { escapeRegex } = require('../utils/slug');
const { FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS } = require('../constants');

const SORTS = {
  newest: { createdAt: -1 },
  price_asc: { price: 1 },
  price_desc: { price: -1 },
  name_asc: { name: 1 },
  year_desc: { year: -1, createdAt: -1 },
  popular: { sold: -1, createdAt: -1 }
};

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  fuel: z.enum(FUELS).optional(),
  transmission: z.enum(TRANSMISSIONS).optional(),
  bodyType: z.enum(BODY_TYPES).optional(),
  condition: z.enum(CONDITIONS).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minYear: z.coerce.number().int().optional(),
  maxYear: z.coerce.number().int().optional(),
  inStock: z.enum(['true', 'false']).optional(),
  sort: z.enum(Object.keys(SORTS)).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12)
});

function range(min, max) {
  if (min === undefined && max === undefined) return undefined;
  const r = {};
  if (min !== undefined) r.$gte = min;
  if (max !== undefined) r.$lte = max;
  return r;
}

// -- Tìm xe (dùng chung cho web và trang quản trị) --
async function listCars(rawQuery) {
  const q = listQuerySchema.parse(rawQuery);
  const filter = {};
  if (q.q) filter.name = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.brand) {
    const brand = mongoose.isValidObjectId(q.brand)
      ? await Brand.findById(q.brand)
      : await Brand.findOne({ slug: q.brand });
    if (!brand) return { items: [], total: 0, page: q.page, pages: 0 };
    filter.brand = brand._id;
  }
  for (const key of ['fuel', 'transmission', 'bodyType', 'condition']) {
    if (q[key]) filter[key] = q[key];
  }
  const price = range(q.minPrice, q.maxPrice);
  if (price) filter.price = price;
  const year = range(q.minYear, q.maxYear);
  if (year) filter.year = year;
  if (q.inStock === 'true') filter.stock = { $gt: 0 };
  if (q.inStock === 'false') filter.stock = 0;

  const [items, total] = await Promise.all([
    Car.find(filter)
      .sort(SORTS[q.sort])
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate('brand', 'name slug'),
    Car.countDocuments(filter)
  ]);
  return { items, total, page: q.page, pages: Math.ceil(total / q.limit) };
}

async function getFilterOptions() {
  const [brands, stats] = await Promise.all([
    Brand.find().sort({ name: 1 }),
    Car.aggregate([{
      $group: {
        _id: null,
        minPrice: { $min: '$price' }, maxPrice: { $max: '$price' },
        minYear: { $min: '$year' }, maxYear: { $max: '$year' }
      }
    }])
  ]);
  const s = stats[0] || {};
  return {
    brands,
    fuels: FUELS,
    transmissions: TRANSMISSIONS,
    bodyTypes: BODY_TYPES,
    conditions: CONDITIONS,
    price: { min: s.minPrice || 0, max: s.maxPrice || 0 },
    year: { min: s.minYear || null, max: s.maxYear || null }
  };
}

module.exports = { listCars, getFilterOptions };
