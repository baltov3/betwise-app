'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
  stripeId: string;
  user: { email: string };
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubs();
  }, []);

  const fetchSubs = async () => {
    try {
      const res = await api.get('/subscriptions/all');
      setSubs(res.data.data.subscriptions);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="text-gray-600">All active/cancelled subscriptions</p>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : subs.length === 0 ? (
        <div>No subscriptions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Plan</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Start date</th>
                <th className="p-2 border">End date</th>
                <th className="p-2 border">Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td className="p-2 border">{s.user?.email}</td>
                  <td className="p-2 border">{s.plan}</td>
                  <td className="p-2 border">{s.status}</td>
                  <td className="p-2 border">
                    {s.startDate ? new Date(s.startDate).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 border">
                    {s.endDate ? new Date(s.endDate).toLocaleString() : '-'}
                  </td>
                  <td className="p-2 border">{s.stripeId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}