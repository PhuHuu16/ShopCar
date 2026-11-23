import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Clock, CreditCard, Mail, Phone, ReceiptText, StickyNote, TriangleAlert, User, X } from 'lucide-react';
import { useCan } from '../hooks/useCan';
import { api } from '../lib/api';
import { formatDateTime, formatNumber, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS, PAYMENT_STATUS } from '../lib/labels';
import { actorName } from '../lib/audit';
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

function GuestBadge() {
  return <Badge className="bg-info-soft text-accent">Vãng lai</Badge>;
}

export function PaymentBadge({ payment }) {
  const s = PAYMENT_STATUS[payment?.status || 'none'];
  return <Badge className={s.className}>{s.label}</Badge>;
}

function PaymentInfo({ order }) {
  const p = order.payment || { method: 'showroom', status: 'none' };
  const refund = order.status === 'CANCELED' && p.status === 'paid';
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-muted">Thanh toán</h3>
      <div className="space-y-2 rounded-md bg-paper p-4 text-sm">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-medium">
            <CreditCard className="size-4 text-muted" />
            {p.method === 'vnpay' ? `Đặt cọc online ${p.provider === 'demo' ? '(cổng demo)' : 'qua VNPay'}` : 'Thanh toán tại showroom'}
          </span>
          <PaymentBadge payment={p} />
        </div>
        {p.method === 'vnpay' && (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1">
            <dt className="text-muted">Tiền cọc</dt><dd className="text-right font-medium tabular-nums">{formatVnd(p.deposit)}</dd>
            {p.status === 'paid' && (
              <>
                <dt className="text-muted">Còn phải thu</dt><dd className="text-right tabular-nums">{formatVnd(order.total - p.deposit)}</dd>
                <dt className="text-muted">Thời gian</dt><dd className="text-right">{formatDateTime(p.paidAt)}</dd>
                <dt className="text-muted">Mã giao dịch</dt><dd className="text-right font-mono text-xs">{p.transactionNo}, {p.bankCode}</dd>
              </>
            )}
            {p.status === 'failed' && (
              <><dt className="text-muted">Mã lỗi VNPay</dt><dd className="text-right font-mono text-xs">{p.responseCode}</dd></>
            )}
            <dt className="text-muted">Số lần thanh toán</dt><dd className="text-right tabular-nums">{p.attempts}</dd>
          </dl>
        )}
        {refund && (
          <p className="flex gap-2 rounded-lg bg-error-soft p-3 text-error">
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
      toast.success(order.status === 'APPROVED' ? 'Đã xác nhận đơn' : 'Đã hủy đơn hàng');
      onDone?.(order);
    },
    onError: (err) => toast.error(err.message)
  });
}

function Timeline({ order }) {
  const steps = [{ label: 'Khách đặt xe', at: order.createdAt }];
  if (order.approvedAt) {
    steps.push({ label: order.approvedBy ? `Xác nhận bởi ${actorName(order.approvedBy)}` : 'Showroom xác nhận', at: order.approvedAt });
  }
  if (order.status === 'CANCELED') {
    steps.push({ label: order.canceledBy ? `Hủy bởi ${actorName(order.canceledBy)}` : 'Đơn bị hủy', at: order.canceledAt || order.updatedAt });
  }
  return (
    <ol className="space-y-3 border-l border-rule pl-4">
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-rule ring-4 ring-paper" />
          <p className="text-sm font-medium">{s.label}</p>
          <p className="text-xs text-muted">{formatDateTime(s.at)}</p>
        </li>
      ))}
    </ol>
  );
}

function OrderDetail({ id, onClose }) {
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api(`/orders/${id}`) });
  const change = useChangeStatus();
  const o = order.data;
  const canApprove = useCan('orders.approve');
  const canCancel = useCan('orders.cancel');
  const canCancelPaid = useCan('orders.cancelPaid');
  const paidLocked = o?.payment?.status === 'paid' && !canCancelPaid;

  async function act(status) {
    const approve = status === 'APPROVED';
    const ok = await confirm(
      approve
        ? { title: 'Xác nhận đơn hàng?', message: 'Xe đã được giữ cho khách từ lúc đặt. Xác nhận sẽ bỏ hạn giữ xe và tính vào số xe đã bán.', confirmText: 'Xác nhận đơn' }
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

  const footer = o && o.status !== 'CANCELED' && (canCancel || canApprove) && (
    <>
      {canCancel && paidLocked && (
        <p className="mr-auto self-center text-xs text-muted">Khách đã đặt cọc: chỉ quản trị viên hủy được đơn này (cần hoàn cọc).</p>
      )}
      {canCancel && !paidLocked && (
        <Button variant="danger-outline" onClick={() => act('CANCELED')} loading={change.isPending && change.variables?.status === 'CANCELED'}>
          <X className="size-4" /> Hủy đơn
        </Button>
      )}
      {o.status === 'PENDING' && canApprove && (
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
            <span className="text-sm text-muted">{formatDateTime(o.createdAt)}</span>
          </div>
          {o.status === 'PENDING' && o.holdUntil && o.payment?.status !== 'paid' && (
            <p className="flex gap-2 rounded-md bg-warn-soft p-3 text-sm text-warn">
              <Clock className="mt-0.5 size-4 shrink-0" />
              Khách chưa cọc: xe được giữ đến {formatDateTime(o.holdUntil)}, sau đó đơn tự hủy và xe về kho.
            </p>
          )}

          <section>
            <h3 className="mb-2 text-xs font-medium text-muted">Khách hàng</h3>
            <div className="space-y-2 rounded-md bg-paper p-4 text-sm">
              <p className="flex items-center gap-2 font-medium">
                <User className="size-4 text-muted" /> {o.customerInfo?.name}
                {!o.customer && <GuestBadge />}
              </p>
              {o.customerInfo?.phone && (
                <a href={`tel:${o.customerInfo.phone}`} className="flex items-center gap-2 hover:text-accent"><Phone className="size-4 text-muted" /> {o.customerInfo.phone}</a>
              )}
              {o.customerInfo?.email && (
                <a href={`mailto:${o.customerInfo.email}`} className="flex items-center gap-2 hover:text-accent"><Mail className="size-4 text-muted" /> {o.customerInfo.email}</a>
              )}
              {o.customer ? (
                <Link to={`/orders?customer=${o.customer}`} onClick={onClose} className="inline-block pt-1 text-sm text-ink underline decoration-accent underline-offset-4 hover:decoration-2">
                  Xem các đơn khác của khách này
                </Link>
              ) : (
                <p className="pt-1 text-xs text-muted">Đặt không cần tài khoản: hãy gọi số điện thoại trên để xác nhận.</p>
              )}
              {o.status === 'CANCELED' && o.cancelReason && (
                <p className="pt-1 text-xs text-muted">Lý do hủy: {o.cancelReason}</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-medium text-muted">Xe đặt mua</h3>
            <ul className="divide-y divide-rule">
              {o.items.map((item) => (
                <li key={item.car} className="flex items-center gap-3 py-3">
                  <CarThumb car={item} className="h-12 w-[72px]" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/cars/${item.car}`} onClick={onClose} className="block truncate font-medium hover:text-accent">{item.name}</Link>
                    <p className="text-sm text-muted">{formatVnd(item.price)} × {item.quantity}</p>
                  </div>
                  <p className="font-medium tabular-nums">{formatVnd(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-rule pt-3">
              <span className="font-medium">Tổng cộng</span>
              <span className="text-lg font-medium tabular-nums">{formatVnd(o.total)}</span>
            </div>
          </section>

          <PaymentInfo order={o} />

          {o.note && (
            <section>
              <h3 className="mb-2 text-xs font-medium text-muted">Ghi chú của khách</h3>
              <p className="flex gap-2 rounded-md bg-warn-soft p-4 text-sm text-warn">
                <StickyNote className="mt-0.5 size-4 shrink-0" /> {o.note}
              </p>
            </section>
          )}

          <section>
            <h3 className="mb-3 text-xs font-medium text-muted">Lịch sử</h3>
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

  const canApprove = useCan('orders.approve');
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
        <div className="flex gap-1 overflow-x-auto rounded-md bg-paper-3/60 p-1" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={filters.status === t.value}
              onClick={() => update({ status: t.value })}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.status === t.value ? 'bg-card text-ink shadow-sm  ' : 'text-ink-2 hover:text-ink  '
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="text-xs font-medium text-muted">{formatNumber(t.count)}</span>}
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
          <span className="text-muted">Đang xem đơn của</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ink py-1 pl-3 pr-1.5 font-medium text-paper">
            {customer.data?.name || '…'}
            <button onClick={() => update({ customer: '' })} className="rounded-md p-0.5 hover:bg-paper/20" aria-label="Bỏ lọc theo khách">
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
          <div className={orders.isPlaceholderData ? 'opacity-60 transition-colors' : ''}>
            <Table>
              <thead>
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
              <tbody className="divide-y divide-rule">
                {data.items.map((o) => (
                  <tr key={o._id} onClick={() => update({ id: o._id })} className="cursor-pointer hover:bg-paper">
                    <td className={`${td} font-mono text-xs font-medium`}>
                      <button onClick={(e) => { e.stopPropagation(); update({ id: o._id }); }} className="hover:text-accent">{shortId(o._id)}</button>
                    </td>
                    <td className={td}>
                      <p className="flex items-center gap-1.5 font-medium">{o.customerInfo?.name}{!o.customer && <GuestBadge />}</p>
                      <p className="text-xs text-muted">{o.customerInfo?.phone}</p>
                    </td>
                    <td className={`${td} max-w-56`}>
                      <p className="truncate">{o.items[0]?.name}</p>
                      {o.items.length > 1 && <p className="text-xs text-muted">và {o.items.length - 1} xe khác</p>}
                    </td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{formatVnd(o.total)}</td>
                    <td className={`${td} whitespace-nowrap text-muted `}>{formatDateTime(o.createdAt)}</td>
                    <td className={td}>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={o.status} />
                        {o.payment?.status && o.payment.status !== 'none' && <PaymentBadge payment={o.payment} />}
                      </div>
                    </td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      {o.status === 'PENDING' && canApprove && (
                        <Button
                          size="xs"
                          variant="success"
                          loading={change.isPending && change.variables?.id === o._id}
                          onClick={async () => {
                            const ok = await confirm({ title: `Xác nhận đơn ${shortId(o._id)}?`, message: 'Xe đã được giữ cho khách từ lúc đặt. Xác nhận sẽ bỏ hạn giữ xe và tính vào số xe đã bán.', confirmText: 'Xác nhận đơn' });
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
