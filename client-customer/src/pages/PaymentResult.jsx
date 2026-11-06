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

// -- Kết quả thanh toán VNPay --
export default function PaymentResult() {
  useTitle('Kết quả thanh toán');
  const { search } = useLocation();
  const queryClient = useQueryClient();
  const token = useAuth((s) => s.token);
  const openChat = useUi((s) => s.openChat);

  const result = useQuery({
    queryKey: ['payment-result', search],
    queryFn: () => api(`/payment/vnpay/return${search}`),
    enabled: search.includes('vnp_'),
    retry: false,
    staleTime: Infinity
  });

  useEffect(() => {
    if (result.data) queryClient.invalidateQueries({ queryKey: ['orders'] });
  }, [result.data, queryClient]);

  const retry = useMutation({
    mutationFn: () => api(`/customer/orders/${result.data.order._id}/pay`, { method: 'POST' }),
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
            <LoaderCircle className="mx-auto size-14 animate-spin text-brand-600" />
            <h1 className="mt-5 text-xl font-bold">Đang xác nhận thanh toán...</h1>
          </>
        ) : invalid ? (
          <>
            <CircleX className="mx-auto size-16 text-red-500" />
            <h1 className="mt-5 text-xl font-bold">Không xác nhận được thanh toán</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {result.error?.message || data?.message || 'Liên kết không hợp lệ.'} Nếu tài khoản đã bị trừ tiền, hãy nhắn tin cho showroom để được kiểm tra.
            </p>
            <div className="mt-7 grid gap-3">
              <ButtonLink to="/orders">Xem đơn hàng</ButtonLink>
              <Button variant="outline" onClick={() => openChat()}>
                <MessageCircle className="size-4" /> Nhắn tin cho showroom
              </Button>
            </div>
          </>
        ) : paid ? (
          <>
            <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
              <CircleCheck className="size-11 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="mt-5 text-2xl font-bold">Đặt cọc thành công!</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Xe đã được giữ cho bạn. Showroom sẽ gọi điện xác nhận và hẹn lịch nhận xe.
            </p>
            <dl className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-left text-sm dark:bg-slate-800/60">
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Đơn hàng</dt><dd className="font-semibold">{data.order.code}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Đã đặt cọc</dt><dd className="font-semibold text-emerald-600 dark:text-emerald-400">{formatVnd(data.order.deposit)}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-slate-500">Còn lại khi nhận xe</dt><dd className="font-semibold">{formatVnd(data.order.total - data.order.deposit)}</dd></div>
              {data.order.paidAt && (
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Thời gian</dt><dd>{formatDateTime(data.order.paidAt)}</dd></div>
              )}
            </dl>
            <ButtonLink to="/orders" className="mt-7 w-full">Xem đơn hàng của tôi</ButtonLink>
          </>
        ) : (
          <>
            <CircleX className="mx-auto size-16 text-red-500" />
            <h1 className="mt-5 text-xl font-bold">Đặt cọc chưa thành công</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {data.message}. Đơn hàng {data.order.code} vẫn được giữ, bạn có thể thanh toán lại hoặc chọn trả tại showroom.
            </p>
            <div className="mt-7 grid gap-3">
              {token && (
                <Button loading={retry.isPending} onClick={() => retry.mutate()}>
                  Thanh toán lại {formatVnd(data.order.deposit)}
                </Button>
              )}
              <ButtonLink to="/orders" variant="outline">Xem đơn hàng</ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
