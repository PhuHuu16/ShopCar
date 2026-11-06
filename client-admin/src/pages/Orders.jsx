import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, CreditCard, Mail, Phone, ReceiptText, StickyNote, TriangleAlert, User, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatNumber, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS, PAYMENT_STATUS } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { confirm } from '../components/confirm';
import { CarThumb } from '../components/CarThumb';
import { Pagination } from '../components/Pagination';
import { Badge, Button, Drawer, EmptyState, ErrorBox, PageHeader, SearchInput, Spinner, Table, td, th } from '../components/ui';

const LIMIT = 15;

export function StatusBadge({ status }) {
  const s = ORDER_STATUS[status];
  return <Badge className={s.className}>{s.label}</Badge>;
}

export function PaymentBadge({ payment }) {
  const s = PAYMENT_STATUS[payment?.status || 'none'];
  return <Badge className={s.className}>{s.label}</Badge>;
}

// Deposit details in the order drawer
function PaymentInfo({ order }) {
  const p = order.payment || { method: 'showroom', status: 'none' };
  const refund = order.status === 'CANCELED' && p.status === 'paid';
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thanh toán</h3>
      <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-semibold">
            <CreditCard className="size-4 text-slate-400" />
            {p.method === 'vnpay' ? `Đặt cọc online ${p.provider === 'demo' ? '(cổng demo)' : 'qua VNPay'}` : 'Thanh toán tại showroom'}
          </span>
          <PaymentBadge payment={p} />
        </div>
        {p.method === 'vnpay' && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
            <dt className="text-slate-500">Tiền cọc</dt><dd className="text-right font-semibold tabular-nums">{formatVnd(p.deposit)}</dd>
            {p.status === 'paid' && (
              <>
                <dt className="text-slate-500">Còn phải thu</dt><dd className="text-right tabular-nums">{formatVnd(order.total - p.deposit)}</dd>
                <dt className="text-slate-500">Thời gian</dt><dd className="text-right">{formatDateTime(p.paidAt)}</dd>
                <dt className="text-slate-500">Mã giao dịch</dt><dd className="text-right font-mono text-xs">{p.transactionNo} · {p.bankCode}</dd>
              </>
            )}
            {p.status === 'failed' && (
              <><dt className="text-slate-500">Mã lỗi VNPay</dt><dd className="text-right font-mono text-xs">{p.responseCode}</dd></>
            )}
            <dt className="text-slate-500">Số lần thanh toán</dt><dd className="text-right tabular-nums">{p.attempts}</dd>
          </dl>
        )}
        {refund && (
          <p className="flex gap-2 rounded-lg bg-red-50 p-3 text-red-800 dark:bg-red-500/10 dark:text-red-300">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" /> Đơn đã hủy nhưng khách đã cọc: cần hoàn {formatVnd(p.deposit)} cho khách.
          </p>
        )}
      </div>
    </section>
  );
}

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function useChangeStatus(onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => api(`/orders/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order._id], order);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(order.status === 'APPROVED' ? 'Đã xác nhận đơn, kho xe đã được trừ' : 'Đã hủy đơn hàng');
      onDone?.(order);
    },
    onError: (err) => toast.error(err.message)
  });
}

function Timeline({ order }) {
  const steps = [{ label: 'Khách đặt xe', at: order.createdAt }];
  if (order.approvedAt) steps.push({ label: 'Showroom xác nhận', at: order.approvedAt });
  if (order.status === 'CANCELED') steps.push({ label: 'Đơn bị hủy', at: order.updatedAt });
  return (
    <ol className="space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-slate-400 ring-4 ring-white dark:ring-slate-900" />
          <p className="text-sm font-medium">{s.label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(s.at)}</p>
        </li>
      ))}
    </ol>
  );
}

function OrderDetail({ id, onClose }) {
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api(`/orders/${id}`) });
  const change = useChangeStatus();
  const o = order.data;

  async function act(status) {
    const approve = status === 'APPROVED';
    const ok = await confirm(
      approve
        ? { title: 'Xác nhận đơn hàng?', message: 'Số xe trong đơn sẽ được trừ khỏi kho.', confirmText: 'Xác nhận đơn' }
        : {
            title: 'Hủy đơn hàng?',
            message: [
              o.status === 'APPROVED' ? 'Đơn đã xác nhận: số xe sẽ được trả lại kho.' : 'Khách hàng sẽ thấy đơn ở trạng thái “Đã hủy”.',
              o.payment?.status === 'paid' ? `Khách đã đặt cọc ${formatVnd(o.payment.deposit)}, bạn cần hoàn tiền cọc cho khách.` : ''
            ].join(' '),
            confirmText: 'Hủy đơn',
            danger: true
          }
    );
    if (ok) change.mutate({ id, status });
  }

  const footer = o && o.status !== 'CANCELED' && (
    <>
      <Button variant="danger-outline" onClick={() => act('CANCELED')} loading={change.isPending && change.variables?.status === 'CANCELED'}>
        <X className="size-4" /> Hủy đơn
      </Button>
      {o.status === 'PENDING' && (
        <Button variant="success" onClick={() => act('APPROVED')} loading={change.isPending && change.variables?.status === 'APPROVED'}>
          <Check className="size-4" /> Xác nhận đơn
        </Button>
      )}
    </>
  );

  return (
    <Drawer open onClose={onClose} title={o ? `Đơn hàng ${shortId(o._id)}` : 'Đơn hàng'} footer={footer}>
      {order.isLoading ? (
        <Spinner />
      ) : order.error ? (
        <ErrorBox error={order.error} onRetry={order.refetch} />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={o.status} />
            <span className="text-sm text-slate-500 dark:text-slate-400">{formatDateTime(o.createdAt)}</span>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</h3>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800/50">
              <p className="flex items-center gap-2 font-semibold"><User className="size-4 text-slate-400" /> {o.customerInfo?.name}</p>
              {o.customerInfo?.phone && (
                <a href={`tel:${o.customerInfo.phone}`} className="flex items-center gap-2 hover:text-brand-600"><Phone className="size-4 text-slate-400" /> {o.customerInfo.phone}</a>
              )}
              {o.customerInfo?.email && (
                <a href={`mailto:${o.customerInfo.email}`} className="flex items-center gap-2 hover:text-brand-600"><Mail className="size-4 text-slate-400" /> {o.customerInfo.email}</a>
              )}
              <Link to={`/orders?customer=${o.customer}`} onClick={onClose} className="inline-block pt-1 text-xs font-semibold text-brand-600 dark:text-brand-500">
                Xem các đơn khác của khách này
              </Link>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Xe đặt mua</h3>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {o.items.map((item) => (
                <li key={item.car} className="flex items-center gap-3 py-3">
                  <CarThumb car={item} className="h-12 w-[72px]" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/cars/${item.car}`} onClick={onClose} className="block truncate font-medium hover:text-brand-600">{item.name}</Link>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{formatVnd(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatVnd(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 dark:border-slate-800">
              <span className="font-medium">Tổng cộng</span>
              <span className="text-lg font-bold tabular-nums">{formatVnd(o.total)}</span>
            </div>
          </section>

          <PaymentInfo order={o} />

          {o.note && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú của khách</h3>
              <p className="flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <StickyNote className="mt-0.5 size-4 shrink-0" /> {o.note}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Lịch sử</h3>
            <Timeline order={o} />
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default function Orders() {
  useTitle('Đơn hàng');
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search);
  const filters = {
    status: params.get('status') || '',
    customer: params.get('customer') || '',
    payment: params.get('payment') || '',
    q: params.get('q') || '',
    page: Number(params.get('page')) || 1
  };
  const openId = params.get('id');

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes) && !('id' in changes)) next.delete('page');
    setParams(next, { replace: !('id' in changes) });
  }

  useEffect(() => {
    if (q !== filters.q) update({ q });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api('/stats') });
  const customer = useQuery({
    queryKey: ['customer', filters.customer],
    queryFn: () => api(`/customers/${filters.customer}`),
    enabled: !!filters.customer
  });
  const orders = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => api('/orders', { query: { ...filters, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });
  const change = useChangeStatus();

  const counts = stats.data?.orders;
  const tabs = [
    { value: '', label: 'Tất cả', count: stats.data?.counts.orders },
    ...Object.entries(ORDER_STATUS).map(([value, s]) => ({ value, label: s.label, count: counts?.[value] }))
  ];
  const data = orders.data;

  return (
    <>
      <PageHeader title="Đơn hàng" description="Xác nhận đơn để trừ kho; hủy đơn đã xác nhận sẽ trả xe về kho." />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-200/60 p-1 dark:bg-slate-800/60" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={filters.status === t.value}
              onClick={() => update({ status: t.value })}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                filters.status === t.value ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{formatNumber(t.count)}</span>}
            </button>
          ))}
        </div>
        <SearchInput className="min-w-56 flex-1" value={search} onChange={setSearch} placeholder="Tìm tên, số điện thoại, email hoặc mã đơn..." />
        <select className="input w-auto py-2" value={filters.payment} onChange={(e) => update({ payment: e.target.value })} aria-label="Thanh toán">
          <option value="">Mọi hình thức thanh toán</option>
          {Object.entries(PAYMENT_STATUS).map(([value, s]) => (
            <option key={value} value={value}>{s.label}</option>
          ))}
        </select>
      </div>

      {filters.customer && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-slate-500">Đang xem đơn của</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 py-1 pl-3 pr-1.5 font-semibold text-white dark:bg-white dark:text-slate-900">
            {customer.data?.name || '...'}
            <button onClick={() => update({ customer: '' })} className="rounded-full p-0.5 hover:bg-white/20 dark:hover:bg-slate-900/10" aria-label="Bỏ lọc theo khách">
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      )}

      <div className="card overflow-hidden">
        {orders.isLoading ? (
          <Spinner />
        ) : orders.error ? (
          <div className="p-4"><ErrorBox error={orders.error} onRetry={orders.refetch} /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={ReceiptText} title="Không có đơn hàng nào">Thử đổi trạng thái hoặc từ khóa tìm kiếm.</EmptyState>
        ) : (
          <div className={orders.isPlaceholderData ? 'opacity-60 transition' : ''}>
            <Table>
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className={th}>Mã đơn</th>
                  <th className={th}>Khách hàng</th>
                  <th className={th}>Xe</th>
                  <th className={`${th} text-right`}>Tổng tiền</th>
                  <th className={th}>Ngày đặt</th>
                  <th className={th}>Trạng thái</th>
                  <th className={`${th} text-right`}><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((o) => (
                  <tr key={o._id} onClick={() => update({ id: o._id })} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={`${td} font-mono text-xs font-semibold`}>
                      <button onClick={(e) => { e.stopPropagation(); update({ id: o._id }); }} className="hover:text-brand-600">{shortId(o._id)}</button>
                    </td>
                    <td className={td}>
                      <p className="font-medium">{o.customerInfo?.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{o.customerInfo?.phone}</p>
                    </td>
                    <td className={`${td} max-w-56`}>
                      <p className="truncate">{o.items[0]?.name}</p>
                      {o.items.length > 1 && <p className="text-xs text-slate-500">và {o.items.length - 1} xe khác</p>}
                    </td>
                    <td className={`${td} text-right font-semibold tabular-nums`}>{formatVnd(o.total)}</td>
                    <td className={`${td} whitespace-nowrap text-slate-500 dark:text-slate-400`}>{formatDateTime(o.createdAt)}</td>
                    <td className={td}>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={o.status} />
                        {o.payment?.status && o.payment.status !== 'none' && <PaymentBadge payment={o.payment} />}
                      </div>
                    </td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      {o.status === 'PENDING' && (
                        <Button
                          size="xs"
                          variant="success"
                          loading={change.isPending && change.variables?.id === o._id}
                          onClick={async () => {
                            const ok = await confirm({ title: `Xác nhận đơn ${shortId(o._id)}?`, message: 'Số xe trong đơn sẽ được trừ khỏi kho.', confirmText: 'Xác nhận đơn' });
                            if (ok) change.mutate({ id: o._id, status: 'APPROVED' });
                          }}
                        >
                          <Check className="size-3.5" /> Xác nhận
                        </Button>
                      )}
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
          <Pagination page={data.page} pages={data.pages} onChange={(page) => update({ page: String(page) })} />
        </div>
      )}
      {openId && <OrderDetail key={openId} id={openId} onClose={() => update({ id: '' })} />}
    </>
  );
}
