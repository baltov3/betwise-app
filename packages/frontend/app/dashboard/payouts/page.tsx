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

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Request payouts for your referral earnings.</p>
        </div>

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

        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={requestPayout}
          disabled={!status?.stripePayoutsEnabled}
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