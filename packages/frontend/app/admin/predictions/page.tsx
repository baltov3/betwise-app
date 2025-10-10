'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import AdminLayout from '../../../components/AdminLayout';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Prediction {
  id: string;
  categoryId: string;
  title: string;
  league?: string;
  homeTeam?: string;
  awayTeam?: string;
  pick: string;
  odds: string;
  scheduledAt: string;
  status: string;
  resultNote?: string;
  category?: Category;
  creator?: {
    email: string;
  };
}

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchPredictions();
  }, [statusFilter]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ pageSize: '100' });
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/predictions?${params.toString()}`);
      setPredictions(res.data.data.predictions);
    } catch (err) {
      toast.error('Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const deletePrediction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this prediction?')) return;
    try {
      await api.delete(`/predictions/${id}`);
      toast.success('Prediction deleted');
      setPredictions(predictions.filter((p) => p.id !== id));
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const runMaintenance = async () => {
    try {
      const res = await api.post('/predictions/maintenance/run');
      toast.success(res.data.message || 'Maintenance completed');
      fetchPredictions();
    } catch (err) {
      toast.error('Failed to run maintenance');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      UPCOMING: 'bg-blue-100 text-blue-800',
      WON: 'bg-green-100 text-green-800',
      LOST: 'bg-red-100 text-red-800',
      VOID: 'bg-gray-100 text-gray-800',
      EXPIRED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Predictions</h1>
        <div className="flex gap-2">
          <button onClick={runMaintenance} className="btn-secondary">
            Run Maintenance
          </button>
          <Link href="/admin/predictions/new" className="btn-primary">
            Add New Prediction
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <label className="mr-2">Filter by Status:</label>
        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded px-3 py-1"
        >
          <option value="">All</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
          <option value="VOID">Void</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : predictions.length === 0 ? (
        <div>No predictions found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr>
                <th className="p-2 border">Category</th>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Pick</th>
                <th className="p-2 border">Scheduled</th>
                <th className="p-2 border">Odds</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.category?.name || 'N/A'}</td>
                  <td className="p-2 border">{p.title}</td>
                  <td className="p-2 border">{p.pick}</td>
                  <td className="p-2 border">{new Date(p.scheduledAt).toLocaleString()}</td>
                  <td className="p-2 border">{p.odds}</td>
                  <td className="p-2 border">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-2 border">
                    <Link href={`/admin/predictions/edit/${p.id}`} className="btn-secondary mr-2">
                      Edit
                    </Link>
                    <button onClick={() => deletePrediction(p.id)} className="btn-danger">
                      Delete
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