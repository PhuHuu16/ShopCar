const mongoose = require('mongoose');
const config = require('../config');
const { Car, Order } = require('../models');
const HttpError = require('../utils/httpError');
const realtime = require('../realtime');

// -- Tồn kho --

async function reserveStock(items) {
  const done = [];
  for (const item of items) {
    const result = await Car.updateOne(
      { _id: item.car, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (result.modifiedCount !== 1) {
      await releaseStock(done);
      const car = await Car.findById(item.car).select('stock');
      throw new HttpError(409, !car || car.stock === 0
        ? `Xe ${item.name} đã hết hàng, vừa có khách khác đặt trước`
        : `Xe ${item.name} chỉ còn ${car.stock} chiếc`);
    }
    done.push(item);
  }
}

async function releaseStock(items) {
  for (const item of items) {
    await Car.updateOne({ _id: item.car }, { $inc: { stock: item.quantity } });
  }
}

async function addSold(items, sign) {
  for (const item of items) {
    await Car.updateOne({ _id: item.car }, { $inc: { sold: sign * item.quantity } });
  }
}

const carIds = (order) => order.items.map((i) => i.car);

async function createOrder(buyer, items, note = '') {
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
    if (car.hidden) throw new HttpError(409, `Xe ${car.name} đã ngừng kinh doanh`);
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

  await reserveStock(orderItems);
  const isAccount = Boolean(buyer._id);
  let order;
  try {
    order = await Order.create({
      customer: isAccount ? buyer._id : undefined,
      customerInfo: { name: buyer.name, phone: buyer.phone, email: buyer.email },
      items: orderItems,
      total,
      note,
      stockHeld: true,
      holdUntil: new Date(Date.now() + config.payment.holdHours * 3600 * 1000)
    });
  } catch (err) {
    await releaseStock(orderItems);
    throw err;
  }
  await realtime.stockChanged(carIds(order));
  return order;
}

const TRANSITIONS = {
  PENDING: ['APPROVED', 'CANCELED'],
  APPROVED: ['CANCELED'],
  CANCELED: []
};

async function changeStatus(orderId, newStatus, { reason, by = { kind: 'system', name: 'Hệ thống' } } = {}) {
  if (!mongoose.isValidObjectId(orderId)) throw new HttpError(400, 'ID không hợp lệ');
  const order = await Order.findById(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  if (!TRANSITIONS[order.status].includes(newStatus)) {
    throw new HttpError(409, `Không thể chuyển đơn từ ${order.status} sang ${newStatus}`);
  }
  const changes = { status: newStatus, stockHeld: newStatus !== 'CANCELED', $unset: { holdUntil: 1 } };
  if (newStatus === 'APPROVED') {
    changes.approvedAt = new Date();
    changes.approvedBy = by;
  }
  if (newStatus === 'CANCELED') {
    changes.canceledAt = new Date();
    changes.canceledBy = by;
    if (reason) changes.cancelReason = reason;
  }
  const claimed = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, changes, { new: true });
  if (!claimed) throw new HttpError(409, 'Đơn hàng vừa được cập nhật, hãy tải lại');

  try {
    if (newStatus === 'APPROVED') {
      if (!order.stockHeld) await reserveStock(order.items);
      await addSold(order.items, 1);
    }
    if (newStatus === 'CANCELED') {
      if (order.stockHeld) await releaseStock(order.items);
      if (order.status === 'APPROVED') await addSold(order.items, -1);
    }
  } catch (err) {
    const undo = { status: order.status, stockHeld: order.stockHeld };
    const unset = {};
    for (const field of ['approvedAt', 'approvedBy', 'holdUntil', 'canceledAt', 'canceledBy', 'cancelReason']) {
      if (order[field]) undo[field] = order[field];
      else unset[field] = 1;
    }
    if (Object.keys(unset).length) undo.$unset = unset;
    await Order.updateOne({ _id: order._id }, undo);
    throw err;
  }

  realtime.orderChanged(claimed);
  if (order.stockHeld !== claimed.stockHeld) await realtime.stockChanged(carIds(order));
  return claimed;
}

// -- Đơn chưa đặt cọc quá thời gian giữ xe: tự hủy để trả xe cho người khác --
async function releaseExpiredHolds(now = new Date()) {
  const expired = await Order.find({
    status: 'PENDING',
    holdUntil: { $lte: now },
    'payment.status': { $ne: 'paid' }
  }).select('_id');
  let count = 0;
  for (const { _id } of expired) {
    try {
      await changeStatus(_id, 'CANCELED', { reason: 'Hết thời gian giữ xe do chưa đặt cọc' });
      count += 1;
    } catch {}
  }
  return count;
}

function startHoldSweeper() {
  const timer = setInterval(() => {
    releaseExpiredHolds().catch((err) => console.error('[holds]', err));
  }, 60 * 1000);
  timer.unref();
  return timer;
}

module.exports = { createOrder, changeStatus, releaseExpiredHolds, startHoldSweeper };
