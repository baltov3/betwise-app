'use client';

import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import UpsellModal from '../../../components/UpsellModal';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { formatCurrency } from './../../../lib/currency';

interface RequestItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface Subscription {
  status: string;
  endDate?: string;
}

export default function UserPayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [showUpsell, setShowUpsell] = useState(false);

  // Форма
  const [amountInput, setAmountInput] = useState<string>('');
  const MIN_PAYOUT = 20;

  const isSubActive = (sub: Subscription | null) =>
    Boolean(sub && sub.status === 'ACTIVE' && sub.endDate && new Date(sub.endDate) > new Date());

  const available = useMemo(() => Number(status?.balance?.available || 0), [status]);
  const parsedAmount = useMemo(() => {
    const n = Number((amountInput || '').replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }, [amountInput]);

  const hasStripe = Boolean(status?.stripePayoutsEnabled);
  const subActive = isSubActive(subscription);
  const meetsMin = available >= MIN_PAYOUT;
  const payoutsEligible = subActive && hasStripe && meetsMin;

  const load = async () => {
    try {
      const [reqs, stat, subRes] = await Promise.all([
        api.get('/payouts/my-requests'),
        api.get('/payouts/status'),
        api.get('/subscriptions/status').catch(
          () => ({ data: { data: { subscription: null } } }) as any
        ),
      ]);
      setRequests(reqs.data.data.requests);
      setStatus(stat.data.data);
      setSubscription(subRes.data?.data?.subscription || null);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) load();
  }, [authLoading, user]);

  const setQuick = (val: number) => {
    const v = Math.min(available, Math.max(MIN_PAYOUT, Number(val)));
    setAmountInput(v.toFixed(2));
  };

  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setAmountInput(v.toFixed(2));
  };

  const requestPayout = async () => {
    if (!subActive) {
      setShowUpsell(true);
      return;
    }
    if (!hasStripe) {
      toast.error('Завърши Stripe онбординга, за да заявиш теглене.');
      return;
    }
    if (!meetsMin) {
      toast.error(`Минималната сума за теглене е ${formatCurrency(MIN_PAYOUT)}.`);
      return;
    }
    if (!Number.isFinite(parsedAmount)) {
      toast.error('Невалидна сума.');
      return;
    }
    if (parsedAmount < MIN_PAYOUT) {
      toast.error(`Минималната сума за теглене е ${formatCurrency(MIN_PAYOUT)}.`);
      return;
    }
    if (parsedAmount > available) {
      toast.error(`Нямаш достатъчна наличност. Максимум: ${formatCurrency(available)}`);
      return;
    }

    try {
      await api.post('/payouts/request', { amount: Number(parsedAmount.toFixed(2)) });
      toast.success('Заявката за теглене е подадена');
      setAmountInput('');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Request failed');
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-4">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-4">Моля, влез в профила си, за да достъпиш тегленията.</div>
      </DashboardLayout>
    );
  }

  const visuallyDisabled =
    !subActive ||
    !hasStripe ||
    !meetsMin ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount < MIN_PAYOUT ||
    parsedAmount > available;

  const chip = (color: 'green' | 'red' | 'blue' | 'amber', text: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-50 text-green-700 ring-1 ring-green-200',
      red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
      blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
      amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    };
    return (
      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${colors[color]}`}>
        <span
          className={`h-2 w-2 rounded-full ${
            color === 'green'
              ? 'bg-green-500'
              : color === 'red'
              ? 'bg-red-500'
              : color === 'blue'
              ? 'bg-blue-500'
              : 'bg-amber-500'
          }`}
        />
        {text}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <UpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        title="Тегленето е налично за активни абонати"
        bullets={[
          'Отключи теглене на натрупаните средства',
          'По-високи комисиони с Premium/VIP планове',
          'Приоритетна поддръжка',
        ]}
        ctaHref="/pricing"
        ctaText="Виж плановете"
        secondaryCtaHref="/dashboard/subscription"
        secondaryCtaText="Управление на абонамент"
      />

      <div className="p-4 space-y-6">
        {/* Хедър */}
        <div className="relative overflow-hidden rounded-2xl border border-primary-200/40 bg-gradient-to-r from-primary-50 via-white to-indigo-50 p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Payouts</h1>
              <p className="text-sm text-gray-600">
                Управлявай заявките за теглене и следи баланса си от реферали.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {chip(subActive ? 'green' : 'red', subActive ? 'Subscription: Active' : 'Subscription: Inactive')}
              {chip(hasStripe ? 'green' : 'red', hasStripe ? 'Stripe статус: Payouts enabled' : 'Stripe статус: Not enabled')}
              {chip(payoutsEligible ? 'green' : 'red', payoutsEligible ? 'Withdrawals: Eligible' : 'Withdrawals: Locked')}
            </div>
          </div>

          {!payoutsEligible && (
            <div className="mt-4 rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-700 backdrop-blur">
              <div className="font-semibold text-gray-900 mb-1">Защо тегленето е недостъпно:</div>
              <ul className="list-disc pl-5 space-y-1">
                {!subActive && <li>Нямаш активен абонамент.</li>}
                {subActive && !hasStripe && <li>Stripe payouts не са активирани. Завърши онбординга в Stripe.</li>}
                {subActive && hasStripe && !meetsMin && (
                  <li>
                    Нямаш минимална наличност. Минимум: {formatCurrency(MIN_PAYOUT)}. Текущо: {formatCurrency(available)}.
                  </li>
                )}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {!subActive && (
                  <>
                    <Link href="/pricing" className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-primary-500">
                      Виж плановете
                    </Link>
                    <Link href="/dashboard/subscription" className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
                      Управление на абонамент
                    </Link>
                  </>
                )}
                {subActive && !hasStripe && (
                  <Link href="/dashboard/payouts/onboarding" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-indigo-500">
                    Завърши Stripe онбординг
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Карти */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subscription */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-medium text-gray-900">Абонамент</div>
            <div className="mb-3">
              {chip(subActive ? 'green' : 'red', subActive ? 'Active' : 'Inactive')}
            </div>
            {!subActive && (
              <div className="space-x-2">
                <Link href="/pricing" className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-primary-500">
                  Виж плановете
                </Link>
                <Link href="/dashboard/subscription" className="inline-flex items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-50">
                  Управление
                </Link>
              </div>
            )}
          </div>

          {/* Stripe статус */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-medium text-gray-900">Stripe статус</div>
            <div className="mb-3">
              {chip(hasStripe ? 'green' : 'red', hasStripe ? 'Payouts enabled' : 'Payouts not enabled')}
            </div>
            {!hasStripe && (
              <Link href="/dashboard/payouts/onboarding" className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500">
                Завърши Stripe онбординг
              </Link>
            )}
            {hasStripe && !subActive && (
              <p className="mt-2 text-xs text-gray-600">
                Аккаунтът в Stripe е активен, но тегленето е блокирано без активен абонамент.
              </p>
            )}
          </div>

          {/* Баланс */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold text-gray-900">Баланс</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Натрупани</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(Number(status?.balance?.earned || 0))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Заключени</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(Number(status?.balance?.locked || 0))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Чакащи</div>
                <div className="text-lg font-semibold text-gray-900">
                  {formatCurrency(Number(status?.balance?.pending || 0))}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">Налични</div>
                <div className="text-lg font-semibold text-green-600">
                  {formatCurrency(available)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Форма за заявка */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Заяви теглене</h2>

          {available < MIN_PAYOUT ? (
            <div className="text-sm text-gray-600">
              Минималната сума за теглене е {formatCurrency(MIN_PAYOUT)}. Текущо налични: {formatCurrency(available)}.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <label className="text-sm text-gray-700">
                Сума за теглене (EUR)
                <input
                  type="number"
                  min={MIN_PAYOUT}
                  step="0.01"
                  placeholder={MIN_PAYOUT.toFixed(2)}
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </label>

              <div>
                <input
                  type="range"
                  min={MIN_PAYOUT}
                  max={Math.max(MIN_PAYOUT, Math.floor(available))}
                  step="1"
                  value={
                    Number.isFinite(parsedAmount)
                      ? Math.min(
                          Math.max(parsedAmount, MIN_PAYOUT),
                          Math.max(MIN_PAYOUT, Math.floor(available))
                        )
                      : MIN_PAYOUT
                  }
                  onChange={onSliderChange}
                  className="w-full accent-primary-600"
                />
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>{formatCurrency(MIN_PAYOUT)}</span>
                  <span>{formatCurrency(Math.max(MIN_PAYOUT, Math.floor(available)))}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => setQuick(MIN_PAYOUT)}
                >
                  {formatCurrency(MIN_PAYOUT)}
                </button>
                {available >= 50 && (
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => setQuick(50)}
                  >
                    {formatCurrency(50)}
                  </button>
                )}
                {available >= 100 && (
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                    onClick={() => setQuick(100)}
                  >
                    {formatCurrency(100)}
                  </button>
                )}
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-50"
                  onClick={() => setQuick(available)}
                >
                  Максимум ({formatCurrency(available)})
                </button>
              </div>

              <div className="pt-1">
                <button
                  aria-disabled={visuallyDisabled}
                  title={
                    !subActive
                      ? 'Нужен е активен абонамент'
                      : !hasStripe
                      ? 'Завърши Stripe онбординга'
                      : !meetsMin
                      ? `Минимум ${formatCurrency(MIN_PAYOUT)}`
                      : !Number.isFinite(parsedAmount)
                      ? 'Невалидна сума'
                      : parsedAmount < MIN_PAYOUT
                      ? `Минимум ${formatCurrency(MIN_PAYOUT)}`
                      : parsedAmount > available
                      ? `Максимум ${formatCurrency(available)}`
                      : 'Подай заявка'
                  }
                  className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                    visuallyDisabled
                      ? 'bg-gray-300 text-gray-600 cursor-pointer'
                      : 'bg-primary-600 hover:bg-primary-500 shadow'
                  }`}
                  onClick={requestPayout}
                >
                  Подай заявка
                </button>
                {!subActive && (
                  <p className="mt-2 text-xs text-gray-500">
                    Бутонът е заключен: нужeн е активен абонамент
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* История на заявките */}
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-lg font-semibold text-gray-900">Моите заявки</h2>
          {loading ? (
            <div>Loading...</div>
          ) : requests.length === 0 ? (
            <div className="text-sm text-gray-600">Няма заявки.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                      Amount
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                      Currency
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                      Status
                    </th>
                    <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r, idx) => (
                    <tr key={r.id} className={idx % 2 ? 'bg-white' : 'bg-gray-50/50 hover:bg-gray-50'}>
                      <td className="px-3 py-2">
                        <span className="font-medium">{formatCurrency(r.amount)}</span>
                      </td>
                      <td className="px-3 py-2">{r.currency?.toUpperCase() || 'EUR'}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                            r.status === 'REQUESTED'
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              : r.status === 'PROCESSING'
                              ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : r.status === 'PAID'
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                              : r.status === 'FAILED'
                              ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                              : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}