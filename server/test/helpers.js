// Starts a throwaway MongoDB + the app for tests. Must be required first.
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shopcar-test-uploads-'));

const http = require('http');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createApp } = require('../src/app');
const { attachSocket } = require('../src/socket');
const { seed } = require('../scripts/seed');
const email = require('../src/utils/email');

async function startTestServer() {
  const mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('shopcar-test'));
  const originalLog = console.log;
  console.log = () => {}; // keep seed output out of test results
  try {
    await seed();
  } finally {
    console.log = originalLog;
  }

  const app = createApp();
  const server = http.createServer(app);
  app.set('io', attachSocket(server));
  await new Promise((resolve) => server.listen(0, resolve));
  const url = `http://localhost:${server.address().port}`;

  return {
    app,
    url,
    api: request(app),
    async stop() {
      app.get('io').close();
      await new Promise((resolve) => server.close(resolve));
      await mongoose.disconnect();
      await mongo.stop();
      fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
    }
  };
}

async function login(api, role, username, password) {
  const res = await api.post(`/api/${role}/login`).send({ username, password });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.token;
}

// The id and token from the last email link sent to an address
function lastEmailLink(to) {
  const mail = [...email.outbox].reverse().find((m) => m.to === to);
  if (!mail) return null;
  const url = new URL(mail.link);
  return { id: url.searchParams.get('id'), token: url.searchParams.get('token'), path: url.pathname };
}

module.exports = { startTestServer, login, lastEmailLink };
