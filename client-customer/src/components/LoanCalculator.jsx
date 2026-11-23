import { useMemo, useState } from 'react';
import { formatPriceShort, formatVnd } from '../lib/format';

const TERMS = [12, 24, 36, 48, 60, 72, 84, 96];

// -- Tính trả góp theo dư nợ giảm dần --
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
    <div className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className={`tabular-nums text-ink ${strong ? 'text-base font-medium' : ''}`}>{value}</span>
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
    <section className="border-t border-ink pt-10">
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-12">
        <h2 className="text-[length:var(--text-3xl)] md:col-span-5">Tính trả góp</h2>
        <p className="text-ink-2 md:col-span-6 md:col-start-7 md:self-end">Vay tối đa 80% giá xe, dư nợ giảm dần</p>
      </div>

      <div className="mt-10 grid gap-x-[var(--space-3xl)] gap-y-10 md:grid-cols-2">
        <div className="space-y-7">
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="down" className="label mb-0">Trả trước</label>
              <span className="text-sm text-ink tabular-nums">{down}%, {formatPriceShort(plan.down)}</span>
            </div>
            <input
              id="down"
              type="range"
              min="20"
              max="90"
              step="5"
              value={down}
              onChange={(e) => setDown(Number(e.target.value))}
              className="mt-3 w-full accent-ink"
            />
            <div className="mt-1 flex justify-between text-xs text-muted"><span>20%</span><span>90%</span></div>
          </div>

          <div>
            <span className="label">Thời hạn vay</span>
            <div className="grid grid-cols-4 gap-2">
              {TERMS.map((t) => (
                <button
                  key={t}
                  onClick={() => setMonths(t)}
                  aria-pressed={months === t}
                  type="button"
                  className={`min-h-11 whitespace-nowrap rounded-md border text-sm transition-colors duration-[var(--dur-short)] ${
                    months === t ? 'border-ink bg-ink text-paper' : 'border-muted text-ink hover:bg-paper-2'
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
              className={`input ${validRate ? '' : 'border-error'}`}
            />
            <p className="mt-1.5 text-xs text-muted">Lãi tham khảo, tùy ngân hàng và thời điểm vay.</p>
          </div>
        </div>

        <div className="stock self-start p-8">
          <p className="text-sm text-muted">Trả tháng đầu tiên</p>
          <p className="price mt-2 text-[length:var(--text-display-s)] leading-none">{formatVnd(Math.round(plan.first))}</p>
          <p className="mt-3 text-sm text-muted">giảm dần đến {formatVnd(Math.round(plan.last))} ở tháng cuối</p>
          <div className="mt-6 border-t border-ink [&>*+*]:border-t [&>*+*]:border-rule">
            <Row label="Số tiền vay" value={formatVnd(plan.loan)} />
            <Row label="Trả trước" value={formatVnd(plan.down)} />
            <Row label="Tổng tiền lãi" value={formatVnd(Math.round(plan.totalInterest))} />
            <Row label="Tổng chi phí xe" value={formatVnd(Math.round(plan.total))} strong />
          </div>
        </div>
      </div>

      <details className="group mt-8">
        <summary className="link cursor-pointer text-sm">Xem lịch trả nợ theo năm</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="py-2 font-medium">Năm</th>
                <th className="py-2 text-right font-medium">Phải trả</th>
                <th className="py-2 text-right font-medium">Trong đó lãi</th>
                <th className="py-2 text-right font-medium">Dư nợ còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {plan.years.map((y) => (
                <tr key={y.year}>
                  <td className="py-2">Năm {y.year}</td>
                  <td className="py-2 text-right tabular-nums">{formatVnd(Math.round(y.paid))}</td>
                  <td className="py-2 text-right tabular-nums text-muted">{formatVnd(Math.round(y.interest))}</td>
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
