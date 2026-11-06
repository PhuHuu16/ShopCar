import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { LoaderCircle, MessageCircle, SendHorizontal, X } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { useChat } from '../hooks/useChat';
import { formatPriceShort, formatTime } from '../lib/format';

function CarChip({ car, onRemove }) {
  if (!car) return null;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
      {car.images?.[0] && <img src={car.images[0].thumbUrl} alt="" className="h-10 w-16 rounded-lg object-cover" />}
      <div className="min-w-0 flex-1">
        <Link to={`/cars/${car.slug}`} className="block truncate text-sm font-semibold hover:text-brand-600">{car.name}</Link>
        <p className="text-xs text-slate-500">{formatPriceShort(car.price)}</p>
      </div>
      {onRemove && (
        <button onClick={onRemove} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Bỏ xe đính kèm">
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function Message({ message }) {
  const mine = message.sender === 'customer';
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm ${mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-slate-100 dark:bg-slate-800'}`}>
        {message.car && <div className="text-slate-900 dark:text-slate-100"><CarChip car={message.car} /></div>}
        <p className="whitespace-pre-line break-words">{message.text}</p>
      </div>
      <span className="mt-1 px-1 text-[11px] text-slate-400">{formatTime(message.createdAt)}</span>
    </div>
  );
}

function ChatPanel({ token, chat }) {
  const { closeChat, chatCar, clearChatCar } = useUi();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat.messages.length]);

  async function submit(e) {
    e?.preventDefault();
    const value = text.trim();
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

  return (
    <div className="card fixed inset-0 z-50 flex flex-col overflow-hidden rounded-none sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[560px] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl">
      <div className="flex items-center gap-3 bg-slate-900 px-4 py-3 text-white dark:bg-slate-800">
        <div className="flex size-10 items-center justify-center rounded-full bg-brand-600 font-bold">SC</div>
        <div className="flex-1">
          <p className="font-semibold">Tư vấn bán hàng</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className={`size-2 rounded-full ${chat.connected ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            {chat.connected ? 'Đang kết nối' : 'Đang kết nối lại...'}
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
          <div className="py-10 text-center text-sm text-slate-500">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Xin chào! 👋</p>
            <p className="mt-1">Hãy để lại câu hỏi về giá, lái thử hay trả góp. Tư vấn viên sẽ trả lời bạn sớm nhất.</p>
          </div>
        ) : (
          chat.messages.map((m) => <Message key={m._id} message={m} />)
        )}
      </div>

      <form onSubmit={submit} className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800">
        {chatCar && <CarChip car={chatCar} onRemove={clearChatCar} />}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // isComposing: Vietnamese input methods use Enter while composing a word
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e);
            }}
            rows={1}
            maxLength={2000}
            placeholder={chatCar ? 'Hỏi về xe này...' : 'Nhập tin nhắn...'}
            className="input max-h-32 min-h-11 resize-none"
            disabled={!token}
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
      </form>
    </div>
  );
}

export function ChatWidget() {
  const token = useAuth((s) => s.token);
  const { chatOpen, openChat, closeChat } = useUi();
  const chat = useChat(token, chatOpen);
  const navigate = useNavigate();

  // visitors must log in first; the chat opens again after login
  useEffect(() => {
    if (chatOpen && !token) {
      closeChat();
      toast.info('Đăng nhập để chat với tư vấn viên');
      navigate(`/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}&chat=1`);
    }
  }, [chatOpen, token, closeChat, navigate]);

  return (
    <>
      {chatOpen && token && <ChatPanel token={token} chat={chat} />}
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
