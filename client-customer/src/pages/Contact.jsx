import { Clock, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Button, PageHeader } from '../components/ui';
import { ContactForm } from '../components/ContactForm';
import { SHOWROOM } from '../components/Footer';
import { useTitle } from '../hooks/useTitle';
import { useUi } from '../stores/ui';

const MAP_URL = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3918.7878052273613!2d106.69744577570373!3d10.827544458247356!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x317528f4a62fce9b%3A0xc99902aa1e26ef02!2zVHLGsOG7nW5nIMSQ4bqhaSBo4buNYyBWxINuIExhbmcgLSBDxqEgc-G7nyBjaMOtbmg!5e0!3m2!1svi!2s!4v1719289904736!5m2!1svi!2s';
const MAP_LINK = 'https://www.google.com/maps/search/?api=1&query=10.827544,106.697446';

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
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-paper-2 text-accent">
                <Icon className="size-6" />
              </div>
              <div>
                <p className="text-sm text-muted">{label}</p>
                <p className="font-medium">{value}</p>
              </div>
            </div>
          ))}
          <div className="card p-5">
            <h2 className="font-medium">Tư vấn trực tuyến</h2>
            <p className="mt-1 text-sm text-muted">
              Không cần tài khoản. Hỏi giá, lái thử, trả góp ngay trong khung chat; ngoài giờ có trợ lý tự động trả lời.
            </p>
            <Button className="mt-4 w-full" onClick={() => openChat()}>
              <MessageCircle className="size-5" /> Bắt đầu chat
            </Button>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-medium">Gửi lời nhắn cho showroom</h2>
          <p className="mb-5 mt-1 text-sm text-muted">Không cần tài khoản. Để lại số điện thoại, tư vấn viên sẽ gọi lại cho bạn.</p>
          <ContactForm />
        </div>
        <figure className="lg:col-span-2">
          <div className="card overflow-hidden">
            <iframe title="Bản đồ showroom" src={MAP_URL} tabIndex={-1} className="h-[420px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
          <figcaption className="mt-3 text-sm">
            <a href={MAP_LINK} target="_blank" rel="noreferrer" className="link">Mở bản đồ trong Google Maps</a>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
