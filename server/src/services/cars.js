const { z } = require('zod');
const mongoose = require('mongoose');
const { Car, Brand } = require('../models');
const search = require('../utils/search');
const { FUELS, TRANSMISSIONS, BODY_TYPES, CONDITIONS } = require('../constants');

const VISIBLE = { hidden: { $ne: true } };

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
  visibility: z.enum(['visible', 'hidden', 'all']).optional(),
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

async function matchingCars(tokens, base, fields = 'name brand') {
  const cars = await Car.find(base).select(fields).populate('brand', 'name').lean();
  return cars.filter((car) => search.matches(car, tokens));
}

// -- Gợi ý khi đang gõ ô tìm kiếm (web khách, chỉ xe đang hiện) --
async function suggestCars(query, limit = 6) {
  const tokens = search.searchTokens(query);
  if (!tokens.length) return { items: [], total: 0 };
  const found = await matchingCars(tokens, VISIBLE, 'name slug brand price stock sold images');
  found.sort((a, b) =>
    search.score(b, tokens) - search.score(a, tokens)
    || (b.stock > 0) - (a.stock > 0)
    || (b.sold || 0) - (a.sold || 0)
    || a.name.localeCompare(b.name));
  const items = found.slice(0, limit).map((car) => ({
    _id: car._id,
    name: car.name,
    slug: car.slug,
    brand: car.brand?.name,
    price: car.price,
    stock: car.stock,
    image: car.images?.[0]?.thumbUrl || car.images?.[0]?.url
  }));
  return { items, total: found.length };
}

// -- Tìm xe (dùng chung cho web và trang quản trị) --
async function listCars(rawQuery, { admin = false } = {}) {
  const q = listQuerySchema.parse(rawQuery);
  const visibility = admin ? q.visibility || 'all' : 'visible';
  const filter = visibility === 'visible' ? { ...VISIBLE } : visibility === 'hidden' ? { hidden: true } : {};
  if (q.q) {
    const tokens = search.searchTokens(q.q);
    const ids = tokens.length ? (await matchingCars(tokens, { ...filter })).map((car) => car._id) : [];
    filter._id = { $in: ids };
  }
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
    Car.aggregate([{ $match: VISIBLE }, {
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

module.exports = { listCars, suggestCars, getFilterOptions, VISIBLE };
