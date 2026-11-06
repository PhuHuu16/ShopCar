import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CarFront, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { formatNumber, formatVnd } from '../lib/format';
import { BODY_TYPE, CAR_SORTS, CONDITION } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { confirm } from '../components/confirm';
import { CarThumb } from '../components/CarThumb';
import { Pagination } from '../components/Pagination';
import { Badge, Button, ButtonLink, EmptyState, ErrorBox, PageHeader, SearchInput, Spinner, Table, td, th } from '../components/ui';

const LIMIT = 15;

function StockBadge({ stock }) {
  if (stock === 0) return <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300">Hết hàng</Badge>;
  if (stock <= 1) return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">Còn {stock}</Badge>;
  return <span className="tabular-nums">{stock}</span>;
}

function useDebounced(value, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export default function Cars() {
  useTitle('Quản lý xe');
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const q = useDebounced(search);

  const filters = {
    q: params.get('q') || '',
    brand: params.get('brand') || '',
    condition: params.get('condition') || '',
    inStock: params.get('inStock') || '',
    sort: params.get('sort') || 'newest',
    page: Number(params.get('page')) || 1
  };

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  }

  useEffect(() => {
    if (q !== filters.q) update({ q });
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api('/brands') });
  const cars = useQuery({
    queryKey: ['cars', filters],
    queryFn: () => api('/cars', { query: { ...filters, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });

  const remove = useMutation({
    mutationFn: (car) => api(`/cars/${car._id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      toast.success('Đã xóa xe');
    },
    onError: (err) => toast.error(err.message)
  });

  async function onDelete(car) {
    const ok = await confirm({
      title: 'Xóa xe này?',
      message: `"${car.name}" và toàn bộ ảnh của xe sẽ bị xóa. Các đơn hàng cũ vẫn giữ thông tin xe.`,
      confirmText: 'Xóa xe',
      danger: true
    });
    if (ok) remove.mutate(car);
  }

  const select = 'input w-auto py-2';
  const data = cars.data;

  return (
    <>
      <PageHeader
        title="Xe"
        description={data ? `${formatNumber(data.total)} mẫu xe` : 'Danh sách xe trong showroom'}
        actions={
          <ButtonLink to="/cars/new">
            <Plus className="size-4" /> Thêm xe
          </ButtonLink>
        }
      />

      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <SearchInput className="min-w-52 flex-1" value={search} onChange={setSearch} placeholder="Tìm theo tên xe..." />
        <select className={select} value={filters.brand} onChange={(e) => update({ brand: e.target.value })} aria-label="Hãng xe">
          <option value="">Tất cả hãng</option>
          {brands.data?.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <select className={select} value={filters.condition} onChange={(e) => update({ condition: e.target.value })} aria-label="Tình trạng">
          <option value="">Mới và cũ</option>
          {Object.entries(CONDITION).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select className={select} value={filters.inStock} onChange={(e) => update({ inStock: e.target.value })} aria-label="Tồn kho">
          <option value="">Mọi tồn kho</option>
          <option value="true">Còn hàng</option>
          <option value="false">Hết hàng</option>
        </select>
        <select className={select} value={filters.sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })} aria-label="Sắp xếp">
          {CAR_SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {cars.isLoading ? (
          <Spinner />
        ) : cars.error ? (
          <div className="p-4"><ErrorBox error={cars.error} onRetry={cars.refetch} /></div>
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={CarFront}
            title="Không có xe phù hợp"
            action={<ButtonLink to="/cars/new" size="sm"><Plus className="size-4" /> Thêm xe</ButtonLink>}
          >
            Thử bỏ bớt bộ lọc, hoặc thêm xe mới.
          </EmptyState>
        ) : (
          <div className={cars.isPlaceholderData ? 'opacity-60 transition' : ''}>
            <Table>
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                <tr>
                  <th className={th}>Xe</th>
                  <th className={th}>Kiểu dáng</th>
                  <th className={`${th} text-right`}>Giá niêm yết</th>
                  <th className={`${th} text-right`}>Tồn kho</th>
                  <th className={`${th} text-right`}>Đã bán</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.items.map((car) => (
                  <tr key={car._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className={td}>
                      <Link to={`/cars/${car._id}`} className="flex items-center gap-3">
                        <CarThumb car={car} className="h-11 w-16" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold hover:text-brand-600">{car.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {car.brand?.name} · {car.year} · {car.condition === 'used' ? 'Đã qua sử dụng' : 'Xe mới'}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className={`${td} text-slate-600 dark:text-slate-300`}>{BODY_TYPE[car.bodyType]}</td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{formatVnd(car.price)}</td>
                    <td className={`${td} text-right`}><StockBadge stock={car.stock} /></td>
                    <td className={`${td} text-right tabular-nums text-slate-600 dark:text-slate-300`}>{car.sold}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        <a
                          href={`${SHOP_URL}/cars/${car.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                          title="Xem trên cửa hàng"
                          aria-label={`Xem ${car.name} trên cửa hàng`}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                        <ButtonLink to={`/cars/${car._id}`} variant="ghost" size="icon" title="Sửa" aria-label={`Sửa ${car.name}`}>
                          <Pencil className="size-4" />
                        </ButtonLink>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(car)} title="Xóa" aria-label={`Xóa ${car.name}`}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
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
