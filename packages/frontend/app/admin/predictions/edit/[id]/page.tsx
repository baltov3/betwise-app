'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../../../lib/api';
import AdminLayout from '../../../../../components/AdminLayout';

export default function EditPredictionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [form, setForm] = useState({
    sport: '',
    title: '',
    description: '',
    odds: '',
    matchDate: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/predictions/${id}`)
      .then((res) => {
        const p = res.data.data.prediction;
        setForm({
          sport: p.sport,
          title: p.title,
          description: p.description,
          odds: p.odds,
          matchDate: p.matchDate?.slice(0, 16) || '',
        });
      })
      .catch(() => toast.error('Failed to load prediction'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/predictions/${id}`, {
        ...form,
        odds: parseFloat(form.odds),
        matchDate: form.matchDate,
      });
      toast.success('Prediction updated!');
      router.push('/admin/predictions');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error updating prediction');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto mt-10 card p-8">
        <h2 className="text-xl font-bold mb-4">Edit Prediction</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              name="sport"
              type="text"
              className="input w-full"
              placeholder="Sport"
              required
              value={form.sport}
              onChange={handleChange}
            />
            <input
              name="title"
              type="text"
              className="input w-full"
              placeholder="Title"
              required
              value={form.title}
              onChange={handleChange}
            />
            <textarea
              name="description"
              className="input w-full"
              placeholder="Description"
              required
              value={form.description}
              onChange={handleChange}
            />
            <input
              name="odds"
              type="number"
              step="0.01"
              min="1"
              className="input w-full"
              placeholder="Odds"
              required
              value={form.odds}
              onChange={handleChange}
            />
            <input
              name="matchDate"
              type="datetime-local"
              className="input w-full"
              required
              value={form.matchDate}
              onChange={handleChange}
            />
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}