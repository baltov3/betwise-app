'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../../../lib/api';
import AdminLayout from '../../../../../components/AdminLayout';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function EditPredictionPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    categoryId: '',
    title: '',
    league: '',
    homeTeam: '',
    awayTeam: '',
    pick: '',
    odds: '',
    scheduledAt: '',
    status: 'UPCOMING',
    resultNote: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchPrediction();
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/predictions/categories/list');
      setCategories(response.data.data.categories);
    } catch (error) {
      toast.error('Failed to load categories');
    }
  };

  const fetchPrediction = async () => {
    try {
      const res = await api.get(`/predictions/${id}`);
      const p = res.data.data.prediction;
      setForm({
        categoryId: p.categoryId,
        title: p.title,
        league: p.league || '',
        homeTeam: p.homeTeam || '',
        awayTeam: p.awayTeam || '',
        pick: p.pick,
        odds: p.odds,
        scheduledAt: p.scheduledAt?.slice(0, 16) || '',
        status: p.status,
        resultNote: p.resultNote || '',
      });
    } catch (error) {
      toast.error('Failed to load prediction');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/predictions/${id}`, {
        ...form,
        odds: parseFloat(form.odds),
        scheduledAt: form.scheduledAt,
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
      <div className="max-w-2xl mx-auto mt-10 card p-8">
        <h2 className="text-xl font-bold mb-4">Edit Prediction</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select
                name="categoryId"
                className="input w-full"
                required
                value={form.categoryId}
                onChange={handleChange}
              >
                <option value="">Select Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                name="title"
                type="text"
                className="input w-full"
                placeholder="e.g., Liverpool vs Manchester City"
                required
                value={form.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">League</label>
              <input
                name="league"
                type="text"
                className="input w-full"
                placeholder="e.g., Premier League"
                value={form.league}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Home Team</label>
                <input
                  name="homeTeam"
                  type="text"
                  className="input w-full"
                  placeholder="Home Team"
                  value={form.homeTeam}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Away Team</label>
                <input
                  name="awayTeam"
                  type="text"
                  className="input w-full"
                  placeholder="Away Team"
                  value={form.awayTeam}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Pick *</label>
              <input
                name="pick"
                type="text"
                className="input w-full"
                placeholder="e.g., Liverpool to win"
                required
                value={form.pick}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Odds *</label>
                <input
                  name="odds"
                  type="number"
                  step="0.01"
                  min="1"
                  className="input w-full"
                  placeholder="2.5"
                  required
                  value={form.odds}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  className="input w-full"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="UPCOMING">Upcoming</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                  <option value="VOID">Void</option>
                  <option value="EXPIRED">Expired</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Scheduled At *</label>
              <input
                name="scheduledAt"
                type="datetime-local"
                className="input w-full"
                required
                value={form.scheduledAt}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Result Note</label>
              <textarea
                name="resultNote"
                className="input w-full"
                placeholder="Optional result note"
                rows={3}
                value={form.resultNote}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}