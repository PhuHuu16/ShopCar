const http = require('http');
const config = require('./src/config');
const db = require('./src/db');
const { createApp } = require('./src/app');
const { attachSocket } = require('./src/socket');
const { Admin, Conversation } = require('./src/models');
const { seed } = require('./scripts/seed');
const { ensureAdmin } = require('./src/services/admin');
const { startHoldSweeper } = require('./src/services/orders');

async function main() {
  await db.connect();

  if (!config.isProd && !(await Admin.exists({}))) {
    console.log('Empty database, adding demo data...');
    await seed();
  }
  await Conversation.syncIndexes();
  await Admin.collection.updateMany({ mustChangePassword: { $exists: true } }, { $unset: { mustChangePassword: '' } });
  const admin = await ensureAdmin();
  if (admin !== 'unchanged') console.log(`Admin account "${config.admin.username}" ${admin} from .env`);

  const app = createApp();
  const server = http.createServer(app);
  app.set('io', attachSocket(server));
  startHoldSweeper();

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
