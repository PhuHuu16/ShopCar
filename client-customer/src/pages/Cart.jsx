import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Lock, LogIn, Minus, Plus, ShoppingCart, Store, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { formatPriceShort, formatVnd } from '../lib/format';
import { Button, ButtonLink, EmptyState, Input, PageHeader } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useCart, cartTotal } from '../stores/cart';
import { useGuestOrders } from '../stores/guestOrders';

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
  const guest = useGuestOrders();
  const [info, setInfo] = useState(guest.info);
  const [errors, setErrors] = useState({});
  const soldOut = items.filter((i) => i.car.stock === 0);

  const [payment, setPayment] = useState('showroom');
  const paymentConfig = useQuery({ queryKey: ['payment-config'], queryFn: () => api('/payment/config'), staleTime: Infinity });
  const carCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const holdHours = paymentConfig.data?.holdHours || 24;
  const deposit = paymentConfig.data ? Math.min(total, carCount * paymentConfig.data.depositPerCar) : 0;

  const checkout = useMutation({
    mutationFn: () => {
      const body = {
        items: items.map((i) => ({ car: i.car._id, quantity: i.quantity })),
        note: note.trim() || undefined,
        payment
      };
      if (token) return api('/customer/orders', { method: 'POST', body });
      return api('/orders', { method: 'POST', body: { ...body, customerInfo: info } });
    },
    onSuccess: (order) => {
      clear();
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (order.trackToken) {
        guest.add(order._id, order.trackToken);
        guest.setInfo(info);
      }
      if (order.payUrl) {
        toast.success('Đã tạo đơn hàng, đang chuyển sang trang thanh toán...');
        window.location.assign(order.payUrl);
        return;
      }
      toast.success('Đặt hàng thành công! Showroom sẽ liên hệ xác nhận với bạn sớm.');
      navigate(order.trackToken ? `/orders/track/${order._id}?token=${order.trackToken}` : '/orders');
    },
    onError: (err) => {
      const fields = err.fieldErrors?.() || {};
      setErrors(Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.replace('customerInfo.', ''), v])));
      toast.error(err.message);
    }
  });
  const bind = (field) => ({
    value: info[field] || '',
    onChange: (e) => setInfo({ ...info, [field]: e.target.value }),
    error: errors[field]
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
                    {car.stock === 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-red-600">
                        <TriangleAlert className="size-4" /> Vừa hết hàng, hãy bỏ khỏi giỏ
                      </p>
                    )}
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
                text={`Không cần trả trước. Xe được giữ ${holdHours} giờ; showroom gọi xác nhận rồi bạn thanh toán khi nhận xe.`}
              />
              <PaymentOption
                checked={payment === 'vnpay'}
                onChange={() => setPayment('vnpay')}
                icon={CreditCard}
                title={<>Đặt cọc online {deposit > 0 && <span className="text-brand-600">{formatVnd(deposit)}</span>}</>}
                text={`Qua VNPay (thẻ ATM, Visa, QR) để giữ xe đến khi nhận, không giới hạn ${holdHours} giờ. Cọc ${paymentConfig.data ? formatPriceShort(paymentConfig.data.depositPerCar) : '...'} mỗi xe, trừ vào tiền xe.`}
                badge={paymentConfig.data?.provider === 'demo' ? 'Demo' : undefined}
              />
            </div>
          </fieldset>

          {token ? (
            <p className="mt-4 text-sm text-slate-500">Đặt hàng với tên <b className="text-slate-700 dark:text-slate-200">{customer?.name}</b> · {customer?.phone}</p>
          ) : (
            <fieldset className="mt-6 space-y-3">
              <legend className="label">Thông tin liên hệ để đặt xe</legend>
              <p className="-mt-1 text-xs text-slate-500">Không cần tài khoản. Showroom gọi số này để xác nhận, link theo dõi đơn gửi qua email.</p>
              <Input placeholder="Họ tên" aria-label="Họ tên" autoComplete="name" maxLength={80} {...bind('name')} />
              <Input placeholder="Số điện thoại" aria-label="Số điện thoại" type="tel" autoComplete="tel" maxLength={15} {...bind('phone')} />
              <Input placeholder="Email" aria-label="Email" type="email" autoComplete="email" {...bind('email')} />
            </fieldset>
          )}
          <Button
            size="lg"
            className="mt-4 w-full"
            loading={checkout.isPending}
            disabled={soldOut.length > 0}
            onClick={() => checkout.mutate()}
          >
            {payment === 'vnpay' ? <><Lock className="size-4" /> Đặt hàng và thanh toán cọc</> : 'Đặt hàng'}
          </Button>
          {!token && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs font-medium uppercase tracking-wider text-slate-400">
                <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" /> hoặc <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              </div>
              <ButtonLink to="/login?from=/cart" variant="outline" size="lg" className="w-full">
                <LogIn className="size-4" /> Tiếp tục với đăng nhập
              </ButtonLink>
              <p className="mt-2 text-center text-xs text-slate-500">
                Chưa có tài khoản? <Link to="/signup" className="font-semibold text-brand-600 hover:underline">Đăng ký</Link> để xem lại mọi đơn và chat với tư vấn viên
              </p>
            </>
          )}
          <p className="mt-3 text-center text-xs text-slate-500">
            {payment === 'vnpay'
              ? 'Bạn sẽ được chuyển sang cổng thanh toán an toàn. Cọc được hoàn nếu showroom không giao được xe.'
              : `Bạn chưa phải thanh toán ngay. Xe được giữ ${holdHours} giờ, đặt cọc trong thời gian này để giữ xe đến khi nhận.`}
          </p>
        </aside>
      </div>
    </div>
  );
}
