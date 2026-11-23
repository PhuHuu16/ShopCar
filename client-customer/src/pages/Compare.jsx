import { useEffect } from 'react';
import { Link } from 'react-router';
import { useQueries } from '@tanstack/react-query';
import { GitCompareArrows, Plus, Trophy, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatKm, formatPriceShort, formatVnd } from '../lib/format';
import { BODY_TYPE, CONDITION, FUEL, TRANSMISSION } from '../lib/labels';
import { ButtonLink, EmptyState, PageHeader, Spinner } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { MAX_COMPARE, useCompare } from '../stores/compare';

const ROWS = [
  { label: 'Giá niêm yết', value: (c) => formatVnd(c.price), best: (cars) => Math.min(...cars.map((c) => c.price)), key: 'price' },
  { label: 'Năm sản xuất', value: (c) => c.year, best: (cars) => Math.max(...cars.map((c) => c.year)), key: 'year' },
  {
    label: 'Số km đã đi',
    value: (c) => (c.condition === 'used' ? formatKm(c.mileage) : 'Xe mới'),
    best: (cars) => Math.min(...cars.map((c) => c.mileage)),
    key: 'mileage'
  },
  { label: 'Tình trạng', value: (c) => CONDITION[c.condition] },
  { label: 'Hãng', value: (c) => c.brand?.name },
  { label: 'Kiểu dáng', value: (c) => BODY_TYPE[c.bodyType] },
  { label: 'Số chỗ ngồi', value: (c) => `${c.seats} chỗ`, best: (cars) => Math.max(...cars.map((c) => c.seats)), key: 'seats' },
  { label: 'Nhiên liệu', value: (c) => FUEL[c.fuel] },
  { label: 'Hộp số', value: (c) => TRANSMISSION[c.transmission] },
  { label: 'Màu sắc', value: (c) => c.color || 'Chưa rõ' },
  { label: 'Tình trạng kho', value: (c) => (c.stock > 0 ? `Còn ${c.stock} xe` : 'Hết hàng') }
];

export default function Compare() {
  useTitle('So sánh xe');
  const { items, remove } = useCompare();
  const results = useQueries({
    queries: items.map((c) => ({ queryKey: ['car', c.slug], queryFn: () => api(`/cars/${c.slug}`) }))
  });

  const gone = results.map((r, i) => (r.error?.status === 404 ? items[i]._id : null)).filter(Boolean).join();
  useEffect(() => {
    if (gone) gone.split(',').forEach(remove);
  }, [gone, remove]);

  if (!items.length) {
    return (
      <div className="container-page py-10">
        <PageHeader title="So sánh xe" />
        <EmptyState icon={GitCompareArrows} title="Chưa chọn xe nào" action={<ButtonLink to="/cars">Chọn xe để so sánh</ButtonLink>}>
          Bấm nút “So sánh” trên ảnh xe để thêm tối đa {MAX_COMPARE} xe, rồi xem thông số cạnh nhau.
        </EmptyState>
      </div>
    );
  }

  if (results.some((r) => r.isLoading)) return <Spinner className="py-32" />;
  const cars = results.map((r) => r.data?.car).filter(Boolean);
  const winners = Object.fromEntries(
    ROWS.filter((row) => row.best && cars.length > 1).map((row) => [row.key, row.best(cars)])
  );
  const isBest = (row, car) => row.key && winners[row.key] !== undefined && car[row.key] === winners[row.key] && !cars.every((c) => c[row.key] === car[row.key]);
  const cols = `minmax(140px,180px) repeat(${MAX_COMPARE}, minmax(200px, 1fr))`;

  return (
    <div className="container-page py-10">
      <PageHeader title="So sánh xe">Đặt các mẫu xe cạnh nhau để chọn chiếc phù hợp nhất. Giá trị tốt nhất được đánh dấu.</PageHeader>
      <div className="overflow-x-auto border-t border-ink" tabIndex={0} aria-label="Bảng so sánh xe">
        <div className="min-w-[780px]">
          <div className="grid border-b border-rule" style={{ gridTemplateColumns: cols }}>
            <div className="sticky left-0 bg-paper p-4" />
            {cars.map((car) => (
              <div key={car._id} className="relative border-l border-rule p-4">
                <button
                  onClick={() => remove(car._id)}
                  type="button"
                  className="absolute right-6 top-6 z-10 flex size-9 items-center justify-center rounded-md border border-rule bg-paper text-ink-2 hover:border-ink hover:text-ink"
                  aria-label={`Bỏ ${car.name} khỏi so sánh`}
                >
                  <X className="size-4" />
                </button>
                <Link to={`/cars/${car.slug}`} className="group block">
                  <img src={car.images[0]?.thumbUrl} alt={car.name} className="aspect-[16/10] w-full rounded-md bg-paper-2 object-cover" />
                  <p className="mt-4 text-sm text-muted">{car.brand?.name}</p>
                  <p className="text-lg text-ink decoration-accent underline-offset-4 group-hover:underline">{car.name}</p>
                  <p className="price mt-2 text-2xl">{formatPriceShort(car.price)}</p>
                </Link>
              </div>
            ))}
            {Array.from({ length: MAX_COMPARE - cars.length }, (_, i) => (
              <div key={i} className="border-l border-rule p-4">
                <Link
                  to="/cars"
                  className="flex aspect-[16/10] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted text-sm text-muted hover:border-ink hover:text-ink"
                >
                  <Plus className="size-6" /> Thêm xe
                </Link>
              </div>
            ))}
          </div>
          {ROWS.map((row) => (
            <div key={row.label} className="grid border-b border-rule text-sm" style={{ gridTemplateColumns: cols }}>
              <div className="sticky left-0 bg-paper px-4 py-3 text-muted">
                {row.label}
              </div>
              {cars.map((car) => {
                const best = isBest(row, car);
                return (
                  <div key={car._id} className={`flex items-center gap-2 border-l border-rule px-4 py-3  ${best ? 'font-medium' : ''}`}>
                    {row.value(car)}
                    {best && (
                      <span className="inline-flex items-center gap-1 rounded-sm bg-success-soft px-2 py-0.5 text-xs text-success">
                        <Trophy className="size-3" /> Tốt nhất
                      </span>
                    )}
                  </div>
                );
              })}
              {Array.from({ length: MAX_COMPARE - cars.length }, (_, k) => (
                <div key={k} className="border-l border-rule" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
