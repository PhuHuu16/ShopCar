// `npm run dev`: starts the API and restarts it whenever code changes.
// Without MONGODB_URI it also starts ONE local MongoDB here and keeps it running
// across restarts, so saving a file restarts the API in about a second.
const path = require('path');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const config = require('../src/config');
const { startLocalMongo, flush } = require('../src/db');

const SERVER_DIR = path.resolve(__dirname, '..');

async function main() {
  const env = { ...process.env };
  let local = null;
  if (!config.mongoUri) {
    local = await startLocalMongo();
    env.MONGODB_URI = local.getUri('shopcar');
    env.SHOPCAR_LOCAL_MONGO = '1';
    console.log(`Local MongoDB started at ${env.MONGODB_URI} (data in server/.data/db)`);
  }

  const app = spawn(process.execPath, ['--watch-path=src', '--watch-path=scripts', '--watch-path=index.js', 'index.js'], {
    cwd: SERVER_DIR,
    env,
    stdio: 'inherit'
  });

  let stopping = false;
  async function stop(code = 0) {
    if (stopping) return;
    stopping = true;
    app.kill();
    if (local) {
      // write everything to disk, then stop MongoDB
      const conn = await mongoose.createConnection(env.MONGODB_URI).asPromise().catch(() => null);
      if (conn) {
        await flush(conn.db);
        await conn.close();
      }
      await local.stop({ doCleanup: false });
    }
    process.exit(code);
  }

  process.on('SIGINT', () => stop());
  process.on('SIGTERM', () => stop());
  app.on('exit', (code) => stop(code || 0));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
