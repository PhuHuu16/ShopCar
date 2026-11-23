import { CarFront } from 'lucide-react';

export function CarThumb({ car, className = 'h-10 w-16' }) {
  const image = car?.images?.[0] || car?.image;
  const src = typeof image === 'string' ? image : image?.thumbUrl || image?.url;
  if (!src) {
    return (
      <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-paper-2 text-muted `}>
        <CarFront className="size-5" />
      </div>
    );
  }
  return <img src={src} alt="" loading="lazy" className={`${className} shrink-0 rounded-lg bg-paper-2 object-cover `} />;
}
