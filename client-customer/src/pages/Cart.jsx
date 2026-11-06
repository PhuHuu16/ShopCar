import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Lock, Minus, Plus, ShoppingCart, Store, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { formatPriceShort, formatVnd } from '../lib/format';
import { Button, ButtonLink, EmptyState, PageHeader } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useCart, cartTotal } from '../stores/cart';

function PaymentOption({ checked, onChange, icon: Icon, title, text, badge }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 transition ${
        checked ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20 dark:bg-brand-500/5' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
      }`}
    >
      <input type="radio" name="payment" className="mt-1 accent-brand-600" checked={checked} onChange={onChange} />
      <Icon className={`mt-0.5 size-5 shrink-0 ${checked ? 'text-brand-600' : 'text-slate-400'}`} />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {title}
          {badge && <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{text}</span>
      </span>
    </label>
  );
}

export default function Cart() {
  useTitle('Giỏ hàng');
  const { items, setQuantity, remove, clear } = useCart();
  const total = useCart(cartTotal);
  const { token, customer } = useAuth();
  const [note, setNote] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [payment, setPayment] = useState('showroom');
  const paymentConfig = useQuery({ queryKey: ['payment-config'], queryFn: () => api('/payment/config'), staleTime: Infinity });
  const carCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const deposit = paymentConfig.data ? Math.min(total, carCount * paymentConfig.data.depositPerCar) : 0;

  const checkout = useMutation({
    mutationFn: () => api('/customer/orders', {
      method: 'POST',
      body: {
        items: items.map((i) => ({ car: i.car._id, quantity: i.quantity })),
        note: note.trim() || undefined,
        payment
      }
    }),
    onSuccess: (order) => {
      clear();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (order.payUrl) {
        toast.success('Đã tạo đơn hàng, đang chuyển sang trang thanh toán...');
        window.location.assign(order.payUrl);
        return;
      }
      toast.success('Đặt hàng thành công! Showroom sẽ liên hệ xác nhận với bạn sớm.');
      navigate('/orders');
    },
    onError: (err) => toast.error(err.message)
  });

  if (items.length === 0) {
    return (
      <div className="container-page py-10">
        <PageHeader title="Giỏ hàng" />
        <EmptyState icon={ShoppingCart} title="Giỏ hàng trống" action={<ButtonLink to="/cars">Khám phá các mẫu xe</ButtonLink>}>
          Bạn chưa chọn chiếc xe nào. Hãy xem các mẫu xe đang có tại showroom.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <PageHeader title="Giỏ hàng">{items.length} mẫu xe đã chọn</PageHeader>
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {items.map(({ car, quantity }) => (
            <div key={car._id} className="card flex gap-4 p-4">
              <Link to={`/cars/${car.slug}`} className="w-28 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-40 dark:bg-slate-800">
                {car.image && <img src={car.image} alt={car.name} className="aspect-[16/10] size-full object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{car.brand}</p>
                    <Link to={`/cars/${car.slug}`} className="block truncate font-semibold hover:text-brand-600">{car.name}</Link>
                    <p className="mt-0.5 text-sm text-slate-500">{formatVnd(car.price)}</p>
                  </div>
                  <button onClick={() => remove(car._id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10" aria-label="Xóa khỏi giỏ">
                    <Trash2 className="size-5" />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex h-10 items-center rounded-xl border border-slate-300 dark:border-slate-700">
                    <button className="flex size-10 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(car._id, quantity - 1)} disabled={quantity <= 1} aria-label="Giảm">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
                    <button className="flex size-10 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(car._id, quantity + 1)} disabled={quantity >= Math.min(car.stock ?? 10, 10)} aria-label="Tăng">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="font-bold">{formatVnd(car.price * quantity)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Tóm tắt đơn hàng</h2>
          <div className="mt-5 space-y-2 text-sm">
            {items.map(({ car, quantity }) => (
              <div key={car._id} className="flex justify-between gap-3 text-slate-600 dark:text-slate-400">
                <span className="truncate">{car.name} × {quantity}</span>
                <span className="shrink-0">{formatVnd(car.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-slate-200 pt-5 dark:border-slate-800">
            <span className="font-medium">Tổng cộng</span>
            <span className="text-2xl font-extrabold text-brand-600">{formatVnd(total)}</span>
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">Chưa gồm thuế trước bạ, biển số, bảo hiểm</p>

          <label className="label mt-6" htmlFor="note">Ghi chú cho showroom</label>
          <textarea id="note" className="input min-h-20" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: muốn lái thử trước, cần hỗ trợ trả góp..." />

          <fieldset className="mt-6">
            <legend className="label">Hình thức thanh toán</legend>
            <div className="space-y-2">
              <PaymentOption
                checked={payment === 'showroom'}
                onChange={() => setPayment('showroom')}
                icon={Store}
                title="Thanh toán tại showroom"
                text="Không cần trả trước. Showroom gọi xác nhận rồi bạn thanh toán khi nhận xe."
              />
              <PaymentOption
                checked={payment === 'vnpay'}
                onChange={() => setPayment('vnpay')}
                icon={CreditCard}
                title={<>Đặt cọc online {deposit > 0 && <span className="text-brand-600">{formatVnd(deposit)}</span>}</>}
                text={`Qua VNPay (thẻ ATM, Visa, QR) để giữ xe ngay. Cọc ${paymentConfig.data ? formatPriceShort(paymentConfig.data.depositPerCar) : '...'} mỗi xe, trừ vào tiền xe.`}
                badge={paymentConfig.data?.provider === 'demo' ? 'Demo' : undefined}
              />
            </div>
          </fieldset>

          {token ? (
            <>
              <p className="mt-4 text-sm text-slate-500">Đặt hàng với tên <b className="text-slate-700 dark:text-slate-200">{customer?.name}</b> · {customer?.phone}</p>
              <Button size="lg" className="mt-4 w-full" loading={checkout.isPending} onClick={() => checkout.mutate()}>
                {payment === 'vnpay' ? <><Lock className="size-4" /> Đặt hàng và thanh toán cọc</> : 'Đặt hàng'}
              </Button>
            </>
          ) : (
            <ButtonLink size="lg" className="mt-6 w-full" to="/login?from=/cart">Đăng nhập để đặt hàng</ButtonLink>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">
            {payment === 'vnpay'
              ? 'Bạn sẽ được chuyển sang cổng thanh toán an toàn. Cọc được hoàn nếu showroom không giao được xe.'
              : 'Bạn chưa phải thanh toán ngay. Showroom sẽ gọi xác nhận đơn.'}
          </p>
        </aside>
      </div>
    </div>
  );
}
