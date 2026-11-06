import { Link } from 'react-router';
import { Fuel, Gauge, Settings2, Users } from 'lucide-react';
import { formatKm, formatPriceShort } from '../lib/format';
import { FUEL, TRANSMISSION } from '../lib/labels';
import { CompareToggle } from './Compare';

export function CarCard({ car }) {
  const image = car.images?.[0]?.thumbUrl;
  const soldOut = car.stock === 0;
  return (
    <Link
      to={`/cars/${car.slug}`}
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {image && (
          <img
            src={image}
            alt={car.name}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute bottom-3 left-3 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:has-[[aria-pressed=true]]:opacity-100">
          <CompareToggle car={car} />
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5">
          {car.condition === 'used' && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-800 backdrop-blur">Xe cũ</span>
          )}
          {soldOut && (
            <span className="rounded-full bg-slate-900/85 px-2.5 py-1 text-xs font-semibold text-white">Hết hàng</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
          {car.brand?.name} · {car.year}
        </p>
        <h3 className="mt-1 line-clamp-1 font-semibold group-hover:text-brand-600">{car.name}</h3>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><Fuel className="size-4" />{FUEL[car.fuel]}</span>
          <span className="flex items-center gap-1.5"><Settings2 className="size-4" />{TRANSMISSION[car.transmission]}</span>
          <span className="flex items-center gap-1.5"><Users className="size-4" />{car.seats} chỗ</span>
          <span className="flex items-center gap-1.5"><Gauge className="size-4" />{car.condition === 'used' ? formatKm(car.mileage) : 'Mới 100%'}</span>
        </div>
        <p className="mt-auto pt-4 text-xl font-bold text-slate-900 dark:text-white">{formatPriceShort(car.price)}</p>
      </div>
    </Link>
  );
}

export function CarCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] animate-pulse bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-3 p-4">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
        <div className="h-10 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-6 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      </div>
    </div>
  );
}

export function CarGrid({ cars, loading, count = 8, columns = 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' }) {
  return (
    <div className={`grid gap-5 ${columns}`}>
      {loading
        ? Array.from({ length: count }, (_, i) => <CarCardSkeleton key={i} />)
        : cars.map((car) => <CarCard key={car._id} car={car} />)}
    </div>
  );
}
