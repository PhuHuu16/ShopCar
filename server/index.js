const http = require('http');
const config = require('./src/config');
const db = require('./src/db');
const { createApp } = require('./src/app');
const { attachSocket } = require('./src/socket');
const { Admin } = require('./src/models');
const { seed } = require('./scripts/seed');
const { ensureAdmin } = require('./src/services/admin');

async function main() {
  await db.connect();

  // Lần chạy đầu khi phát triển: thêm dữ liệu mẫu
  if (!config.isProd && !(await Admin.exists({}))) {
    console.log('Empty database, adding demo data...');
    await seed();
  }
  const admin = await ensureAdmin();
  if (admin !== 'unchanged') console.log(`Admin account "${config.admin.username}" ${admin} from .env`);

  const app = createApp();
  const server = http.createServer(app);
  app.set('io', attachSocket(server));

  server.listen(config.port, () => {
    console.log(`ShopCar API running at http://localhost:${config.port}`);
  });

  const shutdown = async () => {
    server.close();
    await db.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
