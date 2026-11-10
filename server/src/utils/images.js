const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');

// Tắt cache của sharp để Windows xóa được file
sharp.cache(false);

// Ảnh lưu trong MongoDB (GridFS) để không mất khi máy chủ khởi động lại (Render xóa ổ đĩa)
const BUCKET = 'images';
const PREFIX = '/uploads/';
const CAR_DIR = 'cars';

const TYPES = {
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif'
};

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
}

const contentTypeOf = (name) => TYPES[path.extname(name).toLowerCase()] || 'application/octet-stream';

async function removeFiles(names) {
  if (names.length === 0) return;
  const b = bucket();
  const files = await b.find({ filename: { $in: names } }, { projection: { _id: 1 } }).toArray();
  await Promise.all(files.map((f) => b.delete(f._id)));
}

// -- Ghi một ảnh, thay thế ảnh cùng tên nếu có --
async function putImage(name, buffer) {
  await removeFiles([name]);
  await new Promise((resolve, reject) => {
    bucket()
      .openUploadStream(name, { metadata: { contentType: contentTypeOf(name) } })
      .once('finish', resolve)
      .once('error', reject)
      .end(buffer);
  });
  return PREFIX + name;
}

async function imageExists(name) {
  return (await bucket().find({ filename: name }).limit(1).toArray()).length > 0;
}

// -- Lưu ảnh xe: bản lớn và ảnh nhỏ, định dạng WebP --
async function saveCarImage(buffer) {
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const image = sharp(buffer, { failOn: 'error' }).rotate();
  const [large, thumb] = await Promise.all([
    image.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(),
    image.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
  ]);
  const [url, thumbUrl] = await Promise.all([
    putImage(`${CAR_DIR}/${id}.webp`, large),
    putImage(`${CAR_DIR}/${id}-thumb.webp`, thumb)
  ]);
  return { url, thumbUrl };
}

async function deleteImages(images) {
  const names = new Set();
  for (const img of images || []) {
    for (const url of [img.url, img.thumbUrl]) {
      if (typeof url === 'string' && url.startsWith(PREFIX)) names.add(url.slice(PREFIX.length));
    }
  }
  try {
    await removeFiles([...names]);
  } catch (err) {
    console.error('[images] could not delete', err.message);
  }
}

// -- GET /uploads/*: trả ảnh từ GridFS, cache lâu dài vì tên ảnh không bao giờ đổi nội dung --
async function serveImage(req, res) {
  const name = [].concat(req.params.path).join('/');
  const file = await bucket().find({ filename: name }).sort({ uploadDate: -1 }).limit(1).next();
  if (!file) {
    res.status(404).type('text').send('Not found');
    return;
  }
  const etag = `"${file._id}"`;
  res.set({
    'Cache-Control': 'public, max-age=2592000, immutable',
    ETag: etag,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'"
  });
  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return;
  }
  res.type(file.metadata?.contentType || contentTypeOf(name)).set('Content-Length', String(file.length));
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  await new Promise((resolve, reject) => {
    bucket().openDownloadStream(file._id).once('error', reject).once('end', resolve).pipe(res);
  });
}

module.exports = { saveCarImage, deleteImages, putImage, imageExists, serveImage, contentTypeOf };
