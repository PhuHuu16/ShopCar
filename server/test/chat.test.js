const { startTestServer, login } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { io: connect } = require('socket.io-client');
const { Car } = require('../src/models');

let ctx;
let adminToken;
let customerToken;
const sockets = [];

before(async () => {
  ctx = await startTestServer();
  adminToken = await login(ctx.api, 'admin', 'admin', 'admin123');
  customerToken = await login(ctx.api, 'customer', 'lecuong', 'demo123');
});
after(async () => {
  sockets.forEach((s) => s.close());
  await ctx.stop();
});

function open(auth) {
  return new Promise((resolve, reject) => {
    const socket = connect(ctx.url, { auth, transports: ['websocket'], reconnection: false });
    sockets.push(socket);
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function nextEvent(socket, name) {
  return new Promise((resolve) => socket.once(name, resolve));
}

test('connection without a valid token is refused', async () => {
  await assert.rejects(open({ token: 'bad', role: 'customer' }));
  await assert.rejects(open({ token: customerToken, role: 'admin' }));
});

test('customer message reaches the admin live, and the admin reply reaches the customer', async () => {
  const admin = await open({ token: adminToken, role: 'admin' });
  const customer = await open({ token: customerToken, role: 'customer' });
  const car = await Car.findOne();

  const adminGets = nextEvent(admin, 'message:new');
  const ack = await customer.emitWithAck('message:send', { text: 'Xe này còn màu khác không?', car: String(car._id) });
  assert.equal(ack.ok, true);
  const received = await adminGets;
  assert.equal(received.message.text, 'Xe này còn màu khác không?');
  assert.equal(received.message.car.name, car.name, 'car card is attached');
  assert.equal(received.conversation.unreadByAdmin, 1);
  assert.equal(received.conversation.customer.username, 'lecuong');

  const customerGets = nextEvent(customer, 'message:new');
  const reply = await admin.emitWithAck('message:send', { conversationId: received.conversationId, text: 'Dạ còn màu trắng và xám ạ.' });
  assert.equal(reply.ok, true);
  const answer = await customerGets;
  assert.equal(answer.message.sender, 'admin');

  const history = await ctx.api.get('/api/customer/chat').set('Authorization', `Bearer ${customerToken}`);
  assert.equal(history.status, 200);
  assert.deepEqual(history.body.messages.map((m) => m.sender), ['customer', 'admin']);
  assert.equal(history.body.conversation.unreadByCustomer, 1);

  await customer.emitWithAck('conversation:read', {});
  const afterRead = await ctx.api.get('/api/customer/chat').set('Authorization', `Bearer ${customerToken}`);
  assert.equal(afterRead.body.conversation.unreadByCustomer, 0);

  const list = await ctx.api.get('/api/admin/chats').set('Authorization', `Bearer ${adminToken}`);
  assert.ok(list.body.some((c) => c._id === received.conversationId));
});

test('empty messages are refused', async () => {
  const customer = await open({ token: customerToken, role: 'customer' });
  const ack = await customer.emitWithAck('message:send', { text: '   ' });
  assert.equal(ack.ok, false);
});

test('a customer cannot write into another conversation', async () => {
  const customer = await open({ token: customerToken, role: 'customer' });
  const demoChat = (await ctx.api.get('/api/admin/chats').set('Authorization', `Bearer ${adminToken}`)).body
    .find((c) => c.customer.username === 'demo');
  const ack = await customer.emitWithAck('message:send', { conversationId: demoChat._id, text: 'hello' });
  assert.equal(ack.ok, true);
  const demoMessages = await ctx.api.get(`/api/admin/chats/${demoChat._id}/messages`).set('Authorization', `Bearer ${adminToken}`);
  assert.ok(!demoMessages.body.messages.some((m) => m.text === 'hello'), 'message went to their own conversation');
});

test('admins are told about a new order right away', async () => {
  const adminSocket = await open({ token: adminToken, role: 'admin' });
  try {
    const car = await Car.findOne({ stock: { $gt: 0 } });
    const event = nextEvent(adminSocket, 'order:new');
    const res = await ctx.api
      .post('/api/customer/orders')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ items: [{ car: String(car._id), quantity: 1 }] });
    assert.equal(res.status, 201);
    const order = await event;
    assert.equal(order._id, res.body._id);
  } finally {
    adminSocket.close();
  }
});

test('the showroom can start a conversation with a customer', async () => {
  const { Customer } = require('../src/models');
  const customer = await Customer.findOne({ username: 'demo' });
  const auth = { Authorization: `Bearer ${adminToken}` };
  const first = await ctx.api.post(`/api/admin/chats/with/${customer._id}`).set(auth);
  assert.equal(first.status, 200);
  assert.equal(first.body.customer.username, 'demo');
  const again = await ctx.api.post(`/api/admin/chats/with/${customer._id}`).set(auth);
  assert.equal(again.body._id, first.body._id);
  const sent = await ctx.api.post(`/api/admin/chats/${first.body._id}/messages`).set(auth).send({ text: 'Chào anh, xe đã về ạ' });
  assert.equal(sent.status, 201);
});
