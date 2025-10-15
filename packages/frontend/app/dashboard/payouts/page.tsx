'use client';

import { useEffect, useState } from 'react';
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

  const requestPayout = async () => {
    try {
      await api.post('/payouts/request', {});
      toast.success('Payout request submitted');
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
        <div className="p-4">Please log in to access payouts.</div>
      </DashboardLayout>
    );
  }

  const balance = status?.balance || { earned: 0, locked: 0, pending: 0, available: 0 };

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Request payouts for your referral earnings.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <div className="mb-2">
              <strong>Stripe status:</strong>{' '}
              {status?.stripePayoutsEnabled ? 'Payouts enabled' : 'Payouts not enabled'}
            </div>
            {!status?.stripePayoutsEnabled && (
              <Link href="/dashboard/payouts/onboarding" className="inline-block px-3 py-2 bg-indigo-600 text-white rounded">
                Complete Stripe onboarding
              </Link>
            )}
          </div>

          <div className="p-4 border rounded">
            <h2 className="text-lg font-semibold mb-2">Balance</h2>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Earned</div>
                <div className="text-lg font-semibold text-gray-800">${Number(balance.earned).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Locked (processing/paid)</div>
                <div className="text-lg font-semibold text-gray-800">${Number(balance.locked).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Pending (requested)</div>
                <div className="text-lg font-semibold text-gray-800">${Number(balance.pending).toFixed(2)}</div>
              </div>
              <div className="p-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Available</div>
                <div className="text-lg font-semibold text-green-600">${Number(balance.available).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={requestPayout}
          disabled={!status?.stripePayoutsEnabled || Number(balance.available) <= 0}
          title={!status?.stripePayoutsEnabled ? 'Enable payouts in Stripe first' : Number(balance.available) <= 0 ? 'No available balance' : ''}
        >
          Request payout
        </button>

        <div>
          <h2 className="text-xl font-semibold mb-2">My requests</h2>
          {loading ? (
            <div>Loading...</div>
          ) : requests.length === 0 ? (
            <div>No requests yet.</div>
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