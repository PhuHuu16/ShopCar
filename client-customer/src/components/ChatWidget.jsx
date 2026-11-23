import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Bot, LoaderCircle, MessageCircle, SendHorizontal, X } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { ensureVisitorToken } from '../stores/visitor';
import { useChat } from '../hooks/useChat';
import { formatPriceShort, formatTime } from '../lib/format';
import { isNewStaffTurn } from '../lib/chat';

const STARTERS = ['Tìm SUV dưới 1,5 tỷ', 'Giờ mở cửa & địa chỉ', 'Đặt lịch lái thử', 'Mua trả góp thế nào?', 'Gặp tư vấn viên'];

const closeOnMobile = (closeChat) => window.matchMedia('(max-width: 639px)').matches && closeChat();

function CarChip({ car, onRemove, onOpen }) {
  if (!car) return null;
  return (
    <div className="flex items-center gap-3 rounded-md border border-rule bg-card p-2">
      {car.images?.[0] && <img src={car.images[0].thumbUrl} alt="" className="h-10 w-16 rounded-sm object-cover" />}
      <div className="min-w-0 flex-1">
        <Link to={`/cars/${car.slug}`} onClick={onOpen} className="block truncate text-sm text-ink decoration-accent underline-offset-4 hover:underline">{car.name}</Link>
        <p className="text-xs text-muted tabular-nums">
          {formatPriceShort(car.price)}
          {car.stock !== undefined && (car.stock > 0 ? `, còn ${car.stock} xe` : ', tạm hết hàng')}
        </p>
      </div>
      {onRemove && (
        <button type="button" onClick={onRemove} className="flex size-8 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink" aria-label="Bỏ xe đính kèm">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function QuickReplies({ items, onPick, disabled }) {
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {items.map((q) => (
        <button
          type="button"
          key={q}
          disabled={disabled}
          onClick={() => onPick(q)}
          className="min-h-9 rounded-md border border-rule bg-card px-3 text-left text-sm text-ink-2 transition-colors duration-[var(--dur-short)] hover:border-ink hover:text-ink disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}

function Message({ message, showStaff, onNavigate }) {
  const mine = message.sender === 'customer';
  const isBot = message.sender === 'bot';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      {isBot && (
        <span className="mb-1 flex items-center gap-1.5 px-1 text-xs text-muted">
          <Bot className="size-3.5" aria-hidden="true" /> Trợ lý tự động
        </span>
      )}
      {showStaff && <span className="mb-1 px-1 text-xs text-muted">{message.staffName}, tư vấn viên</span>}
      <div className={`max-w-[85%] space-y-2 rounded-md px-3.5 py-2.5 text-sm leading-relaxed text-ink ${mine ? 'bg-paper-3' : 'border border-rule bg-card'}`}>
        {message.car && <CarChip car={message.car} onOpen={onNavigate} />}
        <p className="whitespace-pre-line break-words">{message.text}</p>
        {message.cars?.length > 0 && (
          <div className="space-y-1.5">
            {message.cars.map((car) => <CarChip key={car._id} car={car} onOpen={onNavigate} />)}
          </div>
        )}
        {message.link?.to && (
          <Link to={message.link.to} onClick={onNavigate} className="link">
            {message.link.label}
          </Link>
        )}
      </div>
      <span className="mt-1 px-1 text-xs text-muted tabular-nums">{formatTime(message.createdAt)}</span>
    </div>
  );
}

function ChatPanel({ chat, loggedIn }) {
  const { closeChat, chatCar, clearChatCar } = useUi();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length, chat.typing]);

  async function sendText(value) {
    if (!value || sending) return;
    setSending(true);
    try {
      await chat.send(value, chatCar?._id);
      setText('');
      clearChatCar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  function submit(e) {
    e?.preventDefault();
    sendText(text.trim());
  }

  const last = chat.messages.at(-1);
  const suggestions = chat.messages.length === 0 ? STARTERS : last?.sender === 'bot' ? last.quickReplies || [] : [];
  const onNavigate = () => closeOnMobile(closeChat);
  const loginUrl = `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}&chat=1`;

  return (
    <div className="card fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-8rem)] sm:w-[380px] sm:rounded-md sm:shadow-xl">
      <div className="flex items-center gap-3 border-b border-rule bg-paper px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight text-ink">Tư vấn bán hàng</p>
          <p className="mt-0.5 flex items-center gap-2 text-sm text-muted" role="status">
            <span className={`size-1.5 shrink-0 rounded-full ${!chat.connected ? 'bg-rule' : chat.supportOnline ? 'bg-success' : 'bg-warn'}`} aria-hidden="true" />
            {!chat.connected ? 'Đang kết nối…' : chat.supportOnline ? 'Tư vấn viên đang trực tuyến' : 'Trợ lý tự động đang trả lời'}
          </p>
        </div>
        <button type="button" onClick={closeChat} className="flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Đóng chat">
          <X className="size-5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-paper-2/40 p-5">
        {chat.loading ? (
          <div className="flex justify-center py-10"><LoaderCircle className="size-6 animate-spin text-muted" /></div>
        ) : chat.messages.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">
            <p className="font-display text-xl text-ink">Hỏi showroom bất cứ điều gì</p>
            <p className="mt-2 leading-relaxed">
              {chat.supportOnline
                ? 'Tư vấn viên đang trực tuyến, hãy hỏi về giá, lái thử hay trả góp.'
                : 'Trợ lý tự động trả lời ngay về xe, báo giá, giờ mở cửa và trả góp. Để lại số điện thoại để tư vấn viên gọi lại.'}
            </p>
          </div>
        ) : (
          chat.messages.map((m, i) => <Message key={m._id} message={m} showStaff={isNewStaffTurn(m, chat.messages[i - 1])} onNavigate={onNavigate} />)
        )}
        {chat.typing && (
          <div className="flex items-center gap-1.5 px-1 text-xs text-muted">
            <Bot className="size-3.5" />
            <span className="flex gap-0.5">
              {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-pulse rounded-full bg-rule" style={{ animationDelay: `${d}ms` }} />)}
            </span>
          </div>
        )}
        {suggestions.length > 0 && !chat.typing && <QuickReplies items={suggestions} onPick={sendText} disabled={sending || !chat.connected} />}
      </div>

      <form onSubmit={submit} className="space-y-2 border-t border-rule p-4">
        {chatCar && <CarChip car={chatCar} onRemove={clearChatCar} />}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            rows={1}
            maxLength={2000}
            placeholder={chatCar ? 'Hỏi về xe này…' : 'Nhập tin nhắn…'}
            className="input max-h-32 min-h-11 resize-none"
            disabled={!chat.ready}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex size-11 shrink-0 items-center justify-center rounded-md bg-ink text-paper transition-colors duration-[var(--dur-short)] hover:bg-ink-2 active:translate-y-px disabled:opacity-40"
            aria-label="Gửi"
          >
            {sending ? <LoaderCircle className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
          </button>
        </div>
        {!loggedIn && (
          <p className="text-xs text-muted">
            Không cần tài khoản. <Link to={loginUrl} onClick={closeChat} className="link">Đăng nhập</Link> để xem lại chat trên mọi thiết bị
          </p>
        )}
      </form>
    </div>
  );
}

export function ChatWidget() {
  const token = useAuth((s) => s.token);
  const { chatOpen, openChat, closeChat } = useUi();
  const chat = useChat(chatOpen);

  useEffect(() => {
    if (chatOpen && !token) ensureVisitorToken().catch((err) => toast.error(err.message));
  }, [chatOpen, token]);

  return (
    <>
      {chatOpen && <ChatPanel chat={chat} loggedIn={!!token} />}
      <button
        onClick={() => (chatOpen ? closeChat() : openChat())}
        className={`fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg transition-colors duration-[var(--dur-short)] hover:bg-ink-2 active:translate-y-px ${chatOpen ? 'max-sm:hidden' : ''}`}
        aria-label={chatOpen ? 'Đóng chat' : 'Chat với tư vấn viên'}
      >
        {chatOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!chatOpen && chat.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-accent text-xs text-paper tabular-nums ring-2 ring-paper">
            {chat.unread}
          </span>
        )}
      </button>
    </>
  );
}
