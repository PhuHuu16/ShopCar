const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const config = require('../config');

// sharp's cache keeps files open, which on Windows stops them from being deleted
sharp.cache(false);

const CAR_DIR = 'cars';

// Saves an uploaded photo as two WebP files: a large one for the detail page
// and a small thumbnail for lists. Much lighter than the old base64-in-database.
async function saveCarImage(buffer) {
  const dir = path.join(config.uploadDir, CAR_DIR);
  await fs.mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const image = sharp(buffer, { failOn: 'error' }).rotate(); // rotate = respect phone EXIF orientation
  await Promise.all([
    image.clone().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(dir, `${id}.webp`)),
    image.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 72 }).toFile(path.join(dir, `${id}-thumb.webp`))
  ]);
  return { url: `/uploads/${CAR_DIR}/${id}.webp`, thumbUrl: `/uploads/${CAR_DIR}/${id}-thumb.webp` };
}

// Deletes files we stored ourselves; external URLs are left alone.
async function deleteImages(images) {
  const files = [];
  for (const img of images || []) {
    for (const url of [img.url, img.thumbUrl]) {
      if (typeof url === 'string' && url.startsWith('/uploads/')) {
        const file = path.resolve(config.uploadDir, url.slice('/uploads/'.length));
        if (file.startsWith(config.uploadDir + path.sep)) files.push(file);
      }
    }
  }
  // Best effort: the car is already saved, a leftover file is not worth an error.
  const results = await Promise.allSettled([...new Set(files)].map((f) => fs.rm(f, { force: true })));
  for (const r of results) {
    if (r.status === 'rejected') console.error('[images] could not delete', r.reason.path || r.reason);
  }
}

module.exports = { saveCarImage, deleteImages };
