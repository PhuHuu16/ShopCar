import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { create } from 'zustand';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { formatPriceShort, shortId } from '../lib/format';
import { api } from '../lib/api';

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
    socket.on('connect', () => useLive.setState({ connected: true }));
    socket.on('disconnect', () => useLive.setState({ connected: false }));

    socket.on('message:new', ({ conversationId, conversation, message }) => {
      const viewing = useLive.getState().activeChat === conversationId && document.visibilityState === 'visible';
      queryClient.setQueryData(['chats'], (list) => upsertConversation(list, conversation));
      queryClient.setQueryData(['chat', conversationId], (data) => addMessage(data, message, conversation));
      if (message.sender !== 'customer') return;
      if (viewing) {
        markChatRead(queryClient, conversationId);
      } else {
        const name = conversation.customer?.name || 'Khách hàng';
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
        description: `${order.customerInfo?.name || 'Khách hàng'} · ${formatPriceShort(order.total)}`,
        action: { label: 'Xem', onClick: () => navigate(`/orders?id=${order._id}`) }
      });
    });

    socket.on('order:paid', (order) => {
      queryClient.setQueryData(['order', order._id], order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(`Đơn ${shortId(order._id)} đã được đặt cọc`, {
        description: `${order.customerInfo?.name || 'Khách hàng'} · ${formatPriceShort(order.payment?.deposit || 0)} qua VNPay`,
        action: { label: 'Xem', onClick: () => navigate(`/orders?id=${order._id}`) }
      });
    });

    socket.io.on('reconnect', () => {
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
