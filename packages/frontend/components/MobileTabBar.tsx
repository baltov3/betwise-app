'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  Cog6ToothIcon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';

const tabs = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Stats', href: '/dashboard/stats', icon: ChartPieIcon },
  { name: 'Predict', href: '/dashboard/predictions', icon: ChartBarIcon },
  { name: 'Subs', href: '/dashboard/subscription', icon: CreditCardIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40
                    rounded-2xl bg-white/80 dark:bg-gray-900/70 backdrop-blur
                    border border-gray-200/60 dark:border-gray-800 shadow-lg
                    px-2 py-1 flex gap-1">
      {tabs.map((tab) => {
        const active = pathname?.startsWith(tab.href);
        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl
                        text-xs font-medium transition-colors
                        ${active
                          ? 'text-primary-700 bg-primary-50 dark:bg-primary-900/40 dark:text-primary-200'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'}`}
          >
            <tab.icon className="h-5 w-5" />
            <span className="hidden xs:block">{tab.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}