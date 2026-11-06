import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { GripVertical, ImagePlus, LoaderCircle, Star, Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const MAX_IMAGES = 20;
const MAX_SIZE = 10 * 1024 * 1024;
const PER_REQUEST = 12; // the API takes at most 12 files per upload

// Car photos: drop or pick files (uploaded right away and converted to WebP by
// the server), drag thumbnails to reorder, the first photo is the cover.
export function ImageManager({ images, onChange, error }) {
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

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (dragIndex !== null) return; // reordering, not dropping files
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
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
            : error
              ? 'border-red-300 dark:border-red-500/40'
              : 'border-slate-300 dark:border-slate-700'
        }`}
      >
        <ImagePlus className="mx-auto size-8 text-slate-400" />
        <p className="mt-2 text-sm font-medium">Kéo thả ảnh vào đây</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">JPG, PNG, WebP · tối đa 10MB mỗi ảnh · {images.length}/{MAX_IMAGES} ảnh</p>
        <button
          type="button"
          disabled={full}
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-40 dark:text-brand-500 dark:hover:bg-brand-500/10"
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
      {error && <p className="mt-1.5 text-sm text-red-600 dark:text-red-400">{error}</p>}

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
                className={`group relative overflow-hidden rounded-xl border bg-slate-100 dark:bg-slate-800 ${
                  dragIndex === i ? 'border-brand-500 opacity-50' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <img src={img.thumbUrl || img.url} alt={`Ảnh ${i + 1}`} className="aspect-[4/3] w-full cursor-grab object-cover active:cursor-grabbing" draggable={false} />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-md bg-slate-950/75 px-2 py-0.5 text-[11px] font-semibold text-white">Ảnh bìa</span>
                )}
                <span className="absolute right-2 top-2 rounded-md bg-slate-950/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-hidden="true">
                  <GripVertical className="size-3.5" />
                </span>
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-slate-950/70 to-transparent p-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => move(i, 0)}
                      className="rounded-lg bg-white/90 p-1.5 text-slate-800 hover:bg-white"
                      title="Đặt làm ảnh bìa"
                      aria-label={`Đặt ảnh ${i + 1} làm ảnh bìa`}
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onChange(images.filter((_, j) => j !== i))}
                    className="rounded-lg bg-white/90 p-1.5 text-red-600 hover:bg-white"
                    title="Bỏ ảnh"
                    aria-label={`Bỏ ảnh ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
            {Array.from({ length: uploading }, (_, i) => (
              <li key={`up-${i}`} className="flex aspect-[4/3] items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
                <LoaderCircle className="size-6 animate-spin text-brand-600" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Kéo ảnh để đổi thứ tự. Ảnh đầu tiên là ảnh bìa trên cửa hàng.</p>
        </>
      )}
    </div>
  );
}
