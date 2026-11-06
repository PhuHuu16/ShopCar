import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BadgeCheck, Banknote, KeyRound, MessageCircle, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { BODY_TYPE, PRICE_RANGES } from '../lib/labels';
import { formatPriceShort } from '../lib/format';
import { CarGrid } from '../components/CarCard';
import { Button, ButtonLink, ErrorBox } from '../components/ui';
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

  const select = 'input h-12 appearance-none bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100';
  return (
    <form onSubmit={submit} className="card grid gap-3 p-4 shadow-xl sm:grid-cols-2 lg:grid-cols-4 lg:p-5">
      <select className={select} value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Hãng xe">
        <option value="">Tất cả hãng xe</option>
        {filters?.brands.map((b) => <option key={b._id} value={b.slug}>{b.name}</option>)}
      </select>
      <select className={select} value={bodyType} onChange={(e) => setBodyType(e.target.value)} aria-label="Kiểu dáng">
        <option value="">Mọi kiểu dáng</option>
        {(filters?.bodyTypes || []).map((t) => <option key={t} value={t}>{BODY_TYPE[t]}</option>)}
      </select>
      <select className={select} value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Khoảng giá">
        <option value="">Mọi mức giá</option>
        {PRICE_RANGES.map((r, i) => <option key={r.label} value={i}>{r.label}</option>)}
      </select>
      <Button type="submit" size="lg" className="h-12">
        <Search className="size-5" /> Tìm xe
      </Button>
    </form>
  );
}

function Section({ title, subtitle, link, children }) {
  return (
    <section className="container-page mt-20">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-brand-600 hover:gap-2 sm:flex">
            Xem tất cả <ArrowRight className="size-4 transition-all" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// Best seller shown next to the headline on large screens
function HeroCar({ car }) {
  if (!car) return <div className="hidden aspect-[16/10] rounded-3xl bg-white/5 lg:block" />;
  return (
    <Link to={`/cars/${car.slug}`} className="group relative hidden overflow-hidden rounded-3xl shadow-2xl shadow-black/40 ring-1 ring-white/10 lg:block">
      <img src={car.images[0]?.url} alt={car.name} className="aspect-[16/10] w-full object-cover transition duration-700 group-hover:scale-105" />
      <div className="absolute inset-x-4 bottom-4 flex items-center justify-between gap-4 rounded-2xl bg-slate-950/75 px-5 py-4 backdrop-blur">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-500">Bán chạy nhất</p>
          <p className="truncate font-semibold">{car.name}</p>
        </div>
        <p className="shrink-0 text-xl font-bold">{formatPriceShort(car.price)}</p>
      </div>
    </Link>
  );
}

const PERKS = [
  { icon: ShieldCheck, title: 'Bảo hành chính hãng', text: 'Xe mới bảo hành theo hãng, xe cũ được kiểm tra 160 hạng mục.' },
  { icon: Banknote, title: 'Trả góp đến 80%', text: 'Liên kết nhiều ngân hàng, duyệt hồ sơ nhanh trong 24 giờ.' },
  { icon: KeyRound, title: 'Lái thử tận nơi', text: 'Đặt lịch qua chat, chúng tôi mang xe đến tận nhà bạn.' },
  { icon: BadgeCheck, title: 'Giá minh bạch', text: 'Niêm yết rõ ràng, báo giá lăn bánh chi tiết trước khi mua.' }
];

export default function Home() {
  useTitle();
  const openChat = useUi((s) => s.openChat);
  const featured = useQuery({ queryKey: ['featured'], queryFn: () => api('/cars/featured') });
  const filters = useQuery({ queryKey: ['filters'], queryFn: () => api('/cars/filters') });

  return (
    <>
      {/* hero */}
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(220,38,38,0.35),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(30,64,175,0.25),transparent_50%)]" />
        <div className="container-page relative grid items-center gap-12 pb-28 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-slate-300">
              <span className="size-2 rounded-full bg-emerald-400" /> {filters.data ? `${filters.data.brands.length} thương hiệu` : 'Nhiều thương hiệu'} · giao xe toàn quốc
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl xl:text-6xl">
              Tìm chiếc xe <span className="text-brand-500">dành cho bạn</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Xe mới và xe đã qua sử dụng chất lượng, giá niêm yết rõ ràng. Hỏi giá lăn bánh, đặt lịch lái thử ngay trong khung chat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/cars" size="lg">Xem tất cả xe <ArrowRight className="size-5" /></ButtonLink>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 dark:border-white/20 dark:bg-white/5" onClick={() => openChat()}>
                <MessageCircle className="size-5" /> Chat với tư vấn viên
              </Button>
            </div>
          </div>
          <HeroCar car={featured.data?.popular[0] || featured.data?.newest[0]} />
        </div>
      </section>
      <div className="container-page relative -mt-14">
        <QuickSearch filters={filters.data} />
      </div>

      {/* brands */}
      {filters.data && (
        <section className="container-page mt-14">
          <div className="flex flex-wrap justify-center gap-3">
            {filters.data.brands.map((b) => (
              <Link
                key={b._id}
                to={`/cars?brand=${b.slug}`}
                className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-brand-500 hover:text-brand-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
              >
                {b.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.error ? (
        <div className="container-page mt-16"><ErrorBox error={featured.error} onRetry={featured.refetch} /></div>
      ) : (
        <>
          <Section title="Xe mới về" subtitle="Những mẫu xe vừa có mặt tại showroom" link="/cars?sort=newest">
            <CarGrid cars={featured.data?.newest || []} loading={featured.isLoading} />
          </Section>
          {(featured.isLoading || featured.data?.popular.length > 0) && (
            <Section title="Bán chạy nhất" subtitle="Được khách hàng ShopCar lựa chọn nhiều nhất" link="/cars?sort=popular">
              <CarGrid cars={featured.data?.popular.slice(0, 4) || []} loading={featured.isLoading} count={4} />
            </Section>
          )}
        </>
      )}

      {/* perks */}
      <section className="container-page mt-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card p-6">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                <Icon className="size-6" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* call to action */}
      <section className="container-page mt-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 py-12 text-white sm:px-12">
          <div className="absolute -right-20 -top-20 size-72 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold sm:text-3xl">Chưa biết chọn xe nào?</h2>
              <p className="mt-2 max-w-lg text-brand-100">Cho chúng tôi biết nhu cầu và ngân sách, tư vấn viên sẽ gợi ý mẫu xe phù hợp nhất cho bạn.</p>
            </div>
            <Button size="lg" variant="white" onClick={() => openChat()}>
              <MessageCircle className="size-5" /> Nhận tư vấn miễn phí
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
