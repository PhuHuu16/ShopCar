import { useEffect, useState } from 'react';
import { Link, useBlocker, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Save } from 'lucide-react';
import { api, SHOP_URL } from '../lib/api';
import { formatPriceShort } from '../lib/format';
import { BODY_TYPE, CONDITION, FUEL, TRANSMISSION, toOptions } from '../lib/labels';
import { useTitle } from '../hooks/useTitle';
import { confirm } from '../components/confirm';
import { ImageManager } from '../components/ImageManager';
import { Button, ErrorBox, Input, Select, Spinner, Textarea } from '../components/ui';

const EMPTY = {
  name: '', brand: '', price: '', year: String(new Date().getFullYear()), mileage: '0',
  fuel: 'gasoline', transmission: 'automatic', bodyType: 'sedan', seats: '5', color: '',
  condition: 'new', description: '', stock: '1', images: []
};

function fromCar(car) {
  const form = {};
  for (const key of Object.keys(EMPTY)) {
    const value = car[key];
    form[key] = key === 'images' ? value || [] : key === 'brand' ? value?._id || value || '' : value == null ? '' : String(value);
  }
  return form;
}

function Section({ title, description, children }) {
  return (
    <section className="card p-5">
      <h2 className="font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Editor({ car }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const initial = car ? fromCar(car) : EMPTY;
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const brands = useQuery({ queryKey: ['brands'], queryFn: () => api('/brands') });
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const save = useMutation({
    mutationFn: () =>
      car ? api(`/cars/${car._id}`, { method: 'PUT', body: form }) : api('/cars', { method: 'POST', body: form }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['cars'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.setQueryData(['car', saved._id], saved);
      toast.success(car ? 'Đã lưu thay đổi' : `Đã thêm ${saved.name}`);
      navigate('/cars', { state: { saved: true } });
    },
    onError: (err) => {
      setErrors(err.fieldErrors?.() || {});
      toast.error(err.errors?.length ? 'Hãy kiểm tra lại các ô được đánh dấu' : err.message);
    }
  });

  const blocker = useBlocker(({ nextLocation }) => dirty && !save.isPending && !save.isSuccess && !nextLocation.state?.saved);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirm({ title: 'Bỏ các thay đổi?', message: 'Những gì bạn vừa nhập cho xe này chưa được lưu.', confirmText: 'Bỏ thay đổi', danger: true }).then(
      (ok) => (ok ? blocker.proceed() : blocker.reset())
    );
  }, [blocker]);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (errors[key]) setErrors((x) => ({ ...x, [key]: undefined }));
  };
  const field = (key) => ({ id: key, value: form[key], onChange: set(key), error: errors[key] });
  const price = Number(form.price);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link to="/cars" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <ArrowLeft className="size-4" /> Danh sách xe
          </Link>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">{car ? car.name : 'Thêm xe mới'}</h1>
        </div>
        <div className="flex gap-2">
          {car && (
            <a href={`${SHOP_URL}/cars/${car.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
              <ExternalLink className="size-4" /> Xem trên cửa hàng
            </a>
          )}
          <Button type="submit" loading={save.isPending}>
            <Save className="size-4" /> {car ? 'Lưu thay đổi' : 'Thêm xe'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Section title="Ảnh xe" description="Ảnh được nén sang WebP và tạo ảnh nhỏ tự động.">
            <ImageManager images={form.images} onChange={(images) => setForm((f) => ({ ...f, images }))} error={errors.images} />
          </Section>

          <Section title="Thông tin cơ bản">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Tên xe" placeholder="Ví dụ: Toyota Camry 2.5Q" className="sm:col-span-2" {...field('name')} />
              <Select label="Hãng xe" placeholder="Chọn hãng" options={(brands.data || []).map((b) => ({ value: b._id, label: b.name }))} {...field('brand')} />
              <Select label="Tình trạng" options={toOptions(CONDITION)} {...field('condition')} />
              <Select label="Kiểu dáng" options={toOptions(BODY_TYPE)} {...field('bodyType')} />
              <Input label="Màu sắc" placeholder="Ví dụ: Trắng ngọc trai" {...field('color')} />
            </div>
          </Section>

          <Section title="Thông số kỹ thuật">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Năm sản xuất" type="number" min="1950" max={new Date().getFullYear() + 1} {...field('year')} />
              <Input label="Số chỗ ngồi" type="number" min="1" max="60" {...field('seats')} />
              <Input
                label="Số km đã đi"
                type="number"
                min="0"
                step="1000"
                hint={form.condition === 'new' ? 'Xe mới thường là 0' : undefined}
                {...field('mileage')}
              />
              <Select label="Nhiên liệu" options={toOptions(FUEL)} {...field('fuel')} />
              <Select label="Hộp số" options={toOptions(TRANSMISSION)} {...field('transmission')} />
            </div>
          </Section>

          <Section title="Mô tả" description="Hiển thị trên trang chi tiết xe. Xuống dòng để tách đoạn.">
            <Textarea rows={7} placeholder="Điểm nổi bật, trang bị, tình trạng xe, chính sách bảo hành..." aria-label="Mô tả" {...field('description')} />
          </Section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Section title="Giá và kho">
            <div className="space-y-4">
              <Input
                label="Giá niêm yết (VND)"
                type="number"
                min="0"
                step="1000000"
                placeholder="Ví dụ: 1050000000"
                hint={price > 0 ? `= ${formatPriceShort(price)}` : undefined}
                {...field('price')}
              />
              <Input label="Số xe trong kho" type="number" min="0" hint="Về 0 thì cửa hàng hiện “Hết hàng”." {...field('stock')} />
              {car && (
                <p className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  Đã bán <b>{car.sold}</b> xe
                </p>
              )}
            </div>
          </Section>
          <Button type="submit" className="w-full" size="lg" loading={save.isPending}>
            <Save className="size-4" /> {car ? 'Lưu thay đổi' : 'Thêm xe'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default function CarForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  useTitle(isNew ? 'Thêm xe' : 'Sửa xe');
  const car = useQuery({ queryKey: ['car', id], queryFn: () => api(`/cars/${id}`), enabled: !isNew });
  if (isNew) return <Editor />;
  if (car.isLoading) return <Spinner />;
  if (car.error) return <ErrorBox error={car.error} onRetry={car.refetch} />;
  return <Editor key={car.data._id} car={car.data} />;
}
