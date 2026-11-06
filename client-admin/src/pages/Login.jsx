import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { LockKeyhole } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { Logo } from '../components/Layout';
import { Button, Input } from '../components/ui';
import { useTitle } from '../hooks/useTitle';

// Chỉ cho quay lại các trang trong web
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-950 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(220,38,38,0.35),transparent_55%)]" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative mt-auto max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Quản lý showroom trong một nơi.</h1>
          <p className="mt-4 text-slate-300">
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
          <div className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
            <LockKeyhole className="size-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Đăng nhập quản trị</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Dành cho nhân viên showroom ShopCar.</p>

          <div className="mt-8 space-y-4">
            <Input id="username" label="Tên đăng nhập" autoComplete="username" value={form.username} onChange={set('username')} required autoFocus />
            <Input id="password" label="Mật khẩu" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
            {mutation.error && (
              <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400" role="alert">
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
