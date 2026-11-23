import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CarFront, Eye, EyeOff, ExternalLink, FileText, Pencil, Plus } from 'lucide-react';
import { useCan } from '../hooks/useCan';
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
  if (stock === 0) return <Badge className="bg-error-soft text-error">Hết hàng</Badge>;
  if (stock <= 1) return <Badge className="bg-warn-soft text-warn">Còn {stock}</Badge>;
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
    visibility: params.get('visibility') || '',
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

  const canEdit = useCan('cars.edit');
  const canHide = useCan('cars.hide');
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api('/brands') });
  const cars = useQuery({
    queryKey: ['cars', filters],
    queryFn: () => api('/cars', { query: { ...filters, limit: LIMIT } }),
    placeholderData: keepPreviousData
  });

  const visibility = useMutation({
    mutationFn: ({ car, hidden }) => api(`/cars/${car._id}/visibility`, { method: 'PATCH', body: { hidden } }),
    onSuccess: (car) => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.setQueryData(['car', car._id], car);
      toast.success(car.hidden ? `Đã ẩn ${car.name} khỏi web` : `${car.name} đã hiện lại trên web`);
    },
    onError: (err) => toast.error(err.message)
  });

  async function onToggleHidden(car) {
    if (car.hidden) return visibility.mutate({ car, hidden: false });
    const ok = await confirm({
      title: 'Ẩn xe khỏi web?',
      message: `"${car.name}" sẽ không còn hiện trong danh sách, tìm kiếm và không đặt mua được nữa. Thông tin xe, ảnh và các đơn hàng cũ vẫn được giữ nguyên; bạn có thể hiện lại bất cứ lúc nào.`,
      confirmText: 'Ẩn xe'
    });
    if (ok) visibility.mutate({ car, hidden: true });
  }

  const select = 'input w-auto py-2';
  const data = cars.data;

  return (
    <>
      <PageHeader
        title="Xe"
        description={data ? `${formatNumber(data.total)} mẫu xe` : 'Danh sách xe trong showroom'}
        actions={
          canEdit && (
            <ButtonLink to="/cars/new">
              <Plus className="size-4" /> Thêm xe
            </ButtonLink>
          )
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
        <select className={select} value={filters.visibility} onChange={(e) => update({ visibility: e.target.value })} aria-label="Hiển thị trên web">
          <option value="">Đang bán và đã ẩn</option>
          <option value="visible">Đang bán</option>
          <option value="hidden">Đã ẩn (ngừng bán)</option>
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
            action={canEdit && <ButtonLink to="/cars/new" size="sm"><Plus className="size-4" /> Thêm xe</ButtonLink>}
          >
            {canEdit ? 'Thử bỏ bớt bộ lọc, hoặc thêm xe mới.' : 'Thử bỏ bớt bộ lọc.'}
          </EmptyState>
        ) : (
          <div className={cars.isPlaceholderData ? 'opacity-60 transition-colors' : ''}>
            <Table>
              <thead>
                <tr>
                  <th className={th}>Xe</th>
                  <th className={th}>Kiểu dáng</th>
                  <th className={`${th} text-right`}>Giá niêm yết</th>
                  <th className={`${th} text-right`}>Tồn kho</th>
                  <th className={`${th} text-right`}>Đã bán</th>
                  <th className={`${th} text-right`}>Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {data.items.map((car) => (
                  <tr key={car._id} className={`hover:bg-paper  ${car.hidden ? 'bg-paper/60 ' : ''}`}>
                    <td className={td}>
                      <Link to={`/cars/${car._id}`} className="flex items-center gap-3">
                        <CarThumb car={car} className={`h-11 w-16 ${car.hidden ? 'opacity-50 grayscale' : ''}`} />
                        <div className="min-w-0">
                          <p className="flex items-center gap-2 font-medium">
                            <span className={`truncate hover:text-accent ${car.hidden ? 'text-muted' : ''}`}>{car.name}</span>
                            {car.hidden && <Badge className="shrink-0 bg-paper-3 text-ink-2">Đã ẩn</Badge>}
                          </p>
                          <p className="text-xs text-muted">
                            {car.brand?.name}, {car.year}, {car.condition === 'used' ? 'Đã qua sử dụng' : 'Xe mới'}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className={`${td} text-ink-2 `}>{BODY_TYPE[car.bodyType]}</td>
                    <td className={`${td} text-right font-medium tabular-nums`}>{formatVnd(car.price)}</td>
                    <td className={`${td} text-right`}><StockBadge stock={car.stock} /></td>
                    <td className={`${td} text-right tabular-nums text-ink-2 `}>{car.sold}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex justify-end gap-1">
                        <a
                          href={`${SHOP_URL}/cars/${car.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-9 items-center justify-center rounded-md text-ink-2 hover:bg-paper-2"
                          title="Xem trên cửa hàng"
                          aria-label={`Xem ${car.name} trên cửa hàng`}
                        >
                          <ExternalLink className="size-4" />
                        </a>
                        <ButtonLink
                          to={`/cars/${car._id}`}
                          variant="ghost"
                          size="icon"
                          title={canEdit ? 'Sửa' : 'Xem thông số'}
                          aria-label={canEdit ? `Sửa ${car.name}` : `Xem ${car.name}`}
                        >
                          {canEdit ? <Pencil className="size-4" /> : <FileText className="size-4" />}
                        </ButtonLink>
                        {canHide && <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onToggleHidden(car)}
                          disabled={visibility.isPending}
                          title={car.hidden ? 'Hiện lại trên web' : 'Ẩn khỏi web (ngừng bán)'}
                          aria-label={car.hidden ? `Hiện lại ${car.name}` : `Ẩn ${car.name}`}
                        >
                          {car.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                        </Button>}
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
