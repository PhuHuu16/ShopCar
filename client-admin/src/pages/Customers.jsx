import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BadgeCheck, Lock, MailWarning, MessageSquare, ReceiptText, Unlock, Users } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatNumber, formatPriceShort } from '../lib/format';
import { CUSTOMER_STATUS } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { confirm } from '../components/confirm';
import { Pagination } from '../components/Pagination';
import { Badge, Button, EmptyState, ErrorBox, PageHeader, SearchInput, Spinner, Table, td, th } from '../components/ui';

const LIMIT = 15;

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function Customers() {
  useTitle('Khách hàng');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search);
  const filters = { q: params.get('q') || '', page: Number(params.get('page')) || 1 };

  useEffect(() => {
    if (q === filters.q) return;
    const next = new URLSearchParams(params);
    if (q) next.set('q', q);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const customers = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => api('/customers', { query: { ...filters, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }) => api(`/customers/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (c) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(c.status === 'blocked' ? `Đã khóa tài khoản ${c.username}` : `Đã mở khóa tài khoản ${c.username}`);
    },
    onError: (err) => toast.error(err.message)
  });

  const resend = useMutation({
    mutationFn: (id) => api(`/customers/${id}/resend-activation`, { method: 'POST' }),
    onSuccess: () => toast.success('Đã gửi lại email kích hoạt'),
    onError: (err) => toast.error(err.message)
  });

  const startChat = useMutation({
    mutationFn: (id) => api(`/chats/with/${id}`, { method: 'POST' }),
    onSuccess: (conversation) => navigate(`/chats/${conversation._id}`),
    onError: (err) => toast.error(err.message)
  });

  async function toggleBlock(c) {
    const blocking = c.status !== 'blocked';
    const ok = await confirm(
      blocking
        ? { title: `Khóa tài khoản ${c.username}?`, message: 'Khách sẽ bị đăng xuất ngay và không đăng nhập hay đặt xe được nữa.', confirmText: 'Khóa tài khoản', danger: true }
        : { title: `Mở khóa ${c.username}?`, message: 'Khách sẽ đăng nhập và đặt xe lại được.', confirmText: 'Mở khóa' }
    );
    if (ok) setStatus.mutate({ id: c._id, status: blocking ? 'blocked' : 'active' });
  }

  const data = customers.data;

  return (
    <>
      <PageHeader title="Khách hàng" description={data ? `${formatNumber(data.total)} tài khoản` : 'Tài khoản khách đã đăng ký'} />
      <div className="card mb-4 p-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm theo tên, tên đăng nhập, email hoặc số điện thoại..." />
      </div>

      <div className="card overflow-hidden">
        {customers.isLoading ? (
          <Spinner />
        ) : customers.error ? (
          <div className="p-4"><ErrorBox error={customers.error} onRetry={customers.refetch} /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={Users} title="Không tìm thấy khách hàng">Thử từ khóa khác.</EmptyState>
        ) : (
          <div className={customers.isPlaceholderData ? 'opacity-60 transition' : ''}>
            <Table>
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className={th}>Khách hàng</th>
                  <th className={th}>Liên hệ</th>
                  <th className={`${th} text-right`}>Đơn hàng</th>
                  <th className={`${th} text-right`}>Đã chi</th>
                  <th className={th}>Ngày tham gia</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {c.name?.trim().split(/\s+/).at(-1)?.[0] || c.username[0]}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{c.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">@{c.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className={td}>
                      <p className="flex items-center gap-1.5">
                        {c.email}
                        {c.emailVerified ? (
                          <BadgeCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-label="Đã xác thực email" />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                            <MailWarning className="size-3.5" /> Chưa kích hoạt
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{c.phone}</p>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>
                      {c.orderCount > 0 ? (
                        <Link to={`/orders?customer=${c._id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-500">{c.orderCount}</Link>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{c.totalSpent ? formatPriceShort(c.totalSpent) : <span className="text-slate-400">—</span>}</td>
                    <td className={`${td} text-slate-500 dark:text-slate-400`}>{formatDate(c.createdAt)}</td>
                    <td className={td}>
                      <Badge className={CUSTOMER_STATUS[c.status].className}>{CUSTOMER_STATUS[c.status].label}</Badge>
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        {!c.emailVerified && (
                          <Button variant="ghost" size="icon" title="Gửi lại email kích hoạt" aria-label={`Gửi lại email kích hoạt cho ${c.username}`} loading={resend.isPending && resend.variables === c._id} onClick={() => resend.mutate(c._id)}>
                            {!(resend.isPending && resend.variables === c._id) && <MailWarning className="size-4" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Nhắn tin" aria-label={`Nhắn tin cho ${c.username}`} loading={startChat.isPending && startChat.variables === c._id} onClick={() => startChat.mutate(c._id)}>
                          {!(startChat.isPending && startChat.variables === c._id) && <MessageSquare className="size-4" />}
                        </Button>
                        <Link
                          to={`/orders?customer=${c._id}`}
                          className="inline-flex size-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Xem đơn hàng"
                          aria-label={`Đơn hàng của ${c.username}`}
                        >
                          <ReceiptText className="size-4" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={c.status === 'blocked' ? 'Mở khóa' : 'Khóa tài khoản'}
                          aria-label={c.status === 'blocked' ? `Mở khóa ${c.username}` : `Khóa ${c.username}`}
                          onClick={() => toggleBlock(c)}
                          className={c.status === 'blocked' ? '' : 'hover:!bg-red-50 hover:!text-red-600 dark:hover:!bg-red-500/10'}
                        >
                          {c.status === 'blocked' ? <Unlock className="size-4" /> : <Lock className="size-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
      {data && (
        <div className="mt-6">
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(page) => {
              const next = new URLSearchParams(params);
              next.set('page', String(page));
              setParams(next);
            }}
          />
        </div>
      )}
    </>
  );
}
