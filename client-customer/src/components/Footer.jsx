import { Link } from 'react-router';
import { MessageCircle } from 'lucide-react';
import { Logo } from './Header';
import { useUi } from '../stores/ui';

export const SHOWROOM = {
  address: 'Quận Bình Thạnh, TP. Hồ Chí Minh',
  hotline: '1900 0000',
  hours: 'Thứ 2 - Chủ nhật, 8:00 - 20:00'
};

const link = 'text-ink-2 transition-colors duration-[var(--dur-short)] hover:text-ink hover:underline hover:decoration-accent';

export function Footer() {
  const openChat = useUi((s) => s.openChat);
  return (
    <footer className="mt-[var(--section-gap)] border-t border-ink bg-paper-2">
      <div className="container-page grid gap-x-8 gap-y-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo className="text-[2rem]" />
          <p className="mt-5 max-w-sm text-ink-2">
            Showroom ô tô mới và đã qua sử dụng. Giá minh bạch, hỗ trợ trả góp, lái thử tận nơi và tư vấn trực tuyến mỗi ngày.
          </p>
          <button
            type="button"
            onClick={() => openChat()}
            className="mt-6 inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border border-ink px-4 text-sm text-ink transition-colors duration-[var(--dur-short)] hover:bg-ink hover:text-paper"
          >
            <MessageCircle className="size-4" /> Chat với tư vấn viên
          </button>
        </div>
        <div className="md:col-span-3 md:col-start-7">
          <h4 className="font-display text-xl font-normal">Mua xe</h4>
          <ul className="mt-4 space-y-3">
            <li><Link to="/cars" className={link}>Tất cả xe</Link></li>
            <li><Link to="/cars?condition=new" className={link}>Xe mới</Link></li>
            <li><Link to="/cars?condition=used" className={link}>Xe đã qua sử dụng</Link></li>
            <li><Link to="/cars?fuel=electric" className={link}>Xe điện</Link></li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h4 className="font-display text-xl font-normal">Showroom</h4>
          <dl className="mt-4 space-y-3">
            <div><dt className="text-sm text-muted">Địa chỉ</dt><dd className="text-ink-2">{SHOWROOM.address}</dd></div>
            <div><dt className="text-sm text-muted">Hotline</dt><dd className="text-ink-2 num">{SHOWROOM.hotline}</dd></div>
            <div><dt className="text-sm text-muted">Giờ mở cửa</dt><dd className="text-ink-2">{SHOWROOM.hours}</dd></div>
          </dl>
        </div>
      </div>
      <div className="container-page border-t border-rule py-6 text-sm text-muted">
        © {new Date().getFullYear()} ShopCar. Dự án portfolio - giá xe chỉ mang tính tham khảo.
      </div>
    </footer>
  );
}
