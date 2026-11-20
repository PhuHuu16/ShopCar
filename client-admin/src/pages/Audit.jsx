import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ExternalLink, History, X } from 'lucide-react';
import { api } from '../lib/api';
import { useCan } from '../hooks/useCan';
import { useTitle } from '../hooks/useTitle';
import { formatDateTime } from '../lib/format';
import { ADMIN_ROLE } from '../lib/labels';
import { AUDIT_ACTION, AUDIT_GROUP, actionClass, describeDetails, targetLink } from '../lib/audit';
import { Pagination } from '../components/Pagination';
import { Badge, EmptyState, ErrorBox, PageHeader, Select, Spinner, Table, td, th } from '../components/ui';

const LIMIT = 30;
const GROUP_OPTIONS = Object.entries(AUDIT_GROUP).map(([value, label]) => ({ value, label }));

export default function Audit() {
  useTitle('Nhật ký thao tác');
  const [params, setParams] = useSearchParams();
  const filters = {
    group: params.get('group') || '',
    actor: params.get('actor') || '',
    target: params.get('target') || '',
    page: Number(params.get('page')) || 1
  };
  const targetLabel = params.get('label') || 'đối tượng này';

  const canSeeStaff = useCan('staff.manage');
  const staff = useQuery({ queryKey: ['staff'], queryFn: () => api('/staff'), enabled: canSeeStaff });
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['audit', filters],
    queryFn: () => api('/audit', { query: { ...filters, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next);
  };
  const showHistory = (target) => update({ target: target.id, label: target.label });

  return (
    <>
      <PageHeader
        title="Nhật ký thao tác"
        description="Ai đã làm gì trong trang quản trị: xác nhận / hủy đơn, sửa giá, ẩn xe, khóa khách, đổi quyền nhân viên. Nhật ký không bị xóa hay sửa."
      />

      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <Select id="audit-group" label="Loại thao tác" className="w-full sm:w-52" value={filters.group} onChange={(e) => update({ group: e.target.value })} options={GROUP_OPTIONS} placeholder="Tất cả" />
        {canSeeStaff && (
          <Select
            id="audit-actor"
            label="Người thực hiện"
            className="w-full sm:w-60"
            value={filters.actor}
            onChange={(e) => update({ actor: e.target.value })}
            options={(staff.data || []).map((a) => ({ value: a._id, label: `${a.name || a.username} (${a.username})` }))}
            placeholder="Mọi người"
          />
        )}
        {filters.target && (
          <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-50 pl-3 pr-1 text-sm font-medium text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
            <History className="size-4" /> Lịch sử của {targetLabel}
            <button onClick={() => update({ target: '', label: '' })} className="rounded-lg p-1.5 hover:bg-brand-100 dark:hover:bg-brand-500/20" aria-label="Bỏ lọc theo đối tượng">
              <X className="size-4" />
            </button>
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorBox error={error} onRetry={refetch} /></div>
        ) : data.items.length === 0 ? (
          <EmptyState icon={History} title="Chưa có thao tác nào">Thử bỏ bớt bộ lọc.</EmptyState>
        ) : (
          <Table>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className={th}>Thời gian</th>
                <th className={th}>Người thực hiện</th>
                <th className={th}>Thao tác</th>
                <th className={th}>Đối tượng</th>
                <th className={th}>Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.items.map((e) => {
                const link = targetLink(e.target);
                const lines = describeDetails(e);
                return (
                  <tr key={e._id} className="align-top">
                    <td className={`${td} text-sm text-slate-600 dark:text-slate-300`}>{formatDateTime(e.createdAt)}</td>
                    <td className={td}>
                      <button
                        className="text-left font-semibold hover:text-brand-600 disabled:hover:text-inherit"
                        disabled={!e.actor?.account}
                        onClick={() => update({ actor: e.actor.account })}
                        title="Chỉ xem thao tác của người này"
                      >
                        {e.actor?.name || e.actor?.username}
                      </button>
                      <p className="text-xs text-slate-500">
                        {e.actor?.username}
                        {e.actor?.role && ` · ${ADMIN_ROLE[e.actor.role]?.label || e.actor.role}`}
                      </p>
                    </td>
                    <td className={td}><Badge className={actionClass(e.action)}>{AUDIT_ACTION[e.action] || e.action}</Badge></td>
                    <td className={`${td} max-w-64`}>
                      {e.target?.id ? (
                        <div className="flex items-center gap-1">
                          <button className="truncate text-left font-medium hover:text-brand-600" onClick={() => showHistory(e.target)} title="Xem mọi thao tác trên đối tượng này">
                            {e.target.label}
                          </button>
                          {link && (
                            <Link to={link} className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" title="Mở" aria-label={`Mở ${e.target.label}`}>
                              <ExternalLink className="size-3.5" />
                            </Link>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="min-w-56 px-4 py-3 align-middle text-sm">
                      {lines.map((line) => <p key={line}>{line}</p>)}
                      {e.ip && <p className="text-xs text-slate-400">IP {e.ip}</p>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </div>
      {data && (
        <div className="mt-6">
          <Pagination page={data.page} pages={data.pages} onChange={(page) => update({ page: String(page) })} />
        </div>
      )}
    </>
  );
}
