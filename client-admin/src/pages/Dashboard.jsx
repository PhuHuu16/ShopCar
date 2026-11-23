import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CarFront, CreditCard, Clock, Inbox, MessageSquare, Users, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import { formatDateTime, formatNumber, formatPriceShort, formatVnd, shortId } from '../lib/format';
import { ORDER_STATUS } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { useCan } from '../hooks/useCan';
import { RevenueChart, StatusBar } from '../components/charts';
import { CarThumb } from '../components/CarThumb';
import { Badge, ErrorBox, PageHeader, Spinner } from '../components/ui';

function Tile({ label, value, icon: Icon, children, to }) {
  const body = (
    <div className={`h-full border-t border-ink pt-4 ${to ? 'transition-colors duration-[var(--dur-micro)] group-hover:border-accent' : ''}`}>
      <p className="flex items-center gap-2 text-sm text-muted">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className={to ? 'decoration-accent underline-offset-4 group-hover:underline' : ''}>{label}</span>
      </p>
      <p className="mt-2 whitespace-nowrap font-display text-4xl font-light leading-tight text-ink tabular-nums">{value}</p>
      {children && <div className="mt-1.5 text-sm text-muted">{children}</div>}
    </div>
  );
  return to ? <Link to={to} className="group block rounded-sm">{body}</Link> : body;
}

function Delta({ now, before }) {
  if (!before) return <span>Tháng trước chưa có doanh thu</span>;
  if (now < before) {
    return (
      <span>
        Tháng trước <span className="text-ink-2 tabular-nums">{formatPriceShort(before)}</span>
      </span>
    );
  }
  const change = ((now - before) / before) * 100;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5 font-medium text-success">
        <ArrowUpRight className="size-4" />+{change.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
      </span>
      so với tháng trước
    </span>
  );
}

function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`card p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const more = (to, label = 'Xem tất cả đơn') => (
  <Link to={to} className="whitespace-nowrap text-sm text-ink underline decoration-accent decoration-1 underline-offset-4 hover:decoration-2">
    {label}
  </Link>
);

export default function Dashboard() {
  useTitle('Tổng quan');
  const canChat = useCan('chats.reply');
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['stats'], queryFn: () => api('/stats') });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const months = data.revenueByMonth;
  const money = Array.isArray(months);
  const thisMonth = money ? months.at(-1) : null;
  const lastMonth = money ? months.at(-2) : null;
  const year = money ? months.reduce((sum, m) => sum + m.revenue, 0) : 0;

  return (
    <>
      <PageHeader title="Tổng quan" description={`Tình hình kinh doanh của showroom, tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {money && (
          <Tile label="Doanh thu tháng này" value={formatPriceShort(thisMonth.revenue)} icon={Wallet}>
            <Delta now={thisMonth.revenue} before={lastMonth.revenue} />
          </Tile>
        )}
        <Tile label="Đơn chờ xác nhận" value={formatNumber(data.orders.PENDING)} icon={Clock} to="/orders?status=PENDING">
          trên tổng {formatNumber(data.counts.orders)} đơn
        </Tile>
        <Tile label="Mẫu xe đang bán" value={formatNumber(data.counts.cars)} icon={CarFront} to="/cars">
          của {data.counts.brands} hãng xe
        </Tile>
        <Tile label="Khách hàng" value={formatNumber(data.counts.customers)} icon={Users} to="/customers">
          {data.unreadChats > 0 && !canChat ? (
            `${data.unreadChats} cuộc trò chuyện chờ nhân viên tư vấn`
          ) : data.unreadChats > 0 ? (
            <Link to="/chats" className="inline-flex items-center gap-1.5 text-ink underline decoration-accent underline-offset-4">
              <MessageSquare className="size-4 text-muted" aria-hidden="true" /> {data.unreadChats} cuộc trò chuyện chưa đọc
            </Link>
          ) : (
            'Không có tin nhắn chưa đọc'
          )}
          {data.newContacts > 0 && (
            <Link to="/contacts" className="mt-1 flex items-center gap-1.5 text-ink underline decoration-accent underline-offset-4">
              <Inbox className="size-4 text-muted" aria-hidden="true" /> {data.newContacts} lời nhắn chờ gọi lại
            </Link>
          )}
        </Tile>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        {money && <Panel title="Doanh thu 12 tháng" className="xl:col-span-2">
          <p className="-mt-3 mb-2 text-sm text-muted">
            Từ các đơn đã xác nhận, tổng <span className="text-ink tabular-nums">{formatVnd(year)}</span>. Cột màu xanh là tháng này
          </p>
          <RevenueChart data={months} />
        </Panel>}
        <Panel title="Trạng thái đơn hàng" action={more('/orders')}>
          <StatusBar counts={data.orders} />
          {money && <>
          <div className="mt-6 border-t border-ink pt-4">
            <p className="text-sm text-muted">Tổng doanh thu từ trước đến nay</p>
            <p className="mt-1 font-display text-3xl font-light leading-tight tabular-nums">{formatVnd(data.revenue)}</p>
          </div>
          <Link to="/orders?payment=paid" className="group mt-4 block border-t border-rule pt-4">
            <p className="flex items-center gap-2 text-sm text-muted">
              <CreditCard className="size-4" aria-hidden="true" /> <span className="decoration-accent underline-offset-4 group-hover:underline">Tiền cọc online đã nhận</span>
            </p>
            <p className="mt-1 font-display text-2xl font-light leading-tight tabular-nums">{formatVnd(data.deposits.total)}</p>
            <p className="mt-1 text-sm text-muted">
              từ {data.deposits.count} đơn
              {data.deposits.toRefund > 0 && (
                <span className="text-error">, cần hoàn {formatVnd(data.deposits.toRefund)}</span>
              )}
            </p>
          </Link>
          </>}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="Đơn hàng mới nhất" action={more('/orders')} className="xl:col-span-1">
          <ul className="-mx-2 divide-y divide-rule">
            {data.recentOrders.map((o) => (
              <li key={o._id}>
                <Link to={`/orders?id=${o._id}`} className="flex min-h-14 items-center gap-3 rounded-sm px-2 py-2.5 transition-colors duration-[var(--dur-micro)] hover:bg-paper-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">
                      {o.customerInfo?.name} <span className="text-muted">{shortId(o._id)}</span>
                    </p>
                    <p className="text-xs text-muted tabular-nums">{formatDateTime(o.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink tabular-nums">{formatPriceShort(o.total)}</p>
                    <Badge className={`mt-0.5 ${ORDER_STATUS[o.status].className}`}>{ORDER_STATUS[o.status].label}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Bán chạy nhất">
          {data.topCars.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Chưa có xe nào được bán.</p>
          ) : (
            <ol className="divide-y divide-rule">
              {data.topCars.map((car, i) => (
                <li key={car._id} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="w-5 font-display text-lg text-muted tabular-nums">{i + 1}</span>
                  <CarThumb car={car} className="h-10 w-14" />
                  <Link to={`/cars/${car._id}`} className="min-w-0 flex-1 truncate text-sm text-ink decoration-accent underline-offset-4 hover:underline">
                    {car.name}
                  </Link>
                  <span className="text-sm text-muted">
                    <span className="tabular-nums text-ink">{car.sold}</span> xe
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Sắp hết hàng">
          {data.lowStock.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Tất cả xe đều còn hàng.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {data.lowStock.map((car) => (
                <li key={car._id} className="flex min-h-14 items-center gap-3 py-2">
                  <CarThumb car={car} className="h-10 w-14" />
                  <Link to={`/cars/${car._id}`} className="min-w-0 flex-1 truncate text-sm text-ink decoration-accent underline-offset-4 hover:underline">
                    {car.name}
                  </Link>
                  {car.stock === 0 ? (
                    <Badge className="bg-error-soft text-error">Hết hàng</Badge>
                  ) : (
                    <Badge className="bg-warn-soft text-warn">Còn {car.stock}</Badge>
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
