import { useAuth } from '../stores/auth';
import { ADMIN_ROLE, PERMISSION } from '../lib/labels';
import { ButtonLink, Spinner } from './ui';

// -- Trang 403: mở trang không thuộc quyền của mình (gõ thẳng địa chỉ, link cũ, vừa bị đổi vai trò) --
export function Forbidden({ permission }) {
  const admin = useAuth((s) => s.admin);
  const role = ADMIN_ROLE[admin?.role || 'admin'];
  return (
    <div className="py-16 text-center">
      <p className="font-display text-8xl font-light text-muted">403</p>
      <h1 className="mt-4 text-3xl">Bạn không có quyền xem trang này</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
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
