// Draws a simple illustrated car as SVG, used as placeholder photos for demo data.

const PAINT = {
  'Trắng': '#f1f5f9', 'Đen': '#111827', 'Đỏ': '#dc2626', 'Xám': '#6b7280', 'Bạc': '#cbd5e1',
  'Xanh dương': '#2563eb', 'Cam': '#ea580c'
};

const BOTTOM = 'L1110 340 Q1105 360 1080 360 L980 360 A110 110 0 0 0 760 360 L360 360 A110 110 0 0 0 140 360 L50 360 Q20 355 20 330 Z';

const SHAPES = {
  sedan: {
    body: `M20 330 Q10 270 70 250 L300 215 Q380 120 470 105 L720 100 Q820 105 900 200 L1060 225 Q1110 235 1110 300 ${BOTTOM}`,
    windows: ['M330 215 Q400 135 475 125 L590 122 L590 215 Z', 'M615 122 L715 122 Q800 128 860 210 L615 215 Z']
  },
  suv: {
    body: `M20 320 Q15 250 80 235 L250 210 L330 100 Q345 80 375 80 L900 80 Q935 80 950 110 L1000 215 L1070 230 Q1110 240 1110 300 ${BOTTOM}`,
    windows: ['M300 205 L365 105 L600 105 L600 205 Z', 'M625 105 L905 105 L955 205 L625 205 Z']
  },
  pickup: {
    body: `M20 330 L20 220 L470 220 L500 110 Q510 90 540 90 L800 90 Q830 90 850 120 L920 215 L1060 230 Q1110 240 1110 300 ${BOTTOM}`,
    windows: ['M515 210 L545 115 L690 115 L690 210 Z', 'M712 115 L820 115 L890 210 L712 210 Z']
  }
};
const SHAPE_FOR = { sedan: 'sedan', coupe: 'sedan', suv: 'suv', crossover: 'suv', mpv: 'suv', hatchback: 'suv', pickup: 'pickup' };

function escapeXml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
}

function wheel(cx) {
  return `<circle cx="${cx}" cy="360" r="88" fill="#0b0f19"/><circle cx="${cx}" cy="360" r="52" fill="#9ca3af"/>`
    + `<circle cx="${cx}" cy="360" r="40" fill="#4b5563"/><circle cx="${cx}" cy="360" r="14" fill="#d1d5db"/>`;
}

// variant 0..2 changes the background and flips the car for a "different angle"
function carSvg({ brand, brandColor, name, year, bodyType, color }, variant = 0) {
  const shape = SHAPES[SHAPE_FOR[bodyType] || 'sedan'];
  const paint = PAINT[color] || '#94a3b8';
  const backgrounds = [['#0f172a', brandColor], ['#111827', '#1f2937'], [brandColor, '#0f172a']];
  const [c1, c2] = backgrounds[variant % 3];
  const flip = variant === 1 ? 'translate(1360,380) scale(-1,1)' : 'translate(240,380)';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" width="1600" height="1000">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.78" r="0.55"><stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.35"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#bg)"/>
  <rect width="1600" height="1000" fill="url(#glow)"/>
  <rect y="780" width="1600" height="220" fill="#000" opacity="0.18"/>
  <ellipse cx="800" cy="745" rx="600" ry="38" fill="#000" opacity="0.35"/>
  <g transform="${flip}">
    <path d="${shape.body}" fill="${paint}"/>
    <path d="${shape.body}" fill="url(#shine)" stroke="#ffffff" stroke-opacity="0.3" stroke-width="3"/>
    ${shape.windows.map((d) => `<path d="${d}" fill="#0f172a" opacity="0.85"/>`).join('')}
    <rect x="1065" y="250" width="40" height="18" rx="6" fill="#fde68a"/>
    <rect x="24" y="262" width="30" height="20" rx="5" fill="#ef4444"/>
    ${wheel(250)}${wheel(870)}
  </g>
  <text x="80" y="130" font-family="Segoe UI, Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" opacity="0.7" letter-spacing="6">${escapeXml(brand.toUpperCase())}</text>
  <text x="80" y="200" font-family="Segoe UI, Arial, sans-serif" font-size="60" font-weight="700" fill="#ffffff">${escapeXml(name)}</text>
  <text x="80" y="255" font-family="Segoe UI, Arial, sans-serif" font-size="36" fill="#ffffff" opacity="0.75">${year}</text>
  <text x="1520" y="950" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="#ffffff" opacity="0.5">Ảnh minh họa</text>
</svg>`;
}

module.exports = { carSvg };
