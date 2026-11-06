// -- npm run db:check: kiểm tra kết nối tới MONGODB_URI --
const mongoose = require('mongoose');
const config = require('../src/config');
const db = require('../src/db');
const { Admin, Brand, Car, Customer, Order } = require('../src/models');

async function main() {
  if (!config.mongoUri) {
    console.log('MONGODB_URI đang trống: server dùng MongoDB chạy trên máy (server/.data).');
    console.log('Điền chuỗi kết nối Atlas vào server/.env rồi chạy lại lệnh này.');
    return;
  }
  const started = Date.now();
  await db.connect();
  await mongoose.connection.db.admin().ping();
  console.log(`Đã kết nối: ${db.describeUri(config.mongoUri)}, database "${mongoose.connection.name}" (${Date.now() - started} ms)`);

  const counts = await Promise.all([Admin, Brand, Car, Customer, Order].map((M) => M.countDocuments()));
  const [admins, brands, cars, customers, orders] = counts;
  if (admins === 0) {
    console.log('Database đang trống: lần chạy npm run dev tới sẽ tự thêm dữ liệu mẫu.');
  } else {
    console.log(`Dữ liệu: ${brands} hãng, ${cars} xe, ${customers} khách hàng, ${orders} đơn hàng, ${admins} quản trị viên.`);
  }
  await db.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
