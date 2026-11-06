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
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

// Refreshes the saved customer details once per visit (name changes, blocked account...).
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
  const theme = useUi((s) => s.theme);
  return (
    <div className="flex min-h-screen flex-col">
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

// Pages that need a logged-in customer send visitors to the login page first.
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
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-brand-600">{notFound ? '404' : 'Oops'}</p>
      <h1 className="mt-4 text-2xl font-bold">{notFound ? 'Không tìm thấy trang' : 'Đã có lỗi xảy ra'}</h1>
      <p className="mt-2 text-slate-500">{notFound ? 'Trang bạn tìm không tồn tại hoặc đã được chuyển đi.' : 'Hãy tải lại trang hoặc quay về trang chủ.'}</p>
      <ButtonLink to="/" className="mt-8">Về trang chủ</ButtonLink>
    </div>
  );
}
