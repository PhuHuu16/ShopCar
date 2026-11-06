import { useState } from 'react';
import { Link } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useTitle } from '../hooks/useTitle';
import { confirm } from '../components/confirm';
import { Button, EmptyState, ErrorBox, Input, Modal, PageHeader, Spinner, Table, td, th } from '../components/ui';
import { formatDate } from '../lib/format';

function BrandForm({ brand, onDone }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(brand?.name || '');
  const mutation = useMutation({
    mutationFn: () =>
      brand
        ? api(`/brands/${brand._id}`, { method: 'PUT', body: { name } })
        : api('/brands', { method: 'POST', body: { name } }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      toast.success(brand ? 'Đã đổi tên hãng xe' : `Đã thêm hãng ${saved.name}`);
      setName('');
      onDone?.();
    }
  });
  const error = mutation.error?.fieldErrors?.().name || (mutation.error && mutation.error.message);
  return (
    <form
      className="flex items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Input
        id={brand ? 'brand-edit' : 'brand-new'}
        className="flex-1"
        placeholder="Tên hãng, ví dụ: Peugeot"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={error}
        autoFocus={!!brand}
        aria-label="Tên hãng xe"
      />
      <Button type="submit" loading={mutation.isPending} disabled={!name.trim()}>
        {brand ? 'Lưu' : <><Plus className="size-4" /> Thêm hãng</>}
      </Button>
    </form>
  );
}

export default function Brands() {
  useTitle('Hãng xe');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const { data, error, isLoading, refetch } = useQuery({ queryKey: ['brands'], queryFn: () => api('/brands') });

  const remove = useMutation({
    mutationFn: (brand) => api(`/brands/${brand._id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.success('Đã xóa hãng xe');
    },
    onError: (err) => toast.error(err.message)
  });

  async function onDelete(brand) {
    const ok = await confirm({ title: 'Xóa hãng xe?', message: `Hãng "${brand.name}" sẽ bị xóa vĩnh viễn.`, confirmText: 'Xóa', danger: true });
    if (ok) remove.mutate(brand);
  }

  return (
    <>
      <PageHeader title="Hãng xe" description="Các hãng xe hiển thị trong bộ lọc của cửa hàng." />
      <div className="card mb-4 p-4">
        <BrandForm />
      </div>
      <div className="card overflow-hidden">
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <div className="p-4"><ErrorBox error={error} onRetry={refetch} /></div>
        ) : data.length === 0 ? (
          <EmptyState icon={Tags} title="Chưa có hãng xe nào">Thêm hãng xe đầu tiên ở ô phía trên.</EmptyState>
        ) : (
          <Table>
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
              <tr>
                <th className={th}>Hãng xe</th>
                <th className={th}>Đường dẫn</th>
                <th className={`${th} text-right`}>Số mẫu xe</th>
                <th className={th}>Ngày thêm</th>
                <th className={`${th} text-right`}>Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.map((brand) => (
                <tr key={brand._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className={`${td} font-semibold`}>{brand.name}</td>
                  <td className={`${td} font-mono text-xs text-slate-500`}>{brand.slug}</td>
                  <td className={`${td} text-right tabular-nums`}>
                    {brand.carCount > 0 ? (
                      <Link to={`/cars?brand=${brand._id}`} className="font-semibold text-brand-600 hover:underline dark:text-brand-500">
                        {brand.carCount}
                      </Link>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className={`${td} text-slate-500`}>{formatDate(brand.createdAt)}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(brand)} aria-label={`Sửa ${brand.name}`} title="Đổi tên">
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(brand)}
                        disabled={brand.carCount > 0}
                        title={brand.carCount > 0 ? 'Hãng còn xe nên chưa xóa được' : 'Xóa'}
                        aria-label={`Xóa ${brand.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Đổi tên hãng ${editing?.name || ''}`}>
        {editing && <BrandForm key={editing._id} brand={editing} onDone={() => setEditing(null)} />}
      </Modal>
    </>
  );
}
