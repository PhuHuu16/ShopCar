import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, Bot, LoaderCircle, MessageCircle, SendHorizontal, X } from 'lucide-react';
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
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
      {car.images?.[0] && <img src={car.images[0].thumbUrl} alt="" className="h-10 w-16 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <Link to={`/cars/${car.slug}`} onClick={onOpen} className="block truncate text-sm font-semibold hover:text-brand-600">{car.name}</Link>
        <p className="text-xs text-slate-500">
          {formatPriceShort(car.price)}
          {car.stock !== undefined && (car.stock > 0 ? ` · còn ${car.stock} xe` : ' · tạm hết hàng')}
        </p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Bỏ xe đính kèm">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function QuickReplies({ items, onPick, disabled }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((q) => (
        <button
          key={q}
          disabled={disabled}
          onClick={() => onPick(q)}
          className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-medium text-brand-700 transition hover:bg-brand-50 disabled:opacity-50 dark:border-brand-500/30 dark:bg-slate-900 dark:text-brand-400 dark:hover:bg-brand-500/10"
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
        <span className="mb-1 flex items-center gap-1 px-1 text-[11px] font-medium text-slate-500">
          <Bot className="size-3.5" /> Trợ lý tự động
        </span>
      )}
      {showStaff && <span className="mb-1 px-1 text-[11px] font-medium text-slate-500">{message.staffName} · Tư vấn viên</span>}
      <div className={`max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm ${mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
        {message.car && <div className="text-slate-900 dark:text-slate-100"><CarChip car={message.car} onOpen={onNavigate} /></div>}
        <p className="whitespace-pre-line break-words">{message.text}</p>
        {message.cars?.length > 0 && (
          <div className="space-y-1.5 text-slate-900 dark:text-slate-100">
            {message.cars.map((car) => <CarChip key={car._id} car={car} onOpen={onNavigate} />)}
          </div>
        )}
        {message.link?.to && (
          <Link to={message.link.to} onClick={onNavigate} className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline dark:text-brand-400">
            {message.link.label} <ArrowRight className="size-3.5" />
          </Link>
        )}
      </div>
      <span className="mt-1 px-1 text-[11px] text-slate-400">{formatTime(message.createdAt)}</span>
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
    <div className="card fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-8rem)] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl">
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white dark:bg-slate-800">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-600 font-bold">
          {chat.supportOnline ? 'SC' : <Bot className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Tư vấn bán hàng</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className={`size-2 shrink-0 rounded-full ${!chat.connected ? 'bg-slate-500' : chat.supportOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="truncate">
              {!chat.connected ? 'Đang kết nối...' : chat.supportOnline ? 'Tư vấn viên đang trực tuyến' : 'Trợ lý tự động · tư vấn viên trả lời khi online'}
            </span>
          </p>
        </div>
        <button onClick={closeChat} className="rounded-lg p-1.5 hover:bg-white/10" aria-label="Đóng chat">
          <X className="size-5" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {chat.loading ? (
          <div className="flex justify-center py-10"><LoaderCircle className="size-6 animate-spin text-slate-400" /></div>
        ) : chat.messages.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-500">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Xin chào! 👋</p>
            <p className="mt-1">
              {chat.supportOnline
                ? 'Tư vấn viên đang trực tuyến, hãy hỏi về giá, lái thử hay trả góp.'
                : 'Trợ lý tự động sẽ trả lời ngay: tìm xe, báo giá, giờ mở cửa, trả góp... Để lại số điện thoại để tư vấn viên gọi lại.'}
            </p>
          </div>
        ) : (
          chat.messages.map((m, i) => <Message key={m._id} message={m} showStaff={isNewStaffTurn(m, chat.messages[i - 1])} onNavigate={onNavigate} />)
        )}
        {chat.typing && (
          <div className="flex items-center gap-1.5 px-1 text-xs text-slate-500">
            <Bot className="size-3.5" />
            <span className="flex gap-0.5">
              {[0, 150, 300].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: `${d}ms` }} />)}
            </span>
          </div>
        )}
        {suggestions.length > 0 && !chat.typing && <QuickReplies items={suggestions} onPick={sendText} disabled={sending || !chat.connected} />}
      </div>

      <form onSubmit={submit} className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
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
            placeholder={chatCar ? 'Hỏi về xe này...' : 'Nhập tin nhắn...'}
            className="input max-h-32 min-h-11 resize-none"
            disabled={!chat.ready}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
            aria-label="Gửi"
          >
            {sending ? <LoaderCircle className="size-5 animate-spin" /> : <SendHorizontal className="size-5" />}
          </button>
        </div>
        {!loggedIn && (
          <p className="text-center text-[11px] text-slate-500">
            Không cần tài khoản · <Link to={loginUrl} onClick={closeChat} className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link> để xem lại chat trên mọi thiết bị
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
        className={`fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-xl shadow-brand-600/30 transition hover:scale-105 hover:bg-brand-700 ${chatOpen ? 'max-sm:hidden' : ''}`}
        aria-label={chatOpen ? 'Đóng chat' : 'Chat với tư vấn viên'}
      >
        {chatOpen ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {!chatOpen && chat.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold ring-2 ring-white dark:ring-slate-950">
            {chat.unread}
          </span>
        )}
      </button>
    </>
  );
}
