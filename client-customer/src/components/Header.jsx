import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { LogOut, Menu, Moon, Package, ShoppingCart, Sun, User, X } from 'lucide-react';
import { useAuth } from '../stores/auth';
import { useCart, cartCount } from '../stores/cart';
import { useUi } from '../stores/ui';
import { useGuestOrders } from '../stores/guestOrders';
import { SearchBox } from './SearchBox';

// -- Mục đang mở: "Mua xe" và "Xe đã qua sử dụng" cùng là /cars, phân biệt bằng ?condition=used --
const usedOnly = (search) => new URLSearchParams(search).get('condition') === 'used';
const NAV = [
  { to: '/', label: 'Trang chủ', match: ({ pathname }) => pathname === '/' },
  { to: '/cars', label: 'Mua xe', match: ({ pathname, search }) => pathname.startsWith('/cars') && !(pathname === '/cars' && usedOnly(search)) },
  { to: '/cars?condition=used', label: 'Xe đã qua sử dụng', match: ({ pathname, search }) => pathname === '/cars' && usedOnly(search) },
  { to: '/contact', label: 'Liên hệ', match: ({ pathname }) => pathname.startsWith('/contact') }
];

const iconButton = 'relative flex size-11 items-center justify-center rounded-md text-ink-2 transition-colors duration-[var(--dur-short)] hover:bg-paper-2 hover:text-ink active:bg-paper-3';

export function Logo({ className = '' }) {
  return (
    <Link to="/" aria-label="ShopCar, về trang chủ" className={`wordmark text-[1.625rem] ${className}`}>
      SHOPCAR
    </Link>
  );
}

function AccountMenu() {
  const { customer, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const guestOrders = useGuestOrders((s) => s.orders.length);

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!customer) {
    return (
      <>
        {guestOrders > 0 && (
          <Link to="/orders" className={iconButton} aria-label="Đơn hàng của tôi" title="Đơn hàng của tôi">
            <Package className="size-5" />
          </Link>
        )}
        <Link to="/login" className="flex h-11 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm text-ink-2 transition-colors duration-[var(--dur-short)] hover:bg-paper-2 hover:text-ink">
          <User className="size-5" />
          <span className="hidden sm:inline">Đăng nhập</span>
        </Link>
      </>
    );
  }
  const item = 'flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-ink-2 transition-colors duration-[var(--dur-short)] hover:bg-paper-2 hover:text-ink';
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 items-center gap-2 whitespace-nowrap rounded-md pl-1.5 pr-3 text-sm text-ink-2 transition-colors duration-[var(--dur-short)] hover:bg-paper-2 hover:text-ink"
        aria-expanded={open}
      >
        <span className="flex size-8 items-center justify-center rounded-full border border-ink font-display text-base text-ink">
          {customer.name?.trim().split(' ').at(-1)?.[0]?.toUpperCase() || 'K'}
        </span>
        <span className="hidden max-w-28 truncate sm:inline">{customer.name}</span>
      </button>
      {open && (
        <div className="card absolute right-0 top-13 z-[var(--z-dropdown)] w-60 p-1.5 shadow-lg" onClick={() => setOpen(false)}>
          <div className="border-b border-rule px-3 pb-3 pt-2">
            <p className="truncate text-ink">{customer.name}</p>
            <p className="truncate text-sm text-muted">{customer.email}</p>
          </div>
          <Link to="/account" className={`${item} mt-1`}><User className="size-4" /> Tài khoản</Link>
          <Link to="/orders" className={item}><Package className="size-4" /> Đơn hàng của tôi</Link>
          <button
            type="button"
            className={`${item} text-error hover:text-error`}
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
    `whitespace-nowrap py-2 text-sm underline-offset-[0.4em] transition-colors duration-[var(--dur-short)] ${
      isActive ? 'text-ink underline decoration-accent decoration-1' : 'text-ink-2 hover:text-ink'
    }`;

  return (
    <header className="sticky top-0 z-[var(--z-sticky-nav)] border-b border-rule bg-paper">
      <div className="container-page grid h-18 grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-4 xl:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-6">
          <button type="button" className={`${iconButton} -ml-2.5 xl:hidden`} onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu" aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <Link key={n.label} to={n.to} aria-current={n.match(location) ? 'page' : undefined} className={navClass({ isActive: n.match(location) })}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <Logo className="justify-self-center" />
        <div className="flex items-center justify-end gap-1">
          <SearchBox className="mr-2 hidden w-60 xl:block" />
          <button
            type="button"
            onClick={toggleTheme}
            className={iconButton}
            aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
          >
            {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Link to="/cart" className={iconButton} aria-label="Giỏ hàng">
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs text-paper num">
                {count}
              </span>
            )}
          </Link>
          <AccountMenu />
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-rule bg-paper px-4 py-4 xl:hidden">
          <SearchBox className="mb-3" onDone={() => setMobileOpen(false)} />
          <nav className="flex flex-col" aria-label="Điều hướng chính">
            {NAV.map((n) => (
              <Link
                key={n.label}
                to={n.to}
                aria-current={n.match(location) ? 'page' : undefined}
                className={`border-b border-rule px-1 py-3.5 last:border-b-0 ${n.match(location) ? 'text-ink underline decoration-accent underline-offset-[0.4em]' : 'text-ink-2'}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
