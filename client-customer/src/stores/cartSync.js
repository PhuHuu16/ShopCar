import { api } from '../lib/api';
import { useAuth } from './auth';
import { useCart } from './cart';

// -- Đồng bộ giỏ hàng với tài khoản: khách đã đăng nhập thì server giữ giỏ --
let ready = false;
let timer = null;

const toServer = (items) => items.map((i) => ({ car: i.car._id, quantity: i.quantity }));

async function pull() {
  ready = false;
  const { token, customer } = useAuth.getState();
  if (!token || !customer) return;
  const { items, owner } = useCart.getState();
  const merge = owner == null && items.length > 0;
  try {
    const res = await api(merge ? '/customer/cart/merge' : '/customer/cart', merge ? { method: 'POST', body: { items: toServer(items) } } : {});
    if (useAuth.getState().token !== token) return;
    useCart.setState({ items: res.items, owner: customer._id });
    ready = true;
  } catch {}
}

function push() {
  const { token } = useAuth.getState();
  if (!ready || !token) return;
  timer = null;
  api('/customer/cart', { method: 'PUT', body: { items: toServer(useCart.getState().items) } }).catch(() => {});
}

useCart.subscribe((state, prev) => {
  if (!ready || state.items === prev.items) return;
  clearTimeout(timer);
  timer = setTimeout(push, 300);
});

useAuth.subscribe((state, prev) => {
  if (state.token === prev.token) return;
  if (state.token) {
    pull();
    return;
  }
  ready = false;
  clearTimeout(timer);
  timer = null;
  useCart.setState({ items: [], owner: null });
});

// Đóng tab ngay sau khi sửa giỏ: gửi nốt thay đổi cuối
addEventListener('pagehide', () => {
  const { token } = useAuth.getState();
  if (!timer || !ready || !token) return;
  clearTimeout(timer);
  timer = null;
  fetch('/api/customer/cart', {
    method: 'PUT',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ items: toServer(useCart.getState().items) })
  }).catch(() => {});
});

pull();
