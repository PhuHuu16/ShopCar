import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleCheck, Send } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useGuestOrders } from '../stores/guestOrders';
import { Button, Field, Input } from './ui';

// -- Để lại lời nhắn cho showroom, không cần đăng nhập --
export function ContactForm({ car, onSent, compact = false }) {
  const customer = useAuth((s) => s.customer);
  const saved = useGuestOrders((s) => s.info);
  const setInfo = useGuestOrders((s) => s.setInfo);
  const [form, setForm] = useState(() => ({
    name: customer?.name || saved.name || '',
    phone: customer?.phone || saved.phone || '',
    email: customer?.email || saved.email || '',
    message: car ? `Tôi muốn hỏi về xe ${car.name}.` : ''
  }));
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const send = useMutation({
    mutationFn: () => api('/contact', { method: 'POST', body: { ...form, car: car?._id } }),
    onSuccess: (res) => {
      if (!customer) setInfo({ name: form.name, phone: form.phone, email: form.email });
      setErrors({});
      setSent(true);
      toast.success(res.message);
      onSent?.();
    },
    onError: (err) => {
      setErrors(err.fieldErrors?.() || {});
      toast.error(err.message);
    }
  });

  const bind = (field) => ({
    value: form[field],
    onChange: (e) => setForm({ ...form, [field]: e.target.value }),
    error: errors[field]
  });

  if (sent) {
    return (
      <div className="py-6 text-center">
        <CircleCheck className="mx-auto size-12 text-success" />
        <p className="mt-3 font-medium">Đã gửi lời nhắn</p>
        <p className="mt-1 text-sm text-muted">Tư vấn viên sẽ gọi lại số {form.phone} trong giờ làm việc.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => { setSent(false); setForm({ ...form, message: '' }); }}>
          Gửi lời nhắn khác
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        send.mutate();
      }}
    >
      <div className={compact ? 'space-y-3' : 'grid gap-3 sm:grid-cols-2'}>
        <Input label="Họ tên" autoComplete="name" required maxLength={80} {...bind('name')} />
        <Input label="Số điện thoại" type="tel" autoComplete="tel" required maxLength={15} {...bind('phone')} />
      </div>
      <Input label="Email (không bắt buộc)" type="email" autoComplete="email" {...bind('email')} />
      <Field label="Nội dung" error={errors.message}>
        <textarea
          className="input min-h-24"
          required
          minLength={5}
          maxLength={2000}
          placeholder="Hỏi giá lăn bánh, đặt lịch lái thử, trả góp"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
      </Field>
      <Button type="submit" className="w-full" loading={send.isPending}>
        <Send className="size-4" /> Gửi lời nhắn
      </Button>
    </form>
  );
}
