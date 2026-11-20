import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Clock, Package, Radio } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS, PAYMENT_STATUS } from '../lib/labels';
import { useLive } from '../lib/live';
import { Button, ButtonLink, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useGuestOrders } from '../stores/guestOrders';

function StatusBadge({ status }) {
  const s = ORDER_STATUS[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function LiveHint() {
  const connected = useLive((s) => s.connected);
  if (!connected) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
      <Radio className="size-3.5" /> Tự cập nhật khi showroom xử lý đơn
    </span>
  );
}

export function OrderCard({ order, trackToken }) {
  const queryClient = useQueryClient();
  const base = trackToken ? `/orders/${order._id}` : `/customer/orders/${order._id}`;
  const query = trackToken ? { token: trackToken } : undefined;

  const cancel = useMutation({
    mutationFn: () => api(`${base}/cancel`, { method: 'POST', query }),
    onSuccess: (updated) => {
      toast.success('Đã hủy đơn hàng');
      queryClient.setQueryData(['guest-order', order._id], (old) => (old ? updated : old));
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const pay = useMutation({
    mutationFn: () => api(`${base}/pay`, { method: 'POST', query }),
    onSuccess: ({ payUrl }) => window.location.assign(payUrl),
    onError: (err) => toast.error(err.message)
  });
  const payment = order.payment || { method: 'showroom', status: 'none' };
  const canPay = order.status === 'PENDING' && payment.status !== 'paid';
  const holding = canPay && order.holdUntil;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
        <div className="text-sm">
          <span className="font-semibold">Đơn {shortId(order._id)}</span>
          <span className="ml-2 text-slate-500">{formatDateTime(order.createdAt)}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
        {order.items.map((item) => (
          <div key={item.car} className="flex items-center gap-4 py-4">
            <div className="w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              {item.image && <img src={item.image} alt="" className="aspect-[16/10] size-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{item.name}</p>
              <p className="text-sm text-slate-500">{formatVnd(item.price)} × {item.quantity}</p>
            </div>
            <p className="font-semibold">{formatVnd(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>
      {order.note && <p className="mx-5 mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">Ghi chú: {order.note}</p>}
      {order.status === 'CANCELED' && order.cancelReason && (
        <p className="mx-5 mb-4 text-sm text-slate-500">Lý do hủy: {order.cancelReason}</p>
      )}
      <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS[payment.status].className}`}>
          {PAYMENT_STATUS[payment.status].label}
        </span>
        {payment.status === 'paid' && (
          <span className="text-slate-500 dark:text-slate-400">
            {formatVnd(payment.deposit)} lúc {formatDateTime(payment.paidAt)} · còn lại {formatVnd(order.total - payment.deposit)} khi nhận xe
          </span>
        )}
      </div>
      {holding && (
        <p className="mx-5 mb-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <Clock className="mt-0.5 size-4 shrink-0" />
          <span>
            Xe được giữ đến <b>{formatDateTime(order.holdUntil)}</b>. Đặt cọc trước thời điểm này để tiếp tục giữ xe, nếu không đơn sẽ tự hủy.
          </span>
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        {order.status === 'PENDING' ? (
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Button size="sm" loading={pay.isPending} onClick={() => pay.mutate()}>
                {payment.deposit > 0 ? `Đặt cọc ${formatVnd(payment.deposit)}` : 'Đặt cọc giữ xe'}
              </Button>
            )}
            {payment.status !== 'paid' && (
              <Button
                variant="danger"
                size="sm"
                loading={cancel.isPending}
                onClick={() => window.confirm('Bạn chắc chắn muốn hủy đơn hàng này?') && cancel.mutate()}
              >
                Hủy đơn
              </Button>
            )}
          </div>
        ) : <span />}
        <p className="text-sm">Tổng tiền: <span className="text-lg font-bold text-brand-600">{formatVnd(order.total)}</span></p>
      </div>
    </div>
  );
}

const guestOrderQuery = (id, token) => ({
  queryKey: ['guest-order', id],
  queryFn: () => api(`/orders/${id}`, { query: { token } })
});

function GuestOrders() {
  const { orders, remove } = useGuestOrders();
  const results = useQueries({ queries: orders.map((o) => guestOrderQuery(o.id, o.token)) });

  useEffect(() => {
    results.forEach((r, i) => r.error?.status === 404 && remove(orders[i].id));
  }, [results, orders, remove]);

  if (orders.length === 0) return null;
  return (
    <div className="space-y-5">
      {results.map((r, i) => (r.data ? <OrderCard key={orders[i].id} order={r.data} trackToken={orders[i].token} /> : r.isLoading ? <Spinner key={orders[i].id} /> : null))}
    </div>
  );
}

export default function Orders() {
  useTitle('Đơn hàng của tôi');
  const token = useAuth((s) => s.token);
  const guestCount = useGuestOrders((s) => s.orders.length);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['orders'], queryFn: () => api('/customer/orders'), enabled: !!token });

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader title="Đơn hàng của tôi">
        Theo dõi trạng thái các đơn đặt xe. Cần hỗ trợ? Hãy nhắn cho showroom. <LiveHint />
      </PageHeader>

      {token && (isLoading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={refetch} /> : data.length > 0 && (
        <div className="space-y-5">
          {data.map((order) => <OrderCard key={order._id} order={order} />)}
        </div>
      ))}

      {guestCount > 0 && (
        <section className={token ? 'mt-10' : ''}>
          {token && <h2 className="mb-4 text-lg font-semibold">Đơn đặt không cần đăng nhập trên máy này</h2>}
          <GuestOrders />
        </section>
      )}

      {(token ? data?.length === 0 : true) && guestCount === 0 && (
        <EmptyState
          icon={Package}
          title="Chưa có đơn hàng"
          action={<ButtonLink to="/cars">Chọn xe ngay</ButtonLink>}
        >
          {token
            ? 'Khi bạn đặt xe, đơn hàng sẽ hiện ở đây.'
            : <>Đơn đặt không cần đăng nhập sẽ hiện ở đây trên máy này, hoặc mở link theo dõi trong email. Có tài khoản? <Link to="/login?from=/orders" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link></>}
        </EmptyState>
      )}

      {(data?.length > 0 || guestCount > 0) && (
        <p className="mt-5 text-center text-sm text-slate-500">
          Muốn đặt thêm? <Link to="/cars" className="font-semibold text-brand-600 hover:underline">Xem các mẫu xe</Link>
        </p>
      )}
    </div>
  );
}

// -- Theo dõi một đơn bằng link (từ email hoặc sau khi đặt) --
export function OrderTrack() {
  useTitle('Theo dõi đơn hàng');
  const { id } = useParams();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const add = useGuestOrders((s) => s.add);
  const { data, error, isLoading, refetch } = useQuery({ ...guestOrderQuery(id, token), enabled: !!token });

  useEffect(() => {
    if (data) add(id, token);
  }, [data, id, token, add]);

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader title={`Theo dõi đơn ${shortId(id)}`}>
        Lưu lại trang này (hoặc dùng link trong email) để xem đơn trên máy khác. <LiveHint />
      </PageHeader>
      {!token || error?.status === 404 ? (
        <EmptyState icon={Package} title="Không tìm thấy đơn hàng" action={<ButtonLink to="/orders">Đơn hàng của tôi</ButtonLink>}>
          Link theo dõi không đúng hoặc đơn không còn tồn tại.
        </EmptyState>
      ) : isLoading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={refetch} /> : (
        <>
          {data.status === 'PENDING' && (
            <p className="mb-5 rounded-xl bg-brand-50 p-4 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
              Đã nhận đơn và giữ xe cho bạn. Showroom sẽ gọi số <b>{data.customerInfo?.phone}</b> để xác nhận.
            </p>
          )}
          <OrderCard order={data} trackToken={token} />
        </>
      )}
    </div>
  );
}
