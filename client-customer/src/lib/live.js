import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '../stores/auth';
import { useCart } from '../stores/cart';
import { useGuestOrders } from '../stores/guestOrders';
import { useVisitor } from '../stores/visitor';
import { shortId } from './format';

// -- Một kết nối Socket.IO cho cả web khách --
export const useLive = create(() => ({ socket: null, connected: false, supportOnline: false }));

const CAR_QUERIES = new Set(['car', 'cars', 'featured']);

export function patchCarStock(data, carId, patch) {
  if (Array.isArray(data)) {
    let changed = false;
    const next = data.map((item) => {
      const out = patchCarStock(item, carId, patch);
      if (out !== item) changed = true;
      return out;
    });
    return changed ? next : data;
  }
  if (data && typeof data === 'object') {
    if (data._id === carId && 'stock' in data) return { ...data, ...patch };
    let changed = false;
    const next = {};
    for (const [key, value] of Object.entries(data)) {
      next[key] = patchCarStock(value, carId, patch);
      if (next[key] !== value) changed = true;
    }
    return changed ? next : data;
  }
  return data;
}

function watchGuestOrders(socket) {
  const orders = useGuestOrders.getState().orders;
  if (socket?.connected && orders.length) socket.emit('order:watch', orders.map(({ id, token }) => ({ id, token })));
}

function findCachedOrder(queryClient, id) {
  return queryClient.getQueryData(['guest-order', id]) || queryClient.getQueryData(['orders'])?.find((o) => o._id === id);
}

export function useRealtime() {
  const token = useAuth((s) => s.token);
  const queryClient = useQueryClient();
  const guestOrders = useGuestOrders((s) => s.orders);
  const visitorToken = useVisitor((s) => s.token);

  useEffect(() => {
    const auth = token ? { token, role: 'customer' } : visitorToken ? { visitor: visitorToken } : {};
    const socket = io({ auth });
    useLive.setState({ socket });

    socket.on('connect', () => {
      useLive.setState({ connected: true });
      watchGuestOrders(socket);
    });
    socket.on('disconnect', () => useLive.setState({ connected: false }));
    socket.on('connect_error', (err) => {
      if (err.message !== 'unauthorized') return;
      if (token) useAuth.getState().logout();
      else if (visitorToken) useVisitor.getState().clear();
    });
    socket.on('support:status', ({ online }) => useLive.setState({ supportOnline: online }));

    socket.on('car:stock', ({ car, stock, sold }) => {
      queryClient.setQueriesData(
        { predicate: (q) => CAR_QUERIES.has(q.queryKey[0]) },
        (data) => patchCarStock(data, car, { stock, sold })
      );
      const before = useCart.getState().updateStock(car, stock);
      if (before && stock < before.quantity) {
        toast.warning(stock === 0
          ? `${before.car.name} trong giỏ của bạn vừa được khách khác đặt`
          : `${before.car.name} chỉ còn ${stock} xe, đã cập nhật giỏ hàng`);
      }
    });

    socket.on('order:updated', (order) => {
      const previous = findCachedOrder(queryClient, order._id);
      queryClient.setQueryData(['guest-order', order._id], (old) => (old ? order : old));
      queryClient.setQueryData(['orders'], (list) => list?.map((o) => (o._id === order._id ? order : o)));
      if (previous && previous.status === order.status) return;
      if (order.status === 'APPROVED') {
        toast.success(`Đơn ${shortId(order._id)} đã được showroom xác nhận`);
      } else if (order.status === 'CANCELED' && order.cancelReason !== 'Khách hủy đơn') {
        toast.warning(`Đơn ${shortId(order._id)} đã bị hủy`, { description: order.cancelReason });
      }
    });

    socket.io.on('reconnect', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['guest-order'] });
      queryClient.invalidateQueries({ predicate: (q) => CAR_QUERIES.has(q.queryKey[0]) });
    });

    return () => {
      socket.close();
      useLive.setState({ socket: null, connected: false });
    };
  }, [token, visitorToken, queryClient]);

  useEffect(() => {
    watchGuestOrders(useLive.getState().socket);
  }, [guestOrders]);
}
