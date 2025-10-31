'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDaysIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

type Subscription = {
  status: string;
  endDate?: string;
};

function formatBgDate(d: Date) {
  return d.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });
}

function daysUntil(date: Date) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  const diffMs = end.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function SubscriptionRenewalNotice() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ title: string; desc: string } | null>(null);
  const [cycleKey, setCycleKey] = useState<string | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [isCanceled, setIsCanceled] = useState(false);

  const daysLeft = useMemo(() => {
    if (!endAt) return null;
    return daysUntil(endAt);
  }, [endAt]);

  useEffect(() => {
    let mounted = true;
    if (!user?.id) return;

    const run = async () => {
      try {
        const res = await api.get('/subscriptions/status');
        const sub: Subscription | null = res?.data?.data?.subscription ?? null;
        if (!sub || !sub.endDate) return;

        const end = new Date(sub.endDate);
        const remaining = daysUntil(end);
        if (remaining < 0) return;

        if (remaining <= 3) {
          const key = `renewalNoticeShown:${user.id}:${end.toISOString().slice(0, 10)}`;
          setCycleKey(key);
          const already = typeof window !== 'undefined' && sessionStorage.getItem(key) === '1';
          if (already) return;

          const status = String(sub.status || '').toUpperCase();
          const canceled = status.includes('CANCEL');
          const dateStr = formatBgDate(end);

          const title = canceled ? 'Абонаментът е към своя край' : 'Предстоящо подновяване';
          const desc = canceled
            ? `Абонаментът ти е планиран да изтече на ${dateStr}. Можеш да го подновиш, когато решиш – лесно и по всяко време.`
            : `Следващото подновяване е на ${dateStr}. Всичко е наред – няма нужда от действие. По всяко време можеш да прегледаш детайлите и метода на плащане.`;

          if (!mounted) return;
          setIsCanceled(canceled);
          setEndAt(end);
          setMessage({ title, desc });
          setOpen(true);
        }
      } catch {
        // тих отказ – не пречим на UX
      }
    };

    run();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const markShownForThisCycle = () => {
    try {
      if (cycleKey) sessionStorage.setItem(cycleKey, '1');
    } catch {}
  };

  const handleClose = () => {
    markShownForThisCycle();
    setOpen(false);
  };

  const handlePrimaryAction = () => {
    // Маркираме като показано за текущия цикъл, затваряме и навигираме
    markShownForThisCycle();
    setOpen(false);
    router.push('/dashboard/subscription');
  };

  if (!open || !message) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Floating gradient orbs for mood */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 -left-10 h-60 w-60 rounded-full bg-primary-500/20 blur-3xl" />
            <div className="absolute -bottom-24 -right-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          </div>

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative mx-auto mt-24 w-[92%] max-w-lg"
            initial={{ y: 30, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
          >
            <div className="rounded-2xl border border-white/20 bg-white/80 p-0 shadow-2xl backdrop-blur-xl ring-1 ring-black/5 dark:bg-gray-950/70 dark:border-white/10">
              {/* Header with gradient band */}
              <div className="relative overflow-hidden rounded-t-2xl">
                <div className="h-2 w-full bg-gradient-to-r from-primary-500 via-fuchsia-500 to-emerald-500" />
                <div className="flex items-center gap-3 px-5 pt-4">
                  <div className="relative">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary-600 to-emerald-500 text-white shadow-lg">
                      {isCanceled ? (
                        <ShieldCheckIcon className="h-7 w-7" />
                      ) : (
                        <SparklesIcon className="h-7 w-7" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {message.title}
                    </h3>
                    {endAt && (
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-900/5 px-2 py-0.5 dark:bg-white/10">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <span className="font-medium">
                            {isCanceled ? 'Изтичане' : 'Подновяване'}: {formatBgDate(endAt)}
                          </span>
                        </span>
                        {typeof daysLeft === 'number' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary-600/10 text-primary-700 dark:text-primary-300 px-2 py-0.5">
                            Остават {daysLeft} {daysLeft === 1 ? 'ден' : 'дни'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 pb-5 pt-4">
                <p className="text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {message.desc}
                </p>

                {/* Soft progress hint (visual only) */}
                {typeof daysLeft === 'number' && endAt && (
                  <div className="mt-4">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200/70 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500"
                        style={{
                          width: `${Math.max(0, Math.min(100, ((4 - (daysLeft + 1)) / 4) * 100))}%`,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="mt-2 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Напомняне в последните 3 дни
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    По-късно
                  </button>

                  <button
                    onClick={handlePrimaryAction}
                    className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-white shadow
                      ${isCanceled
                        ? 'bg-gradient-to-r from-primary-600 to-emerald-600 hover:opacity-95'
                        : 'bg-gradient-to-r from-primary-600 to-fuchsia-600 hover:opacity-95'}`}
                  >
                    {isCanceled ? 'Поднови абонамента' : 'Преглед на абонамента'}
                  </button>
                  {/* Ако предпочиташ Link, можеш да обвиеш бутона с <Link href="/dashboard/subscription"> и да запазиш onClick={handlePrimaryAction} */}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}