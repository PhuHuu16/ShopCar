import { Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation, useRouteError } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import {
  CarFront, ExternalLink, History, Inbox, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, ReceiptText, Sun, Tags, UserCog, Users, X
} from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { useLive, useLiveUpdates } from '../hooks/live';
import { useCan } from '../hooks/useCan';
import { ADMIN_ROLE } from '../lib/labels';
import { ConfirmHost } from './confirm';
import { ButtonLink, Spinner } from './ui';

export function Logo({ className = '' }) {
  return (
    <Link to="/" aria-label="ShopCar Admin, về trang tổng quan" className={`flex items-baseline gap-2 ${className}`}>
      <span className="wordmark text-[1.5rem]">SHOPCAR</span>
      <span className="text-sm text-muted">Admin</span>
    </Link>
  );
}

function useBadges() {
  const token = useAuth((s) => s.token);
  const canStats = useCan('dashboard.view');
  const canChat = useCan('chats.reply');
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api('/stats'), enabled: !!token && canStats, refetchInterval: 60_000 });
  const chats = useQuery({ queryKey: ['chats'], queryFn: () => api('/chats'), enabled: !!token && canChat });
  return {
    orders: stats.data?.orders?.PENDING || 0,
    contacts: stats.data?.newContacts || 0,
    chats: (chats.data || []).filter((c) => c.unreadByAdmin > 0).length
  };
}

const NAV = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true, permission: 'dashboard.view' },
  { to: '/cars', label: 'Xe', icon: CarFront, permission: 'cars.view' },
  { to: '/brands', label: 'Hãng xe', icon: Tags, permission: 'cars.view' },
  { to: '/orders', label: 'Đơn hàng', icon: ReceiptText, badge: 'orders', permission: 'orders.view' },
  { to: '/customers', label: 'Khách hàng', icon: Users, permission: 'customers.view' },
  { to: '/chats', label: 'Tin nhắn', icon: MessageSquare, badge: 'chats', permission: 'chats.reply' },
  { to: '/contacts', label: 'Liên hệ', icon: Inbox, badge: 'contacts', permission: 'contacts.handle' },
  { to: '/staff', label: 'Nhân viên', icon: UserCog, permission: 'staff.manage' },
  { to: '/audit', label: 'Nhật ký', icon: History, permission: 'audit.view' }
];

function Sidebar() {
  const badges = useBadges();
  const { sidebarOpen, setSidebarOpen } = useUi();
  const admin = useAuth((s) => s.admin);
  const logout = useAuth((s) => s.logout);
  const nav = NAV.filter((item) => !item.permission || admin?.permissions?.includes(item.permission));

  const content = (
    <div className="flex h-full flex-col border-r border-rule bg-paper-2 px-4 py-5 text-ink-2">
      <div className="flex items-center justify-between px-2">
        <Logo />
        <button type="button" className="flex size-9 items-center justify-center rounded-md hover:bg-paper-3 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-0.5" aria-label="Menu quản trị">
        {nav.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex min-h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors duration-[var(--dur-micro)] ${
                isActive ? 'bg-card text-ink shadow-sm ring-1 ring-rule' : 'hover:bg-paper-3 hover:text-ink'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-[1.125rem] ${isActive ? 'text-accent' : 'text-muted'}`} aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {badge && badges[badge] > 0 && (
                  <span className="min-w-6 rounded-sm bg-ink px-1.5 py-0.5 text-center text-xs text-paper tabular-nums">
                    {badges[badge]}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-rule pt-4">
        <div className="flex items-center gap-1">
          <NavLink
            to="/account"
            onClick={() => setSidebarOpen(false)}
            title="Tài khoản của tôi"
            className={({ isActive }) => `flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1.5 transition-colors duration-[var(--dur-micro)] hover:bg-paper-3 ${isActive ? 'bg-card ring-1 ring-rule' : ''}`}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-ink font-display text-lg text-ink">
              {(admin?.name || admin?.username)?.[0] || 'A'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-ink">{admin?.name || admin?.username}</span>
              <span className="block truncate text-xs text-muted">{ADMIN_ROLE[admin?.role || 'admin'].label}</span>
            </span>
          </NavLink>
          <button type="button" onClick={logout} className="flex size-9 items-center justify-center rounded-md hover:bg-paper-3 hover:text-ink" title="Đăng xuất" aria-label="Đăng xuất">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{content}</aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-[var(--z-modal)] lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]">{content}</aside>
        </div>
      )}
    </>
  );
}

function Topbar() {
  const { theme, toggleTheme, setSidebarOpen } = useUi();
  const connected = useLive((s) => s.connected);
  return (
    <header className="sticky top-0 z-[var(--z-sticky-nav)] flex h-16 items-center gap-3 border-b border-rule bg-paper px-4 sm:px-6">
      <button type="button" className="flex size-10 items-center justify-center rounded-md hover:bg-paper-2 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
        <Menu className="size-5" />
      </button>
      <Logo className="lg:hidden" />
      <div className="flex-1" />
      <span
        role="status"
        className="hidden items-center gap-2 text-sm text-muted sm:flex"
        title={connected ? 'Nhận tin nhắn, lời nhắn và đơn hàng mới ngay lập tức' : 'Đang kết nối lại…'}
      >
        <span className={`size-2 rounded-full ${connected ? 'bg-success' : 'bg-warn'}`} />
        {connected ? 'Trực tuyến' : 'Đang kết nối…'}
      </span>
      <a
        href={SHOP_URL || '/'}
        target="_blank"
        rel="noreferrer"
        className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm text-ink-2 hover:bg-paper-2 hover:text-ink"
      >
        <ExternalLink className="size-4" /> <span className="hidden sm:inline">Xem cửa hàng</span>
      </a>
      <button type="button" onClick={toggleTheme} className="flex size-10 items-center justify-center rounded-md text-ink-2 hover:bg-paper-2 hover:text-ink" aria-label="Đổi giao diện sáng/tối">
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
    </header>
  );
}

// -- Kiểm tra phiên đăng nhập khi mở trang --
function useRefreshAdmin(token) {
  const setAdmin = useAuth((s) => s.setAdmin);
  useEffect(() => {
    if (token) api('/me').then(setAdmin).catch(() => {});
  }, [token, setAdmin]);
}

export function AdminLayout() {
  const token = useAuth((s) => s.token);
  const location = useLocation();
  useRefreshAdmin(token);
  useLiveUpdates(token);
  if (!token) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return (
    <div className="min-h-svh lg:pl-64">
      <Sidebar />
      <Topbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <ConfirmHost />
    </div>
  );
}

export function Root() {
  const theme = useUi((s) => s.theme);
  return (
    <>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
      <Toaster richColors closeButton position="top-right" theme={theme} />
      <ScrollRestoration />
    </>
  );
}

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-display text-8xl font-light text-muted">404</p>
      <h1 className="mt-4 text-3xl">Không tìm thấy trang</h1>
      <ButtonLink to="/" className="mt-6">Về trang tổng quan</ButtonLink>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl">Đã có lỗi xảy ra</h1>
      <p className="mt-2 text-muted">Hãy tải lại trang. Nếu vẫn lỗi, kiểm tra máy chủ API đang chạy.</p>
      <a href="/admin/" className="mt-6 text-ink underline decoration-accent underline-offset-4">Tải lại</a>
    </div>
  );
}
