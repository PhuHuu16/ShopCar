// Fills the database with demo data.
//   npm run seed   -> wipes the database and adds fresh demo data
// The dev server also runs seed() by itself the first time (empty database).
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const config = require('../src/config');
const { Admin, Customer, Brand, Car, Order, Conversation, Message } = require('../src/models');
const { hashPassword } = require('../src/utils/security');
const { slugify } = require('../src/utils/slug');
const { BRANDS, CARS, CUSTOMERS, describe } = require('./seed-data');
const { carSvg } = require('./car-art');

const DEMO_PASSWORD = config.demoPassword;

// Small fixed-seed random generator, so every seed gives the same demo data.
function random(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function writeCarImages(car, brandColor) {
  const dir = path.join(config.uploadDir, 'cars', 'seed');
  await fs.mkdir(dir, { recursive: true });
  const images = [];
  for (let v = 0; v < 3; v++) {
    const file = `${car.slug}-${v + 1}.svg`;
    await fs.writeFile(path.join(dir, file), carSvg({ ...car, brandColor }, v));
    const url = `/uploads/cars/seed/${file}`;
    images.push({ url, thumbUrl: url });
  }
  return images;
}

async function seed({ reset = false } = {}) {
  if (reset) {
    await mongoose.connection.dropDatabase();
    await fs.rm(path.join(config.uploadDir, 'cars', 'seed'), { recursive: true, force: true });
  }
  await Promise.all([Admin, Customer, Brand, Car, Order, Conversation, Message].map((M) => M.init()));
  const rand = random(2024);

  await Admin.create({
    username: config.admin.username,
    password: await hashPassword(config.admin.password),
    name: 'Quản trị viên'
  });

  const brandDocs = new Map();
  for (const b of BRANDS) {
    brandDocs.set(b.name, { doc: await Brand.create({ name: b.name, slug: slugify(b.name) }), color: b.color });
  }

  const cars = [];
  const now = Date.now();
  for (let i = 0; i < CARS.length; i++) {
    const [brandName, name, year, price, fuel, transmission, bodyType, seats, color, condition, mileage, stock] = CARS[i];
    const brand = brandDocs.get(brandName);
    const data = { name, year, price, fuel, transmission, bodyType, seats, color, condition, mileage, stock };
    data.slug = slugify(`${name} ${year}`);
    data.images = await writeCarImages({ ...data, brand: brandName }, brand.color);
    data.description = describe(data);
    data.brand = brand.doc._id;
    // spread "added" dates so "newest" sorting looks natural
    const createdAt = new Date(now - (CARS.length - i) * 3 * 86400000);
    cars.push(await Car.create({ ...data, createdAt, updatedAt: createdAt }));
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const customers = [];
  for (const c of CUSTOMERS) {
    customers.push(await Customer.create({ ...c, password: passwordHash, emailVerified: true }));
  }

  // ~30 orders over the last 12 months so the dashboard charts have data
  const sold = new Map();
  for (let i = 0; i < 30; i++) {
    const customer = customers[Math.floor(rand() * customers.length)];
    const car = cars[Math.floor(rand() * cars.length)];
    // the first 4 are recent orders still waiting for the showroom to confirm
    const recent = i < 4;
    const days = recent ? Math.floor(rand() * 5) : 5 + Math.floor(rand() * 355);
    const createdAt = new Date(now - days * 86400000 - Math.floor(rand() * 86400000));
    const status = recent ? 'PENDING' : rand() < 0.85 ? 'APPROVED' : 'CANCELED';
    const order = {
      customer: customer._id,
      customerInfo: { name: customer.name, phone: customer.phone, email: customer.email },
      items: [{ car: car._id, name: car.name, price: car.price, image: car.images[0].thumbUrl, quantity: 1 }],
      total: car.price,
      status,
      createdAt,
      updatedAt: createdAt
    };
    // every third order (not cancelled) was secured with an online deposit
    if (i % 3 === 0 && status !== 'CANCELED') {
      order._id = new mongoose.Types.ObjectId();
      order.payment = {
        method: 'vnpay',
        status: 'paid',
        deposit: config.payment.depositPerCar,
        provider: 'demo',
        txnRef: `${order._id}01`,
        attempts: 1,
        responseCode: '00',
        transactionNo: String(14000000 + i),
        bankCode: 'NCB',
        paidAt: new Date(createdAt.getTime() + 10 * 60000)
      };
    }
    if (status === 'APPROVED') {
      order.approvedAt = new Date(createdAt.getTime() + 86400000);
      sold.set(String(car._id), (sold.get(String(car._id)) || 0) + 1);
    }
    await Order.create(order);
  }
  for (const [id, count] of sold) await Car.updateOne({ _id: id }, { sold: count });

  // a short chat so the chat screens are not empty
  const demo = customers[0];
  const interested = cars.find((c) => c.slug.startsWith('mazda-cx-5')) || cars[0];
  const conversation = await Conversation.create({ customer: demo._id });
  const lines = [
    ['customer', 'Chào showroom, mình quan tâm mẫu xe này. Giá lăn bánh ở TP.HCM khoảng bao nhiêu ạ?', interested._id],
    ['admin', 'Chào anh An! Giá lăn bánh tại TP.HCM khoảng 935 triệu, đã gồm thuế trước bạ, biển số và bảo hiểm.'],
    ['customer', 'Cuối tuần này mình qua lái thử được không?'],
    ['admin', 'Dạ được ạ. Anh hẹn sáng thứ Bảy lúc 9h nhé, em sẽ chuẩn bị xe sẵn.']
  ];
  let at = now - 2 * 86400000;
  for (const [sender, text, car] of lines) {
    at += 7 * 60000;
    await Message.create({ conversation: conversation._id, sender, text, car, createdAt: new Date(at) });
  }
  await Conversation.updateOne({ _id: conversation._id }, {
    lastMessage: { text: lines.at(-1)[1], sender: 'admin', at: new Date(at) },
    unreadByCustomer: 1
  });

  console.log(`Demo data ready: ${cars.length} cars, ${customers.length} customers, 30 orders.`);
  // passwords are not printed: they live in .env (or are the documented dev defaults)
  console.log(`  admin login: ${config.admin.username}, customer login: demo`);
}

module.exports = { seed };

// npm run seed
if (require.main === module) {
  const db = require('../src/db');
  db.connect()
    .then(() => seed({ reset: true }))
    .then(() => db.disconnect())
    .catch(async (err) => {
      console.error(err.message || err);
      if (/lock|already in use|exited/i.test(String(err.message))) {
        console.error('Is the dev server still running? Stop it first, then run npm run seed again.');
      }
      await db.disconnect().catch(() => {});
      process.exit(1);
    });
}
