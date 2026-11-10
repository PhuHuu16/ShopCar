const { startTestServer, login, lastEmailLink } = require('./helpers');
const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { Car, Customer } = require('../src/models');

let ctx;
let api;
let adminToken;
let customerToken;

before(async () => {
  ctx = await startTestServer();
  api = ctx.api;
  adminToken = await login(api, 'admin', 'admin', 'admin123');
  customerToken = await login(api, 'customer', 'demo', 'demo123');
});
after(() => ctx.stop());

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asCustomer = (req) => req.set('Authorization', `Bearer ${customerToken}`);

describe('public car catalogue', () => {
  test('filters, sorts and paginates', async () => {
    const res = await api.get('/api/cars').query({ bodyType: 'suv', sort: 'price_asc', limit: 2 });
    assert.equal(res.status, 200);
    assert.equal(res.body.items.length, 2);
    assert.ok(res.body.total >= 2);
    assert.equal(res.body.pages, Math.ceil(res.body.total / 2));
    assert.ok(res.body.items.every((c) => c.bodyType === 'suv'));
    assert.ok(res.body.items[0].price <= res.body.items[1].price);
    assert.ok(res.body.items[0].brand.name, 'brand is included');
  });

  test('filters by brand slug and price range', async () => {
    const res = await api.get('/api/cars').query({ brand: 'toyota', maxPrice: 1000000000 });
    assert.equal(res.status, 200);
    assert.ok(res.body.items.length > 0);
    assert.ok(res.body.items.every((c) => c.brand.slug === 'toyota' && c.price <= 1000000000));
  });

  test('search treats special characters as text', async () => {
    const res = await api.get('/api/cars').query({ q: '(' });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 0);
  });

  test('rejects an unknown filter value', async () => {
    const res = await api.get('/api/cars').query({ fuel: 'steam' });
    assert.equal(res.status, 400);
  });

  test('car detail by slug, with related cars', async () => {
    const list = await api.get('/api/cars').query({ limit: 1 });
    const slug = list.body.items[0].slug;
    const res = await api.get(`/api/cars/${slug}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.car.slug, slug);
    assert.ok(Array.isArray(res.body.related));
    assert.equal((await api.get('/api/cars/does-not-exist')).status, 404);
  });

  test('filter options and featured cars', async () => {
    const filters = await api.get('/api/cars/filters');
    assert.equal(filters.status, 200);
    assert.ok(filters.body.brands.length > 0);
    assert.ok(filters.body.price.max > filters.body.price.min);
    const featured = await api.get('/api/cars/featured');
    assert.ok(featured.body.newest.length > 0);
    assert.ok(featured.body.popular.length > 0);
  });
});

describe('customer accounts', () => {
  const account = { username: 'newbie', password: 'secret12', name: 'Khách Mới', phone: '0909000111', email: 'newbie@example.com' };

  test('signup -> cannot login before activation -> activate by email link -> login', async () => {
    const signup = await api.post('/api/customer/signup').send(account);
    assert.equal(signup.status, 201);

    const early = await api.post('/api/customer/login').send({ username: account.username, password: account.password });
    assert.equal(early.status, 403);

    const link = lastEmailLink(account.email);
    assert.equal(link.path, '/activate');
    assert.equal((await api.post('/api/customer/activate').send({ id: link.id, token: 'wrong' })).status, 400);
    assert.equal((await api.post('/api/customer/activate').send(link)).status, 200);
    assert.equal((await api.post('/api/customer/activate').send(link)).status, 400, 'link works only once');

    const ok = await api.post('/api/customer/login').send({ username: account.username, password: account.password });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    assert.equal(ok.body.customer.password, undefined, 'password is never returned');
  });

  test('password is stored as a bcrypt hash', async () => {
    const doc = await Customer.findOne({ username: account.username }).select('+password');
    assert.match(doc.password, /^\$2[aby]\$/);
  });

  test('duplicate username or email is rejected', async () => {
    const res = await api.post('/api/customer/signup').send({ ...account, username: 'other' });
    assert.equal(res.status, 409);
  });

  test('wrong password is rejected', async () => {
    const res = await api.post('/api/customer/login').send({ username: 'demo', password: 'nope' });
    assert.equal(res.status, 401);
  });

  test('forgot password -> reset once -> login with the new password', async () => {
    const same = await api.post('/api/customer/forgot-password').send({ email: 'nobody@example.com' });
    assert.equal(same.status, 200, 'does not reveal whether the email exists');

    await api.post('/api/customer/forgot-password').send({ email: account.email });
    const link = lastEmailLink(account.email);
    assert.equal(link.path, '/reset-password');
    const reset = await api.post('/api/customer/reset-password').send({ ...link, password: 'brandnew1' });
    assert.equal(reset.status, 200);
    const again = await api.post('/api/customer/reset-password').send({ ...link, password: 'another1' });
    assert.equal(again.status, 400, 'reset link works only once');

    const res = await api.post('/api/customer/login').send({ username: account.username, password: 'brandnew1' });
    assert.equal(res.status, 200);
  });

  test('profile update needs the current password to change password', async () => {
    const bad = await asCustomer(api.put('/api/customer/me')).send({ name: 'Nguyễn Văn An', phone: '0901234567', currentPassword: 'x', newPassword: 'changed1' });
    assert.equal(bad.status, 400);
    const ok = await asCustomer(api.put('/api/customer/me')).send({ name: 'An Nguyễn', phone: '0901234567' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.name, 'An Nguyễn');
  });

  test('blocked customer is locked out immediately', async () => {
    const token = await login(api, 'customer', 'tranbinh', 'demo123');
    const binh = await Customer.findOne({ username: 'tranbinh' });
    await asAdmin(api.patch(`/api/admin/customers/${binh._id}/status`)).send({ status: 'blocked' });
    const res = await api.get('/api/customer/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.status, 401);
    await asAdmin(api.patch(`/api/admin/customers/${binh._id}/status`)).send({ status: 'active' });
  });
});

describe('access control', () => {
  test('customer token cannot use the admin API', async () => {
    assert.equal((await asCustomer(api.get('/api/admin/stats'))).status, 401);
    assert.equal((await api.get('/api/admin/stats')).status, 401);
  });

  test('a customer only sees their own orders', async () => {
    const other = await login(api, 'customer', 'lecuong', 'demo123');
    const car = await Car.findOne({ stock: { $gt: 0 } });
    const { body: order } = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity: 1 }] });
    const mine = await asCustomer(api.get('/api/customer/orders'));
    assert.ok(mine.body.some((o) => o._id === order._id));
    const res = await api.get(`/api/customer/orders/${order._id}`).set('Authorization', `Bearer ${other}`);
    assert.equal(res.status, 404);
  });
});

describe('orders and stock', () => {
  let car;
  before(async () => {
    car = await Car.create({
      name: 'Test Car', slug: 'test-car', brand: (await Car.findOne()).brand, price: 500000000, year: 2024,
      fuel: 'gasoline', transmission: 'automatic', bodyType: 'sedan', seats: 5, stock: 2
    });
  });

  test('total is calculated on the server; quantities above stock are refused', async () => {
    const tooMany = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity: 3 }] });
    assert.equal(tooMany.status, 409);

    const res = await asCustomer(api.post('/api/customer/orders')).send({
      items: [{ car: String(car._id), quantity: 2, price: 1 }], total: 1
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.total, 1000000000);
    assert.equal(res.body.status, 'PENDING');
    car.orderId = res.body._id;
  });

  test('approving takes stock; approving twice fails; cancelling returns stock', async () => {
    const approve = await asAdmin(api.patch(`/api/admin/orders/${car.orderId}/status`)).send({ status: 'APPROVED' });
    assert.equal(approve.status, 200);
    let fresh = await Car.findById(car._id);
    assert.equal(fresh.stock, 0);
    assert.equal(fresh.sold, 2);

    const twice = await asAdmin(api.patch(`/api/admin/orders/${car.orderId}/status`)).send({ status: 'APPROVED' });
    assert.equal(twice.status, 409);

    const cancel = await asAdmin(api.patch(`/api/admin/orders/${car.orderId}/status`)).send({ status: 'CANCELED' });
    assert.equal(cancel.status, 200);
    fresh = await Car.findById(car._id);
    assert.equal(fresh.stock, 2);
    assert.equal(fresh.sold, 0);
  });

  test('approval fails without enough stock and leaves the order pending', async () => {
    const a = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity: 2 }] });
    const b = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String(car._id), quantity: 1 }] });
    assert.equal((await asAdmin(api.patch(`/api/admin/orders/${a.body._id}/status`)).send({ status: 'APPROVED' })).status, 200);
    const fail = await asAdmin(api.patch(`/api/admin/orders/${b.body._id}/status`)).send({ status: 'APPROVED' });
    assert.equal(fail.status, 409);
    const order = await asAdmin(api.get(`/api/admin/orders/${b.body._id}`));
    assert.equal(order.body.status, 'PENDING');
  });

  test('customer can cancel only a pending order', async () => {
    const order = await asCustomer(api.post('/api/customer/orders')).send({ items: [{ car: String((await Car.findOne({ stock: { $gt: 0 } }))._id), quantity: 1 }] });
    const res = await asCustomer(api.post(`/api/customer/orders/${order.body._id}/cancel`));
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'CANCELED');
    assert.equal((await asCustomer(api.post(`/api/customer/orders/${order.body._id}/cancel`))).status, 409);
  });
});

describe('admin car management', () => {
  test('upload photos -> create car -> replace a photo -> delete car removes photos', async () => {
    const png = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#c00' } }).png().toBuffer();
    const upload = await asAdmin(api.post('/api/admin/uploads'))
      .attach('images', png, { filename: 'a.png', contentType: 'image/png' })
      .attach('images', png, { filename: 'b.png', contentType: 'image/png' });
    assert.equal(upload.status, 201);
    assert.equal(upload.body.length, 2);
    const fetchImage = (url) => api.get(url).buffer(true).parse((res, done) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c)).on('end', () => done(null, Buffer.concat(chunks)));
    });
    for (const img of upload.body) {
      assert.equal((await fetchImage(img.url)).status, 200);
      assert.equal((await fetchImage(img.thumbUrl)).status, 200);
    }
    const first = await fetchImage(upload.body[0].url);
    assert.equal(first.headers['content-type'], 'image/webp');
    assert.match(first.headers['cache-control'], /immutable/);
    assert.equal((await api.get(upload.body[0].url).set('If-None-Match', first.headers.etag)).status, 304);
    const big = await sharp(first.body).metadata();
    assert.equal(big.format, 'webp');
    assert.equal(big.width, 1600, 'large photos are resized');

    const brands = await asAdmin(api.get('/api/admin/brands'));
    const body = {
      name: 'Mazda CX-8 Premium', brand: brands.body[0]._id, price: 1100000000, year: 2024,
      fuel: 'gasoline', transmission: 'automatic', bodyType: 'suv', seats: 7, images: upload.body
    };
    const created = await asAdmin(api.post('/api/admin/cars')).send(body);
    assert.equal(created.status, 201);
    assert.equal(created.body.slug, 'mazda-cx-8-premium-2024');

    const updated = await asAdmin(api.put(`/api/admin/cars/${created.body._id}`)).send({ ...body, images: [upload.body[1]] });
    assert.equal(updated.status, 200);
    assert.equal((await fetchImage(upload.body[0].url)).status, 404, 'removed photo is deleted');

    const del = await asAdmin(api.delete(`/api/admin/cars/${created.body._id}`));
    assert.equal(del.status, 200);
    assert.equal((await fetchImage(upload.body[1].url)).status, 404);
    assert.equal((await fetchImage(upload.body[1].thumbUrl)).status, 404);
  });

  test('seeded car photos are served from the database', async () => {
    const featured = await api.get('/api/cars/featured');
    const photo = featured.body.newest.find((c) => c.images[0]?.url.endsWith('.svg')).images[0].url;
    const res = await api.get(photo);
    assert.equal(res.status, 200);
    assert.equal(res.headers['content-type'], 'image/svg+xml');
    assert.equal((await api.get('/uploads/cars/missing.webp')).status, 404);
  });

  test('rejects files that are not images', async () => {
    const res = await asAdmin(api.post('/api/admin/uploads')).attach('images', Buffer.from('hello'), { filename: 'a.txt', contentType: 'text/plain' });
    assert.equal(res.status, 400);
  });

  test('invalid car data gives field errors', async () => {
    const res = await asAdmin(api.post('/api/admin/cars')).send({ name: 'X', brand: '', price: '' });
    assert.equal(res.status, 400);
    const message = (field) => res.body.errors.find((e) => e.field === field)?.message;
    assert.ok(message('name'));
    assert.equal(message('brand'), 'Hãy chọn hãng xe');
    assert.equal(message('price'), 'Hãy nhập giá xe');
    assert.equal(message('images'), 'Hãy thêm ít nhất một ảnh xe');
  });

  test('a brand with cars cannot be deleted', async () => {
    const brands = await asAdmin(api.get('/api/admin/brands'));
    const used = brands.body.find((b) => b.carCount > 0);
    assert.equal((await asAdmin(api.delete(`/api/admin/brands/${used._id}`))).status, 409);
  });

  test('dashboard stats have 12 months of revenue', async () => {
    const res = await asAdmin(api.get('/api/admin/stats'));
    assert.equal(res.status, 200);
    assert.equal(res.body.revenueByMonth.length, 12);
    assert.ok(res.body.revenue > 0);
    assert.ok(res.body.orders.PENDING > 0);
    assert.equal(typeof res.body.unreadChats, 'number');
    assert.ok(res.body.recentOrders.length > 0);
  });
});

describe('admin orders and customers', () => {
  test('orders can be searched by customer name or order code', async () => {
    const all = await asAdmin(api.get('/api/admin/orders').query({ limit: 1 }));
    const order = all.body.items[0];
    const byName = await asAdmin(api.get('/api/admin/orders').query({ q: order.customerInfo.name }));
    assert.ok(byName.body.items.some((o) => o._id === order._id));
    const byCode = await asAdmin(api.get('/api/admin/orders').query({ q: '#' + order._id.slice(-6) }));
    assert.ok(byCode.body.items.some((o) => o._id === order._id));
    const none = await asAdmin(api.get('/api/admin/orders').query({ q: 'no such customer (' }));
    assert.equal(none.body.total, 0);
  });

  test('customer list includes order count and money spent, without secrets', async () => {
    const res = await asAdmin(api.get('/api/admin/customers').query({ q: 'demo' }));
    const demo = res.body.items.find((c) => c.username === 'demo');
    assert.ok(demo.orderCount > 0);
    assert.equal(typeof demo.totalSpent, 'number');
    assert.equal(demo.password, undefined);
    assert.equal(demo.activationTokenHash, undefined);
    const one = await asAdmin(api.get('/api/admin/customers/' + demo._id));
    assert.equal(one.body.username, 'demo');
  });
});
