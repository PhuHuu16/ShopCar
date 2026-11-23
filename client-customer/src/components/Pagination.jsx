import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  const base = 'flex size-10 items-center justify-center rounded-md text-sm font-medium transition-colors';
  return (
    <nav className="flex items-center justify-center gap-1.5" aria-label="Phân trang">
      <button
        className={`${base} hover:bg-paper-3 disabled:opacity-40 `}
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft className="size-5" />
      </button>
      {pageList(page, pages).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-1 text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`${base} ${p === page ? 'bg-ink text-paper' : 'hover:bg-paper-3 '}`}
          >
            {p}
          </button>
        )
      )}
      <button
        className={`${base} hover:bg-paper-3 disabled:opacity-40 `}
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight className="size-5" />
      </button>
    </nav>
  );
}
