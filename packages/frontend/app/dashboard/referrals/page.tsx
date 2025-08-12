'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Referral {
  id: string;
  earnedAmount: number;
  createdAt: string;
  referred: {
    id: string;
    email: string;
    createdAt: string;
    subscription: {
      plan: string;
      status: string;
    } | null;
  };
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: string;
  referralLink: string;
}

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [referralsResponse, statsResponse] = await Promise.all([
        api.get('/referrals/my'),
        api.get('/referrals/stats'),
      ]);

      setReferrals(referralsResponse.data.data.referrals);
      setStats(statsResponse.data.data);
    } catch (error) {
      console.error('Error fetching referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referralLink) {
      navigator.clipboard.writeText(stats.referralLink);
      toast.success('Referral link copied to clipboard!');
    }
  };

  const requestPayout = async () => {
    if (!stats || parseFloat(stats.totalEarnings) < 10) {
      toast.error('Minimum payout amount is $10');
      return;
    }

    if (confirm('Request payout for your referral earnings?')) {
      try {
        await api.post('/payments/payout');
        toast.success('Payout request submitted successfully');
        fetchData(); // Refresh data
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Failed to request payout');
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Program</h1>
          <p className="text-gray-600">Earn commissions by referring new users</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Total Referrals</h3>
            <p className="text-3xl font-bold text-primary-600">{stats?.totalReferrals || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Active Referrals</h3>
            <p className="text-3xl font-bold text-green-600">{stats?.activeReferrals || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Total Earnings</h3>
            <p className="text-3xl font-bold text-green-600">${stats?.totalEarnings || '0.00'}</p>
            {stats && parseFloat(stats.totalEarnings) >= 10 && (
              <button onClick={requestPayout} className="btn-primary mt-2 text-sm">
                Request Payout
              </button>
            )}
          </div>
        </div>

        {/* Referral Link */}
        {stats?.referralLink && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Referral Link</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={stats.referralLink}
                readOnly
                className="input flex-1"
              />
              <button onClick={copyReferralLink} className="btn-primary">
                Copy Link
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Share this link with friends to earn commissions when they subscribe!
            </p>
          </div>
        )}

        {/* Referral List */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Your Referrals</h3>
          
          {referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>User Email</th>
                    <th>Joined Date</th>
                    <th>Subscription</th>
                    <th>Status</th>
                    <th>Earnings</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {referrals.map((referral) => (
                    <tr key={referral.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {referral.referred.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(referral.referred.createdAt), 'MMM dd, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {referral.referred.subscription?.plan || 'None'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          referral.referred.subscription?.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {referral.referred.subscription?.status || 'No Subscription'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ${referral.earnedAmount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No referrals yet.</p>
              <p className="text-sm text-gray-400 mt-2">
                Share your referral link to start earning commissions!
              </p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}