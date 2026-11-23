import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleCheck, CircleX, LoaderCircle, MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatVnd } from '../lib/format';
import { Button, ButtonLink } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { useGuestOrders } from '../stores/guestOrders';

// -- Kết quả thanh toán VNPay --
export default function PaymentResult() {
  useTitle('Kết quả thanh toán');
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const token = useAuth((s) => s.token);
  const openChat = useUi((s) => s.openChat);
  const addGuestOrder = useGuestOrders((s) => s.add);

  const result = useQuery({
    queryKey: ['payment-result', search],
    queryFn: () => api(`/payment/vnpay/return${search}`),
    enabled: search.includes('vnp_'),
    retry: false,
    staleTime: Infinity
  });

  const order = result.data?.order;
  const trackToken = order?.trackToken;
  const orderLink = trackToken ? `/orders/track/${order._id}?token=${trackToken}` : '/orders';

  useEffect(() => {
    if (!result.data) return;
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['guest-order'] });
    if (trackToken) addGuestOrder(result.data.order._id, trackToken);
  }, [result.data, trackToken, queryClient, addGuestOrder]);

  const retry = useMutation({
    mutationFn: () => trackToken
      ? api(`/orders/${order._id}/pay`, { method: 'POST', query: { token: trackToken } })
      : api(`/customer/orders/${order._id}/pay`, { method: 'POST' }),
    onSuccess: ({ payUrl }) => window.location.assign(payUrl),
    onError: (err) => toast.error(err.message)
  });

  const data = result.data;
  const paid = data?.status === 'paid';
  const invalid = !search.includes('vnp_') || result.error || data?.status === 'invalid';

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-12">
      <div className="card w-full max-w-md p-8 text-center">
        {result.isLoading ? (
          <>
            <LoaderCircle className="mx-auto size-8 animate-spin text-muted" aria-hidden="true" />
            <h1 className="mt-5 text-3xl">Đang xác nhận thanh toán…</h1>
          </>
        ) : invalid ? (
          <>
            <CircleX className="mx-auto size-8 text-error" aria-hidden="true" />
            <h1 className="mt-5 text-3xl">Không xác nhận được thanh toán</h1>
            <p className="mt-2 text-muted">
              {result.error?.message || data?.message || 'Liên kết không hợp lệ.'} Nếu tài khoản đã bị trừ tiền, hãy nhắn tin cho showroom để được kiểm tra.
            </p>
            <div className="mt-7 grid gap-3">
              <ButtonLink to={orderLink}>Xem đơn hàng</ButtonLink>
              <Button variant="outline" onClick={() => openChat()}>
                <MessageCircle className="size-4" /> Nhắn tin cho showroom
              </Button>
            </div>
          </>
        ) : paid ? (
          <>
            <CircleCheck className="mx-auto size-8 text-success" aria-hidden="true" />
            <h1 className="mt-5 text-3xl">Đã đặt cọc, xe được giữ cho bạn</h1>
            <p className="mt-2 text-muted">
              Showroom sẽ gọi điện xác nhận và hẹn lịch nhận xe.
            </p>
            <dl className="mt-6 border-t border-ink text-left text-sm [&>div]:border-b [&>div]:border-rule [&>div]:py-2.5">
              <div className="flex justify-between gap-3"><dt className="text-muted">Đơn hàng</dt><dd className="text-ink tabular-nums">{data.order.code}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Đã đặt cọc</dt><dd className="text-ink tabular-nums">{formatVnd(data.order.deposit)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Còn lại khi nhận xe</dt><dd className="price text-lg leading-none tabular-nums">{formatVnd(data.order.total - data.order.deposit)}</dd></div>
              {data.order.paidAt && (
                <div className="flex justify-between gap-3"><dt className="text-muted">Thời gian</dt><dd className="text-ink tabular-nums">{formatDateTime(data.order.paidAt)}</dd></div>
              )}
            </dl>
            <ButtonLink to={orderLink} className="mt-7 w-full">Xem đơn hàng của tôi</ButtonLink>
          </>
        ) : (
          <>
            <CircleX className="mx-auto size-8 text-error" aria-hidden="true" />
            <h1 className="mt-5 text-3xl">Đặt cọc chưa thành công</h1>
            <p className="mt-2 text-muted">
              {data.message}. Đơn hàng {data.order.code} vẫn được giữ, bạn có thể thanh toán lại hoặc chọn trả tại showroom.
            </p>
            <div className="mt-7 grid gap-3">
              {(token || trackToken) && (
                <Button loading={retry.isPending} onClick={() => retry.mutate()}>
                  Thanh toán lại {formatVnd(data.order.deposit)}
                </Button>
              )}
              <ButtonLink to={orderLink} variant="outline">Xem đơn hàng</ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
