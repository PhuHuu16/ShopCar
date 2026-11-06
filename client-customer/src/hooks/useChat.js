import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { api } from '../lib/api';

function addMessage(data, message, conversation) {
  if (!data) return data;
  const exists = data.messages.some((m) => m._id === message._id);
  return {
    conversation: conversation || data.conversation,
    messages: exists ? data.messages : [...data.messages, message]
  };
}

// -- Chat với showroom: lịch sử qua REST, tin mới qua Socket.IO --
export function useChat(token, isOpen) {
  const queryClient = useQueryClient();
  const key = ['chat', token];
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  const query = useQuery({
    queryKey: key,
    queryFn: () => api('/customer/chat'),
    enabled: !!token
  });

  useEffect(() => {
    if (!token) return undefined;
    const socket = io({ auth: { token, role: 'customer' } });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('message:new', ({ message, conversation }) => {
      queryClient.setQueryData(key, (data) => addMessage(data, message, conversation));
    });
    socket.io.on('reconnect', () => queryClient.invalidateQueries({ queryKey: key }));
    return () => {
      socket.close();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = query.data?.conversation?.unreadByCustomer || 0;

  useEffect(() => {
    if (!isOpen || !unread || !socketRef.current) return;
    socketRef.current.emit('conversation:read', {});
    queryClient.setQueryData(key, (data) =>
      data ? { ...data, conversation: { ...data.conversation, unreadByCustomer: 0 } } : data
    );
  }, [isOpen, unread, queryClient, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async (text, carId) => {
    const socket = socketRef.current;
    if (!socket || !socket.connected) throw new Error('Mất kết nối, đang thử kết nối lại...');
    const ack = await socket.timeout(10000).emitWithAck('message:send', { text, car: carId || undefined });
    if (!ack.ok) throw new Error(ack.message);
    queryClient.setQueryData(key, (data) => addMessage(data, ack.message));
  }, [queryClient, token]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    messages: query.data?.messages || [],
    loading: query.isLoading,
    error: query.error,
    unread,
    connected,
    send
  };
}
