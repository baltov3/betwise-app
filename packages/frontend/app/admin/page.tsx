'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';

interface AdminStats {
  totalUsers: number;
  totalSubscriptions: number;
  totalPredictions: number;
  totalPayments: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }
    
    if (user) {
      fetchStats();
    }
  }, [user, router]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Overview of platform statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Users</h3>
            <p className="text-3xl font-bold text-primary-600">{stats?.totalUsers || 0}</p>
          </div>
          
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Active Subscriptions</h3>
            <p className="text-3xl font-bold text-green-600">{stats?.totalSubscriptions || 0}</p>
          </div>
          
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Predictions</h3>
            <p className="text-3xl font-bold text-blue-600">{stats?.totalPredictions || 0}</p>
          </div>
          
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Payments</h3>
            <p className="text-3xl font-bold text-purple-600">{stats?.totalPayments || 0}</p>
          </div>
          
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600">
              ${(stats?.totalRevenue || 0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/users"
              className="btn-primary text-center block"
            >
              Manage Users
            </a>
            <a
              href="/admin/predictions"
              className="btn-secondary text-center block"
            >
              Manage Predictions
            </a>
            <a
              href="/admin/subscriptions"
              className="btn-secondary text-center block"
            >
              View Subscriptions
            </a>
            <a
              href="/admin/payments"
              className="btn-secondary text-center block"
            >
              Payment Reports
            </a>
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <p className="text-gray-500">
            Recent activity feed would be displayed here, including new user registrations,
            subscription changes, and other important events.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}