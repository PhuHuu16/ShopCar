import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { Logo } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

function safeRedirect(from) {
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

// -- Đăng nhập quản trị --
export default function Login() {
  useTitle('Đăng nhập');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { token, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });

  const mutation = useMutation({
    mutationFn: () => api('/login', { method: 'POST', body: form }),
    onSuccess: (data) => {
      login(data.token, data.admin);
      navigate(safeRedirect(params.get('from')), { replace: true });
    }
  });

  if (token) return <Navigate to={safeRedirect(params.get('from'))} replace />;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="hidden border-r border-rule bg-paper-2 p-16 lg:flex lg:flex-col">
        <Logo />
        <div className="mt-auto max-w-xl">
          <h1 className="text-[length:var(--text-3xl)] xl:text-6xl">Quản lý showroom trong một nơi.</h1>
          <p className="mt-6 max-w-md text-lg text-ink-2">
            Theo dõi doanh thu, duyệt đơn đặt xe, cập nhật kho xe và trả lời khách hàng theo thời gian thực.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <form
          className="w-full max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h2 className="text-3xl">Đăng nhập quản trị</h2>
          <p className="mt-1 text-sm text-muted">Dành cho nhân viên showroom ShopCar.</p>

          <div className="mt-8 space-y-4">
            <Input id="username" label="Tên đăng nhập" autoComplete="username" value={form.username} onChange={set('username')} required autoFocus />
            <Input id="password" label="Mật khẩu" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
            {mutation.error && (
              <p className="rounded-md bg-error-soft px-3.5 py-2.5 text-sm text-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" loading={mutation.isPending}>
              Đăng nhập
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
