const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('vi-VN');

export function formatVnd(value) {
  return vnd.format(value || 0);
}

export function formatPriceShort(value) {
  if (value >= 999.5e6) return `${(value / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} tỷ`;
  if (value >= 1e6) return `${num.format(Math.round(value / 1e6))} triệu`;
  return formatVnd(value);
}

export function formatKm(value) {
  return `${num.format(value || 0)} km`;
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('vi-VN');
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTime(value) {
  const d = new Date(value);
  const today = new Date();
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === today.toDateString() ? time : `${time} ${d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
}

export function shortId(id) {
  return `#${String(id).slice(-6).toUpperCase()}`;
}
