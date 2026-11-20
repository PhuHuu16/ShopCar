import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AdminLayout, NotFound, Root, RouteError } from './components/Layout';
import { Spinner } from './components/ui';
import { RequirePermission } from './components/RequirePermission';
import Dashboard from './pages/Dashboard';

const Login = lazy(() => import('./pages/Login'));
const Cars = lazy(() => import('./pages/Cars'));
const CarForm = lazy(() => import('./pages/CarForm'));
const Brands = lazy(() => import('./pages/Brands'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const Chats = lazy(() => import('./pages/Chats'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Staff = lazy(() => import('./pages/Staff'));
const Account = lazy(() => import('./pages/Account'));
const Audit = lazy(() => import('./pages/Audit'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => ![400, 401, 403, 404].includes(error.status) && count < 2
    }
  }
});

const guard = (permission, page) => <RequirePermission permission={permission}>{page}</RequirePermission>;

const router = createBrowserRouter(
  [
    {
      element: <Root />,
      errorElement: <RouteError />,
      hydrateFallbackElement: <Spinner />,
      children: [
        { path: 'login', element: <Login /> },
        {
          element: <AdminLayout />,
          children: [
            { index: true, element: guard('dashboard.view', <Dashboard />) },
            { path: 'cars', element: guard('cars.view', <Cars />) },
            { path: 'cars/:id', element: guard('cars.view', <CarForm />) },
            { path: 'brands', element: guard('cars.view', <Brands />) },
            { path: 'orders', element: guard('orders.view', <Orders />) },
            { path: 'customers', element: guard('customers.view', <Customers />) },
            { path: 'chats', element: guard('chats.reply', <Chats />) },
            { path: 'chats/:id', element: guard('chats.reply', <Chats />) },
            { path: 'contacts', element: guard('contacts.handle', <Contacts />) },
            { path: 'staff', element: guard('staff.manage', <Staff />) },
            { path: 'audit', element: guard('audit.view', <Audit />) },
            { path: 'account', element: <Account /> },
            { path: '*', element: <NotFound /> }
          ]
        }
      ]
    }
  ],
  { basename: '/admin' }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
