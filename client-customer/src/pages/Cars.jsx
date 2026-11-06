import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CarFront, SlidersHorizontal, X } from 'lucide-react';
import { api } from '../lib/api';
import { BODY_TYPE, CONDITION, FUEL, PRICE_RANGES, SORTS, TRANSMISSION } from '../lib/labels';
import { CarGrid } from '../components/CarCard';
import { Pagination } from '../components/Pagination';
import { Button, EmptyState, ErrorBox } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

const FILTER_KEYS = ['q', 'brand', 'fuel', 'transmission', 'bodyType', 'condition', 'minPrice', 'maxPrice', 'minYear', 'inStock'];

function Chips({ options, labels, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(active ? '' : o)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-500'
            }`}
          >
            {labels ? labels[o] : o}
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <div className="border-b border-slate-200 py-5 first:pt-0 last:border-0 dark:border-slate-800">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Filters({ params, setParam, options }) {
  const priceIndex = PRICE_RANGES.findIndex(
    (r) => String(r.min || '') === (params.get('minPrice') || '') && String(r.max || '') === (params.get('maxPrice') || '')
  );
  const years = options?.year.min ? Array.from({ length: options.year.max - options.year.min + 1 }, (_, i) => options.year.max - i) : [];

  return (
    <div>
      <FilterGroup title="Hãng xe">
        <select className="input" value={params.get('brand') || ''} onChange={(e) => setParam({ brand: e.target.value })}>
          <option value="">Tất cả hãng</option>
          {options?.brands.map((b) => <option key={b._id} value={b.slug}>{b.name}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup title="Khoảng giá">
        <div className="space-y-1">
          {PRICE_RANGES.map((r, i) => (
            <label key={r.label} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm">
              <input
                type="radio"
                name="price"
                className="size-4 accent-brand-600"
                checked={priceIndex === i}
                onChange={() => setParam({ minPrice: r.min || '', maxPrice: r.max || '' })}
              />
              {r.label}
            </label>
          ))}
          {(params.get('minPrice') || params.get('maxPrice')) && (
            <button className="px-1 text-sm font-medium text-brand-600" onClick={() => setParam({ minPrice: '', maxPrice: '' })}>
              Bỏ lọc giá
            </button>
          )}
        </div>
      </FilterGroup>
      <FilterGroup title="Tình trạng">
        <Chips options={options?.conditions || []} labels={CONDITION} value={params.get('condition') || ''} onChange={(v) => setParam({ condition: v })} />
      </FilterGroup>
      <FilterGroup title="Kiểu dáng">
        <Chips options={options?.bodyTypes || []} labels={BODY_TYPE} value={params.get('bodyType') || ''} onChange={(v) => setParam({ bodyType: v })} />
      </FilterGroup>
      <FilterGroup title="Nhiên liệu">
        <Chips options={options?.fuels || []} labels={FUEL} value={params.get('fuel') || ''} onChange={(v) => setParam({ fuel: v })} />
      </FilterGroup>
      <FilterGroup title="Hộp số">
        <Chips options={options?.transmissions || []} labels={TRANSMISSION} value={params.get('transmission') || ''} onChange={(v) => setParam({ transmission: v })} />
      </FilterGroup>
      <FilterGroup title="Đời xe từ năm">
        <select className="input" value={params.get('minYear') || ''} onChange={(e) => setParam({ minYear: e.target.value })}>
          <option value="">Mọi năm</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </FilterGroup>
      <FilterGroup title="Khác">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-brand-600"
            checked={params.get('inStock') === 'true'}
            onChange={(e) => setParam({ inStock: e.target.checked ? 'true' : '' })}
          />
          Chỉ hiện xe còn hàng
        </label>
      </FilterGroup>
    </div>
  );
}

export default function Cars() {
  const [params, setParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const page = Number(params.get('page')) || 1;
  useTitle(params.get('q') ? `Tìm "${params.get('q')}"` : 'Mua xe');

  const options = useQuery({ queryKey: ['filters'], queryFn: () => api('/cars/filters') });
  const result = useQuery({
    queryKey: ['cars', params.toString()],
    queryFn: () => api('/cars', { query: { ...Object.fromEntries(params), limit: 12 } }),
    placeholderData: keepPreviousData
  });

  function setParam(changes, keepPage = false) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value === '' || value === undefined) next.delete(key);
      else next.set(key, value);
    }
    if (!keepPage) next.delete('page');
    setParams(next);
  }

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;
  const brandName = options.data?.brands.find((b) => b.slug === params.get('brand'))?.name;
  const title = params.get('q')
    ? `Kết quả cho "${params.get('q')}"`
    : brandName
      ? `Xe ${brandName}`
      : params.get('bodyType')
        ? `Xe ${BODY_TYPE[params.get('bodyType')] || ''}`
        : params.get('condition')
          ? CONDITION[params.get('condition')]
          : params.get('fuel') === 'electric'
            ? 'Xe điện'
            : 'Tất cả xe';

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {result.data ? `${result.data.total} xe phù hợp` : 'Đang tải...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal className="size-4" /> Bộ lọc {activeCount > 0 && `(${activeCount})`}
          </Button>
          <select className="input h-11 w-auto" value={params.get('sort') || 'newest'} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sắp xếp">
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="card sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-5">
            {activeCount > 0 && (
              <button className="mb-4 text-sm font-semibold text-brand-600" onClick={() => setParams(new URLSearchParams())}>
                Xóa tất cả bộ lọc ({activeCount})
              </button>
            )}
            <Filters params={params} setParam={setParam} options={options.data} />
          </div>
        </aside>

        {showFilters && (
          <div className="fixed inset-0 z-[60] lg:hidden">
            <div className="absolute inset-0 bg-slate-950/50" onClick={() => setShowFilters(false)} />
            <div className="absolute inset-y-0 left-0 flex w-[min(22rem,90vw)] flex-col bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-slate-800">
                <h2 className="font-semibold">Bộ lọc</h2>
                <button onClick={() => setShowFilters(false)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Đóng">
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <Filters params={params} setParam={setParam} options={options.data} />
              </div>
              <div className="flex gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
                <Button variant="outline" className="flex-1" onClick={() => setParams(new URLSearchParams())}>Xóa lọc</Button>
                <Button className="flex-1" onClick={() => setShowFilters(false)}>Xem {result.data?.total ?? ''} xe</Button>
              </div>
            </div>
          </div>
        )}

        <div className={`min-w-0 flex-1 transition-opacity ${result.isPlaceholderData ? 'opacity-60' : ''}`}>
          {result.error ? (
            <ErrorBox error={result.error} onRetry={result.refetch} />
          ) : result.data?.items.length === 0 ? (
            <EmptyState icon={CarFront} title="Không tìm thấy xe phù hợp" action={<Button variant="outline" onClick={() => setParams(new URLSearchParams())}>Xóa bộ lọc</Button>}>
              Hãy thử bỏ bớt bộ lọc, hoặc nhắn tin để chúng tôi tìm xe theo yêu cầu của bạn.
            </EmptyState>
          ) : (
            <>
              <CarGrid cars={result.data?.items || []} loading={result.isLoading} count={6} columns="sm:grid-cols-2 xl:grid-cols-3" />
              <div className="mt-10">
                <Pagination
                  page={page}
                  pages={result.data?.pages || 0}
                  onChange={(p) => { setParam({ page: p > 1 ? p : '' }, true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
