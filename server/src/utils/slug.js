// "Xe Mazda CX-5 Đời 2024" -> "xe-mazda-cx-5-doi-2024"
function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'item';
}

// Adds -2, -3 ... when another document already uses the slug.
async function uniqueSlug(Model, text, excludeId) {
  const base = slugify(text);
  let slug = base;
  for (let n = 2; ; n++) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    if (!(await Model.exists(query))) return slug;
    slug = `${base}-${n}`;
  }
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { slugify, uniqueSlug, escapeRegex };
