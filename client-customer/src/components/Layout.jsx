import { Suspense, useEffect } from 'react';
import { Navigate, Outlet, ScrollRestoration, useLocation, useRouteError, isRouteErrorResponse } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Header } from './Header';
import { Footer } from './Footer';
import { ChatWidget } from './ChatWidget';
import { CompareBar } from './Compare';
import { ButtonLink, Spinner } from './ui';
import { api } from '../lib/api';
import { useRealtime } from '../lib/live';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

function useRefreshAccount() {
  const token = useAuth((s) => s.token);
  const setCustomer = useAuth((s) => s.setCustomer);
  const { data } = useQuery({
    queryKey: ['me', token],
    queryFn: () => api('/customer/me'),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  useEffect(() => {
    if (data) setCustomer(data);
  }, [data, setCustomer]);
}

export function Layout() {
  useRefreshAccount();
  useRealtime();
  const theme = useUi((s) => s.theme);
  return (
    <div className="flex min-h-svh flex-col">
      <Header />
      <main className="flex-1">
        <Suspense fallback={<Spinner className="py-32" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CompareBar />
      <ChatWidget />
      <Toaster position="top-center" richColors theme={theme} />
      <ScrollRestoration />
    </div>
  );
}

// -- Trang cần đăng nhập --
export function RequireAuth({ children }) {
  const token = useAuth((s) => s.token);
  const location = useLocation();
  if (!token) return <Navigate to={`/login?from=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}

export function RouteError() {
  const error = useRouteError();
  return <ErrorPage notFound={isRouteErrorResponse(error) && error.status === 404} />;
}

export function NotFound() {
  return <ErrorPage notFound />;
}

function ErrorPage({ notFound }) {
  return (
    <div className="container-page grid min-h-[70svh] items-center gap-x-8 gap-y-6 py-20 md:grid-cols-12">
      <p className="price text-[clamp(6rem,16vw,14rem)] leading-none text-muted md:col-span-5">{notFound ? '404' : 'Lỗi'}</p>
      <div className="md:col-span-6 md:col-start-7">
        <h1 className="text-[length:var(--text-display-s)]">{notFound ? 'Không tìm thấy trang' : 'Đã có lỗi xảy ra'}</h1>
        <p className="mt-4 text-ink-2">{notFound ? 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.' : 'Hãy tải lại trang hoặc quay về trang chủ.'}</p>
        <ButtonLink to="/" className="mt-8">Về trang chủ</ButtonLink>
      </div>
    </div>
  );
}
