const path = require('path');

try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {}

process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';

const config = {
  env,
  isProd,
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB || 'shopcar',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  clientUrl: (process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/$/, ''),
  email: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  },
  dataDir: path.resolve(__dirname, '../.data'),
  payment: {
    depositPerCar: Number(process.env.DEPOSIT_PER_CAR) || 10_000_000,
    holdHours: Number(process.env.ORDER_HOLD_HOURS) || 24,
    vnpay: {
      tmnCode: process.env.VNPAY_TMN_CODE || '',
      hashSecret: process.env.VNPAY_HASH_SECRET || '',
      url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    }
  },
  // -- Tài khoản quản trị: chỉ đặt trong .env, bắt buộc khi production --
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || (isProd ? '' : 'admin123'),
    fromEnv: Boolean(process.env.ADMIN_PASSWORD)
  },
  demoPassword: process.env.DEMO_PASSWORD || 'demo123',
  showroom: {
    address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
    hotline: '1900 0000',
    hours: 'Thứ 2 - Chủ nhật, 8:00 - 20:00'
  },
  // -- Trợ lý tự động trả lời khi không có nhân viên online --
  bot: {
    enabled: process.env.CHATBOT !== 'off',
    delayMs: 700
  }
};

if (isProd && (!config.mongoUri || !config.jwtSecret)) {
  throw new Error('MONGODB_URI and JWT_SECRET must be set in production');
}
if (isProd && config.admin.password.length < 8) {
  throw new Error('ADMIN_PASSWORD (at least 8 characters) must be set in production');
}

module.exports = config;
