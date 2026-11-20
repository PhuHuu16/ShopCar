import { useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Inbox, Mail, Phone, RotateCcw } from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { formatDateTime, formatPriceShort } from '../lib/format';
import { actorName } from '../lib/audit';
import { useTitle } from '../hooks/useTitle';
import { CarThumb } from '../components/CarThumb';
import { Pagination } from '../components/Pagination';
import { Badge, Button, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';

const LIMIT = 15;

const TABS = [
  { value: 'new', label: 'Chờ gọi lại' },
  { value: 'done', label: 'Đã xử lý' },
  { value: '', label: 'Tất cả' }
];

// -- Lời nhắn khách để lại (không cần tài khoản), đến realtime qua Socket.IO --
function ContactCard({ contact }) {
  const queryClient = useQueryClient();
  const done = contact.status === 'done';
  const toggle = useMutation({
    mutationFn: () => api(`/contacts/${contact._id}`, { method: 'PATCH', body: { status: done ? 'new' : 'done' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success(done ? 'Đã chuyển lại sang chờ gọi lại' : 'Đã đánh dấu xử lý xong');
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <div className={`card p-5 ${done ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {contact.name}
            {contact.customer
              ? <Badge className="bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">Có tài khoản</Badge>
              : <Badge className="bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">Vãng lai</Badge>}
            {done && <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300">Đã xử lý</Badge>}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 hover:text-brand-600"><Phone className="size-4 text-slate-400" /> {contact.phone}</a>
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 hover:text-brand-600"><Mail className="size-4 text-slate-400" /> {contact.email}</a>
            )}
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(contact.createdAt)}</span>
      </div>

      <p className="mt-3 whitespace-pre-line break-words rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/50">{contact.message}</p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {contact.car ? (
          <a href={`${SHOP_URL}/cars/${contact.car.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-sm hover:text-brand-600">
            <CarThumb car={contact.car} />
            <span>
              <span className="block font-medium">{contact.car.name}</span>
              <span className="text-xs text-slate-500">{formatPriceShort(contact.car.price)}</span>
            </span>
          </a>
        ) : <span />}
        <Button size="sm" variant={done ? 'outline' : 'primary'} loading={toggle.isPending} onClick={() => toggle.mutate()}>
          {done ? <><RotateCcw className="size-4" /> Mở lại</> : <><Check className="size-4" /> Đã gọi lại</>}
        </Button>
      </div>
      {done && contact.handledAt && (
        <p className="mt-2 text-right text-xs text-slate-500">
          {contact.handledBy ? `${actorName(contact.handledBy)} xử lý lúc ` : 'Xử lý lúc '}
          {formatDateTime(contact.handledAt)}
        </p>
      )}
    </div>
  );
}

export default function Contacts() {
  useTitle('Liên hệ');
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'new';
  const page = Number(params.get('page')) || 1;

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['contacts', status, page],
    queryFn: () => api('/contacts', { query: { status, page, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) next.set(k, v);
    if (!changes.page) next.delete('page');
    setParams(next);
  };

  return (
    <div>
      <PageHeader title="Liên hệ" description="Lời nhắn khách để lại trên web, không cần đăng nhập. Lời nhắn mới hiện ngay lập tức." />
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value || 'all'}
            onClick={() => update({ status: t.value })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              status === t.value ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isLoading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={refetch} /> : data.items.length === 0 ? (
        <EmptyState icon={Inbox} title={status === 'new' ? 'Không có lời nhắn chờ gọi lại' : 'Chưa có lời nhắn'}>
          Khi khách gửi lời nhắn ở trang Liên hệ hoặc khung chat, nó sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            {data.items.map((c) => <ContactCard key={c._id} contact={c} />)}
          </div>
          <div className="mt-6">
            <Pagination page={data.page} pages={data.pages} onChange={(p) => update({ page: p })} />
          </div>
        </>
      )}
    </div>
  );
}
