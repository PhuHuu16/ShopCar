const fs = require('fs');
const path = require('path');
const express = require('express');
require('./utils/zodMessages');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const { apiNotFound, errorHandler } = require('./middleware/errors');

// Production: phục vụ web khách hàng ở / và trang quản trị ở /admin
function findBuild(folder) {
  for (const name of ['dist', 'build']) {
    const dir = path.resolve(__dirname, '../..', folder, name);
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return null;
}

function createApp() {
  const app = express();
  app.set('trust proxy', 1); // Lấy đúng IP khách khi chạy sau proxy (Render) để giới hạn số lần thử

  if (!config.isTest) app.use(morgan(config.isProd ? 'combined' : 'dev'));
  app.use(express.json({ limit: '1mb' }));

  // -- API --
  const api = express.Router();
  api.use(helmet());
  api.get('/health', (req, res) => res.json({ ok: true }));
  api.use('/', require('./routes/public'));
  api.use('/customer', require('./routes/customer'));
  api.use('/payment', require('./routes/payment'));
  api.use('/admin', require('./routes/admin'));
  api.use(apiNotFound);
  app.use('/api', api);

  // -- Ảnh xe đã tải lên --
  app.use('/uploads', express.static(config.uploadDir, { maxAge: '30d', immutable: true, fallthrough: false }));

  // -- Hai web đã build --
  const adminBuild = findBuild('client-admin');
  if (adminBuild) {
    app.use('/admin', express.static(adminBuild));
    app.get('/admin{/*splat}', (req, res) => res.sendFile(path.join(adminBuild, 'index.html')));
  }
  const customerBuild = findBuild('client-customer');
  if (customerBuild) {
    app.use(express.static(customerBuild));
    app.get('/{*splat}', (req, res) => res.sendFile(path.join(customerBuild, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
