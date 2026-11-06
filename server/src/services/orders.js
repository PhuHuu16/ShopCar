const mongoose = require('mongoose');
const { Car, Order } = require('../models');
const HttpError = require('../utils/httpError');

// Giá và tổng tiền luôn lấy từ database, không tin dữ liệu từ trình duyệt
async function createOrder(customer, items, note = '') {
  const merged = new Map();
  for (const item of items) {
    merged.set(item.car, (merged.get(item.car) || 0) + item.quantity);
  }
  const ids = [...merged.keys()];
  const cars = await Car.find({ _id: { $in: ids } });
  const byId = new Map(cars.map((c) => [String(c._id), c]));

  const orderItems = [];
  let total = 0;
  for (const [id, quantity] of merged) {
    const car = byId.get(id);
    if (!car) throw new HttpError(404, 'Có xe trong giỏ không còn tồn tại');
    if (car.stock < quantity) {
      throw new HttpError(409, car.stock === 0
        ? `Xe ${car.name} đã hết hàng`
        : `Xe ${car.name} chỉ còn ${car.stock} chiếc`);
    }
    orderItems.push({
      car: car._id,
      name: car.name,
      price: car.price,
      image: car.images[0] ? car.images[0].thumbUrl : '',
      quantity
    });
    total += car.price * quantity;
  }

  return Order.create({
    customer: customer._id,
    customerInfo: { name: customer.name, phone: customer.phone, email: customer.email },
    items: orderItems,
    total,
    note
  });
}

// Trừ kho có điều kiện để không bán vượt số xe còn lại
async function takeStock(order) {
  const done = [];
  for (const item of order.items) {
    const result = await Car.updateOne(
      { _id: item.car, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity, sold: item.quantity } }
    );
    if (result.modifiedCount !== 1) {
      await returnStock(done);
      throw new HttpError(409, `Không đủ tồn kho cho xe ${item.name}`);
    }
    done.push(item);
  }
}

async function returnStock(items) {
  for (const item of items) {
    await Car.updateOne({ _id: item.car }, { $inc: { stock: item.quantity, sold: -item.quantity } });
  }
}

const TRANSITIONS = {
  PENDING: ['APPROVED', 'CANCELED'],
  APPROVED: ['CANCELED'],
  CANCELED: []
};

async function changeStatus(orderId, newStatus) {
  if (!mongoose.isValidObjectId(orderId)) throw new HttpError(400, 'ID không hợp lệ');
  const order = await Order.findById(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  if (!TRANSITIONS[order.status].includes(newStatus)) {
    throw new HttpError(409, `Không thể chuyển đơn từ ${order.status} sang ${newStatus}`);
  }
  // Giữ đơn trước để hai yêu cầu cùng lúc không đổi trạng thái hai lần
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    { status: newStatus, ...(newStatus === 'APPROVED' ? { approvedAt: new Date() } : {}) },
    { new: true }
  );
  if (!claimed) throw new HttpError(409, 'Đơn hàng vừa được cập nhật, hãy tải lại');

  try {
    if (newStatus === 'APPROVED') await takeStock(order);
    if (order.status === 'APPROVED' && newStatus === 'CANCELED') await returnStock(order.items);
  } catch (err) {
    const undo = order.approvedAt
      ? { status: order.status, approvedAt: order.approvedAt }
      : { status: order.status, $unset: { approvedAt: 1 } };
    await Order.updateOne({ _id: order._id }, undo);
    throw err;
  }
  return claimed;
}

module.exports = { createOrder, changeStatus };
