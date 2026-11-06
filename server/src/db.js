const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const config = require('./config');

const DB_PATH = path.join(config.dataDir, 'db');
let localServer = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OWNER_FILE = path.join(DB_PATH, 'shopcar-owner.json');

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function lockOwner() {
  try {
    const pid = Number(fs.readFileSync(path.join(DB_PATH, 'mongod.lock'), 'utf8').trim());
    return pid && isAlive(pid) ? pid : null;
  } catch {
    return null;
  }
}

// Dừng MongoDB bị bỏ lại khi app trước bị tắt đột ngột
function stopOrphan(mongodPid) {
  try {
    const { mongod, app } = JSON.parse(fs.readFileSync(OWNER_FILE, 'utf8'));
    if (mongod === mongodPid && !isAlive(app)) {
      process.kill(mongodPid);
      console.log('Stopped a local MongoDB left running by a previous session.');
    }
  } catch {
    // tiến trình đã dừng sẵn
  }
}

// -- MongoDB chạy trên máy khi phát triển --
async function startLocalMongo() {
  fs.mkdirSync(DB_PATH, { recursive: true });
  const { MongoMemoryServer } = require('mongodb-memory-server');
  for (let attempt = 1; ; attempt++) {
    const owner = lockOwner();
    if (owner && attempt === 1) stopOrphan(owner);
    if (owner && attempt > 3) {
      throw new Error(
        `The local database folder (server/.data/db) is in use by another MongoDB (process ${owner}).\n` +
        'Stop the other ShopCar server first, or end that process in Task Manager.'
      );
    }
    if (!owner) {
      try {
        const server = await MongoMemoryServer.create({ instance: { dbPath: DB_PATH, storageEngine: 'wiredTiger' } });
        const mongod = server.instanceInfo?.instance?.mongodProcess?.pid;
        fs.writeFileSync(OWNER_FILE, JSON.stringify({ mongod, app: process.pid }));
        return server;
      } catch (err) {
        if (attempt > 3) throw err;
      }
    }
    await sleep(1000);
  }
}

// -- Kết nối database --
async function connect(uri = config.mongoUri) {
  const local = !uri || !!process.env.SHOPCAR_LOCAL_MONGO;
  if (!uri) {
    if (config.isProd) throw new Error('MONGODB_URI is required in production');
    localServer = await startLocalMongo();
    uri = localServer.getUri('shopcar');
    console.log(`Local MongoDB started at ${uri} (data in server/.data/db)`);
  }
  // Windows có thể tắt MongoDB đột ngột: chờ ghi xuống ổ đĩa để không mất dữ liệu
  const options = local ? { writeConcern: { w: 1, j: true } } : {};
  await mongoose.connect(uri, options);
  return uri;
}

async function flush(connectionDb) {
  await connectionDb.admin().command({ fsync: 1 }).catch(() => {});
}

async function disconnect() {
  if (localServer && mongoose.connection.readyState === 1) await flush(mongoose.connection.db);
  await mongoose.disconnect();
  if (localServer) {
    await localServer.stop({ doCleanup: false });
    localServer = null;
  }
}

module.exports = { connect, disconnect, startLocalMongo, flush };
