import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { formatPriceShort, shortId } from '../lib/format';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';

// -- Kết nối Socket.IO cho trang quản trị --
export const useLive = create(() => ({ socket: null, connected: false, activeChat: null }));

export function setActiveChat(id) {
  useLive.setState({ activeChat: id });
}

export function upsertConversation(list, conversation) {
  if (!list) return list;
  return [conversation, ...list.filter((c) => c._id !== conversation._id)];
}

export function addMessage(data, message, conversation) {
  if (!data) return data;
  const exists = data.messages.some((m) => m._id === message._id);
  return {
    conversation: conversation || data.conversation,
    messages: exists ? data.messages : [...data.messages, message]
  };
}

export function markChatRead(queryClient, conversationId) {
  api(`/chats/${conversationId}/read`, { method: 'POST' }).catch(() => {});
  const clear = (c) => (c._id === conversationId ? { ...c, unreadByAdmin: 0 } : c);
  queryClient.setQueryData(['chats'], (list) => list?.map(clear));
  queryClient.setQueryData(['chat', conversationId], (data) =>
    data ? { ...data, conversation: clear(data.conversation) } : data
  );
}

export function useLiveUpdates(token) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return undefined;
    const socket = io({ auth: { token, role: 'admin' } });
    useLive.setState({ socket });
    let kicked = false;
    socket.on('connect', () => {
      useLive.setState({ connected: true });
      if (!kicked) return;
      kicked = false;
      api('/me').then((admin) => {
        useAuth.getState().setAdmin(admin);
        queryClient.invalidateQueries();
      }).catch(() => {});
    });
    socket.on('disconnect', (reason) => {
      useLive.setState({ connected: false });
      if (reason !== 'io server disconnect') return;
      kicked = true;
      socket.auth = { token: useAuth.getState().token, role: 'admin' };
      socket.connect();
    });
    socket.on('connect_error', (err) => {
      if (kicked && err.message === 'unauthorized' && socket.auth.token === useAuth.getState().token) {
        kicked = false;
        api('/me').catch(() => {});
      }
    });

    socket.on('message:new', ({ conversationId, conversation, message }) => {
      const viewing = useLive.getState().activeChat === conversationId && document.visibilityState === 'visible';
      queryClient.setQueryData(['chats'], (list) => upsertConversation(list, conversation));
      queryClient.setQueryData(['chat', conversationId], (data) => addMessage(data, message, conversation));
      if (message.sender !== 'customer') return;
      if (viewing) {
        markChatRead(queryClient, conversationId);
      } else {
        const name = conversation.customer?.name || conversation.visitor?.name || 'Khách vãng lai';
        toast(`${name} vừa nhắn tin`, {
          description: message.text.length > 80 ? `${message.text.slice(0, 80)}…` : message.text,
          action: { label: 'Trả lời', onClick: () => navigate(`/chats/${conversationId}`) }
        });
      }
    });

    socket.on('order:new', (order) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Đơn hàng mới ${shortId(order._id)}`, {
        description: `${order.customerInfo?.name || 'Khách hàng'}, ${formatPriceShort(order.total)}`,
        action: { label: 'Xem', onClick: () => navigate(`/orders?id=${order._id}`) }
      });
    });

    socket.on('order:paid', (order) => {
      queryClient.setQueryData(['order', order._id], order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Đơn ${shortId(order._id)} đã được đặt cọc`, {
        description: `${order.customerInfo?.name || 'Khách hàng'}, ${formatPriceShort(order.payment?.deposit || 0)} qua VNPay`,
        action: { label: 'Xem', onClick: () => navigate(`/orders?id=${order._id}`) }
      });
    });

    socket.on('order:updated', (order) => {
      queryClient.setQueryData(['order', order._id], order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.on('car:stock', () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.on('contact:new', (contact) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast(`${contact.name} để lại lời nhắn`, {
        description: `${contact.phone}${contact.car ? `, ${contact.car.name}` : ''}: ${contact.message.length > 80 ? `${contact.message.slice(0, 80)}…` : contact.message}`,
        action: { label: 'Xem', onClick: () => navigate('/contacts') }
      });
    });

    socket.on('contact:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    socket.io.on('reconnect', () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['chats'] });
      queryClient.invalidateQueries({ queryKey: ['chat'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    });

    return () => {
      socket.close();
      useLive.setState({ socket: null, connected: false });
    };
  }, [token, queryClient, navigate]);
}
