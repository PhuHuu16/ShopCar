import { useEffect } from 'react';
import { Link } from 'react-router';
import { LoaderCircle, X } from 'lucide-react';

// -- Nút: viền mực mảnh; chỉ "primary" được đổ màu mực --
const VARIANTS = {
  primary: 'border border-ink bg-ink text-paper hover:bg-ink-2 hover:border-ink-2',
  secondary: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  outline: 'border border-muted bg-card text-ink hover:border-ink hover:bg-paper-2',
  ghost: 'border border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
  danger: 'border border-error bg-error text-paper hover:opacity-90',
  'danger-outline': 'border border-error bg-transparent text-error hover:bg-error-soft',
  success: 'border border-success bg-transparent text-success hover:bg-success hover:text-paper'
};
const SIZES = {
  xs: 'min-h-8 px-2.5 text-xs',
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
  icon: 'size-9'
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium
    transition-[background-color,color,border-color,opacity,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)]
    active:translate-y-px motion-reduce:transition-none motion-reduce:active:translate-y-0
    disabled:cursor-not-allowed disabled:opacity-55 disabled:active:translate-y-0 aria-busy:cursor-progress
    ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
}

export function Button({ variant, size, className, loading, children, disabled, type = 'button', ...props }) {
  return (
    <button type={type} className={buttonClass({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, children, ...props }) {
  return (
    <Link className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

export function Field({ label, error, hint, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && <label className="label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

const errorClass = (error) => (error ? 'border-error  ' : '');

export function Input({ label, error, hint, className, id, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <input id={id} className={`input ${errorClass(error)}`} {...props} />
    </Field>
  );
}

export function Textarea({ label, error, hint, className, id, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <textarea id={id} className={`input min-h-32 resize-y ${errorClass(error)}`} {...props} />
    </Field>
  );
}

export function Select({ label, error, hint, className, id, options, placeholder, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className} htmlFor={id}>
      <select id={id} className={`input ${errorClass(error)}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </Field>
  );
}

export function Badge({ className = '', children }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-medium ${className}`}>{children}</span>;
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-16 ${className}`}>
      <LoaderCircle className="size-7 animate-spin text-muted" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <Icon className="mb-4 size-7 text-muted" aria-hidden="true" />
      )}
      <h3 className="text-xl">{title}</h3>
      {children && <p className="mt-1 max-w-md text-sm text-muted">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="rounded-md bg-error-soft px-6 py-8 text-center" role="alert">
      <p className="font-medium text-error">{error?.message || 'Có lỗi xảy ra'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-5">
      <div className="min-w-0">
        <h1 className="text-[length:var(--text-3xl)] font-light leading-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// -- Hộp thoại --
function useOverlay(open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer, size = 'max-w-md' }) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className={`relative w-full ${size} rounded-t-md bg-card shadow-xl sm:rounded-md`}>
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <h2 className="text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-rule px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// -- Ngăn kéo bên phải --
export function Drawer({ open, onClose, title, children, footer }) {
  useOverlay(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--z-modal)]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col bg-card shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-4">
          <h2 className="text-2xl">{title}</h2>
          <button type="button" onClick={onClose} className="flex size-9 items-center justify-center rounded-md text-muted hover:bg-paper-2 hover:text-ink" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-rule px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input type="search" className="input pl-9" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// -- Bảng --
export function Table({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm [&_thead]:border-b [&_thead]:border-ink">{children}</table>
    </div>
  );
}

export const th = 'whitespace-nowrap px-4 py-3 text-sm font-normal text-muted';
export const td = 'whitespace-nowrap px-4 py-3 align-middle';
