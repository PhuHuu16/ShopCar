const path = require('path');

// Thông tin bí mật để trong server/.env (không commit)
try {
  process.loadEnvFile(path.resolve(__dirname, '../.env'));
} catch {
  // không có file .env: dùng biến môi trường sẵn có
}

process.env.MONGOMS_DOWNLOAD_DIR ||= path.resolve(__dirname, '../node_modules/.cache/mongodb-memory-server');

const env = process.env.NODE_ENV || 'development';
const isProd = env === 'production';
const isTest = env === 'test';

const config = {
  env,
  isProd,
  isTest,
  port: Number(process.env.PORT) || 3000,
  // Để trống khi phát triển = tự chạy MongoDB trên máy
  mongoUri: isTest ? '' : process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB || 'shopcar',
  jwtSecret: process.env.JWT_SECRET || (isProd ? '' : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Trên Render dùng luôn địa chỉ công khai của dịch vụ
  clientUrl: (process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').replace(/\/$/, ''),
  email: {
    // Không có thì email được in ra console
    user: isTest ? '' : process.env.EMAIL_USER || '',
    pass: isTest ? '' : process.env.EMAIL_PASS || ''
  },
  dataDir: path.resolve(__dirname, '../.data'),
  payment: {
    depositPerCar: Number(process.env.DEPOSIT_PER_CAR) || 10_000_000,
    // Không có mã VNPay thì dùng trang thanh toán thử nghiệm
    vnpay: {
      tmnCode: isTest ? '' : process.env.VNPAY_TMN_CODE || '',
      hashSecret: isTest ? '' : process.env.VNPAY_HASH_SECRET || '',
      url: process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    }
  },
  // -- Tài khoản quản trị: chỉ đặt trong .env, bắt buộc khi production --
  admin: {
    username: (isTest ? '' : process.env.ADMIN_USERNAME) || 'admin',
    password: (isTest ? '' : process.env.ADMIN_PASSWORD) || (isProd ? '' : 'admin123'),
    fromEnv: !isTest && Boolean(process.env.ADMIN_PASSWORD)
  },
  demoPassword: (isTest ? '' : process.env.DEMO_PASSWORD) || 'demo123'
};

if (isProd && (!config.mongoUri || !config.jwtSecret)) {
  throw new Error('MONGODB_URI and JWT_SECRET must be set in production');
}
if (isProd && config.admin.password.length < 8) {
  throw new Error('ADMIN_PASSWORD (at least 8 characters) must be set in production');
}

module.exports = config;
