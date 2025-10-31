'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import {
  HomeIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  BellIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';
import ThemeToggle from './ThemeToggle';
import MobileTabBar from './MobileTabBar';
import { motion } from 'framer-motion';
// NEW: subscription renewal notice modal
import SubscriptionRenewalNotice from './SubscriptionRenewalNotice';


// Добави този helper над компонента (след импортите):
const clearRenewalNoticeForUser = (userId?: string) => {
  if (typeof window === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (!k) continue;
      // чистим само ключовете за напомнянето, и по възможност само за конкретния userId
      const isRenewalKey = k.startsWith('renewalNoticeShown:');
      const isForUser = userId ? k.startsWith(`renewalNoticeShown:${userId}:`) : true;
      if (isRenewalKey && isForUser) keysToRemove.push(k);
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // игнорираме грешки
  }
};


const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Stats', href: '/dashboard/stats', icon: ChartPieIcon },
  { name: 'Predictions', href: '/dashboard/predictions', icon: ChartBarIcon },
  { name: 'Subscription', href: '/dashboard/subscription', icon: CreditCardIcon },
  { name: 'Referrals', href: '/dashboard/referrals', icon: UsersIcon },
  { name: 'Payouts', href: '/dashboard/payouts', icon: CreditCardIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  const [collapsed, setCollapsed] = useState(false); // desktop collapse
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
        clearRenewalNoticeForUser(user?.id);
    logout();
    router.push('/');
  };

  const initials = useMemo(() => {
    const email = user?.email || '';
    const namePart = email.split('@')[0] || 'U';
    return namePart.slice(0, 2).toUpperCase();
  }, [user]);

  // Най-дълбоко съвпадение за active state
  const matches = (href: string) => pathname === href || pathname?.startsWith(href + '/');

  const activeHref = useMemo(() => {
    const candidates = navigation.filter((n) => matches(n.href));
    if (candidates.length === 0) return '';
    return candidates.sort((a, b) => b.href.length - a.href.length)[0].href;
  }, [pathname]);

  // Ширини на сайдбара
  const sidebarWidth = collapsed ? 'md:w-20' : 'md:w-64';
  const mainOffset = collapsed ? 'md:ml-20' : 'md:ml-64';

  return (
    <div className="min-h-screen flex bg-[radial-gradient(1200px_800px_at_100%_-200px,rgba(99,102,241,0.08),transparent),radial-gradient(800px_600px_at_-100px_120%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(1200px_800px_at_100%_-200px,rgba(99,102,241,0.15),transparent),radial-gradient(800px_600px_at_-100px_120%,rgba(16,185,129,0.12),transparent)]">
      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setSidebarOpen(false)} />
          <motion.aside
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="relative h-full w-80 bg-white/85 dark:bg-gray-950/80 backdrop-blur-xl border-r border-gray-200/70 dark:border-gray-800 shadow-2xl"
          >
            <div className="flex items-center justify-between px-5 h-16">
              <Link href="/" className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-emerald-500">
                Betwise
              </Link>
              <button
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <nav className="px-3 pb-6 space-y-1 overflow-y-auto">
              {navigation.map((item) => {
                const active = item.href === activeHref;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`relative group flex items-center gap-3 px-3 py-2 rounded-xl transition-colors
                                ${active
                                  ? 'text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900/30'
                                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-gradient-to-b from-primary-500 to-fuchsia-500" />
                    )}
                    <item.icon className="h-5 w-5" />
                    <span className="text-base font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.aside>
        </div>
      )}

      {/* Desktop sidebar (collapsible) */}
      <div className={`hidden md:flex md:flex-col ${sidebarWidth} transition-[width] duration-200`}>
        <aside
          className={`fixed inset-y-0 z-30 flex flex-col ${sidebarWidth}
                      bg-white/80 dark:bg-gray-950/70 backdrop-blur-xl
                      border-r border-gray-200/70 dark:border-gray-800 transition-[width] duration-200`}
        >
          <div className="h-16 flex items-center justify-between px-3">
            <Link
              href="/"
              className={`font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary-600 to-emerald-500
                         ${collapsed ? 'text-lg px-2' : 'text-2xl px-4'}`}
              aria-label="Betwise"
            >
              {collapsed ? 'B' : 'Betwise'}
            </Link>
            <button
              onClick={() => setCollapsed((s) => !s)}
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg
                         hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronDoubleRightIcon className="h-5 w-5" /> : <ChevronDoubleLeftIcon className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={`relative group flex items-center ${collapsed ? 'justify-center' : 'justify-start'}
                              gap-3 ${collapsed ? 'px-2' : 'px-3'} py-2 rounded-xl transition-colors
                              focus:outline-none focus:ring-2 focus:ring-primary-500/40
                              ${active
                                ? 'text-primary-900 dark:text-primary-100 bg-primary-50 dark:bg-primary-900/30'
                                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
                >
                  {active && <span className="absolute left-0 top-0 h-full w-1 rounded-r bg-gradient-to-b from-primary-500 to-fuchsia-500" />}
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm font-semibold truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          <div className={`p-3 border-t border-gray-200/70 dark:border-gray-800 ${collapsed ? 'px-2' : 'px-4'}`}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 text-white grid place-items-center text-xs font-bold">
                {initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user?.email || 'User'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{user?.role || 'USER'}</div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Main */}
      <div className={`flex-1 min-w-0 ${mainOffset} transition-all duration-200`}>
        {/* Top navigation */}
        <div className="sticky top-0 z-20 h-16 bg-white/70 dark:bg-gray-950/60 backdrop-blur-xl border-b border-gray-200/70 dark:border-gray-800 shadow-sm">
          <div className="h-full flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
            <div className="flex items-center gap-2">
              <button
                className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg
                           border border-transparent bg-gray-100 hover:bg-gray-200
                           dark:bg-gray-800 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              {/* Search */}
              <div className="hidden sm:flex items-center">
                <div className="relative">
                  <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    placeholder="Search..."
                    className="pl-10 pr-3 h-10 w-[220px] sm:w-[280px] rounded-xl
                               bg-gray-100/90 dark:bg-gray-800/80
                               text-sm text-gray-900 dark:text-gray-100
                               placeholder:text-gray-500 dark:placeholder:text-gray-400
                               focus:outline-none focus:ring-2 focus:ring-primary-500/40"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              {user?.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg
                             bg-gradient-to-r from-primary-600 to-emerald-500 text-white text-sm font-semibold
                             shadow hover:opacity-95 transition-opacity"
                >
                  Admin Panel
                </Link>
              )}

              <button
                className="relative inline-flex items-center justify-center h-9 w-9 rounded-lg
                           border border-transparent bg-gray-100 hover:bg-gray-200
                           dark:bg-gray-800 dark:hover:bg-gray-700"
                aria-label="Notifications"
                title="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white px-1">
                  3
                </span>
              </button>

              <div className="relative">
                <button className="inline-flex items-center gap-2 h-10 pl-2 pr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-emerald-500 text-white grid place-items-center text-xs font-bold">
                    {initials}
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg border text-sm font-medium
                           border-gray-200 hover:bg-gray-100
                           dark:border-gray-800 dark:hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <main className="relative">
          {/* NEW: глобален модал за напомняне за абонамент */}
          <SubscriptionRenewalNotice />
          <div className="py-6">
            {/* Пълна ширина: без mx-auto и без max-w-* */}
            <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar />
    </div>
  );
}