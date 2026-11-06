import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';
import { CarFront, LogOut, Menu, Moon, Package, Search, ShoppingCart, Sun, User, X } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useCart, cartCount } from '../stores/cart';
import { useUi } from '../stores/ui';

const NAV = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/cars', label: 'Mua xe' },
  { to: '/cars?condition=used', label: 'Xe đã qua sử dụng' },
  { to: '/contact', label: 'Liên hệ' }
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
        <CarFront className="size-5" />
      </span>
      Shop<span className="-ml-2 text-brand-600">Car</span>
    </Link>
  );
}

function SearchBox({ onDone, className = '' }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  function submit(e) {
    e.preventDefault();
    navigate(q.trim() ? `/cars?q=${encodeURIComponent(q.trim())}` : '/cars');
    setQ('');
    onDone?.();
  }
  return (
    <form onSubmit={submit} className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm xe, ví dụ: CX-5, Vios..."
        className="input h-10 rounded-full pl-9"
        aria-label="Tìm xe"
      />
    </form>
  );
}

function AccountMenu() {
  const { customer, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!customer) {
    return (
      <Link to="/login" className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800">
        <User className="size-5" />
        <span className="hidden sm:inline">Đăng nhập</span>
      </Link>
    );
  }
  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800';
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-2 rounded-full pl-1 pr-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-expanded={open}
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-500">
          {customer.name?.trim().split(' ').at(-1)?.[0]?.toUpperCase() || 'K'}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{customer.name}</span>
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-50 w-56 p-1.5 shadow-xl" onClick={() => setOpen(false)}>
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate font-semibold">{customer.name}</p>
            <p className="truncate text-xs text-slate-500">{customer.email}</p>
          </div>
          <Link to="/account" className={`${item} mt-1`}><User className="size-4" /> Tài khoản</Link>
          <Link to="/orders" className={item}><Package className="size-4" /> Đơn hàng của tôi</Link>
          <button
            className={`${item} text-red-600 dark:text-red-400`}
            onClick={() => { logout(); navigate('/'); }}
          >
            <LogOut className="size-4" /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const count = useCart(cartCount);
  const { theme, toggleTheme } = useUi();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location]);

  const navClass = ({ isActive }) =>
    `rounded-full px-3.5 py-2 text-sm font-medium transition ${isActive ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-lg dark:border-slate-800/80 dark:bg-slate-950/85">
      <div className="container-page flex h-16 items-center gap-4">
        <button className="-ml-2 rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            // "Xe đã qua sử dụng" shares the /cars path, so only highlight the plain list
            <NavLink key={n.label} to={n.to} end={n.end} className={n.to.includes('?') ? navClass({ isActive: false }) : navClass}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <SearchBox className="mr-2 hidden w-64 md:block" />
          <button
            onClick={toggleTheme}
            className="flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Link to="/cart" className="relative flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Giỏ hàng">
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <AccountMenu />
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <SearchBox className="mb-3" onDone={() => setMobileOpen(false)} />
          <nav className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} className="rounded-lg px-3 py-2.5 font-medium hover:bg-slate-100 dark:hover:bg-slate-800">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
