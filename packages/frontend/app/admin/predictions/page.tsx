'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '../../../lib/api';
import AdminLayout from '../../../components/AdminLayout';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description: string;
  odds: number;
  matchDate: string;
  creator?: {
    email: string;
  };
}

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictions();
  }, []);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/predictions?limit=100');
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

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Predictions</h1>
        <Link href="/admin/predictions/new" className="btn-primary">
          Add New Prediction
        </Link>
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
                <th className="p-2 border">Sport</th>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Match Date</th>
                <th className="p-2 border">Odds</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.sport}</td>
                  <td className="p-2 border">{p.title}</td>
                  <td className="p-2 border">{new Date(p.matchDate).toLocaleString()}</td>
                  <td className="p-2 border">{p.odds}</td>
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