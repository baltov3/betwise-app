'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '../../../../lib/api';
import AdminLayout from '../../../../components/AdminLayout';

export default function AddPredictionPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    sport: '',
    title: '',
    description: '',
    odds: '',
    matchDate: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/predictions', {
        ...form,
        odds: parseFloat(form.odds),
        matchDate: form.matchDate,
      });
      toast.success('Prediction added!');
      router.push('/admin/predictions');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Error adding prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-lg mx-auto mt-10 card p-8">
        <h2 className="text-xl font-bold mb-4">Add New Prediction</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="sport"
            type="text"
            className="input w-full"
            placeholder="Sport (e.g. Football)"
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
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Adding...' : 'Add Prediction'}
          </button>
        </form>
      </div>
    </AdminLayout>
  );
}