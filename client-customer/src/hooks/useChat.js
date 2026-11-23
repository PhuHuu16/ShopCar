import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useLive } from '../lib/live';
import { useAuth } from '../stores/auth';
import { useVisitor } from '../stores/visitor';

function addMessage(data, message, conversation) {
  const base = data || { conversation: null, messages: [] };
  const exists = base.messages.some((m) => m._id === message._id);
  return {
    conversation: conversation || base.conversation,
    messages: exists ? base.messages : [...base.messages, message]
  };
}

// -- Chat với showroom: lịch sử qua REST, tin mới qua kết nối Socket.IO chung (lib/live.js) --
export function useChat(isOpen) {
  const queryClient = useQueryClient();
  const token = useAuth((s) => s.token);
  const visitorToken = useVisitor((s) => s.token);
  const identity = token || visitorToken;
  const key = ['chat', identity];
  const socket = useLive((s) => s.socket);
  const connected = useLive((s) => s.connected);
  const supportOnline = useLive((s) => s.supportOnline);
  const [typing, setTyping] = useState(false);

  const query = useQuery({
    queryKey: key,
    queryFn: () => (token ? api('/customer/chat') : api('/chat', { headers: { 'X-Visitor-Token': visitorToken } })),
    enabled: !!identity
  });

  useEffect(() => {
    if (!identity || !socket) return undefined;
    const onMessage = ({ message, conversation }) => {
      queryClient.setQueryData(key, (data) => addMessage(data, message, conversation));
      if (message.sender !== 'customer') setTyping(false);
    };
    const onTyping = ({ typing: on }) => setTyping(on);
    const onReconnect = () => queryClient.invalidateQueries({ queryKey: key });
    socket.on('message:new', onMessage);
    socket.on('chat:typing', onTyping);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('chat:typing', onTyping);
      socket.io.off('reconnect', onReconnect);
    };
  }, [identity, socket, queryClient]); // eslint-disable-line react-hooks/exhaustive-deps

  const unread = query.data?.conversation?.unreadByCustomer || 0;

  useEffect(() => {
    if (!isOpen || !unread || !socket || !identity) return;
    socket.emit('conversation:read', {});
    queryClient.setQueryData(key, (data) =>
      data?.conversation ? { ...data, conversation: { ...data.conversation, unreadByCustomer: 0 } } : data
    );
  }, [isOpen, unread, socket, queryClient, identity]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async (text, carId) => {
    if (!socket || !socket.connected) throw new Error('Mất kết nối, đang thử kết nối lại…');
    const ack = await socket.timeout(10000).emitWithAck('message:send', { text, car: carId || undefined });
    if (!ack.ok) throw new Error(ack.message);
    queryClient.setQueryData(key, (data) => addMessage(data, ack.message));
  }, [socket, queryClient, identity]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ready: !!identity,
    messages: query.data?.messages || [],
    loading: query.isLoading,
    error: query.error,
    unread,
    connected: connected && !!identity,
    supportOnline,
    typing,
    send
  };
}
