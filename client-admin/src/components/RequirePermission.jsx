import { ShieldX } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { ADMIN_ROLE, PERMISSION } from '../lib/labels';
import { ButtonLink, Spinner } from './ui';

// -- Trang 403: mở trang không thuộc quyền của mình (gõ thẳng địa chỉ, link cũ, vừa bị đổi vai trò) --
export function Forbidden({ permission }) {
  const admin = useAuth((s) => s.admin);
  const role = ADMIN_ROLE[admin?.role || 'admin'];
  return (
    <div className="py-16 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
        <ShieldX className="size-7" />
      </span>
      <p className="mt-4 text-5xl font-extrabold text-slate-300 dark:text-slate-700">403</p>
      <h1 className="mt-2 text-xl font-semibold">Bạn không có quyền xem trang này</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Vai trò <b>{role.label}</b> chưa có quyền
        {permission && PERMISSION[permission] ? <> “{PERMISSION[permission].toLowerCase()}”</> : ' này'}. Nếu công việc cần, hãy nhờ quản trị viên đổi vai trò cho bạn.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <ButtonLink to="/">Về trang tổng quan</ButtonLink>
        <ButtonLink to="/account" variant="outline">Xem quyền của tôi</ButtonLink>
      </div>
    </div>
  );
}

export function RequirePermission({ permission, children }) {
  const permissions = useAuth((s) => s.admin?.permissions);
  if (!permissions) return <Spinner />;
  if (!permissions.includes(permission)) return <Forbidden permission={permission} />;
  return children;
}
