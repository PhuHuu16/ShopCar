import { Link, useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { GitCompareArrows, X } from 'lucide-react';
import { MAX_COMPARE, useCompare } from '../stores/compare';

export function useToggleCompare() {
  const toggle = useCompare((s) => s.toggle);
  const navigate = useNavigate();
  return (car) => {
    const result = toggle(car);
    if (result === 'full') {
      toast.warning(`Chỉ so sánh tối đa ${MAX_COMPARE} xe`, { action: { label: 'So sánh ngay', onClick: () => navigate('/compare') } });
    }
    return result;
  };
}

// -- Nút so sánh trên thẻ xe --
export function CompareToggle({ car }) {
  const selected = useCompare((s) => s.items.some((c) => c._id === car._id));
  const toggle = useToggleCompare();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(car);
      }}
      aria-pressed={selected}
      aria-label={selected ? `Bỏ ${car.name} khỏi so sánh` : `Thêm ${car.name} vào so sánh`}
      title={selected ? 'Bỏ khỏi so sánh' : 'So sánh'}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur transition ${
        selected ? 'bg-brand-600 text-white' : 'bg-white/90 text-slate-800 hover:bg-white'
      }`}
    >
      <GitCompareArrows className="size-3.5" />
      {selected ? 'Đang so sánh' : 'So sánh'}
    </button>
  );
}

// -- Thanh so sánh xe --
export function CompareBar() {
  const { items, remove, clear } = useCompare();
  const { pathname } = useLocation();
  if (!items.length || pathname === '/compare') return null;
  return (
    <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pr-24 sm:pr-4">
      <div className="flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 p-2 pl-3 shadow-2xl shadow-slate-900/15 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex min-w-0 gap-2 overflow-x-auto pt-1.5 pr-1.5 -mt-1.5 -mr-1.5">
          {items.map((car) => (
            <div key={car._id} className="relative shrink-0">
              {car.image ? (
                <img src={car.image} alt={car.name} title={car.name} className="h-9 w-12 rounded-lg object-cover sm:h-10 sm:w-16" />
              ) : (
                <div className="h-9 w-12 rounded-lg bg-slate-200 sm:h-10 sm:w-16 dark:bg-slate-700" title={car.name} />
              )}
              <button
                onClick={() => remove(car._id)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                aria-label={`Bỏ ${car.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_COMPARE - items.length }, (_, i) => (
            <div key={i} className="hidden h-10 w-16 shrink-0 rounded-lg border-2 border-dashed border-slate-200 sm:block dark:border-slate-700" />
          ))}
        </div>
        <Link
          to="/compare"
          className={`flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
            items.length > 1 ? 'bg-brand-600 text-white hover:bg-brand-700' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
          }`}
        >
          <GitCompareArrows className="size-4" /> So sánh ({items.length})
        </Link>
        <button onClick={clear} className="hidden shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:block dark:hover:bg-slate-800" aria-label="Bỏ chọn tất cả">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
