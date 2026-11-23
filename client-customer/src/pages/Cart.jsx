import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CreditCard, Lock, LogIn, Minus, Plus, ShoppingCart, Store, Trash2, TriangleAlert } from 'lucide-react';
import { api } from '../lib/api';
import { formatVnd } from '../lib/format';
import { Button, ButtonLink, EmptyState, Input, PageHeader } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useCart, cartTotal } from '../stores/cart';
import { useGuestOrders } from '../stores/guestOrders';

function PaymentOption({ checked, onChange, icon: Icon, title, text, badge }) {
  return (
    <label
      className={`grid cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)] items-start gap-x-3 rounded-md border p-4 transition-colors duration-[var(--dur-short)] ${
        checked ? 'border-ink bg-paper-2' : 'border-rule hover:border-muted'
      }`}
    >
      <input type="radio" name="payment" className="mt-0.5 size-4 accent-ink" checked={checked} onChange={onChange} />
      <Icon className={`size-5 shrink-0 ${checked ? 'text-ink' : 'text-muted'}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-2 text-sm text-ink">
          {title}
          {badge && <span className="text-xs text-muted">{badge}</span>}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-ink-2">{text}</span>
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
        toast.success('Đã tạo đơn hàng, đang chuyển sang trang thanh toán…');
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
            <div key={car._id} className="card flex gap-5 p-5">
              <Link to={`/cars/${car.slug}`} className="aspect-[16/10] w-28 shrink-0 self-start overflow-hidden rounded-sm bg-paper-2 sm:w-44">
                {car.image && <img src={car.image} alt={car.name} className="size-full object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-muted">{car.brand}</p>
                    <Link to={`/cars/${car.slug}`} className="block truncate font-display text-xl text-ink decoration-accent underline-offset-4 hover:underline">{car.name}</Link>
                    <p className="mt-1 text-sm text-ink-2 tabular-nums">{formatVnd(car.price)} mỗi xe</p>
                    {car.stock === 0 && (
                      <p className="mt-1 flex items-center gap-1 text-sm font-medium text-error">
                        <TriangleAlert className="size-4" /> Vừa hết hàng, hãy bỏ khỏi giỏ
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => remove(car._id)} className="-mr-2 -mt-2 flex size-10 items-center justify-center rounded-md text-muted transition-colors duration-[var(--dur-short)] hover:bg-error-soft hover:text-error" aria-label="Xóa khỏi giỏ">
                    <Trash2 className="size-[1.125rem]" />
                  </button>
                </div>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                  <div className="flex h-10 items-center rounded-md border border-muted">
                    <button className="flex size-10 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(car._id, quantity - 1)} disabled={quantity <= 1} aria-label="Giảm">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-8 text-center text-sm tabular-nums">{quantity}</span>
                    <button className="flex size-10 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(car._id, quantity + 1)} disabled={quantity >= Math.min(car.stock ?? 10, 10)} aria-label="Tăng">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <p className="price text-xl tabular-nums">{formatVnd(car.price * quantity)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-2xl">Tóm tắt đơn hàng</h2>
          <div className="mt-5 space-y-2 text-sm">
            {items.map(({ car, quantity }) => (
              <div key={car._id} className="flex justify-between gap-3 text-ink-2">
                <span className="truncate">{car.name} × {quantity}</span>
                <span className="shrink-0 tabular-nums">{formatVnd(car.price * quantity)}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-ink pt-5">
            <p className="text-sm text-muted">Tổng cộng</p>
            <p className="price mt-2 whitespace-nowrap text-[length:var(--text-3xl)] leading-none tabular-nums">{formatVnd(total)}</p>
            <p className="mt-2 text-sm text-muted">Chưa gồm thuế trước bạ, biển số, bảo hiểm</p>
          </div>

          <label className="label mt-6" htmlFor="note">Ghi chú cho showroom</label>
          <textarea id="note" className="input min-h-20" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: muốn lái thử trước, cần hỗ trợ trả góp" />

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
                title={<>Đặt cọc online {deposit > 0 && <span className="tabular-nums text-ink-2">{formatVnd(deposit)} mỗi xe</span>}</>}
                text={`Qua VNPay (thẻ ATM, Visa, QR) để giữ xe đến khi nhận, không giới hạn ${holdHours} giờ. Tiền cọc được trừ vào tiền xe.`}
                badge={paymentConfig.data?.provider === 'demo' ? '(thanh toán thử)' : undefined}
              />
            </div>
          </fieldset>

          {token ? (
            <p className="mt-5 text-sm text-muted">Đặt hàng với tên <span className="text-ink">{customer?.name}</span>, {customer?.phone}</p>
          ) : (
            <fieldset className="mt-6 space-y-3">
              <legend className="label">Thông tin liên hệ để đặt xe</legend>
              <p className="-mt-1 text-xs text-muted">Không cần tài khoản. Showroom gọi số này để xác nhận, link theo dõi đơn gửi qua email.</p>
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
              <div className="my-4 flex items-center gap-3 text-sm text-muted">
                <span className="h-px flex-1 bg-rule" /> hoặc <span className="h-px flex-1 bg-rule" />
              </div>
              <ButtonLink to="/login?from=/cart" variant="outline" size="lg" className="w-full">
                <LogIn className="size-4" /> Tiếp tục với đăng nhập
              </ButtonLink>
              <p className="mt-2 text-center text-xs text-muted">
                Chưa có tài khoản? <Link to="/signup" className="link">Đăng ký</Link> để xem lại mọi đơn và chat với tư vấn viên
              </p>
            </>
          )}
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {payment === 'vnpay'
              ? 'Bạn sẽ được chuyển sang cổng thanh toán an toàn. Cọc được hoàn nếu showroom không giao được xe.'
              : `Bạn chưa phải thanh toán ngay. Xe được giữ ${holdHours} giờ, đặt cọc trong thời gian này để giữ xe đến khi nhận.`}
          </p>
        </aside>
      </div>
    </div>
  );
}
