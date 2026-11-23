import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Pencil, Trash2, UserCog, UserPlus } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useTitle } from '../hooks/useTitle';
import { ADMIN_ROLE, ADMIN_STATUS } from '../lib/labels';
import { formatDateTime } from '../lib/format';
import { confirm } from '../components/confirm';
import { Badge, Button, EmptyState, ErrorBox, Input, Modal, PageHeader, Select, Spinner, Table, td, th } from '../components/ui';

const ROLE_OPTIONS = Object.entries(ADMIN_ROLE).map(([value, r]) => ({ value, label: r.label }));
const PASSWORD_HINT = 'Tối thiểu 8 ký tự. Báo trực tiếp cho nhân viên, họ đăng nhập bằng mật khẩu này luôn.';

function useStaffMutation(mutationFn, message, onDone) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(typeof message === 'function' ? message(account) : message);
      onDone?.();
    }
  });
}

function fieldsOf(error) {
  if (!error) return {};
  const fields = error.fieldErrors?.() || {};
  return Object.keys(fields).length ? fields : { _: error.message };
}

function CreateForm({ onDone }) {
  const [form, setForm] = useState({ username: '', name: '', role: 'staff', password: '' });
  const mutation = useStaffMutation(() => api('/staff', { method: 'POST', body: form }), (a) => `Đã tạo tài khoản ${a.username}`, onDone);
  const errors = fieldsOf(mutation.error);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return (
    <form
      id="staff-create"
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Input id="s-name" label="Họ tên" value={form.name} onChange={set('name')} error={errors.name} autoFocus required />
      <Input id="s-username" label="Tên đăng nhập" value={form.username} onChange={set('username')} error={errors.username} hint="Chữ không dấu, số, dấu chấm hoặc gạch. Ví dụ: lan.tran" autoComplete="off" required />
      <Select id="s-role" label="Vai trò" value={form.role} onChange={set('role')} options={ROLE_OPTIONS} hint={ADMIN_ROLE[form.role].hint} />
      <Input id="s-password" type="password" label="Mật khẩu" value={form.password} onChange={set('password')} error={errors.password} hint={PASSWORD_HINT} autoComplete="new-password" required />
      {errors._ && <p className="text-sm text-error">{errors._}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Hủy</Button>
        <Button type="submit" loading={mutation.isPending}>Tạo tài khoản</Button>
      </div>
    </form>
  );
}

function EditForm({ account, onDone }) {
  const [form, setForm] = useState({ name: account.name || '', role: account.role || 'admin' });
  const mutation = useStaffMutation(() => api(`/staff/${account._id}`, { method: 'PATCH', body: form }), 'Đã lưu thay đổi', onDone);
  const errors = fieldsOf(mutation.error);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Input id="e-name" label="Họ tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} required />
      <Select id="e-role" label="Vai trò" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} options={ROLE_OPTIONS} hint={ADMIN_ROLE[form.role].hint} />
      {form.role !== account.role && (
        <p className="rounded-md bg-warn-soft p-3 text-sm text-warn">
          Quyền mới có hiệu lực ngay; trang quản trị của {account.name || account.username} sẽ tự kết nối lại.
        </p>
      )}
      {errors._ && <p className="text-sm text-error">{errors._}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Hủy</Button>
        <Button type="submit" loading={mutation.isPending}>Lưu</Button>
      </div>
    </form>
  );
}

function ResetForm({ account, onDone }) {
  const [password, setPassword] = useState('');
  const mutation = useStaffMutation(
    () => api(`/staff/${account._id}`, { method: 'PATCH', body: { password } }),
    `Đã đặt lại mật khẩu cho ${account.username}`,
    onDone
  );
  const errors = fieldsOf(mutation.error);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <p className="text-sm text-ink-2">
        {account.name || account.username} sẽ bị đăng xuất khỏi mọi thiết bị và đăng nhập lại bằng mật khẩu mới bạn đặt ở đây.
      </p>
      <Input id="r-password" type="password" label="Mật khẩu mới" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password || errors._} hint={PASSWORD_HINT} autoComplete="new-password" autoFocus required />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Hủy</Button>
        <Button type="submit" loading={mutation.isPending}>Đặt lại mật khẩu</Button>
      </div>
    </form>
  );
}

function StatusSwitch({ account, disabled, title, onToggle }) {
  const on = account.status !== 'disabled';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${on ? 'Tắt' : 'Bật'} tài khoản ${account.username}`}
      title={title || (on ? 'Tắt tài khoản' : 'Bật lại tài khoản')}
      disabled={disabled}
      onClick={onToggle}
      className="inline-flex min-h-9 items-center gap-2.5 rounded-md text-sm disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-[var(--dur-short)] ${on ? 'border-ink bg-ink' : 'border-muted bg-paper-2'}`}>
        <span className={`inline-block size-4 rounded-full transition-transform duration-[var(--dur-short)] ${on ? 'translate-x-[1.375rem] bg-paper' : 'translate-x-1 bg-muted'}`} />
      </span>
      <span className={on ? 'text-ink' : 'text-muted'}>{ADMIN_STATUS[account.status || 'active'].label}</span>
    </button>
  );
}

function DeleteForm({ account, onDone }) {
  const [typed, setTyped] = useState('');
  const mutation = useStaffMutation(() => api(`/staff/${account._id}`, { method: 'DELETE' }), `Đã xóa tài khoản ${account.username}`, onDone);
  const name = account.name || account.username;
  const matches = typed.trim().toLowerCase() === account.username;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (matches) mutation.mutate();
      }}
    >
      <p className="text-sm text-ink-2">
        Xóa vĩnh viễn tài khoản <b className="text-ink">{name}</b> ({account.username}). Không khôi phục được.
      </p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
        <li>Người này bị đăng xuất ngay trên mọi thiết bị.</li>
        <li>Đơn đã xác nhận, tin nhắn đã trả lời và nhật ký vẫn giữ tên {name}.</li>
        <li>Tên đăng nhập {account.username} dùng lại được cho người khác.</li>
      </ul>
      {account.status !== 'disabled' && (
        <p className="rounded-md bg-warn-soft p-3 text-sm text-warn">
          Nếu nhân viên có thể quay lại, hãy <b>tắt</b> tài khoản thay vì xóa: bật lại được bất cứ lúc nào, giữ nguyên tên đăng nhập và vai trò.
        </p>
      )}
      <Input
        id="d-confirm"
        label={`Gõ "${account.username}" để xác nhận`}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        error={mutation.error?.message}
        autoComplete="off"
        autoFocus
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onDone}>Hủy</Button>
        <Button type="submit" variant="danger" disabled={!matches} loading={mutation.isPending}>
          <Trash2 className="size-4" /> Xóa tài khoản
        </Button>
      </div>
    </form>
  );
}

export default function Staff() {
  useTitle('Nhân viên');
  const me = useAuth((s) => s.admin);
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(null);
  const close = () => setDialog(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['staff'], queryFn: () => api('/staff') });

  const toggle = useMutation({
    mutationFn: (account) => api(`/staff/${account._id}`, { method: 'PATCH', body: { status: account.status === 'disabled' ? 'active' : 'disabled' } }),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(account.status === 'disabled' ? `Đã tắt tài khoản ${account.username}` : `Đã bật lại tài khoản ${account.username}`);
    },
    onError: (err) => toast.error(err.message)
  });

  async function onToggle(account) {
    if (account.status === 'disabled') return toggle.mutate(account);
    const ok = await confirm({
      title: `Tắt tài khoản ${account.username}?`,
      message: 'Dùng khi nhân viên nghỉ việc hoặc tạm nghỉ. Người này bị đăng xuất ngay trên mọi thiết bị và không đăng nhập được nữa. Bật lại bất cứ lúc nào: tên đăng nhập, vai trò và lịch sử giữ nguyên.',
      confirmText: 'Tắt tài khoản',
      danger: true
    });
    if (ok) toggle.mutate(account);
  }

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Tài khoản đăng nhập trang quản trị và vai trò của từng người."
        actions={<Button onClick={() => setDialog({ type: 'create' })}><UserPlus className="size-4" /> Thêm nhân viên</Button>}
      />

      <div className="mb-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {Object.entries(ADMIN_ROLE).map(([key, r]) => (
          <div key={key} className="border-t border-ink pt-4">
            <h2 className="text-xl">{r.label}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.hint}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorBox error={error} onRetry={refetch} /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={UserCog} title="Chưa có tài khoản nào" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Nhân viên</th>
                <th className={th}>Vai trò</th>
                <th className={th}>Trạng thái</th>
                <th className={th}>Đăng nhập gần nhất</th>
                <th className={`${th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {data.map((a) => {
                const self = a._id === me?._id;
                const locked = a.isOwner || self;
                const lockedReason = a.isOwner ? 'Tài khoản chủ chỉ đổi được trong server/.env' : 'Tài khoản của bạn: đổi tên, mật khẩu ở trang Tài khoản của tôi';
                const role = ADMIN_ROLE[a.role || 'admin'];
                return (
                  <tr key={a._id}>
                    <td className={td}>
                      <p className={a.status === 'disabled' ? 'text-muted' : 'text-ink'}>{a.name || a.username}</p>
                      <p className="text-xs text-muted">
                        {a.username}
                        {a.isOwner && ', tài khoản chủ'}
                        {self && ', bạn'}
                      </p>
                    </td>
                    <td className={td}><Badge className={role.className}>{role.label}</Badge></td>
                    <td className={td}>
                      <StatusSwitch account={a} disabled={locked || toggle.isPending} title={locked ? lockedReason : undefined} onToggle={() => onToggle(a)} />
                    </td>
                    <td className={`${td} text-sm text-ink-2 tabular-nums`}>{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : 'Chưa đăng nhập'}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1" title={locked ? lockedReason : undefined}>
                        <Button variant="ghost" size="icon" disabled={locked} onClick={() => setDialog({ type: 'edit', account: a })} title="Sửa tên, vai trò" aria-label={`Sửa ${a.username}`}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={locked} onClick={() => setDialog({ type: 'reset', account: a })} title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${a.username}`}>
                          <KeyRound className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-error-soft hover:text-error"
                          disabled={locked}
                          onClick={() => setDialog({ type: 'delete', account: a })}
                          title="Xóa tài khoản"
                          aria-label={`Xóa ${a.username}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted">
        Nhân viên nghỉ việc: gạt công tắc để tắt tài khoản (bật lại được). Xóa thì không khôi phục được, nhưng đơn hàng, tin nhắn và nhật ký vẫn giữ tên người đã làm.
      </p>

      <Modal open={dialog?.type === 'create'} onClose={close} title="Thêm nhân viên">
        {dialog?.type === 'create' && <CreateForm onDone={close} />}
      </Modal>
      <Modal open={dialog?.type === 'edit'} onClose={close} title={`Sửa ${dialog?.account?.username || ''}`}>
        {dialog?.type === 'edit' && <EditForm account={dialog.account} onDone={close} />}
      </Modal>
      <Modal open={dialog?.type === 'reset'} onClose={close} title="Đặt lại mật khẩu">
        {dialog?.type === 'reset' && <ResetForm account={dialog.account} onDone={close} />}
      </Modal>
      <Modal open={dialog?.type === 'delete'} onClose={close} title="Xóa tài khoản nhân viên">
        {dialog?.type === 'delete' && <DeleteForm account={dialog.account} onDone={close} />}
      </Modal>
    </>
  );
}
