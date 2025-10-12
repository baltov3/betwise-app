'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { api } from '../../../lib/api';
import toast from 'react-hot-toast';

interface User { email: string }
interface PayoutRequest {
  id: string;
  user: User;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export default function AdminPayoutsPage() {
  const [items, setItems] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get('/payouts/requests');
      setItems(res.data.data.requests);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load payout requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    try {
      await api.post(`/payouts/requests/${id}/approve`, {});
      toast.success('Payout approved and processed');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Approve failed');
    }
  };

  const reject = async (id: string) => {
    const note = prompt('Reason for rejection (optional):') || '';
    try {
      await api.post(`/payouts/requests/${id}/reject`, { note });
      toast.success('Payout rejected');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Reject failed');
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Payout Requests</h1>
        <p className="text-gray-600">Approve or reject user payout requests.</p>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : items.length === 0 ? (
        <div>No requests.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Currency</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 border">{r.user?.email}</td>
                  <td className="p-2 border">${r.amount.toFixed(2)}</td>
                  <td className="p-2 border">{r.currency}</td>
                  <td className="p-2 border">{r.status}</td>
                  <td className="p-2 border">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="p-2 border flex gap-2">
                    <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => approve(r.id)} disabled={r.status !== 'REQUESTED' && r.status !== 'FAILED'}>
                      Approve
                    </button>
                    <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => reject(r.id)} disabled={r.status !== 'REQUESTED'}>
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}