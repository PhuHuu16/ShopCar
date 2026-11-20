import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { Button, Input } from './ui';

const EMPTY = { currentPassword: '', newPassword: '', confirm: '' };

export function PasswordForm({ submitLabel = 'Đổi mật khẩu', currentLabel = 'Mật khẩu hiện tại' }) {
  const login = useAuth((s) => s.login);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: () => api('/me', { method: 'PUT', body: { currentPassword: form.currentPassword, newPassword: form.newPassword } }),
    onSuccess: ({ admin, token }) => {
      login(token, admin);
      setForm(EMPTY);
      setErrors({});
      toast.success('Đã đổi mật khẩu. Các phiên đăng nhập khác đã bị đăng xuất.');
    },
    onError: (err) => {
      const fields = err.fieldErrors?.() || {};
      if (fields.newPassword || fields.currentPassword) return setErrors(fields);
      setErrors(/hiện tại không đúng/.test(err.message) ? { currentPassword: err.message } : { newPassword: err.message });
    }
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function submit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) return setErrors({ confirm: 'Mật khẩu nhập lại không khớp' });
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input id="pw-current" type="password" label={currentLabel} autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} required />
      <Input id="pw-new" type="password" label="Mật khẩu mới" hint="Tối thiểu 8 ký tự" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} required />
      <Input id="pw-confirm" type="password" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={errors.confirm} required />
      <Button type="submit" loading={mutation.isPending} disabled={!form.currentPassword || !form.newPassword || !form.confirm}>
        {submitLabel}
      </Button>
    </form>
  );
}
