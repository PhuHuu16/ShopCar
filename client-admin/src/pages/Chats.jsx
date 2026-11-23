import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Bot, CarFront, Mail, MessageSquare, Phone, ReceiptText, SendHorizontal, X } from 'lucide-react';
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

function person(c) {
  if (c?.customer) return { ...c.customer, guest: false };
  return {
    name: c?.visitor?.name || `Khách vãng lai #${String(c?.visitorId || c?._id || '').slice(-4).toUpperCase()}`,
    phone: c?.visitor?.phone,
    guest: true
  };
}

function GuestTag() {
  return <span className="rounded-sm bg-paper-3 px-1.5 py-0.5 text-xs text-ink-2">Vãng lai</span>;
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/);
  return (parts.at(-1)?.[0] || '?').toUpperCase();
}

function Avatar({ name, className = 'size-10' }) {
  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full border border-ink font-display text-lg text-ink`}>
      {initials(name)}
    </span>
  );
}

function ConversationList({ conversations, activeId }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter((c) => { const p = person(c); return `${p.name} ${p.username || ''} ${p.phone || ''}`.toLowerCase().includes(s); });
  }, [conversations, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-rule p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm khách hàng..." />
      </div>
      {list.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted">{conversations.length ? 'Không tìm thấy.' : 'Chưa có tin nhắn nào.'}</p>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {list.map((c) => {
            const unread = c.unreadByAdmin > 0;
            const p = person(c);
            return (
              <li key={c._id}>
                <Link
                  to={`/chats/${c._id}`}
                  className={`flex gap-3 border-l-2 px-3 py-3 transition-colors ${
                    c._id === activeId
                      ? 'border-ink bg-paper-2 '
                      : 'border-transparent hover:bg-paper '
                  }`}
                >
                  <Avatar name={p.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`flex min-w-0 items-center gap-1.5 text-sm text-ink ${unread ? 'font-medium' : ''}`}><span className="truncate">{p.name}</span>{p.guest && <GuestTag />}</p>
                      <span className="shrink-0 text-xs text-muted tabular-nums">{c.lastMessage?.at && formatTime(c.lastMessage.at)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      <p className={`flex-1 truncate text-sm ${unread ? 'font-medium text-ink ' : 'text-muted '}`}>
                        {c.lastMessage?.sender === 'admin' && 'Bạn: '}
                        {c.lastMessage?.sender === 'bot' && 'Trợ lý: '}
                        {c.lastMessage?.text}
                      </p>
                      {unread && <span className="min-w-5 rounded-sm bg-accent px-1.5 text-center text-xs leading-5 text-paper tabular-nums">{c.unreadByAdmin}</span>}
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

function CarChip({ car }) {
  return (
    <a
      href={`${SHOP_URL}/cars/${car.slug}`}
      target="_blank"
      rel="noreferrer"
      className="mb-1.5 flex items-center gap-2.5 rounded-sm border border-rule bg-card p-2 transition-colors duration-[var(--dur-micro)] hover:border-muted"
    >
      <CarThumb car={car} className="h-9 w-14" />
      <span className="min-w-0">
        <span className="block truncate text-sm text-ink">{car.name}</span>
        <span className="text-xs text-muted tabular-nums">{formatPriceShort(car.price)}</span>
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
    return <p className="m-auto max-w-xs text-center text-sm text-muted">Chưa có tin nhắn. Hãy gửi lời chào đầu tiên cho khách.</p>;
  }
  let lastDay = '';
  return (
    <div className="space-y-2">
      {messages.map((m, i) => {
        const mine = m.sender !== 'customer';
        const isBot = m.sender === 'bot';
        const prev = messages[i - 1];
        const showStaff = m.sender === 'admin' && m.staffName && !(prev?.sender === 'admin' && prev.staffName === m.staffName);
        const day = formatDate(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        return (
          <Fragment key={m._id}>
            {showDay && (
              <div className="py-2 text-center">
                <span className="px-3 text-xs text-muted tabular-nums">{day}</span>
              </div>
            )}
            <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[78%]">
                {isBot && (
                  <p className="mb-1 flex items-center justify-end gap-1.5 text-xs text-muted"><Bot className="size-3.5" aria-hidden="true" /> Trợ lý tự động</p>
                )}
                {showStaff && <p className="mb-1 text-right text-xs text-muted">{m.staffName}</p>}
                <div className={`rounded-md px-3.5 py-2.5 text-sm leading-relaxed text-ink ${isBot ? 'border border-dashed border-muted bg-paper-2' : mine ? 'bg-paper-3' : 'border border-rule bg-card'}`}>
                  {m.car && <CarChip car={m.car} />}
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  {m.cars?.map((car) => <div key={car._id} className="mt-1.5"><CarChip car={car} /></div>)}
                  {m.link?.to && <a href={`${SHOP_URL}${m.link.to}`} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline decoration-accent underline-offset-4">{m.link.label}</a>}
                </div>
                <p className={`mt-1 text-xs text-muted tabular-nums ${mine ? 'text-right' : ''}`}>
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
              className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-paper-2"
            >
              <CarThumb car={car} className="h-10 w-14" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-ink">{car.name}</span>
                <span className="text-xs text-muted tabular-nums">{formatPriceShort(car.price)}, còn {car.stock}</span>
              </span>
            </button>
          </li>
        ))}
        {cars.isLoading && <Spinner className="py-6" />}
        {cars.data?.items.length === 0 && <p className="py-6 text-center text-sm text-muted">Không tìm thấy xe.</p>}
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
    <div className="border-t border-rule p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        {QUICK_REPLIES.map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setText(r)}
            className="min-h-8 rounded-md border border-rule px-3 text-sm text-ink-2 transition-colors duration-[var(--dur-micro)] hover:border-ink hover:text-ink"
          >
            {r}
          </button>
        ))}
      </div>
      {car && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-paper-2 p-2">
          <CarThumb car={car} className="h-8 w-12" />
          <span className="min-w-0 flex-1 truncate text-sm text-ink">{car.name}</span>
          <button type="button" onClick={() => setCar(null)} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper-3 hover:text-ink" aria-label="Bỏ xe đính kèm">
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

  useEffect(() => {
    if (unread > 0) markChatRead(queryClient, id);
  }, [unread, id, queryClient]);

  if (chat.isLoading) return <Spinner className="m-auto" />;
  if (chat.error) return <div className="m-auto p-6"><ErrorBox error={chat.error} onRetry={chat.refetch} /></div>;
  const customer = person(chat.data.conversation);

  return (
    <>
      <div className="flex items-center gap-3 border-b border-rule px-5 py-4">
        <Link to="/chats" className="flex size-10 items-center justify-center rounded-md hover:bg-paper-2 md:hidden" aria-label="Quay lại danh sách">
          <ArrowLeft className="size-5" />
        </Link>
        <Avatar name={customer?.name} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 truncate font-display text-xl leading-tight text-ink">{customer.name}{customer.guest && <GuestTag />}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 text-sm text-muted">
            {customer?.phone && <a href={`tel:${customer.phone}`} className="inline-flex items-center gap-1.5 tabular-nums hover:text-ink"><Phone className="size-3.5" aria-hidden="true" /> {customer.phone}</a>}
            {customer?.email && <a href={`mailto:${customer.email}`} className="hidden items-center gap-1.5 hover:text-ink sm:inline-flex"><Mail className="size-3.5" aria-hidden="true" /> {customer.email}</a>}
          </div>
        </div>
        {!customer.guest && <Link
          to={`/orders?customer=${customer._id}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-muted px-3 text-sm text-ink hover:border-ink hover:bg-paper-2"
        >
          <ReceiptText className="size-4" /> <span className="hidden sm:inline">Đơn hàng</span>
        </Link>}
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

  useEffect(() => {
    if (!id && chats.data?.length && window.matchMedia('(min-width: 768px)').matches) {
      navigate(`/chats/${chats.data[0]._id}`, { replace: true });
    }
  }, [id, chats.data, navigate]);

  return (
    <div className="card flex h-[calc(100dvh-8rem)] min-h-[480px] overflow-hidden lg:h-[calc(100dvh-9rem)]">
      <aside className={`w-full shrink-0 border-r border-rule md:block md:w-80  ${id ? 'hidden' : 'block'}`}>
        {chats.isLoading ? <Spinner /> : chats.error ? <div className="p-4"><ErrorBox error={chats.error} onRetry={chats.refetch} /></div> : <ConversationList conversations={chats.data} activeId={id} />}
      </aside>
      <section className={`min-w-0 flex-1 flex-col ${id ? 'flex' : 'hidden md:flex'}`}>
        {id ? (
          <ChatPane key={id} id={id} />
        ) : (
          <div className="m-auto">
            <EmptyState icon={MessageSquare} title="Chọn một cuộc trò chuyện">Tin nhắn mới của khách (kể cả khách chưa đăng nhập) hiện ở đây ngay lập tức. Khi không có quản trị viên nào online, trợ lý tự động sẽ trả lời khách.</EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
