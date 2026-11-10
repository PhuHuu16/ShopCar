// -- npm run images:upload: chép ảnh cũ trong server/uploads vào MongoDB (chạy một lần) --
const fs = require('fs/promises');
const path = require('path');
const db = require('../src/db');
const { putImage, imageExists } = require('../src/utils/images');

const UPLOAD_DIR = path.resolve(process.argv[2] || path.join(__dirname, '../uploads'));

async function listFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listFiles(full)));
    else if (e.isFile()) files.push(full);
  }
  return files;
}

async function main() {
  const files = await listFiles(UPLOAD_DIR);
  if (files.length === 0) {
    console.log(`Không có ảnh nào trong ${UPLOAD_DIR}.`);
    return;
  }
  await db.connect();
  let added = 0;
  for (const file of files) {
    const name = path.relative(UPLOAD_DIR, file).split(path.sep).join('/');
    if (await imageExists(name)) continue;
    await putImage(name, await fs.readFile(file));
    added++;
  }
  console.log(`Đã chép ${added} ảnh vào database (${files.length - added} ảnh đã có sẵn).`);
  await db.disconnect();
}

main().catch(async (err) => {
  console.error(err.message || err);
  await db.disconnect().catch(() => {});
  process.exit(1);
});
