const { startTestServer, login } = require('./helpers');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const { Admin } = require('../src/models');
const { ensureAdmin } = require('../src/services/admin');

let ctx;
const original = { ...config.admin };

before(async () => {
  ctx = await startTestServer();
});
after(async () => {
  Object.assign(config.admin, original);
  await ctx.stop();
});

const tryLogin = (username, password) => ctx.api.post('/api/admin/login').send({ username, password });

test('without .env values the existing login is kept', async () => {
  assert.equal(await ensureAdmin(), 'unchanged');
  await login(ctx.api, 'admin', 'admin', 'admin123');
});

test('login set in .env replaces the default one', async () => {
  Object.assign(config.admin, { username: 'chu-showroom', password: 'Mat-khau-rieng-2026', fromEnv: true });
  assert.equal(await ensureAdmin(), 'updated');
  assert.equal(await Admin.countDocuments(), 1, 'renamed, not a second admin');

  assert.equal((await tryLogin('admin', 'admin123')).status, 401, 'the default login stops working');
  await login(ctx.api, 'admin', 'chu-showroom', 'Mat-khau-rieng-2026');
  assert.equal(await ensureAdmin(), 'unchanged', 'nothing to do on the next start');
});

test('a new password in .env is applied at the next start', async () => {
  config.admin.password = 'Doi-mat-khau-moi';
  assert.equal(await ensureAdmin(), 'updated');
  assert.equal((await tryLogin('chu-showroom', 'Mat-khau-rieng-2026')).status, 401);
  await login(ctx.api, 'admin', 'chu-showroom', 'Doi-mat-khau-moi');
});

test('an empty database gets the admin from .env', async () => {
  await Admin.deleteMany({});
  assert.equal(await ensureAdmin(), 'created');
  await login(ctx.api, 'admin', 'chu-showroom', 'Doi-mat-khau-moi');
});

test('the login page answers the same for a wrong name or a wrong password', async () => {
  const wrongName = await tryLogin('admin', 'Doi-mat-khau-moi');
  const wrongPassword = await tryLogin('chu-showroom', 'admin123');
  assert.equal(wrongName.status, 401);
  assert.deepEqual(wrongName.body, wrongPassword.body);
});
