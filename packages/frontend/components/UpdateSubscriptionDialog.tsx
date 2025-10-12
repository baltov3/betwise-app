'use client';

import { useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

type Props = {
  user: {
    id: string;
    email: string;
    subscription: {
      plan: 'BASIC' | 'PREMIUM' | 'VIP' | null;
      status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | null;
      endDate: string | null;
    } | null;
  };
  onClose: () => void;
  onSaved: () => void;
};

export default function UpdateSubscriptionDialog({ user, onClose, onSaved }: Props) {
  const [plan, setPlan] = useState<'BASIC' | 'PREMIUM' | 'VIP' | ''>(user.subscription?.plan ?? '');
  const [status, setStatus] = useState<'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING' | ''>(user.subscription?.status ?? '');
  const [endDate, setEndDate] = useState<string>(
    user.subscription?.endDate ? new Date(user.subscription.endDate).toISOString().slice(0, 10) : ''
  );
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    try {
      setSaving(true);
      await api.put(`/admin/users/${user.id}/subscription`, {
        plan: plan || undefined,
        status: status || undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      toast.success('Абонаментът е обновен');
      onSaved();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || 'Грешка при обновяване на абонамента');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded bg-white p-4 shadow">
          <h2 className="text-lg font-semibold mb-2">Update Subscription</h2>
          <p className="text-sm text-gray-600 mb-4">{user.email}</p>

          <div className="space-y-3">
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Plan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                <option value="">—</option>
                <option value="BASIC">BASIC</option>
                <option value="PREMIUM">PREMIUM</option>
                <option value="VIP">VIP</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="border rounded px-2 py-1"
              >
                <option value="">—</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="CANCELLED">CANCELLED</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="PENDING">PENDING</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="border px-3 py-1 rounded">
              Отказ
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="bg-primary-600 text-white px-3 py-1 rounded disabled:opacity-50"
            >
              {saving ? 'Запис...' : 'Запиши'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}