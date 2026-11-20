// -- Gửi sự kiện Socket.IO từ bất kỳ đâu trong server --
const { Car } = require('./models');

let io = null;

function setIo(server) {
  io = server;
}

function getIo() {
  return io;
}

function orderChanged(order, event = 'order:updated') {
  if (!io || !order) return;
  let target = io.to('admins').to(`order:${order._id}`);
  if (order.customer) target = target.to(`customer:${order.customer}`);
  target.emit(event, order);
}

async function stockChanged(carIds) {
  if (!io || !carIds.length) return;
  const cars = await Car.find({ _id: { $in: carIds } }).select('stock sold').lean();
  for (const car of cars) io.emit('car:stock', { car: String(car._id), stock: car.stock, sold: car.sold });
}

function toAdmins(event, payload) {
  io?.to('admins').emit(event, payload);
}

function supportOnline() {
  return Boolean(io?.sockets.adapter.rooms.get('support')?.size);
}

function disconnectStaff(id) {
  io?.in(`staff:${id}`).disconnectSockets(true);
}

function supportStatus(target = io) {
  target?.emit('support:status', { online: supportOnline() });
}

module.exports = { setIo, getIo, orderChanged, stockChanged, toAdmins, supportOnline, supportStatus, disconnectStaff };
