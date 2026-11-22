const { Car, Customer } = require('../models');
const { VISIBLE } = require('./cars');

const MAX_ITEMS = 20;
const MAX_PER_CAR = 10;

// -- Giỏ hàng của khách đã đăng nhập (lưu theo tài khoản) --
function normalize(items) {
  const byCar = new Map();
  for (const { car, quantity } of items) {
    const key = String(car);
    byCar.set(key, Math.max(byCar.get(key) || 0, Math.min(Math.max(1, quantity), MAX_PER_CAR)));
  }
  return [...byCar].slice(0, MAX_ITEMS).map(([car, quantity]) => ({ car, quantity }));
}

async function view(entries) {
  const cars = await Car.find({ ...VISIBLE, _id: { $in: entries.map((e) => e.car) } })
    .select('name slug price stock images brand')
    .populate('brand', 'name')
    .lean();
  const byId = new Map(cars.map((c) => [String(c._id), c]));
  return entries
    .filter((e) => byId.has(String(e.car)))
    .map((e) => {
      const car = byId.get(String(e.car));
      const quantity = car.stock > 0 ? Math.min(e.quantity, car.stock, MAX_PER_CAR) : e.quantity;
      return {
        car: {
          _id: car._id,
          slug: car.slug,
          name: car.name,
          price: car.price,
          stock: car.stock,
          image: car.images?.[0]?.thumbUrl || '',
          brand: car.brand?.name || ''
        },
        quantity
      };
    });
}

async function save(customerId, entries) {
  const items = await view(normalize(entries));
  await Customer.updateOne({ _id: customerId }, { cart: items.map((i) => ({ car: i.car._id, quantity: i.quantity })) });
  return { items };
}

async function stored(customerId) {
  const customer = await Customer.findById(customerId).select('+cart').lean();
  return customer?.cart || [];
}

async function getCart(customerId) {
  return save(customerId, await stored(customerId));
}

async function mergeCart(customerId, entries) {
  return save(customerId, [...(await stored(customerId)), ...entries]);
}

async function clearCart(customerId) {
  await Customer.updateOne({ _id: customerId }, { cart: [] });
}

module.exports = { getCart, saveCart: save, mergeCart, clearCart, MAX_ITEMS, MAX_PER_CAR };
