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
      className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-md border border-ink px-2.5 text-xs transition-colors duration-[var(--dur-short)] ${
        selected ? 'bg-ink text-paper' : 'bg-card text-ink hover:bg-ink hover:text-paper'
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
      <div className="stock flex max-w-full items-center gap-3 p-2 pl-3">
        <div className="flex min-w-0 gap-2 overflow-x-auto pt-1.5 pr-1.5 -mt-1.5 -mr-1.5">
          {items.map((car) => (
            <div key={car._id} className="relative shrink-0">
              {car.image ? (
                <img src={car.image} alt={car.name} title={car.name} className="h-9 w-12 rounded-lg object-cover sm:h-10 sm:w-16" />
              ) : (
                <div className="h-9 w-12 rounded-lg bg-paper-3 sm:h-10 sm:w-16" title={car.name} />
              )}
              <button
                onClick={() => remove(car._id)}
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-ink text-paper"
                aria-label={`Bỏ ${car.name}`}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_COMPARE - items.length }, (_, i) => (
            <div key={i} className="hidden h-10 w-16 shrink-0 rounded-lg border-2 border-dashed border-rule sm:block" />
          ))}
        </div>
        <Link
          to="/compare"
          className={`flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors ${
            items.length > 1 ? 'border border-ink bg-ink text-paper hover:bg-ink-2' : 'border border-rule bg-paper-2 text-muted'
          }`}
        >
          <GitCompareArrows className="size-4" /> So sánh ({items.length})
        </Link>
        <button onClick={clear} className="hidden shrink-0 rounded-lg p-2 text-muted hover:bg-paper-2 hover:text-ink-2 sm:block" aria-label="Bỏ chọn tất cả">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
