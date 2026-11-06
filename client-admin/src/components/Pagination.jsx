import { ChevronLeft, ChevronRight } from 'lucide-react';

// 1 … 4 5 [6] 7 8 … 20
function pageList(page, pages) {
  const list = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) list.push(p);
    else if (list.at(-1) !== '…') list.push('…');
  }
  return list;
}

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  const base = 'flex size-10 items-center justify-center rounded-xl text-sm font-semibold transition';
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button
        className={`${base} hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-800`}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="size-5" />
      </button>
      {pageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${base} ${p === page ? 'bg-brand-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            {p}
          </button>
        )
      )}
      <button
        className={`${base} hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-800`}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="size-5" />
      </button>
    </nav>
  );
}
