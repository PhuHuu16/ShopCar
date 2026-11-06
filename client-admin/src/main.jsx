import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AdminLayout, NotFound, Root, RouteError } from './components/Layout';
import { Spinner } from './components/ui';
import Dashboard from './pages/Dashboard';

// Pages other than the dashboard are loaded on demand.
const Login = lazy(() => import('./pages/Login'));
const Cars = lazy(() => import('./pages/Cars'));
const CarForm = lazy(() => import('./pages/CarForm'));
const Brands = lazy(() => import('./pages/Brands'));
const Orders = lazy(() => import('./pages/Orders'));
const Customers = lazy(() => import('./pages/Customers'));
const Chats = lazy(() => import('./pages/Chats'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
      retry: (count, error) => ![400, 401, 404].includes(error.status) && count < 2
    }
  }
});

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
            { index: true, element: <Dashboard /> },
            { path: 'cars', element: <Cars /> },
            { path: 'cars/:id', element: <CarForm /> },
            { path: 'brands', element: <Brands /> },
            { path: 'orders', element: <Orders /> },
            { path: 'customers', element: <Customers /> },
            { path: 'chats', element: <Chats /> },
            { path: 'chats/:id', element: <Chats /> },
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
