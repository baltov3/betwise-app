'use client';

import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface RequestItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function UserPayoutsPage() {
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

  useEffect(() => { load(); }, []);

  const requestPayout = async () => {
    try {
      await api.post('/payouts/request', {});
      toast.success('Payout request submitted');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Request failed');
    }
  };

  const onboarding = async () => {
    try {
      const res = await api.get('/payouts/account-link');
      if (res.data?.data?.url) {
        window.location.href = res.data.data.url;
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to start onboarding');
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-2">Payouts</h1>
      <p className="text-gray-600 mb-4">Request payouts for your referral earnings.</p>

      <div className="mb-4 p-4 border rounded">
        <div className="mb-2">
          <strong>Stripe status:</strong>{' '}
          {status?.stripePayoutsEnabled ? 'Payouts enabled' : 'Payouts not enabled'}
        </div>
        {!status?.stripePayoutsEnabled && (
          <button className="px-3 py-2 bg-indigo-600 text-white rounded" onClick={onboarding}>
            Complete Stripe onboarding
          </button>
        )}
      </div>

      <button
        className="px-4 py-2 bg-green-600 text-white rounded mb-6"
        onClick={requestPayout}
        disabled={!status?.stripePayoutsEnabled}
      >
        Request payout
      </button>

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
  );
}