import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { formatAxisVnd, formatMonth, formatNumber, formatVnd } from '../lib/format';
import { ORDER_STATUS } from '../lib/labels';

// Rounds the axis top up to a clean number: 1 / 2 / 2.5 / 5 x 10^n per step
function niceScale(max, steps = 4) {
  if (max <= 0) return { top: steps, step: 1 };
  const raw = max / steps;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw);
  return { top: step * steps, step };
}

// Monthly revenue as columns. One series, so no legend: the card title names it.
// Hover or focus a month for its exact numbers; the table view lists every value.
export function RevenueChart({ data }) {
  const [view, setView] = useState('chart');
  const [active, setActive] = useState(null);
  const max = Math.max(...data.map((d) => d.revenue));
  const { top, step } = niceScale(max);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const peak = data.findIndex((d) => d.revenue === max && max > 0);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700" role="group" aria-label="Kiểu hiển thị">
          {[
            ['chart', BarChart3, 'Biểu đồ'],
            ['table', Table2, 'Bảng']
          ].map(([key, Icon, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              aria-pressed={view === key}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                view === key ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'table' ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="py-2 font-semibold">Tháng</th>
                <th className="py-2 text-right font-semibold">Số đơn</th>
                <th className="py-2 text-right font-semibold">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((d) => (
                <tr key={d.month}>
                  <td className="py-2">{formatMonth(d.month)}</td>
                  <td className="py-2 text-right tabular-nums">{d.orders}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatVnd(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-3">
          {/* y axis */}
          <div className="relative h-64 w-12 shrink-0 text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
            {ticks.map((t) => (
              <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / top) * 100}%` }}>
                {formatAxisVnd(t)}
              </span>
            ))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative h-64">
              {ticks.map((t) => (
                <div
                  key={t}
                  className={`absolute inset-x-0 h-px ${t === 0 ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-100 dark:bg-slate-800'}`}
                  style={{ bottom: `${(t / top) * 100}%` }}
                />
              ))}
              <div className="absolute inset-0 flex">
                {data.map((d, i) => {
                  const pct = (d.revenue / top) * 100;
                  const isActive = active === i;
                  return (
                    <div
                      key={d.month}
                      tabIndex={0}
                      role="img"
                      aria-label={`${formatMonth(d.month)}: ${formatVnd(d.revenue)}, ${d.orders} đơn`}
                      className="group relative flex flex-1 cursor-default items-end justify-center outline-none"
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                    >
                      {/* hover band: the whole month slot is the hit target */}
                      <div className={`absolute inset-x-0.5 inset-y-0 rounded-md transition ${isActive ? 'bg-slate-100 dark:bg-slate-800/70' : ''}`} />
                      <div
                        className="relative w-full max-w-6 rounded-t-[4px] bg-brand-600 transition-[height] duration-500 dark:bg-brand-500"
                        style={{ height: `${pct}%`, minHeight: d.revenue > 0 ? 2 : 0 }}
                      />
                      {i === peak && !isActive && (
                        <span className="absolute -translate-y-1.5 whitespace-nowrap text-[11px] font-semibold text-slate-700 dark:text-slate-200" style={{ bottom: `${pct}%` }}>
                          {formatAxisVnd(d.revenue)}
                        </span>
                      )}
                      {isActive && (
                        <div
                          className={`pointer-events-none absolute z-10 w-max rounded-xl bg-slate-900 px-3 py-2 text-xs text-white shadow-xl dark:bg-white dark:text-slate-900 ${
                            i > data.length - 4 ? 'right-0' : i < 3 ? 'left-0' : 'left-1/2 -translate-x-1/2'
                          }`}
                          style={{ bottom: `calc(${Math.min(pct, 80)}% + 10px)` }}
                        >
                          <p className="font-semibold">{formatMonth(d.month)}</p>
                          <p className="mt-0.5 tabular-nums">{formatVnd(d.revenue)}</p>
                          <p className="text-slate-300 dark:text-slate-500">{d.orders} đơn đã xác nhận</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* x axis */}
            <div className="mt-2 flex text-[11px] text-slate-500 dark:text-slate-400">
              {data.map((d, i) => (
                <span key={d.month} className={`flex-1 text-center ${i % 2 ? 'hidden sm:block' : ''}`}>
                  {formatMonth(d.month, true)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One bar split by order status, with a legend that carries labels and counts
export function StatusBar({ counts }) {
  const entries = Object.entries(ORDER_STATUS).map(([key, s]) => ({ key, ...s, count: counts[key] || 0 }));
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  const [active, setActive] = useState(null);
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        {entries.map((e) =>
          e.count > 0 ? (
            <div
              key={e.key}
              className={`${e.dot} h-full transition-opacity ${active && active !== e.key ? 'opacity-40' : ''}`}
              style={{ width: `${(e.count / total) * 100}%` }}
              title={`${e.label}: ${e.count} đơn`}
              onMouseEnter={() => setActive(e.key)}
              onMouseLeave={() => setActive(null)}
            />
          ) : null
        )}
      </div>
      <ul className="mt-4 space-y-2.5">
        {entries.map((e) => (
          <li
            key={e.key}
            className="flex items-center gap-2.5 text-sm"
            onMouseEnter={() => setActive(e.key)}
            onMouseLeave={() => setActive(null)}
          >
            <span className={`size-2.5 rounded-full ${e.dot}`} />
            <span className="flex-1 text-slate-600 dark:text-slate-300">{e.label}</span>
            <span className="font-semibold tabular-nums">{formatNumber(e.count)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">
              {total ? Math.round((e.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
