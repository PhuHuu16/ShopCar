import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { GripVertical, ImagePlus, LoaderCircle, Star, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const MAX_IMAGES = 20;
const MAX_SIZE = 10 * 1024 * 1024;
const PER_REQUEST = 12;

// -- Ảnh xe: kéo thả để tải lên, kéo để sắp xếp, ảnh đầu tiên là ảnh bìa --
export function ImageManager({ images, onChange, error, readOnly = false }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const latest = useRef(images);
  latest.current = images;

  async function upload(fileList) {
    const files = [...fileList].filter((f) => {
      if (!f.type.startsWith('image/')) {
        toast.error(`${f.name} không phải là ảnh`);
        return false;
      }
      if (f.size > MAX_SIZE) {
        toast.error(`${f.name} lớn hơn 10MB`);
        return false;
      }
      return true;
    });
    const room = MAX_IMAGES - latest.current.length;
    if (files.length > room) toast.warning(`Mỗi xe tối đa ${MAX_IMAGES} ảnh, chỉ tải lên ${Math.max(room, 0)} ảnh đầu.`);
    const accepted = files.slice(0, Math.max(room, 0));
    if (!accepted.length) return;

    setUploading((n) => n + accepted.length);
    for (let i = 0; i < accepted.length; i += PER_REQUEST) {
      const batch = accepted.slice(i, i + PER_REQUEST);
      const form = new FormData();
      batch.forEach((f) => form.append('images', f));
      try {
        const saved = await api('/uploads', { method: 'POST', form });
        onChange([...latest.current, ...saved]);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setUploading((n) => n - batch.length);
      }
    }
  }

  function move(from, to) {
    if (from === to || from === null) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  const full = images.length + uploading >= MAX_IMAGES;

  if (readOnly) {
    if (!images.length) return <p className="text-sm text-muted">Xe chưa có ảnh.</p>;
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.url} className="relative overflow-hidden rounded-md border border-rule bg-paper-2">
            <a href={img.url} target="_blank" rel="noreferrer">
              <img src={img.thumbUrl || img.url} alt={`Ảnh ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
            </a>
            {i === 0 && <span className="absolute left-2 top-2 rounded-sm bg-ink/80 px-2 py-0.5 text-xs text-paper">Ảnh bìa</span>}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files);
        }}
        className={`rounded-md border border-dashed p-6 text-center transition-colors ${
          dragOver
            ? 'border-ink bg-paper-2 '
            : error
              ? 'border-error '
              : 'border-muted '
        }`}
      >
        <ImagePlus className="mx-auto size-8 text-muted" />
        <p className="mt-2 text-sm font-medium">Kéo thả ảnh vào đây</p>
        <p className="mt-1 text-xs text-muted">JPG, PNG hoặc WebP, tối đa 10MB mỗi ảnh. Đã có {images.length}/{MAX_IMAGES} ảnh</p>
        <button
          type="button"
          disabled={full}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-md px-3 py-1.5 text-sm text-ink underline decoration-accent underline-offset-4 hover:bg-paper-2 disabled:opacity-40"
        >
          Chọn ảnh từ máy
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-error">{error}</p>}

      {(images.length > 0 || uploading > 0) && (
        <>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img, i) => (
              <li
                key={img.url}
                draggable
                onDragStart={(e) => {
                  setDragIndex(i);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) {
                    move(dragIndex, i);
                    setDragIndex(i);
                  }
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`group relative overflow-hidden rounded-md border bg-paper-2  ${
                  dragIndex === i ? 'border-ink opacity-50' : 'border-rule '
                }`}
              >
                <img src={img.thumbUrl || img.url} alt={`Ảnh ${i + 1}`} className="aspect-[4/3] w-full cursor-grab object-cover active:cursor-grabbing" draggable={false} />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-sm bg-ink/80 px-2 py-0.5 text-xs text-paper">Ảnh bìa</span>
                )}
                <span className="absolute right-2 top-2 rounded-md bg-ink/60 p-1 text-paper opacity-0 transition-colors group-hover:opacity-100" aria-hidden="true">
                  <GripVertical className="size-3.5" />
                </span>
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink/70 to-transparent p-2 opacity-100 transition-colors sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => move(i, 0)}
                      className="rounded-lg bg-card p-1.5 text-ink hover:bg-card"
                      title="Đặt làm ảnh bìa"
                      aria-label={`Đặt ảnh ${i + 1} làm ảnh bìa`}
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    className="rounded-lg bg-card p-1.5 text-error hover:bg-card"
                    title="Bỏ ảnh"
                    aria-label={`Bỏ ảnh ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <li key={`up-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-md border border-rule bg-paper">
                <LoaderCircle className="size-6 animate-spin text-accent" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Kéo ảnh để đổi thứ tự. Ảnh đầu tiên là ảnh bìa trên cửa hàng.</p>
        </>
      )}
    </div>
  );
}
