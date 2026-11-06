import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, CarFront, CreditCard, Clock, MessageSquare, PackageX, Trophy, Users, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatNumber, formatPriceShort, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { RevenueChart, StatusBar } from '../components/charts';
import { CarThumb } from '../components/CarThumb';
import { Badge, ErrorBox, PageHeader, Spinner } from '../components/ui';

function Tile({ label, value, icon: Icon, children, to }) {
  const body = (
    <div className="card h-full p-5 transition hover:border-slate-300 dark:hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {children && <div className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{children}</div>}
    </div>
  );
  return to ? <Link to={to} className="block">{body}</Link> : body;
}

// Tháng này chưa hết nên chỉ hiện % khi đã vượt tháng trước
function Delta({ now, before }) {
  if (!before) return <span>Tháng trước chưa có doanh thu</span>;
  if (now < before) {
    return (
      <span>
        Tháng trước: <b className="font-semibold text-slate-700 dark:text-slate-200">{formatPriceShort(before)}</b>
      </span>
    );
  }
  const change = ((now - before) / before) * 100;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-600 dark:text-emerald-400">
        <ArrowUpRight className="size-4" />+{change.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
      </span>
      so với tháng trước
    </span>
  );
}

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const more = (to, label = 'Xem tất cả') => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-500">
    {label} <ArrowRight className="size-4" />
  </Link>
);

export default function Dashboard() {
  useTitle('Tổng quan');
  const admin = useAuth((s) => s.admin);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['stats'], queryFn: () => api('/stats') });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const months = data.revenueByMonth;
  const thisMonth = months.at(-1);
  const lastMonth = months.at(-2);
  const year = months.reduce((sum, m) => sum + m.revenue, 0);

  return (
    <>
      <PageHeader title={`Xin chào, ${admin?.username || 'admin'}`} description="Tình hình kinh doanh của showroom hôm nay." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Doanh thu tháng này" value={formatPriceShort(thisMonth.revenue)} icon={Wallet}>
          <Delta now={thisMonth.revenue} before={lastMonth.revenue} />
        </Tile>
        <Tile label="Đơn chờ xác nhận" value={formatNumber(data.orders.PENDING)} icon={Clock} to="/orders?status=PENDING">
          trên tổng {formatNumber(data.counts.orders)} đơn
        </Tile>
        <Tile label="Mẫu xe đang bán" value={formatNumber(data.counts.cars)} icon={CarFront} to="/cars">
          của {data.counts.brands} hãng xe
        </Tile>
        <Tile label="Khách hàng" value={formatNumber(data.counts.customers)} icon={Users} to="/customers">
          {data.unreadChats > 0 ? (
            <Link to="/chats" className="inline-flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-500">
              <MessageSquare className="size-4" /> {data.unreadChats} cuộc trò chuyện chưa đọc
            </Link>
          ) : (
            'Không có tin nhắn chưa đọc'
          )}
        </Tile>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Panel title="Doanh thu 12 tháng" className="xl:col-span-2">
          <p className="-mt-3 mb-2 text-sm text-slate-500 dark:text-slate-400">
            Từ các đơn đã xác nhận · tổng <b className="text-slate-800 dark:text-slate-200">{formatVnd(year)}</b>
          </p>
          <RevenueChart data={months} />
        </Panel>
        <Panel title="Trạng thái đơn hàng" action={more('/orders')}>
          <StatusBar counts={data.orders} />
          <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50">
            <p className="text-sm text-slate-500 dark:text-slate-400">Tổng doanh thu từ trước đến nay</p>
            <p className="mt-1 text-xl font-bold tabular-nums">{formatVnd(data.revenue)}</p>
          </div>
          <Link to="/orders?payment=paid" className="mt-3 block rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700">
            <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <CreditCard className="size-4" /> Tiền cọc online đã nhận
            </p>
            <p className="mt-1 text-lg font-bold tabular-nums">{formatVnd(data.deposits.total)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              từ {data.deposits.count} đơn
              {data.deposits.toRefund > 0 && (
                <span className="font-semibold text-red-600 dark:text-red-400"> · cần hoàn {formatVnd(data.deposits.toRefund)}</span>
              )}
            </p>
          </Link>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Đơn hàng mới nhất" action={more('/orders')} className="xl:col-span-1">
          <ul className="-mx-2 divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentOrders.map((o) => (
              <li key={o._id}>
                <Link to={`/orders?id=${o._id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {o.customerInfo?.name} <span className="font-normal text-slate-500">{shortId(o._id)}</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatPriceShort(o.total)}</p>
                    <Badge className={`mt-0.5 ${ORDER_STATUS[o.status].className}`}>{ORDER_STATUS[o.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Bán chạy nhất" action={<Trophy className="size-5 text-slate-400" />}>
          {data.topCars.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Chưa có xe nào được bán.</p>
          ) : (
            <ol className="space-y-3">
              {data.topCars.map((car, i) => (
                <li key={car._id} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold text-slate-400">{i + 1}</span>
                  <CarThumb car={car} className="h-10 w-14" />
                  <Link to={`/cars/${car._id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-600">
                    {car.name}
                  </Link>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    <b className="tabular-nums text-slate-800 dark:text-slate-100">{car.sold}</b> xe
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Sắp hết hàng" action={<PackageX className="size-5 text-slate-400" />}>
          {data.lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">Tất cả xe đều còn hàng.</p>
          ) : (
            <ul className="space-y-3">
              {data.lowStock.map((car) => (
                <li key={car._id} className="flex items-center gap-3">
                  <CarThumb car={car} className="h-10 w-14" />
                  <Link to={`/cars/${car._id}`} className="min-w-0 flex-1 truncate text-sm font-medium hover:text-brand-600">
                    {car.name}
                  </Link>
                  {car.stock === 0 ? (
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">Hết hàng</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Còn {car.stock}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
