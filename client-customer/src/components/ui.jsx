import { Link } from 'react-router';
import { LoaderCircle } from 'lucide-react';

// -- Nút: viền mực mảnh; chỉ "primary" được đổ màu mực --
const VARIANTS = {
  primary: 'border border-ink bg-ink text-paper hover:bg-ink-2 hover:border-ink-2',
  secondary: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  outline: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  white: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-paper',
  ghost: 'border border-transparent text-ink-2 hover:bg-paper-2 hover:text-ink',
  danger: 'border border-error bg-transparent text-error hover:bg-error-soft'
};
const SIZES = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-12 px-6 text-base'
};

export function buttonClass({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium
    transition-[background-color,color,border-color,transform] duration-[var(--dur-short)] ease-[var(--ease-out)]
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

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      <div className="min-h-[1lh] text-sm">
        {error ? <p className="mt-1.5 text-error">{error}</p> : hint ? <p className="mt-1.5 text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Input({ label, error, hint, className, ...props }) {
  return (
    <Field label={label} error={error} hint={hint} className={className}>
      <input className="input" aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center py-16 ${className}`} role="status" aria-label="Đang tải">
      <LoaderCircle className="size-7 animate-spin text-muted" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="ruled flex flex-col items-start gap-1 py-14">
      <h3 className="flex items-center gap-3 text-[length:var(--text-title)]">
        {Icon && <Icon className="size-6 shrink-0 text-muted" aria-hidden="true" />}
        {title}
      </h3>
      {children && <p className="mt-1 max-w-md text-muted">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="rounded-md bg-error-soft px-6 py-6" role="alert">
      <p className="font-medium text-error">{error?.message || 'Có lỗi xảy ra'}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="mb-10 border-b border-rule pb-6">
      <h1 className="text-[length:var(--text-3xl)] leading-[1.1] sm:text-5xl">{title}</h1>
      {children && <p className="mt-3 max-w-2xl text-ink-2">{children}</p>}
    </div>
  );
}
