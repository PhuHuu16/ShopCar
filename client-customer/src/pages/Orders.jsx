import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS, PAYMENT_STATUS } from '../lib/labels';
import { Button, ButtonLink, EmptyState, ErrorBox, PageHeader, Spinner } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

function StatusBadge({ status }) {
  const s = ORDER_STATUS[status];
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${s.className}`}>{s.label}</span>;
}

function OrderCard({ order }) {
  const queryClient = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => api(`/customer/orders/${order._id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('Đã hủy đơn hàng');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const pay = useMutation({
    mutationFn: () => api(`/customer/orders/${order._id}/pay`, { method: 'POST' }),
    onSuccess: ({ payUrl }) => window.location.assign(payUrl),
    onError: (err) => toast.error(err.message)
  });
  const payment = order.payment || { method: 'showroom', status: 'none' };
  const canPay = order.status === 'PENDING' && payment.method === 'vnpay' && payment.status !== 'paid';

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
      <div className="mx-5 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS[payment.status].className}`}>
          {PAYMENT_STATUS[payment.status].label}
        </span>
        {payment.status === 'paid' && (
          <span className="text-slate-500 dark:text-slate-400">
            {formatVnd(payment.deposit)} lúc {formatDateTime(payment.paidAt)} · còn lại {formatVnd(order.total - payment.deposit)} khi nhận xe
          </span>
        )}
        {canPay && <span className="text-slate-500 dark:text-slate-400">Cọc {formatVnd(payment.deposit)} để giữ xe</span>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-800">
        {order.status === 'PENDING' ? (
          <div className="flex flex-wrap gap-2">
            {canPay && (
              <Button size="sm" loading={pay.isPending} onClick={() => pay.mutate()}>
                Thanh toán cọc
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

export default function Orders() {
  useTitle('Đơn hàng của tôi');
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['orders'], queryFn: () => api('/customer/orders') });

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHeader title="Đơn hàng của tôi">Theo dõi trạng thái các đơn đặt xe. Cần hỗ trợ? Hãy nhắn tin cho showroom.</PageHeader>
      {isLoading ? <Spinner /> : error ? <ErrorBox error={error} onRetry={refetch} /> : data.length === 0 ? (
        <EmptyState icon={Package} title="Chưa có đơn hàng" action={<ButtonLink to="/cars">Chọn xe ngay</ButtonLink>}>
          Khi bạn đặt xe, đơn hàng sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {data.map((order) => <OrderCard key={order._id} order={order} />)}
          <p className="text-center text-sm text-slate-500">
            Muốn đặt thêm? <Link to="/cars" className="font-semibold text-brand-600 hover:underline">Xem các mẫu xe</Link>
          </p>
        </div>
      )}
    </div>
  );
}
