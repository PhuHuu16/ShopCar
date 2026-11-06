import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { formatPriceShort, formatVnd } from '../lib/format';

const TERMS = [12, 24, 36, 48, 60, 72, 84, 96];

// Car loan on a reducing balance (how most Vietnamese banks lend):
// the same principal every month, interest on what is still owed.
export function loanPlan(price, downPercent, months, yearlyRate) {
  const loan = Math.round(price * (1 - downPercent / 100));
  const principal = loan / months;
  const monthlyRate = yearlyRate / 100 / 12;
  const first = principal + loan * monthlyRate;
  const last = principal + principal * monthlyRate;
  const totalInterest = loan * monthlyRate * ((months + 1) / 2);

  const years = [];
  for (let y = 0; y < Math.ceil(months / 12); y++) {
    let paid = 0;
    let interest = 0;
    for (let m = y * 12; m < Math.min(months, (y + 1) * 12); m++) {
      const owed = loan - principal * m;
      interest += owed * monthlyRate;
      paid += principal + owed * monthlyRate;
    }
    years.push({ year: y + 1, paid, interest, remaining: Math.max(0, loan - principal * Math.min(months, (y + 1) * 12)) });
  }
  return { loan, down: price - loan, first, last, totalInterest, total: price + totalInterest, years };
}

function Row({ label, value, strong }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`tabular-nums ${strong ? 'text-base font-bold' : 'font-semibold'}`}>{value}</span>
    </div>
  );
}

export function LoanCalculator({ price }) {
  const [down, setDown] = useState(30);
  const [months, setMonths] = useState(60);
  const [rate, setRate] = useState(8.5);
  const validRate = Number.isFinite(rate) && rate >= 0 && rate <= 30;
  const plan = useMemo(() => loanPlan(price, down, months, validRate ? rate : 0), [price, down, months, rate, validRate]);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
          <Calculator className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Tính trả góp</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Vay tối đa 80% giá xe, dư nợ giảm dần</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="down" className="label mb-0">Trả trước</label>
              <span className="text-sm font-semibold tabular-nums">{down}% · {formatPriceShort(plan.down)}</span>
            </div>
            <input
              id="down"
              type="range"
              min="20"
              max="90"
              step="5"
              value={down}
              onChange={(e) => setDown(Number(e.target.value))}
              className="mt-3 w-full accent-brand-600"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400"><span>20%</span><span>90%</span></div>
          </div>

          <div>
            <span className="label">Thời hạn vay</span>
            <div className="grid grid-cols-4 gap-2">
              {TERMS.map((t) => (
                <button
                  key={t}
                  onClick={() => setMonths(t)}
                  aria-pressed={months === t}
                  className={`rounded-lg border py-2 text-sm font-semibold transition ${
                    months === t
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                  }`}
                >
                  {t / 12} năm
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rate" className="label">Lãi suất (%/năm)</label>
            <input
              id="rate"
              type="number"
              min="0"
              max="30"
              step="0.1"
              value={Number.isFinite(rate) ? rate : ''}
              onChange={(e) => setRate(e.target.valueAsNumber)}
              className={`input ${validRate ? '' : 'border-red-400'}`}
            />
            <p className="mt-1.5 text-xs text-slate-500">Lãi tham khảo, tùy ngân hàng và thời điểm vay.</p>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-800/50">
          <p className="text-sm text-slate-500 dark:text-slate-400">Trả tháng đầu tiên</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-brand-600 tabular-nums">{formatVnd(Math.round(plan.first))}</p>
          <p className="mt-1 text-xs text-slate-500">giảm dần đến {formatVnd(Math.round(plan.last))} ở tháng cuối</p>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
            <Row label="Số tiền vay" value={formatVnd(plan.loan)} />
            <Row label="Trả trước" value={formatVnd(plan.down)} />
            <Row label="Tổng tiền lãi" value={formatVnd(Math.round(plan.totalInterest))} />
            <Row label="Tổng chi phí xe" value={formatVnd(Math.round(plan.total))} strong />
          </div>
        </div>
      </div>

      <details className="group mt-5">
        <summary className="cursor-pointer text-sm font-semibold text-brand-600 hover:text-brand-700">Xem lịch trả nợ theo năm</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-semibold">Năm</th>
                <th className="py-2 text-right font-semibold">Phải trả</th>
                <th className="py-2 text-right font-semibold">Trong đó lãi</th>
                <th className="py-2 text-right font-semibold">Dư nợ còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {plan.years.map((y) => (
                <tr key={y.year}>
                  <td className="py-2">Năm {y.year}</td>
                  <td className="py-2 text-right tabular-nums">{formatVnd(Math.round(y.paid))}</td>
                  <td className="py-2 text-right tabular-nums text-slate-500">{formatVnd(Math.round(y.interest))}</td>
                  <td className="py-2 text-right tabular-nums">{formatVnd(Math.round(y.remaining))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
