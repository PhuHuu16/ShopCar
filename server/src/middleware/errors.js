const { ZodError } = require('zod');
const multer = require('multer');
const mongoose = require('mongoose');
const HttpError = require('../utils/httpError');

function apiNotFound(req, res) {
  res.status(404).json({ message: 'Không tìm thấy API' });
}

// Turns any thrown error into a JSON answer. Express 5 sends errors from
// async routes here automatically.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return res.status(400).json({ message: 'Dữ liệu không hợp lệ', errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: 'ID không hợp lệ' });
  }
  if (err && err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `Giá trị ${field} đã tồn tại`, field });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Lỗi upload: ${err.message}` });
  }
  if (err && (err.status === 404 || err.statusCode === 404)) {
    return res.status(404).end(); // e.g. missing file under /uploads
  }
  console.error(err);
  res.status(500).json({ message: 'Lỗi máy chủ' });
}

module.exports = { apiNotFound, errorHandler };
