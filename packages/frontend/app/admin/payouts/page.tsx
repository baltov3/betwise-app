'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';

interface RequestItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function UserPayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>(null);

  // НОВО: състояние за форма
  const [amountInput, setAmountInput] = useState<string>('');
  const MIN_PAYOUT = 20;

  const available = useMemo(() => Number(status?.balance?.available || 0), [status]);
  const parsedAmount = useMemo(() => {
    const n = Number((amountInput || '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }, [amountInput]);

  const clampedMax = useMemo(() => Math.max(0, available), [available]);

  const load = async () => {
    try {
      const [reqs, stat] = await Promise.all([
        api.get('/payouts/my-requests'),
        api.get('/payouts/status'),
      ]);
      setRequests(reqs.data.data.requests);
      setStatus(stat.data.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  const setQuick = (val: number) => {
    const v = Math.min(clampedMax, Math.max(MIN_PAYOUT, Number(val)));
    setAmountInput(v.toFixed(2));
  };

  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setAmountInput(v.toFixed(2));
  };

  const requestPayout = async () => {
    if (!status?.stripePayoutsEnabled) {
      toast.error('Завърши Stripe онбординга, за да заявиш теглене.');
      return;
    }
    if (available < MIN_PAYOUT) {
      toast.error(`Минималната сума за теглене е $${MIN_PAYOUT}.`);
      return;
    }
    if (!Number.isFinite(parsedAmount)) {
      toast.error('Невалидна сума.');
      return;
    }
    if (parsedAmount < MIN_PAYOUT) {
      toast.error(`Минималната сума за теглене е $${MIN_PAYOUT}.`);
      return;
    }
    if (parsedAmount > available) {
      toast.error(`Нямаш достатъчна наличност. Максимум: $${available.toFixed(2)}`);
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

  const disableSubmit =
    !status?.stripePayoutsEnabled ||
    available < MIN_PAYOUT ||
    !Number.isFinite(parsedAmount) ||
    parsedAmount < MIN_PAYOUT ||
    parsedAmount > available;

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Заяви теглене на рефъръл печалбите си.</p>
        </div>

        {/* Статус + Баланс */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <div className="mb-2">
              <strong>Stripe статус:</strong>{' '}
              {status?.stripePayoutsEnabled ? 'Payouts enabled' : 'Payouts not enabled'}
            </div>
            {!status?.stripePayoutsEnabled && (
              <Link href="/dashboard/payouts/onboarding" className="inline-block px-3 py-2 bg-indigo-600 text-white rounded">
                Завърши Stripe онбординг
              </Link>
            )}
          </div>

          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Баланс</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Натрупани (Earned)</div>
                <div className="text-lg font-semibold text-gray-800">${Number(status?.balance?.earned || 0).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Заключени (Processing/Paid)</div>
                <div className="text-lg font-semibold text-gray-800">${Number(status?.balance?.locked || 0).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Чакащи (Requested)</div>
                <div className="text-lg font-semibold text-gray-800">${Number(status?.balance?.pending || 0).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Налични (Available)</div>
                <div className="text-lg font-semibold text-green-600">${available.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* НОВО: Форма за заявка със сума */}
        <div className="p-4 border rounded bg-white">
          <h2 className="text-lg font-semibold mb-3">Заяви теглене</h2>

          {available < MIN_PAYOUT ? (
            <div className="text-sm text-gray-600">
              Минималната сума за теглене е ${MIN_PAYOUT}. Текущо налични: ${available.toFixed(2)}.
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <label className="text-sm text-gray-700">
                  Сума за теглене ($)
                  <input
                    type="number"
                    min={MIN_PAYOUT}
                    step="0.01"
                    placeholder={MIN_PAYOUT.toFixed(2)}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="mt-1 w-full border rounded px-3 py-2"
                  />
                </label>

                <div>
                  <input
                    type="range"
                    min={MIN_PAYOUT}
                    max={Math.max(MIN_PAYOUT, Math.floor(clampedMax))}
                    step="1"
                    value={
                      Number.isFinite(parsedAmount)
                        ? Math.min(Math.max(parsedAmount, MIN_PAYOUT), Math.max(MIN_PAYOUT, Math.floor(clampedMax)))
                        : MIN_PAYOUT
                    }
                    onChange={onSliderChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>${MIN_PAYOUT}</span>
                    <span>${Math.max(MIN_PAYOUT, Math.floor(clampedMax))}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 border rounded hover:bg-gray-50"
                    onClick={() => setQuick(MIN_PAYOUT)}
                  >
                    ${MIN_PAYOUT}
                  </button>
                  {available >= 50 && (
                    <button
                      type="button"
                      className="px-3 py-1 border rounded hover:bg-gray-50"
                      onClick={() => setQuick(50)}
                    >
                      $50
                    </button>
                  )}
                  {available >= 100 && (
                    <button
                      type="button"
                      className="px-3 py-1 border rounded hover:bg-gray-50"
                      onClick={() => setQuick(100)}
                    >
                      $100
                    </button>
                  )}
                  <button
                    type="button"
                    className="px-3 py-1 border rounded hover:bg-gray-50"
                    onClick={() => setQuick(available)}
                  >
                    Максимум (${available.toFixed(2)})
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    className={`px-4 py-2 rounded text-white ${disableSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    onClick={requestPayout}
                    disabled={disableSubmit}
                    title={
                      !status?.stripePayoutsEnabled
                        ? 'Първо завърши Stripe онбординга'
                        : available < MIN_PAYOUT
                        ? `Минимална сума $${MIN_PAYOUT}`
                        : parsedAmount < MIN_PAYOUT
                        ? `Минимална сума $${MIN_PAYOUT}`
                        : parsedAmount > available
                        ? `Максимум $${available.toFixed(2)}`
                        : ''
                    }
                  >
                    Подай заявка
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* История на заявките */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Моите заявки</h2>
          {loading ? (
            <div>Loading...</div>
          ) : requests.length === 0 ? (
            <div>Няма заявки.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border">
                <thead>
                  <tr>
                    <th className="p-2 border">Amount</th>
                    <th className="p-2 border">Currency</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 border">${r.amount.toFixed(2)}</td>
                      <td className="p-2 border">{r.currency}</td>
                      <td className="p-2 border">{r.status}</td>
                      <td className="p-2 border">{new Date(r.createdAt).toLocaleString()}</td>
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