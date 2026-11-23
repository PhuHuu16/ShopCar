import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useTitle } from '../hooks/useTitle';
import { ADMIN_ROLE, PERMISSION } from '../lib/labels';
import { formatDateTime } from '../lib/format';
import { Badge, Button, Input, PageHeader } from '../components/ui';
import { PasswordForm } from '../components/PasswordForm';

function ProfileForm({ admin }) {
  const setAdmin = useAuth((s) => s.setAdmin);
  const [name, setName] = useState(admin.name || '');
  const mutation = useMutation({
    mutationFn: () => api('/me', { method: 'PUT', body: { name } }),
    onSuccess: ({ admin: saved }) => {
      setAdmin(saved);
      toast.success('Đã lưu tên hiển thị');
    }
  });
  const error = mutation.error?.fieldErrors?.().name || mutation.error?.message;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Input id="me-username" label="Tên đăng nhập" value={admin.username} disabled hint="Không đổi được. Quản trị viên tạo tài khoản mới nếu cần." />
      <Input id="me-name" label="Tên hiển thị" value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={60} />
      <Button type="submit" loading={mutation.isPending} disabled={!name.trim() || name.trim() === admin.name}>
        Lưu
      </Button>
    </form>
  );
}

export default function Account() {
  useTitle('Tài khoản của tôi');
  const admin = useAuth((s) => s.admin);
  if (!admin) return null;
  const role = ADMIN_ROLE[admin.role || 'admin'];

  return (
    <>
      <PageHeader title="Tài khoản của tôi" description="Tên hiển thị, mật khẩu và quyền của bạn trong trang quản trị." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="font-medium">Thông tin</h2>
            <Badge className={role.className}>{role.label}</Badge>
            {admin.isOwner && <Badge className="bg-warn-soft text-warn">Tài khoản chủ</Badge>}
          </div>
          <ProfileForm key={admin._id} admin={admin} />
          {admin.lastLoginAt && <p className="mt-4 text-xs text-muted">Đăng nhập gần nhất: {formatDateTime(admin.lastLoginAt)}</p>}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-medium">Đổi mật khẩu</h2>
          {admin.isOwner ? (
            <p className="rounded-md bg-paper p-4 text-sm text-ink-2">
              Đây là tài khoản chủ, được đồng bộ từ <code>server/.env</code>. Muốn đổi mật khẩu, sửa <code>ADMIN_PASSWORD</code> trong file đó
              rồi khởi động lại server. Cách này luôn giúp bạn vào lại được trang quản trị nếu quên mật khẩu.
            </p>
          ) : (
            <PasswordForm />
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-medium"><ShieldCheck className="size-5 text-accent" /> Quyền của bạn</h2>
          <p className="mt-1 text-sm text-muted">{role.hint}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(PERMISSION).map(([key, label]) => {
              const has = admin.permissions?.includes(key);
              return (
                <li key={key} className={`flex items-start gap-2 text-sm ${has ? '' : 'text-muted line-through '}`}>
                  <Check className={`mt-0.5 size-4 shrink-0 ${has ? 'text-success' : 'invisible'}`} />
                  {label}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
