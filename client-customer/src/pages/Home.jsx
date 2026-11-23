import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { MessageCircle, Search } from 'lucide-react';
import { api } from '../lib/api';
import { BODY_TYPE, FUEL, PRICE_RANGES } from '../lib/labels';
import { formatPriceShort } from '../lib/format';
import { CarRail } from '../components/CarCard';
import { BrandLogo, hasBrandLogo } from '../components/BrandLogo';
import { Button, ErrorBox } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useUi } from '../stores/ui';

function QuickSearch({ filters }) {
  const navigate = useNavigate();
  const [brand, setBrand] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [price, setPrice] = useState('');

  function submit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (brand) params.set('brand', brand);
    if (bodyType) params.set('bodyType', bodyType);
    const range = PRICE_RANGES[price];
    if (range?.min) params.set('minPrice', range.min);
    if (range?.max) params.set('maxPrice', range.max);
    navigate(`/cars?${params}`);
  }

  return (
    <form onSubmit={submit} className="stock grid gap-x-5 gap-y-4 p-6 sm:grid-cols-2">
      <label className="block">
        <span className="label">Hãng xe</span>
        <select className="input appearance-none" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">Tất cả hãng xe</option>
          {filters?.brands.map((b) => <option key={b._id} value={b.slug}>{b.name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Kiểu dáng</span>
        <select className="input appearance-none" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
          <option value="">Mọi kiểu dáng</option>
          {(filters?.bodyTypes || []).map((t) => <option key={t} value={t}>{BODY_TYPE[t]}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Khoảng giá</span>
        <select className="input appearance-none" value={price} onChange={(e) => setPrice(e.target.value)}>
          <option value="">Mọi mức giá</option>
          {PRICE_RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
        </select>
      </label>
      <Button type="submit" size="lg" className="self-end">
        <Search className="size-5" /> Tìm xe
      </Button>
    </form>
  );
}

// -- Xe bán chạy treo như một bản in, giá đặt lớn --
function HeroCar({ car, loading }) {
  if (!car) {
    return (
      <div className="mat" aria-hidden="true">
        <div className={`aspect-[16/10] bg-paper-2 ${loading ? 'animate-pulse' : ''}`} />
      </div>
    );
  }
  return (
    <Link to={`/cars/${car.slug}`} className="group block rounded-sm">
      <figure className="m-0">
        <div className="mat">
          <img
            src={car.images[0]?.url}
            alt={car.name}
            width="1200"
            height="750"
            fetchPriority="high"
            className="frame aspect-[16/10] w-full object-cover"
          />
        </div>
        <figcaption className="mt-5 flex items-end justify-between gap-6">
          <span className="min-w-0">
            <span className="block text-sm text-muted">Bán chạy nhất</span>
            <span className="mt-1 line-clamp-2 font-display text-2xl leading-snug text-ink decoration-accent decoration-1 underline-offset-4 group-hover:underline">{car.name}</span>
          </span>
          <span className="price shrink-0 text-[length:var(--text-display-s)] leading-none">{formatPriceShort(car.price)}</span>
        </figcaption>
      </figure>
    </Link>
  );
}

const PERKS = [
  { title: 'Bảo hành chính hãng', text: 'Xe mới bảo hành theo hãng, xe cũ được kiểm tra 160 hạng mục.' },
  { title: 'Trả góp đến 80%', text: 'Liên kết nhiều ngân hàng, duyệt hồ sơ nhanh trong 24 giờ.' },
  { title: 'Lái thử tận nơi', text: 'Đặt lịch qua chat, chúng tôi mang xe đến tận nhà bạn.' },
  { title: 'Giá minh bạch', text: 'Niêm yết rõ ràng, báo giá lăn bánh chi tiết trước khi mua.' }
];

function SectionHead({ title, subtitle, link, linkLabel }) {
  return (
    <div className="mb-12 grid items-end gap-x-8 gap-y-4 md:grid-cols-12">
      <div className="md:col-span-8">
        <h2>{title}</h2>
        {subtitle && <p className="lead mt-4 text-ink-2">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="link justify-self-start whitespace-nowrap md:col-span-4 md:justify-self-end">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

function BestSellers({ cars, loading }) {
  const rows = loading ? Array.from({ length: 4 }, (_, i) => ({ _id: `s${i}` })) : cars;
  return (
    <ol className="ruled">
      {rows.map((car, i) => (
        <li key={car._id}>
          {loading ? (
            <div className="h-28 animate-pulse bg-paper-2/60" aria-hidden="true" />
          ) : (
            <Link
              to={`/cars/${car.slug}`}
              className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-6 transition-colors duration-[var(--dur-short)] hover:bg-paper-2/60 md:grid-cols-[3rem_9rem_minmax(0,1fr)_12rem_10rem]"
            >
              <span className="price hidden text-3xl md:block">{i + 1}</span>
              <span className="mat block w-24 p-1.5 md:w-36">
                <img src={car.images?.[0]?.thumbUrl} alt="" width="320" height="200" loading="lazy" className="frame aspect-[16/10] w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="line-clamp-2 font-display text-xl leading-snug sm:text-[length:var(--text-title)] text-ink decoration-accent decoration-1 underline-offset-4 group-hover:underline">{car.name}</span>
                <span className="mt-1 block text-sm text-muted">{car.brand?.name}, đời {car.year}</span>
              </span>
              <span className="hidden text-sm text-ink-2 md:block">{FUEL[car.fuel]}, {car.seats} chỗ</span>
              <span className="price text-right text-2xl">{formatPriceShort(car.price)}</span>
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function Home() {
  useTitle();
  const openChat = useUi((s) => s.openChat);
  const featured = useQuery({ queryKey: ['featured'], queryFn: () => api('/cars/featured') });
  const filters = useQuery({ queryKey: ['filters'], queryFn: () => api('/cars/filters') });
  const heroCar = featured.data?.popular[0] || featured.data?.newest[0];

  return (
    <>
      {/* -- Hero: tìm xe bên trái, xe bán chạy bên phải -- */}
      <section className="container-page grid grid-cols-[minmax(0,1fr)] items-center gap-x-[var(--space-3xl)] gap-y-[var(--space-xl)] py-[var(--space-2xl)] lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h1>Tìm chiếc xe dành cho bạn</h1>
          <p className="lead mt-6 text-ink-2">Xe mới và xe đã qua sử dụng, giá niêm yết rõ ràng.</p>
          <div className="mt-8">
            <QuickSearch filters={filters.data} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link to="/cars" className="link whitespace-nowrap">Xem tất cả xe</Link>
            <button type="button" onClick={() => openChat()} className="link inline-flex items-center gap-2 whitespace-nowrap">
              <MessageCircle className="size-4" /> Chat với tư vấn viên
            </button>
          </div>
        </div>
        <HeroCar car={heroCar} loading={featured.isLoading} />
      </section>

      {/* -- Cam kết: hàng kẻ mảnh -- */}
      <section className="container-page mt-[var(--section-gap-s)] grid gap-x-8 gap-y-10 md:grid-cols-12">
        <h2 className="md:col-span-4">Mua xe ở ShopCar</h2>
        <dl className="ruled md:col-span-8">
          {PERKS.map(({ title, text }) => (
            <div key={title} className="grid gap-x-8 gap-y-1 py-7 sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <dt className="font-display text-[length:var(--text-title)] text-ink">{title}</dt>
              <dd className="m-0 text-ink-2">{text}</dd>
            </div>
          ))}
        </dl>
      </section>

      {featured.error ? (
        <div className="container-page mt-[var(--section-gap)]"><ErrorBox error={featured.error} onRetry={featured.refetch} /></div>
      ) : (
        <section className="container-page mt-[var(--section-gap)]">
          <SectionHead title="Xe mới về" subtitle="Những mẫu xe vừa có mặt tại showroom" link="/cars?sort=newest" linkLabel="Xem tất cả xe mới về" />
          <CarRail cars={featured.data?.newest || []} loading={featured.isLoading} label="Xe mới về" />
        </section>
      )}

      {/* -- Các hãng xe -- */}
      {filters.data && (
        <section className="mt-[var(--section-gap-s)] bg-paper-2 py-[var(--section-gap-s)]">
          <div className="container-page grid gap-x-8 gap-y-10 md:grid-cols-12">
            <div className="md:col-span-4">
              <h2>{filters.data.brands.length} thương hiệu, giao xe toàn quốc</h2>
              <p className="mt-3 max-w-sm text-ink-2">Chọn một hãng để xem các mẫu xe đang bán tại showroom.</p>
            </div>
            <ul className="grid grid-cols-2 border-l border-t border-rule sm:grid-cols-4 md:col-span-8">
              {filters.data.brands.map((b) => (
                <li key={b._id} className="border-b border-r border-rule">
                  <Link
                    to={`/cars?brand=${b.slug}`}
                    className="group flex h-full min-h-36 flex-col items-center justify-center gap-3 px-4 py-6 text-center transition-colors duration-[var(--dur-short)] hover:bg-paper"
                  >
                    {hasBrandLogo(b.slug) && (
                      <span className="grid h-16 place-items-center text-ink-2 transition-colors duration-[var(--dur-short)] group-hover:text-ink">
                        <BrandLogo slug={b.slug} />
                      </span>
                    )}
                    <span className={hasBrandLogo(b.slug) ? 'text-sm text-ink-2 decoration-accent underline-offset-4 group-hover:text-ink group-hover:underline' : 'font-display text-xl text-ink decoration-accent underline-offset-4 group-hover:underline'}>
                      {b.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {!featured.error && (featured.isLoading || featured.data?.popular.length > 0) && (
        <section className="container-page mt-[var(--section-gap)]">
          <SectionHead title="Bán chạy nhất" subtitle="Được khách hàng ShopCar lựa chọn nhiều nhất" link="/cars?sort=popular" linkLabel="Xem tất cả xe bán chạy" />
          <BestSellers cars={featured.data?.popular.slice(0, 4) || []} loading={featured.isLoading} />
        </section>
      )}

      {/* -- Khép trang: tư vấn chọn xe -- */}
      <section className="container-page mt-[var(--section-gap-l)]">
        <div className="grid items-end gap-x-8 gap-y-8 border-t border-ink pt-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="display-s">Chưa biết chọn xe nào?</p>
            <p className="lead mt-5 text-ink-2">Cho chúng tôi biết nhu cầu và ngân sách, tư vấn viên sẽ gợi ý mẫu xe phù hợp nhất cho bạn.</p>
          </div>
          <div className="md:col-span-5 md:justify-self-end">
            <p className="mb-4 max-w-xs text-sm text-muted">Hỏi giá lăn bánh, đặt lịch lái thử ngay trong khung chat.</p>
            <Button size="lg" variant="outline" onClick={() => openChat()}>
              <MessageCircle className="size-5" /> Nhận tư vấn miễn phí
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
