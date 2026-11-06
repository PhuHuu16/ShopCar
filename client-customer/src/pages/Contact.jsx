import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button, PageHeader } from '../components/ui';
import { SHOWROOM } from '../components/Footer';
import { useTitle } from '../hooks/useTitle';
import { useUi } from '../stores/ui';

const MAP_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.7878052273613!2d106.69744577570373!3d10.827544458247356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528f4a62fce9b%3A0xc99902aa1e26ef02!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBWxINuIExhbmcgLSBDxqEgc-G7nyBjaMOtbmg!5e0!3m2!1svi!2s!4v1719289904736!5m2!1svi!2s';

export default function Contact() {
  useTitle('Liên hệ');
  const openChat = useUi((s) => s.openChat);
  const rows = [
    { icon: MapPin, label: 'Địa chỉ', value: SHOWROOM.address },
    { icon: Phone, label: 'Hotline', value: SHOWROOM.hotline },
    { icon: Clock, label: 'Giờ mở cửa', value: SHOWROOM.hours }
  ];
  return (
    <div className="container-page py-10">
      <PageHeader title="Liên hệ showroom">Ghé thăm, gọi điện hoặc nhắn tin, chúng tôi luôn sẵn sàng hỗ trợ.</PageHeader>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card flex items-center gap-4 p-5">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                <Icon className="size-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="font-semibold">{value}</p>
              </div>
            </div>
          ))}
          <div className="card p-5">
            <h2 className="font-semibold">Tư vấn trực tuyến</h2>
            <p className="mt-1 text-sm text-slate-500">Hỏi giá lăn bánh, đặt lịch lái thử hoặc hỏi về trả góp ngay trong khung chat.</p>
            <Button className="mt-4 w-full" onClick={() => openChat()}>
              <MessageCircle className="size-5" /> Bắt đầu chat
            </Button>
          </div>
        </div>
        <div className="card overflow-hidden">
          <iframe title="Bản đồ showroom" src={MAP_URL} className="h-[420px] w-full border-0 lg:h-full lg:min-h-[480px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      </div>
    </div>
  );
}
