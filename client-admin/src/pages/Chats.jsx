import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CarFront, Mail, MessageSquare, Phone, ReceiptText, SendHorizontal, X } from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { formatDate, formatPriceShort, formatTime } from '../lib/format';
import { useTitle } from '../hooks/useTitle';
import { addMessage, markChatRead, setActiveChat, useLive } from '../hooks/live';
import { CarThumb } from '../components/CarThumb';
import { Button, EmptyState, ErrorBox, Modal, SearchInput, Spinner } from '../components/ui';

const QUICK_REPLIES = [
  'Dạ em chào anh/chị, em có thể giúp gì ạ?',
  'Xe này hiện vẫn còn tại showroom ạ.',
  'Anh/chị cho em xin số điện thoại để tư vấn kỹ hơn nhé.',
  'Anh/chị muốn hẹn lái thử vào ngày nào ạ?'
];

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1)?.[0] || '?').toUpperCase();
}

function Avatar({ name, className = 'size-10' }) {
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200`}>
      {initials(name)}
    </span>
  );
}

function ConversationList({ conversations, activeId }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter((c) => `${c.customer?.name} ${c.customer?.username} ${c.customer?.phone}`.toLowerCase().includes(s));
  }, [conversations, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3 dark:border-slate-800">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm khách hàng..." />
      </div>
      {list.length === 0 ? (
        <p className="p-6 text-center text-sm text-slate-500">{conversations.length ? 'Không tìm thấy.' : 'Chưa có tin nhắn nào.'}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {list.map((c) => {
            const unread = c.unreadByAdmin > 0;
            return (
              <li key={c._id}>
                <Link
                  to={`/chats/${c._id}`}
                  className={`flex gap-3 border-l-2 px-3 py-3 transition ${
                    c._id === activeId
                      ? 'border-brand-600 bg-slate-100 dark:bg-slate-800/70'
                      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <Avatar name={c.customer?.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`truncate text-sm ${unread ? 'font-bold' : 'font-medium'}`}>{c.customer?.name || 'Khách hàng'}</p>
                      <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{c.lastMessage?.at && formatTime(c.lastMessage.at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={`flex-1 truncate text-sm ${unread ? 'font-medium text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {c.lastMessage?.sender === 'admin' && 'Bạn: '}
                        {c.lastMessage?.text}
                      </p>
                      {unread && <span className="min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{c.unreadByAdmin}</span>}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CarChip({ car, mine }) {
  return (
    <a
      href={`${SHOP_URL}/cars/${car.slug}`}
      target="_blank"
      rel="noreferrer"
      className={`mb-1.5 flex items-center gap-2.5 rounded-xl p-2 ${mine ? 'bg-white/15 hover:bg-white/25' : 'bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950'}`}
    >
      <CarThumb car={car} className="h-9 w-14" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{car.name}</span>
        <span className={`text-xs ${mine ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{formatPriceShort(car.price)}</span>
      </span>
    </a>
  );
}

function Messages({ messages }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  if (!messages.length) {
    return <p className="m-auto max-w-xs text-center text-sm text-slate-500">Chưa có tin nhắn. Hãy gửi lời chào đầu tiên cho khách.</p>;
  }
  let lastDay = '';
  return (
    <div className="space-y-2">
      {messages.map((m) => {
        const mine = m.sender === 'admin';
        const day = formatDate(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <Fragment key={m._id}>
            {showDay && (
              <div className="py-2 text-center">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">{day}</span>
              </div>
            )}
            <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%]">
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
                  {m.car && <CarChip car={m.car} mine={mine} />}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                </div>
                <p className={`mt-0.5 text-[11px] text-slate-500 ${mine ? 'text-right' : ''}`}>
                  {new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </Fragment>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}

// Lets the showroom attach a car to the next message
function CarPicker({ open, onClose, onPick }) {
  const [search, setSearch] = useState('');
  const cars = useQuery({
    queryKey: ['cars', { q: search, picker: true }],
    queryFn: () => api('/cars', { query: { q: search, limit: 8 } }),
    enabled: open
  });
  return (
    <Modal open={open} onClose={onClose} title="Gửi kèm một xe">
      <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên xe..." />
      <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto">
        {cars.data?.items.map((car) => (
          <li key={car._id}>
            <button
              onClick={() => {
                onPick(car);
                onClose();
              }}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CarThumb car={car} className="h-10 w-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{car.name}</span>
                <span className="text-xs text-slate-500">{formatPriceShort(car.price)} · còn {car.stock}</span>
              </span>
            </button>
          </li>
        ))}
        {cars.isLoading && <Spinner className="py-6" />}
        {cars.data?.items.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Không tìm thấy xe.</p>}
      </ul>
    </Modal>
  );
}

function Composer({ conversationId }) {
  const queryClient = useQueryClient();
  const socket = useLive((s) => s.socket);
  const connected = useLive((s) => s.connected);
  const [text, setText] = useState('');
  const [car, setCar] = useState(null);
  const [picking, setPicking] = useState(false);
  const [sending, setSending] = useState(false);
  const inputRef = useRef(null);

  async function send(value = text) {
    const message = value.trim();
    if (!message || sending) return;
    setSending(true);
    try {
      const payload = { conversationId, text: message, car: car?._id };
      let saved;
      if (socket && connected) {
        const ack = await socket.timeout(10000).emitWithAck('message:send', payload);
        if (!ack.ok) throw new Error(ack.message);
        saved = ack.message;
      } else {
        saved = await api(`/chats/${conversationId}/messages`, { method: 'POST', body: payload });
      }
      queryClient.setQueryData(['chat', conversationId], (data) => addMessage(data, saved));
      setText('');
      setCar(null);
      inputRef.current?.focus();
    } catch (err) {
      toast.error(err.message || 'Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-slate-200 p-3 dark:border-slate-800">
      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
        {QUICK_REPLIES.map((r) => (
          <button
            key={r}
            onClick={() => setText(r)}
            className="shrink-0 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {r}
          </button>
        ))}
      </div>
      {car && (
        <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
          <CarThumb car={car} className="h-8 w-12" />
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{car.name}</span>
          <button onClick={() => setCar(null)} className="rounded-lg p-1 hover:bg-slate-200 dark:hover:bg-slate-700" aria-label="Bỏ xe đính kèm">
            <X className="size-4" />
          </button>
        </div>
      )}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <Button variant="outline" size="icon" className="size-11" onClick={() => setPicking(true)} title="Gửi kèm xe" aria-label="Gửi kèm xe">
          <CarFront className="size-5" />
        </Button>
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          maxLength={2000}
          placeholder="Nhập tin nhắn..."
          title="Enter để gửi, Shift+Enter để xuống dòng"
          className="input max-h-32 min-h-11 flex-1 resize-none"
          aria-label="Tin nhắn"
        />
        <Button type="submit" size="icon" className="size-11" loading={sending} disabled={!text.trim()} aria-label="Gửi">
          {!sending && <SendHorizontal className="size-5" />}
        </Button>
      </form>
      <CarPicker open={picking} onClose={() => setPicking(false)} onPick={setCar} />
    </div>
  );
}

function ChatPane({ id }) {
  const queryClient = useQueryClient();
  const chat = useQuery({ queryKey: ['chat', id], queryFn: () => api(`/chats/${id}/messages`) });
  const unread = chat.data?.conversation?.unreadByAdmin || 0;

  useEffect(() => {
    setActiveChat(id);
    return () => setActiveChat(null);
  }, [id]);

  // opening a conversation marks the customer's messages as read
  useEffect(() => {
    if (unread > 0) markChatRead(queryClient, id);
  }, [unread, id, queryClient]);

  if (chat.isLoading) return <Spinner className="m-auto" />;
  if (chat.error) return <div className="m-auto p-6"><ErrorBox error={chat.error} onRetry={chat.refetch} /></div>;
  const customer = chat.data.conversation.customer;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <Link to="/chats" className="rounded-lg p-1.5 hover:bg-slate-100 md:hidden dark:hover:bg-slate-800" aria-label="Quay lại danh sách">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={customer?.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{customer?.name}</p>
          <div className="flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
            {customer?.phone && <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone className="size-3" /> {customer.phone}</a>}
            {customer?.email && <a href={`mailto:${customer.email}`} className="hidden items-center gap-1 hover:text-brand-600 sm:inline-flex"><Mail className="size-3" /> {customer.email}</a>}
          </div>
        </div>
        <Link
          to={`/orders?customer=${customer?._id}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <ReceiptText className="size-4" /> <span className="hidden sm:inline">Đơn hàng</span>
        </Link>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto px-4 py-4">
        <Messages messages={chat.data.messages} />
      </div>
      <Composer key={id} conversationId={id} />
    </>
  );
}

export default function Chats() {
  useTitle('Tin nhắn');
  const { id } = useParams();
  const navigate = useNavigate();
  const chats = useQuery({ queryKey: ['chats'], queryFn: () => api('/chats') });

  // on wide screens open the newest conversation right away
  useEffect(() => {
    if (!id && chats.data?.length && window.matchMedia('(min-width: 768px)').matches) {
      navigate(`/chats/${chats.data[0]._id}`, { replace: true });
    }
  }, [id, chats.data, navigate]);

  return (
    <div className="card flex h-[calc(100dvh-8rem)] min-h-[480px] overflow-hidden lg:h-[calc(100dvh-9rem)]">
      <aside className={`w-full shrink-0 border-r border-slate-200 md:block md:w-80 dark:border-slate-800 ${id ? 'hidden' : 'block'}`}>
        {chats.isLoading ? <Spinner /> : chats.error ? <div className="p-4"><ErrorBox error={chats.error} onRetry={chats.refetch} /></div> : <ConversationList conversations={chats.data} activeId={id} />}
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${id ? 'flex' : 'hidden md:flex'}`}>
        {id ? (
          <ChatPane key={id} id={id} />
        ) : (
          <div className="m-auto">
            <EmptyState icon={MessageSquare} title="Chọn một cuộc trò chuyện">Tin nhắn mới của khách sẽ hiện ở đây ngay lập tức.</EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
