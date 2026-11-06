import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '../lib/api';
import { formatDate } from '../lib/format';
import { Button, Input, PageHeader } from '../components/ui';
import { useTitle } from '../hooks/useTitle';
import { useAuth } from '../stores/auth';

export default function Account() {
  useTitle('Tài khoản');
  const { customer, setCustomer } = useAuth();
  const [profile, setProfile] = useState({ name: customer?.name || '', phone: customer?.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [errors, setErrors] = useState({});

  const save = useMutation({
    mutationFn: (body) => api('/customer/me', { method: 'PUT', body }),
    onSuccess: (data, body) => {
      setCustomer(data);
      setErrors({});
      if (body.newPassword) {
        setPw({ currentPassword: '', newPassword: '', confirm: '' });
        toast.success('Đã đổi mật khẩu');
      } else {
        toast.success('Đã lưu thông tin');
      }
    },
    onError: (err) => {
      if (err.errors.length) setErrors(err.fieldErrors());
      else if (/hiện tại/.test(err.message)) setErrors({ currentPassword: err.message });
      else toast.error(err.message);
    }
  });

  function saveProfile(e) {
    e.preventDefault();
    save.mutate(profile);
  }

  function changePassword(e) {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setErrors({ confirm: 'Mật khẩu nhập lại không khớp' });
    save.mutate({ ...profile, currentPassword: pw.currentPassword, newPassword: pw.newPassword });
  }

  if (!customer) return null;
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHeader title="Tài khoản của tôi">Thành viên từ {formatDate(customer.createdAt)}</PageHeader>
      <div className="space-y-6">
        <form onSubmit={saveProfile} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Tên đăng nhập" value={customer.username} disabled />
            <Input label="Email" value={customer.email} disabled />
            <Input label="Họ và tên" required value={profile.name} error={errors.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            <Input label="Số điện thoại" type="tel" required value={profile.phone} error={errors.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </div>
          <Button type="submit" loading={save.isPending && !save.variables?.newPassword}>Lưu thay đổi</Button>
        </form>

        <form onSubmit={changePassword} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Đổi mật khẩu</h2>
          <Input label="Mật khẩu hiện tại" type="password" autoComplete="current-password" required value={pw.currentPassword}
            error={errors.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Mật khẩu mới" type="password" autoComplete="new-password" required minLength={6} value={pw.newPassword}
              error={errors.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} />
            <Input label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" required value={pw.confirm}
              error={errors.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
          </div>
          <Button type="submit" variant="secondary" loading={save.isPending && !!save.variables?.newPassword}>Đổi mật khẩu</Button>
        </form>
      </div>
    </div>
  );
}
