const multer = require('multer');
const HttpError = require('../utils/httpError');

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter(req, file, cb) {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Chỉ nhận ảnh JPG, PNG, WebP, GIF hoặc AVIF'));
  }
}).array('images', 12);

module.exports = { uploadImages };
