import { Suspense, useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, ScrollRestoration, useLocation, useRouteError } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import {
  CarFront, ExternalLink, LayoutDashboard, LogOut, Menu, MessageSquare, Moon, ReceiptText, Sun, Tags, Users, X
} from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';
import { useLive, useLiveUpdates } from '../hooks/live';
import { ConfirmHost } from './confirm';
import { ButtonLink, Spinner } from './ui';

export function Logo({ light = false }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-lg shadow-brand-600/30">
        <CarFront className="size-5" />
      </span>
      <span className={`text-lg font-bold tracking-tight ${light ? 'text-white' : ''}`}>
        Shop<span className="text-brand-500">Car</span>
        <span className="ml-1.5 rounded-md bg-white/10 px-1.5 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wider text-slate-300">
          Admin
        </span>
      </span>
    </Link>
  );
}

// Counters shown next to the menu items
function useBadges() {
  const token = useAuth((s) => s.token);
  const stats = useQuery({ queryKey: ['stats'], queryFn: () => api('/stats'), enabled: !!token, refetchInterval: 60_000 });
  const chats = useQuery({ queryKey: ['chats'], queryFn: () => api('/chats'), enabled: !!token });
  return {
    orders: stats.data?.orders?.PENDING || 0,
    chats: (chats.data || []).filter((c) => c.unreadByAdmin > 0).length
  };
}

const NAV = [
  { to: '/', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/cars', label: 'Xe', icon: CarFront },
  { to: '/brands', label: 'Hãng xe', icon: Tags },
  { to: '/orders', label: 'Đơn hàng', icon: ReceiptText, badge: 'orders' },
  { to: '/customers', label: 'Khách hàng', icon: Users },
  { to: '/chats', label: 'Tin nhắn', icon: MessageSquare, badge: 'chats' }
];

function Sidebar() {
  const badges = useBadges();
  const { sidebarOpen, setSidebarOpen } = useUi();
  const admin = useAuth((s) => s.admin);
  const logout = useAuth((s) => s.logout);

  const content = (
    <div className="flex h-full flex-col bg-slate-950 px-4 py-5 text-slate-300">
      <div className="flex items-center justify-between px-2">
        <Logo light />
        <button className="rounded-lg p-1.5 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Đóng menu">
          <X className="size-5" />
        </button>
      </div>
      <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Menu quản trị">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`size-5 ${isActive ? 'text-brand-500' : ''}`} />
                <span className="flex-1">{label}</span>
                {badge && badges[badge] > 0 && (
                  <span className="min-w-6 rounded-full bg-brand-600 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                    {badges[badge]}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 px-2">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10 font-semibold uppercase text-white">
            {admin?.username?.[0] || 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{admin?.username}</p>
            <p className="text-xs text-slate-400">Quản trị viên</p>
          </div>
          <button onClick={logout} className="rounded-lg p-2 hover:bg-white/10 hover:text-white" title="Đăng xuất" aria-label="Đăng xuất">
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
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setSidebarOpen(false)} />
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
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-950/85">
      <button className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" onClick={() => setSidebarOpen(true)} aria-label="Mở menu">
        <Menu className="size-5" />
      </button>
      <Link to="/" className="flex items-center gap-2 font-bold tracking-tight lg:hidden">
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <CarFront className="size-4" />
        </span>
        <span>Shop<span className="text-brand-600">Car</span></span>
      </Link>
      <div className="flex-1" />
      <span
        className="hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex dark:text-slate-400"
        title={connected ? 'Nhận tin nhắn và đơn hàng mới ngay lập tức' : 'Đang kết nối lại...'}
      >
        <span className={`size-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
        {connected ? 'Trực tuyến' : 'Đang kết nối...'}
      </span>
      <a
        href={SHOP_URL || '/'}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <ExternalLink className="size-4" /> <span className="hidden sm:inline">Xem cửa hàng</span>
      </a>
      <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Đổi giao diện sáng/tối">
        {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
      </button>
    </header>
  );
}

// Checks the saved login is still valid when the site opens
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
    <div className="min-h-screen lg:pl-64">
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

// Wraps every page (also the login page) with toasts and scroll handling
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
      <p className="text-6xl font-extrabold text-brand-600">404</p>
      <h1 className="mt-4 text-xl font-semibold">Không tìm thấy trang</h1>
      <ButtonLink to="/" className="mt-6">Về trang tổng quan</ButtonLink>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  console.error(error);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold">Đã có lỗi xảy ra</h1>
      <p className="mt-2 text-slate-500">Hãy tải lại trang. Nếu vẫn lỗi, kiểm tra máy chủ API đang chạy.</p>
      <a href="/admin/" className="mt-6 font-semibold text-brand-600">Tải lại</a>
    </div>
  );
}
