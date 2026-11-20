import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { CarFront, LoaderCircle, Search } from 'lucide-react';
import { api } from '../lib/api';
import { formatPriceShort } from '../lib/format';
import { highlight, searchTokens } from '../lib/search';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const DEBOUNCE_MS = 250;

function Highlighted({ text, query }) {
  return highlight(text, query).map((part, i) =>
    part.match ? <mark key={i} className="bg-transparent font-bold text-brand-600 dark:text-brand-400">{part.text}</mark> : <span key={i}>{part.text}</span>
  );
}

export function SearchBox({ onDone, className = '' }) {
  const navigate = useNavigate();
  const id = useId();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = useDebouncedValue(q.trim(), DEBOUNCE_MS);
  const ready = searchTokens(term).length > 0;
  const suggest = useQuery({
    queryKey: ['suggest', term],
    queryFn: () => api('/cars/suggest', { query: { q: term } }),
    enabled: ready,
    staleTime: 60_000,
    placeholderData: keepPreviousData
  });

  const typed = searchTokens(q).length > 0;
  const items = typed ? suggest.data?.items || [] : [];
  const total = suggest.data?.total || 0;
  const failed = typed && suggest.isError && !suggest.isFetching;
  const waiting = typed && !failed && (q.trim() !== term || suggest.isFetching || !suggest.data);
  const showList = open && typed;
  const stale = suggest.isPlaceholderData || q.trim() !== term;
  const optionCount = items.length + 1;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function finish() {
    setQ('');
    setOpen(false);
    setActive(-1);
    inputRef.current?.blur();
    onDone?.();
  }

  function openCar(car) {
    navigate(`/cars/${car.slug}`);
    finish();
  }

  function searchAll() {
    navigate(q.trim() ? `/cars?q=${encodeURIComponent(q.trim())}` : '/cars');
    finish();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!typed) return;
      e.preventDefault();
      setOpen(true);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => ((i + 1 + step + optionCount + 1) % (optionCount + 1)) - 1);
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActive(-1);
      } else {
        setQ('');
      }
    }
  }

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (showList && active >= 0 && active < items.length) openCar(items[active]);
          else searchAll();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm xe, ví dụ: CX-5, Vios..."
          className="input h-10 rounded-full pl-9 pr-9"
          role="combobox"
          aria-label="Tìm xe"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={`${id}-list`}
          aria-activedescendant={showList && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
        />
        {waiting && open && (
          <LoaderCircle className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden="true" />
        )}
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:left-auto md:w-96 dark:border-slate-800 dark:bg-slate-900">
          <ul id={`${id}-list`} role="listbox" aria-label="Gợi ý xe" aria-busy={stale} className={stale ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {items.map((car, i) => (
              <li
                key={car._id}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openCar(car)}
                onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${active === i ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
              >
                {car.image ? (
                  <img src={car.image} alt="" className="h-10 w-14 shrink-0 rounded-lg object-cover" loading="lazy" />
                ) : (
                  <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <CarFront className="size-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium"><Highlighted text={car.name} query={stale ? '' : q} /></span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {formatPriceShort(car.price)}
                    {car.stock > 0 ? '' : ' · Hết hàng'}
                  </span>
                </span>
              </li>
            ))}
            {failed && (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Chưa tải được gợi ý. Bấm Enter để tìm trong danh sách xe.</li>
            )}
            {!waiting && !failed && items.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">Không có xe nào khớp “{q.trim()}”. Thử gõ tên hãng hoặc dòng xe.</li>
            )}
            <li
              id={`${id}-opt-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={searchAll}
              onMouseEnter={() => setActive(items.length)}
              className={`flex cursor-pointer items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:border-slate-800 dark:text-brand-400 ${
                active === items.length ? 'bg-slate-100 dark:bg-slate-800' : ''
              }`}
            >
              <Search className="size-4" />
              {total > items.length ? `Xem tất cả ${total} xe khớp “${q.trim()}”` : `Tìm “${q.trim()}” trong danh sách xe`}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
