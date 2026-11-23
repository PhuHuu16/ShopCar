import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calculator, Car, ChevronLeft, ChevronRight, GitCompareArrows, MessageCircle, Minus, Plus, ShoppingCart } from 'lucide-react';
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

const arrow = 'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-md border border-ink bg-card text-ink opacity-0 transition-[opacity,background-color,color] duration-[var(--dur-short)] hover:bg-ink hover:text-paper focus-visible:opacity-100 group-hover:opacity-100 max-sm:opacity-100';

function Gallery({ images, name }) {
  const [index, setIndex] = useState(0);
  if (!images.length) {
    return <div className="mat"><div className="flex aspect-[16/10] items-center justify-center bg-paper-2"><Car className="size-16 text-muted" aria-hidden="true" /></div></div>;
  }
  const go = (step) => setIndex((index + step + images.length) % images.length);
  return (
    <div>
      <div className="mat">
        <div className="frame group relative aspect-[16/10] overflow-hidden bg-paper-2">
          <img src={images[index].url} alt={`${name} - ảnh ${index + 1}`} width="1200" height="750" fetchPriority="high" className="size-full object-cover" />
          {images.length > 1 && (
            <>
              <button type="button" onClick={() => go(-1)} className={`${arrow} left-4`} aria-label="Ảnh trước">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => go(1)} className={`${arrow} right-4`} aria-label="Ảnh sau">
                <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
      </div>
      {images.length > 1 && (
        <div className="mt-5 flex items-center justify-between gap-6">
          <div className="grid flex-1 grid-cols-5 gap-3 sm:grid-cols-6">
            {images.map((img, i) => (
              <button
                type="button"
                key={img.url}
                onClick={() => setIndex(i)}
                className={`aspect-[16/10] overflow-hidden rounded-sm ring-1 transition-opacity duration-[var(--dur-short)] ${i === index ? 'ring-ink' : 'opacity-70 ring-rule hover:opacity-100'}`}
                aria-label={`Xem ảnh ${i + 1}`}
                aria-current={i === index || undefined}
              >
                <img src={img.thumbUrl} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
          <span className="shrink-0 text-sm text-pencil num">{index + 1} / {images.length}</span>
        </div>
      )}
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
          <div className="max-w-xl">
            <h1 className="text-[length:var(--text-display-s)]">Không tìm thấy xe</h1>
            <p className="mt-4 text-muted">Xe này có thể đã được bán hoặc không còn trên hệ thống.</p>
            <ButtonLink to="/cars" className="mt-8">Xem các xe khác</ButtonLink>
          </div>
        ) : <ErrorBox error={error} onRetry={refetch} />}
      </div>
    );
  }

  const { car, related } = data;
  const available = Math.max(0, Math.min(car.stock, 10) - inCart);
  const specs = [
    ['Năm sản xuất', car.year],
    ['Số km đã đi', car.condition === 'used' ? formatKm(car.mileage) : 'Xe mới'],
    ['Nhiên liệu', FUEL[car.fuel]],
    ['Hộp số', TRANSMISSION[car.transmission]],
    ['Kiểu dáng', BODY_TYPE[car.bodyType]],
    ['Số chỗ', `${car.seats} chỗ`],
    ['Màu sắc', car.color || '-'],
    ['Tình trạng', CONDITION[car.condition]]
  ];

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
    <div className="container-page pb-8 pt-10">
      <nav className="mb-10 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="Đường dẫn">
        <Link to="/" className="hover:text-ink">Trang chủ</Link> /
        <Link to="/cars" className="hover:text-ink">Mua xe</Link> /
        <Link to={`/cars?brand=${car.brand.slug}`} className="hover:text-ink">{car.brand.name}</Link> /
        <span className="text-ink-2" aria-current="page">{car.name}</span>
      </nav>

      <div className="grid items-start gap-x-[var(--space-3xl)] gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <Gallery images={car.images} name={car.name} />

        <div>
          <p className="text-sm text-muted">{car.brand.name}, {CONDITION[car.condition].toLowerCase()}</p>
          <h1 className="mt-2 text-[length:var(--text-display-s)]">{car.name}</h1>
          <p className="mt-3 text-ink-2">Đời {car.year}, {BODY_TYPE[car.bodyType]}, {car.seats} chỗ</p>

          <div className="mt-8 border-t border-ink pt-6">
            <p className="text-sm text-muted">Giá niêm yết</p>
            <p className="price mt-1 text-[length:var(--text-display)] leading-none">{formatPriceShort(car.price)}</p>
            <p className="mt-2 text-sm text-muted num">{formatVnd(car.price)}</p>
          </div>

          {car.hidden ? (
            <div className="mt-6 rounded-md bg-warn-soft p-5 text-sm text-ink">
              <p className="font-medium">Mẫu xe này đã ngừng kinh doanh</p>
              <p className="mt-1 text-ink-2">Thông tin được giữ lại để bạn tra cứu. Cần hỗ trợ về xe đã mua (bảo hành, giấy tờ, khiếu nại), hãy chat với showroom.</p>
            </div>
          ) : (
            <p className="mt-6 text-sm">
              {car.stock > 0
                ? <span className="text-ink-2">Còn <span className="text-ink num">{car.stock}</span> xe tại showroom</span>
                : <span className="text-error">Tạm hết hàng - hãy chat để đặt trước</span>}
            </p>
          )}

          {car.stock > 0 && !car.hidden && (
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-12 items-center rounded-md border border-muted">
                <button type="button" className="flex size-12 items-center justify-center text-ink disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setQuantity(quantity - 1)} disabled={quantity <= 1} aria-label="Giảm">
                  <Minus className="size-4" />
                </button>
                <span className="w-8 text-center text-ink num" aria-live="polite">{quantity}</span>
                <button type="button" className="flex size-12 items-center justify-center text-ink disabled:cursor-not-allowed disabled:opacity-40" onClick={() => setQuantity(quantity + 1)} disabled={quantity >= available} aria-label="Tăng">
                  <Plus className="size-4" />
                </button>
              </div>
              {inCart > 0 && <span className="text-sm text-muted">Đã có {inCart} trong giỏ</span>}
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {!car.hidden && (
              <>
                <Button size="lg" onClick={() => add(true)} disabled={available === 0}>
                  Mua ngay
                </Button>
                <Button size="lg" variant="outline" onClick={() => add(false)} disabled={available === 0}>
                  <ShoppingCart className="size-5" /> Thêm vào giỏ
                </Button>
              </>
            )}
            <Button size="lg" variant="ghost" className="border-rule sm:col-span-2" onClick={() => openChat(car)}>
              <MessageCircle className="size-5" /> Chat với người bán về xe này
            </Button>
          </div>
          <div className={`mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm ${car.hidden ? 'hidden' : ''}`}>
            <button type="button" onClick={() => toggleCompare(car)} aria-pressed={comparing} className="link inline-flex items-center gap-2">
              <GitCompareArrows className="size-4" /> {comparing ? 'Đã thêm vào so sánh' : 'Thêm vào so sánh'}
            </button>
            <a href="#tra-gop" className="link inline-flex items-center gap-2">
              <Calculator className="size-4" /> Trả góp từ {formatPriceShort(loanPlan(car.price, 30, 96, 8.5).first)}/tháng
            </a>
          </div>

          <ul className="mt-8 space-y-2 border-t border-rule pt-5 text-sm text-ink-2">
            <li>Cam kết xe đúng mô tả, hoàn tiền nếu sai thông tin</li>
            <li>Hỗ trợ đăng ký, đăng kiểm và giao xe tận nhà</li>
          </ul>
        </div>
      </div>

      <div className="mt-[var(--section-gap-s)] grid gap-x-[var(--space-3xl)] gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <section>
          <h2 className="text-[length:var(--text-3xl)]">Mô tả</h2>
          <p className="mt-6 whitespace-pre-line text-lg leading-relaxed text-ink-2 first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-[3.3em] first-letter:leading-[0.8] first-letter:text-accent">
            {car.description || 'Chưa có mô tả.'}
          </p>
        </section>
        <section>
          <h2 className="text-[length:var(--text-3xl)]">Thông số chính</h2>
          <dl className="ruled mt-6">
            {specs.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-6 py-3.5">
                <dt className="text-muted">{label}</dt>
                <dd className="m-0 text-right text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div id="tra-gop" className="mt-[var(--section-gap-s)] scroll-mt-24">
        <LoanCalculator key={car._id} price={car.price} />
      </div>

      {related.length > 0 && (
        <section className="mt-[var(--section-gap)]">
          <h2 className="mb-12">Có thể bạn cũng thích</h2>
          <CarGrid cars={related} />
        </section>
      )}
    </div>
  );
}
