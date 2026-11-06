const path = require('path');

// Local secrets live in server/.env (not committed). On a host such as Render,
// set the same variables in its dashboard instead.
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {
  // no .env file: use the variables already in the environment
}

// Keep the local MongoDB binary (dev + tests) in one place, wherever npm is
// started from; otherwise running from the project root downloads it again.
process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 3000,
  // Empty in development = start a local MongoDB automatically (see db.js)
  mongoUri: isTest ? '' : process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Where the customer website runs; used to build links inside emails
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  email: {
    // Without these, emails are printed to the console instead of being sent
    user: isTest ? '' : process.env.EMAIL_USER || '',
    pass: isTest ? '' : process.env.EMAIL_PASS || ''
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '../uploads')),
  dataDir: path.resolve(__dirname, '../.data'),
  payment: {
    // Online deposit taken per car when the customer chooses to pay with VNPay
    depositPerCar: Number(process.env.DEPOSIT_PER_CAR) || 10_000_000,
    // VNPay sandbox/production merchant. Without both values the site uses a
    // built-in demo payment page that follows the same VNPay protocol.
    vnpay: {
      tmnCode: isTest ? '' : process.env.VNPAY_TMN_CODE || '',
      hashSecret: isTest ? '' : process.env.VNPAY_HASH_SECRET || '',
      url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    }
  },
  // Admin login, kept in .env so it is never written in the code. The fallback only
  // applies on a development machine without these values; production requires them.
  admin: {
    username: (isTest ? '' : process.env.ADMIN_USERNAME) || 'admin',
    password: (isTest ? '' : process.env.ADMIN_PASSWORD) || (isProd ? '' : 'admin123'),
    // when set in .env, the account is updated to match at every start (see services/admin.js)
    fromEnv: !isTest && Boolean(process.env.ADMIN_PASSWORD)
  },
  // Password of the demo customer accounts made by `npm run seed`
  demoPassword: (isTest ? '' : process.env.DEMO_PASSWORD) || 'demo123'
};

if (isProd && (!config.mongoUri || !config.jwtSecret)) {
  throw new Error('MONGODB_URI and JWT_SECRET must be set in production');
}
if (isProd && config.admin.password.length < 8) {
  throw new Error('ADMIN_PASSWORD (at least 8 characters) must be set in production');
}

module.exports = config;
