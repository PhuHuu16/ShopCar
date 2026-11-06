import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calculator, CalendarDays, Car, ChevronLeft, ChevronRight, Fuel, Gauge, GitCompareArrows, MessageCircle, Minus,
  Palette, Plus, Settings2, ShieldCheck, ShoppingCart, Sparkles, Users, Warehouse
} from 'lucide-react';
import { LoanCalculator, loanPlan } from '../components/LoanCalculator';
import { useToggleCompare } from '../components/Compare';
import { useCompare } from '../stores/compare';
import { api } from '../lib/api';
import { formatKm, formatPriceShort, formatVnd } from '../lib/format';
import { BODY_TYPE, CONDITION, FUEL, TRANSMISSION } from '../lib/labels';
import { CarGrid } from '../components/CarCard';
import { Button, ButtonLink, ErrorBox, Spinner } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useCart } from '../stores/cart';
import { useUi } from '../stores/ui';

function Gallery({ images, name }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800"><Car className="size-16 text-slate-400" /></div>;
  }
  const go = (step) => setIndex((index + step + images.length) % images.length);
  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800">
        <img src={images[index].url} alt={`${name} - ảnh ${index + 1}`} className="size-full object-cover" />
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition group-hover:opacity-100 max-sm:opacity-100" aria-label="Ảnh trước">
              <ChevronLeft className="size-5" />
            </button>
            <button onClick={() => go(1)} className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-900 opacity-0 shadow transition group-hover:opacity-100 max-sm:opacity-100" aria-label="Ảnh sau">
              <ChevronRight className="size-5" />
            </button>
            <span className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-white">
              {index + 1} / {images.length}
            </span>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <button
              key={img.url}
              onClick={() => setIndex(i)}
              className={`aspect-[16/10] overflow-hidden rounded-lg ring-2 transition ${i === index ? 'ring-brand-600' : 'ring-transparent opacity-70 hover:opacity-100'}`}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img src={img.thumbUrl} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spec({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900">
      <Icon className="size-5 shrink-0 text-brand-600" />
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function CarDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToCart = useCart((s) => s.add);
  const inCart = useCart((s) => s.items.find((i) => i.car.slug === slug)?.quantity || 0);
  const openChat = useUi((s) => s.openChat);
  const [quantity, setQuantity] = useState(1);
  const toggleCompare = useToggleCompare();
  const comparing = useCompare((s) => s.items.some((c) => c.slug === slug));

  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['car', slug], queryFn: () => api(`/cars/${slug}`) });
  useTitle(data?.car.name);

  if (isLoading) return <Spinner className="py-32" />;
  if (error) {
    return (
      <div className="container-page py-16">
        {error.status === 404 ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">Không tìm thấy xe</h1>
            <p className="mt-2 text-slate-500">Xe này có thể đã được bán hoặc không còn trên hệ thống.</p>
            <ButtonLink to="/cars" className="mt-6">Xem các xe khác</ButtonLink>
          </div>
        ) : <ErrorBox error={error} onRetry={refetch} />}
      </div>
    );
  }

  const { car, related } = data;
  const available = Math.max(0, Math.min(car.stock, 10) - inCart);

  function add(goToCart) {
    const added = addToCart(car, quantity);
    if (added > 0) {
      if (goToCart) navigate('/cart');
      else toast.success(`Đã thêm ${added} xe vào giỏ hàng`, { action: { label: 'Xem giỏ', onClick: () => navigate('/cart') } });
    } else {
      toast.warning('Bạn đã thêm hết số xe còn lại vào giỏ');
    }
    setQuantity(1);
  }

  return (
    <div className="container-page py-8">
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link to="/" className="hover:text-brand-600">Trang chủ</Link> /
        <Link to="/cars" className="hover:text-brand-600">Mua xe</Link> /
        <Link to={`/cars?brand=${car.brand.slug}`} className="hover:text-brand-600">{car.brand.name}</Link> /
        <span className="text-slate-900 dark:text-slate-200">{car.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Gallery images={car.images} name={car.name} />

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-500">{car.brand.name}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">{CONDITION[car.condition]}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{car.name}</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">Đời {car.year} · {BODY_TYPE[car.bodyType]} · {car.seats} chỗ</p>

          <div className="mt-6 rounded-2xl bg-slate-900 p-5 text-white dark:bg-slate-800">
            <p className="text-sm text-slate-400">Giá niêm yết</p>
            <p className="mt-1 text-3xl font-extrabold">{formatPriceShort(car.price)}</p>
            <p className="text-sm text-slate-400">{formatVnd(car.price)}</p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm">
            <Warehouse className="size-4 text-slate-400" />
            {car.stock > 0
              ? <span>Còn <b>{car.stock}</b> xe tại showroom</span>
              : <span className="font-semibold text-red-600">Tạm hết hàng - hãy chat để đặt trước</span>}
          </div>

          {car.stock > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 items-center rounded-xl border border-slate-300 dark:border-slate-700">
                <button className="flex size-12 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Giảm">
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center font-semibold" aria-live="polite">{quantity}</span>
                <button className="flex size-12 items-center justify-center disabled:opacity-30" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= available} aria-label="Tăng">
                  <Plus className="size-4" />
                </button>
              </div>
              {inCart > 0 && <span className="text-sm text-slate-500">Đã có {inCart} trong giỏ</span>}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Button size="lg" onClick={() => add(true)} disabled={available === 0}>
              Mua ngay
            </Button>
            <Button size="lg" variant="outline" onClick={() => add(false)} disabled={available === 0}>
              <ShoppingCart className="size-5" /> Thêm vào giỏ
            </Button>
            <Button size="lg" variant="secondary" className="sm:col-span-2" onClick={() => openChat(car)}>
              <MessageCircle className="size-5" /> Chat với người bán về xe này
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            <button onClick={() => toggleCompare(car)} className={`inline-flex items-center gap-1.5 ${comparing ? 'text-brand-600' : 'text-slate-600 hover:text-brand-600 dark:text-slate-300'}`}>
              <GitCompareArrows className="size-4" /> {comparing ? 'Đã thêm vào so sánh' : 'Thêm vào so sánh'}
            </button>
            <a href="#tra-gop" className="inline-flex items-center gap-1.5 text-slate-600 hover:text-brand-600 dark:text-slate-300">
              <Calculator className="size-4" /> Trả góp từ {formatPriceShort(loanPlan(car.price, 30, 96, 8.5).first)}/tháng
            </a>
          </div>

          <ul className="mt-6 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-2"><ShieldCheck className="size-5 shrink-0 text-emerald-600" /> Cam kết xe đúng mô tả, hoàn tiền nếu sai thông tin</li>
            <li className="flex gap-2"><Sparkles className="size-5 shrink-0 text-emerald-600" /> Hỗ trợ đăng ký, đăng kiểm và giao xe tận nhà</li>
          </ul>
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section>
          <h2 className="text-xl font-bold">Mô tả</h2>
          <p className="mt-4 whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-300">{car.description || 'Chưa có mô tả.'}</p>
        </section>
        <section>
          <h2 className="text-xl font-bold">Thông số chính</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Spec icon={CalendarDays} label="Năm sản xuất" value={car.year} />
            <Spec icon={Gauge} label="Số km đã đi" value={car.condition === 'used' ? formatKm(car.mileage) : 'Xe mới'} />
            <Spec icon={Fuel} label="Nhiên liệu" value={FUEL[car.fuel]} />
            <Spec icon={Settings2} label="Hộp số" value={TRANSMISSION[car.transmission]} />
            <Spec icon={Car} label="Kiểu dáng" value={BODY_TYPE[car.bodyType]} />
            <Spec icon={Users} label="Số chỗ" value={`${car.seats} chỗ`} />
            <Spec icon={Palette} label="Màu sắc" value={car.color || '-'} />
            <Spec icon={ShieldCheck} label="Tình trạng" value={CONDITION[car.condition]} />
          </div>
        </section>
      </div>

      <div id="tra-gop" className="mt-12 scroll-mt-24">
        <LoanCalculator key={car._id} price={car.price} />
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-xl font-bold">Có thể bạn cũng thích</h2>
          <CarGrid cars={related} />
        </section>
      )}
    </div>
  );
}
