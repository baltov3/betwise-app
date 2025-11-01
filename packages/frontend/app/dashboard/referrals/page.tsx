'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { formatCurrency } from '../../../lib/currency';

interface Referral {
  id: string;
  earnedAmount: number;
  createdAt: string;
  referred: {
    id: string;
    email: string;
    createdAt: string;
    subscription: {
      plan: string;
      status: string;
    } | null;
  };
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: string; // string от API; ще го конвертираме към number за формат
  referralLink: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [referralsResponse, statsResponse] = await Promise.all([
        api.get('/referrals/my'),
        api.get('/referrals/stats'),
      ]);

      setReferrals(referralsResponse.data.data.referrals || []);
      setStats(statsResponse.data.data || null);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      toast.success('Referral link copied to clipboard!');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalEarningsNumber = parseFloat(stats?.totalEarnings || '0') || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Hero / Header */}
        <div className="relative overflow-hidden rounded-2xl border border-primary-200/40 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-6">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-primary-100 opacity-40 blur-3xl" />
          <div className="absolute -bottom-12 -left-10 h-48 w-48 rounded-full bg-emerald-100 opacity-40 blur-3xl" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                Grow your earnings with referrals
              </h1>
              <p className="text-sm text-gray-600">
                Invite friends and earn commissions when they subscribe. All payouts are in EUR.
              </p>
            </div>

            {stats?.referralLink && (
              <div className="flex w-full md:w-auto items-center gap-2">
                <input
                  type="text"
                  value={stats.referralLink}
                  readOnly
                  className="input w-full md:w-96"
                />
                <button
                  onClick={copyReferralLink}
                  className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-primary-500"
                >
                  Copy Link
                </button>
              </div>
            )}
          </div>

          {/* Tip strip */}
          <div className="relative mt-4 rounded-lg border border-primary-100 bg-white/70 p-3 text-xs text-gray-700 backdrop-blur">
            Pro tip: Share your link on social media or add it to your bio for steady passive earnings.
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700">Total Referrals</h3>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
              {stats?.totalReferrals || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">All-time referred users</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700">Active Referrals</h3>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
              {stats?.activeReferrals || 0}
            </p>
            <p className="mt-1 text-xs text-gray-500">Currently subscribed referrals</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (Number(stats?.activeReferrals || 0) / Math.max(1, Number(stats?.totalReferrals || 1))) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Conversion rate indicator
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <h3 className="text-sm font-medium text-gray-700">Total Earnings</h3>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-emerald-600">
              {formatCurrency(totalEarningsNumber)}
            </p>
            <p className="mt-1 text-xs text-gray-500">Referral commissions (EUR)</p>
            <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800">
              Payouts are managed in the Payouts section. Track status and request withdrawals there.
            </div>
            <div className="mt-2">
              <a
                href="/dashboard/payouts"
                className="inline-flex items-center text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                Go to Payouts →
              </a>
            </div>
          </div>
        </div>

        {/* Ideas to boost referrals (modern) */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Boost your results</h3>
            <span className="text-xs text-gray-500">Quick ideas to grow referrals</span>
          </div>

          <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1 */}
            <li className="group rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-indigo-200 ring-1 ring-indigo-300/50">
                  <span className="text-lg">📣</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Share weekly picks</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Post your best insights and attach your referral link to every post.
                  </p>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-1.5 w-1/2 rounded-full bg-indigo-500 transition-all group-hover:w-3/4"></div>
                  </div>
                </div>
              </div>
            </li>

            {/* Card 2 */}
            <li className="group rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 ring-1 ring-emerald-300/50">
                  <span className="text-lg">🔗</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Add link to your bio</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Put your referral link in Instagram, X/Twitter and TikTok bios for steady traffic.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                      Always visible
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-200">
                      Low effort
                    </span>
                  </div>
                </div>
              </div>
            </li>

            {/* Card 3 */}
            <li className="group rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 ring-1 ring-amber-300/50">
                  <span className="text-lg">💬</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Personal invites</p>
                  <p className="mt-1 text-sm text-gray-600">
                    DM friends with a short note why you like the platform — converts best.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">High trust</span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">Better CTR</span>
                    <span className="rounded-md bg-gray-100 px-2 py-1 text-gray-700">Fast</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* Referral List - responsive for mobile */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Your Referrals</h3>
            <p className="text-xs text-gray-500">Earnings shown in EUR</p>
          </div>

          {referrals.length > 0 ? (
            <>
              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {referrals.map((referral) => (
                  <div key={referral.id} className="rounded-lg border p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{referral.referred.email}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Joined: {format(new Date(referral.referred.createdAt), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                          referral.referred.subscription?.status === 'ACTIVE'
                            ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                            : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                        }`}
                      >
                        {referral.referred.subscription?.status || 'No Subscription'}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Subscription</p>
                        <p className="font-medium text-gray-700">
                          {referral.referred.subscription?.plan || 'None'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Earnings</p>
                        <p className="font-semibold text-emerald-700">
                          {formatCurrency(referral.earnedAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">User Email</th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">Joined Date</th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">Subscription</th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">Status</th>
                      <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-700">Earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral, idx) => (
                      <tr
                        key={referral.id}
                        className={idx % 2 ? 'bg-white' : 'bg-gray-50/50 hover:bg-gray-50'}
                      >
                        <td className="px-3 py-2 text-gray-900">{referral.referred.email}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {format(new Date(referral.referred.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-3 py-2 text-gray-600">
                          {referral.referred.subscription?.plan || 'None'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${
                              referral.referred.subscription?.status === 'ACTIVE'
                                ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
                                : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200'
                            }`}
                          >
                            {referral.referred.subscription?.status || 'No Subscription'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-emerald-700">
                          {formatCurrency(referral.earnedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-600">No referrals yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Share your referral link to start earning commissions!
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}