import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleCheck, CircleX, LoaderCircle, MailCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Button, ButtonLink, Input } from '../components/ui';
import { Logo } from '../components/Header';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';
import { useUi } from '../stores/ui';

function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="mb-6 flex justify-center"><Logo /></div>
          <h1 className="text-center text-2xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
        {footer && <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>}
      </div>
    </div>
  );
}

function Result({ ok, title, children, action }) {
  const Icon = ok ? CircleCheck : CircleX;
  return (
    <div className="text-center">
      <Icon className={`mx-auto size-14 ${ok ? 'text-emerald-500' : 'text-red-500'}`} />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      {children && <p className="mt-2 text-sm text-slate-500">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// only allow redirects inside this site
function safeRedirect(from) {
  return from && from.startsWith('/') && !from.startsWith('//') ? from : '/';
}

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const bind = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setErrors((er) => ({ ...er, [name]: undefined }));
    }
  });
  return { values, setErrors, bind };
}

function ResendActivation({ defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail);
  const resend = useMutation({
    mutationFn: () => api('/customer/resend-activation', { method: 'POST', body: { email } }),
    onSuccess: (res) => toast.success(res.message),
    onError: (err) => toast.error(err.message)
  });
  return (
    <form
      className="mt-4 space-y-3 rounded-xl bg-amber-50 p-4 dark:bg-amber-500/10"
      onSubmit={(e) => { e.preventDefault(); resend.mutate(); }}
    >
      <p className="text-sm text-amber-900 dark:text-amber-200">Không nhận được email kích hoạt? Nhập email để gửi lại.</p>
      <div className="flex gap-2">
        <input className="input" type="email" required placeholder="email@cua-ban.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" variant="secondary" loading={resend.isPending}>Gửi lại</Button>
      </div>
    </form>
  );
}

export function Login() {
  useTitle('Đăng nhập');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const loginStore = useAuth((s) => s.login);
  const openChat = useUi((s) => s.openChat);
  const form = useForm({ username: '', password: '' });
  const [notActivated, setNotActivated] = useState(false);

  const login = useMutation({
    mutationFn: () => api('/customer/login', { method: 'POST', body: form.values }),
    onSuccess: ({ token, customer }) => {
      loginStore(token, customer);
      toast.success(`Chào mừng ${customer.name}!`);
      navigate(safeRedirect(params.get('from')), { replace: true });
      if (params.get('chat')) openChat();
    },
    onError: (err) => {
      setNotActivated(err.status === 403 && /kích hoạt/.test(err.message));
      if (err.errors.length) form.setErrors(err.fieldErrors());
      else toast.error(err.message);
    }
  });

  return (
    <AuthCard
      title="Đăng nhập"
      subtitle="Theo dõi đơn hàng và chat với tư vấn viên"
      footer={<>Chưa có tài khoản? <Link to="/signup" className="font-semibold text-brand-600 hover:underline">Đăng ký ngay</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); login.mutate(); }}>
        <Input label="Tên đăng nhập" autoComplete="username" required autoFocus {...form.bind('username')} />
        <Input label="Mật khẩu" type="password" autoComplete="current-password" required {...form.bind('password')} />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">Quên mật khẩu?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={login.isPending}>Đăng nhập</Button>
      </form>
      {notActivated && <ResendActivation />}
    </AuthCard>
  );
}

export function Signup() {
  useTitle('Đăng ký');
  const form = useForm({ name: '', username: '', email: '', phone: '', password: '' });
  const [done, setDone] = useState(null);

  const signup = useMutation({
    mutationFn: () => api('/customer/signup', { method: 'POST', body: form.values }),
    onSuccess: (res) => setDone(res.message),
    onError: (err) => {
      if (err.errors.length) form.setErrors(err.fieldErrors());
      else if (err.status === 409) form.setErrors(/email/i.test(err.message) ? { email: err.message } : { username: err.message });
      else toast.error(err.message);
    }
  });

  if (done) {
    return (
      <AuthCard title="Kiểm tra email của bạn">
        <div className="text-center">
          <MailCheck className="mx-auto size-14 text-brand-600" />
          <p className="mt-4 text-slate-600 dark:text-slate-300">{done}</p>
          <p className="mt-2 text-sm text-slate-500">Email đã gửi tới <b>{form.values.email}</b>.</p>
          <ResendActivation defaultEmail={form.values.email} />
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Tạo tài khoản"
      subtitle="Chỉ mất chưa tới một phút"
      footer={<>Đã có tài khoản? <Link to="/login" className="font-semibold text-brand-600 hover:underline">Đăng nhập</Link></>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); signup.mutate(); }}>
        <Input label="Họ và tên" autoComplete="name" required {...form.bind('name')} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Tên đăng nhập" autoComplete="username" required hint="Chữ, số, dấu . và _" {...form.bind('username')} />
          <Input label="Số điện thoại" type="tel" autoComplete="tel" required {...form.bind('phone')} />
        </div>
        <Input label="Email" type="email" autoComplete="email" required {...form.bind('email')} />
        <Input label="Mật khẩu" type="password" autoComplete="new-password" required minLength={6} hint="Tối thiểu 6 ký tự" {...form.bind('password')} />
        <Button type="submit" size="lg" className="w-full" loading={signup.isPending}>Đăng ký</Button>
      </form>
    </AuthCard>
  );
}

// Opened from the link in the activation email: /activate?id=...&token=...
export function Activate() {
  useTitle('Kích hoạt tài khoản');
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading' });
  const started = useRef(false); // the link works once; don't send it twice in dev StrictMode

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const id = params.get('id');
    const token = params.get('token');
    if (!id || !token) {
      setState({ status: 'error', message: 'Link kích hoạt không đầy đủ.' });
      return;
    }
    api('/customer/activate', { method: 'POST', body: { id, token } })
      .then((res) => setState({ status: 'ok', message: res.message }))
      .catch((err) => setState({ status: 'error', message: err.message }));
  }, [params]);

  return (
    <AuthCard title="Kích hoạt tài khoản">
      {state.status === 'loading' ? (
        <div className="flex justify-center py-6"><LoaderCircle className="size-8 animate-spin text-brand-600" /></div>
      ) : state.status === 'ok' ? (
        <Result ok title="Kích hoạt thành công" action={<ButtonLink to="/login" className="w-full">Đăng nhập</ButtonLink>}>{state.message}</Result>
      ) : (
        <>
          <Result title="Không kích hoạt được">{state.message}</Result>
          <ResendActivation />
        </>
      )}
    </AuthCard>
  );
}

export function ForgotPassword() {
  useTitle('Quên mật khẩu');
  const [email, setEmail] = useState('');
  const forgot = useMutation({
    mutationFn: () => api('/customer/forgot-password', { method: 'POST', body: { email } }),
    onError: (err) => toast.error(err.message)
  });

  return (
    <AuthCard
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link đặt lại mật khẩu"
      footer={<Link to="/login" className="font-semibold text-brand-600 hover:underline">Quay lại đăng nhập</Link>}
    >
      {forgot.isSuccess ? (
        <Result ok title="Đã gửi email">{forgot.data.message} Link có hiệu lực trong 30 phút.</Result>
      ) : (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); forgot.mutate(); }}>
          <Input label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" size="lg" className="w-full" loading={forgot.isPending}>Gửi link đặt lại</Button>
        </form>
      )}
    </AuthCard>
  );
}

// Opened from the email link: /reset-password?id=...&token=...
export function ResetPassword() {
  useTitle('Đặt lại mật khẩu');
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const reset = useMutation({
    mutationFn: () => api('/customer/reset-password', {
      method: 'POST',
      body: { id: params.get('id'), token: params.get('token'), password }
    })
  });

  function submit(e) {
    e.preventDefault();
    if (password !== confirm) return setError('Mật khẩu nhập lại không khớp');
    setError('');
    reset.mutate();
  }

  return (
    <AuthCard title="Đặt mật khẩu mới">
      {reset.isSuccess ? (
        <Result ok title="Đổi mật khẩu thành công" action={<ButtonLink to="/login" className="w-full">Đăng nhập</ButtonLink>}>{reset.data.message}</Result>
      ) : reset.error && reset.error.status === 400 && !reset.error.errors.length ? (
        <Result title="Link không còn hiệu lực" action={<ButtonLink to="/forgot-password" variant="outline" className="w-full">Gửi link mới</ButtonLink>}>
          {reset.error.message}
        </Result>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <Input label="Mật khẩu mới" type="password" autoComplete="new-password" required minLength={6} autoFocus value={password}
            onChange={(e) => setPassword(e.target.value)} error={reset.error?.fieldErrors().password} hint="Tối thiểu 6 ký tự" />
          <Input label="Nhập lại mật khẩu" type="password" autoComplete="new-password" required value={confirm}
            onChange={(e) => setConfirm(e.target.value)} error={error} />
          <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>Đổi mật khẩu</Button>
        </form>
      )}
    </AuthCard>
  );
}
