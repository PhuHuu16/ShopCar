import { Link } from 'react-router';
import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Logo } from './Header';
import { useUi } from '../stores/ui';

export const SHOWROOM = {
  address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
  hotline: '1900 0000',
  hours: 'Thứ 2 - Chủ nhật, 8:00 - 20:00'
};

export function Footer() {
  const openChat = useUi((s) => s.openChat);
  return (
    <footer className="mt-24 border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Showroom ô tô mới và đã qua sử dụng. Giá minh bạch, hỗ trợ trả góp, lái thử tận nơi và tư vấn trực tuyến mỗi ngày.
          </p>
          <button onClick={() => openChat()} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:underline">
            <MessageCircle className="size-4" /> Chat với tư vấn viên
          </button>
        </div>
        <div>
          <h4 className="font-semibold">Mua xe</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
            <li><Link to="/cars" className="hover:text-brand-600">Tất cả xe</Link></li>
            <li><Link to="/cars?condition=new" className="hover:text-brand-600">Xe mới</Link></li>
            <li><Link to="/cars?condition=used" className="hover:text-brand-600">Xe đã qua sử dụng</Link></li>
            <li><Link to="/cars?fuel=electric" className="hover:text-brand-600">Xe điện</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Showroom</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
            <li className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0" />{SHOWROOM.address}</li>
            <li className="flex gap-2"><Phone className="mt-0.5 size-4 shrink-0" />{SHOWROOM.hotline}</li>
            <li className="flex gap-2"><Clock className="mt-0.5 size-4 shrink-0" />{SHOWROOM.hours}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-5 text-center text-xs text-slate-400 dark:border-slate-800">
        © {new Date().getFullYear()} ShopCar. Dự án portfolio - giá xe chỉ mang tính tham khảo.
      </div>
    </footer>
  );
}
