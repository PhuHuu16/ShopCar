import { Link } from 'react-router';
import { formatKm, formatPriceShort } from '../lib/format';
import { FUEL, TRANSMISSION } from '../lib/labels';
import { CompareToggle } from './Compare';

// -- Thẻ xe: ảnh treo trong khung giấy, nhãn tranh bên dưới --
export function CarCard({ car, priority = false }) {
  const image = car.images?.[0]?.thumbUrl;
  const soldOut = car.stock === 0;
  const facts = [FUEL[car.fuel], TRANSMISSION[car.transmission], `${car.seats} chỗ`, car.condition === 'used' ? formatKm(car.mileage) : 'Mới 100%'];
  return (
    <Link to={`/cars/${car.slug}`} className="group flex min-w-0 flex-col rounded-sm">
      <div className="mat relative">
        <div className="frame relative aspect-[16/10] overflow-hidden bg-paper-2">
          {image && (
            <img
              src={image}
              alt={car.name}
              width="640"
              height="400"
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : undefined}
              className="size-full object-cover"
            />
          )}
        </div>
        <div className="absolute bottom-6 left-6 opacity-100 transition-opacity duration-[var(--dur-short)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:has-[[aria-pressed=true]]:opacity-100">
          <CompareToggle car={car} />
        </div>
        {(car.condition === 'used' || soldOut) && (
          <div className="absolute right-6 top-6 flex gap-1.5">
            {car.condition === 'used' && <span className="rounded-sm bg-card px-2 py-0.5 text-xs text-ink">Xe cũ</span>}
            {soldOut && <span className="rounded-sm bg-ink px-2 py-0.5 text-xs text-paper">Hết hàng</span>}
          </div>
        )}
      </div>
      <h3 className="mt-5 truncate text-xl decoration-accent decoration-1 underline-offset-4 group-hover:underline">{car.name}</h3>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <p className="min-w-0 truncate text-sm text-muted">{car.brand?.name}, đời {car.year}</p>
        <p className="price shrink-0 text-2xl leading-none">{formatPriceShort(car.price)}</p>
      </div>
      <p className="mt-3 border-t border-rule pt-3 text-sm text-ink-2">{facts.join(', ')}</p>
    </Link>
  );
}

export function CarCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mat"><div className="aspect-[16/10] animate-pulse bg-paper-2" /></div>
      <div className="mt-5 h-5 w-2/3 animate-pulse rounded-sm bg-paper-3" />
      <div className="mt-2 h-4 w-1/3 animate-pulse rounded-sm bg-paper-2" />
      <div className="mt-4 h-4 animate-pulse rounded-sm bg-paper-2" />
    </div>
  );
}

export function CarGrid({ cars, loading, count = 8, columns = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' }) {
  return (
    <div className={`grid gap-x-8 gap-y-14 ${columns}`}>
      {loading
        ? Array.from({ length: count }, (_, i) => <CarCardSkeleton key={i} />)
        : cars.map((car) => <CarCard key={car._id} car={car} />)}
    </div>
  );
}

// -- Dải xe cuộn ngang (chạm, cuộn hoặc phím Tab) --
export function CarRail({ cars, loading, label }) {
  const items = loading ? Array.from({ length: 5 }, (_, i) => ({ _id: `s${i}` })) : cars;
  return (
    <ul
      className="-mx-[var(--gutter)] flex snap-x snap-mandatory scroll-px-[var(--gutter)] gap-8 overflow-x-auto px-[var(--gutter)] pb-6 [scrollbar-width:thin]"
      aria-label={label}
      tabIndex={0}
    >
      {items.map((car) => (
        <li key={car._id} className="w-[78%] shrink-0 snap-start sm:w-[44%] lg:w-[30%] xl:w-[23%]">
          {loading ? <CarCardSkeleton /> : <CarCard car={car} />}
        </li>
      ))}
    </ul>
  );
}
