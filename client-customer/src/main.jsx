import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { Layout, NotFound, RequireAuth, RouteError } from './components/Layout';
import { Spinner } from './components/ui';
import Home from './pages/Home';

const Cars = lazy(() => import('./pages/Cars'));
const CarDetail = lazy(() => import('./pages/CarDetail'));
const Cart = lazy(() => import('./pages/Cart'));
const Account = lazy(() => import('./pages/Account'));
const Orders = lazy(() => import('./pages/Orders'));
const Contact = lazy(() => import('./pages/Contact'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const Compare = lazy(() => import('./pages/Compare'));
const auth = (name) => lazy(() => import('./pages/Auth').then((m) => ({ default: m[name] })));
const Login = auth('Login');
const Signup = auth('Signup');
const Activate = auth('Activate');
const ForgotPassword = auth('ForgotPassword');
const ResetPassword = auth('ResetPassword');

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => error.status !== 404 && error.status !== 401 && count < 2
    }
  }
});

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Spinner />,
    children: [
      { index: true, element: <Home /> },
      { path: 'cars', element: <Cars /> },
      { path: 'cars/:slug', element: <CarDetail /> },
      { path: 'cart', element: <Cart /> },
      { path: 'contact', element: <Contact /> },
      { path: 'compare', element: <Compare /> },
      { path: 'payment/result', element: <PaymentResult /> },
      { path: 'login', element: <Login /> },
      { path: 'signup', element: <Signup /> },
      { path: 'activate', element: <Activate /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'account', element: <RequireAuth><Account /></RequireAuth> },
      { path: 'orders', element: <RequireAuth><Orders /></RequireAuth> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
