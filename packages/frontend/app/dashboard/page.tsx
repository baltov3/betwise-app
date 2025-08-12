'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Prediction {
  id: string;
  sport: string;
  title: string;
  description: string;
  odds: number;
  matchDate: string;
  creator: {
    email: string;
  };
}

interface Subscription {
  plan: string;
  status: string;
  endDate: string;
}

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: string;
  referralLink: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [predictionsRes, subscriptionRes, referralStatsRes] = await Promise.all([
        api.get('/predictions?limit=5'),
        api.get('/subscriptions/status'),
        api.get('/referrals/stats'),
      ]);

      setPredictions(predictionsRes.data.data.predictions);
      setSubscription(subscriptionRes.data.data.subscription);
      setReferralStats(referralStatsRes.data.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (referralStats?.referralLink) {
      navigator.clipboard.writeText(referralStats.referralLink);
      toast.success('Referral link copied to clipboard!');
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user?.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Subscription</h3>
            {subscription ? (
              <div className="mt-2">
                <p className="text-2xl font-bold text-primary-600">{subscription.plan}</p>
                <p className="text-sm text-gray-500">
                  Status: <span className="capitalize">{subscription.status}</span>
                </p>
                {subscription.endDate && (
                  <p className="text-sm text-gray-500">
                    Expires: {format(new Date(subscription.endDate), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-gray-500">No active subscription</p>
                <a href="/pricing" className="text-primary-600 hover:text-primary-700 text-sm">
                  View Plans →
                </a>
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Referrals</h3>
            <div className="mt-2">
              <p className="text-2xl font-bold text-primary-600">
                {referralStats?.totalReferrals || 0}
              </p>
              <p className="text-sm text-gray-500">Total referred users</p>
              <p className="text-sm text-gray-500">
                Active: {referralStats?.activeReferrals || 0}
              </p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900">Earnings</h3>
            <div className="mt-2">
              <p className="text-2xl font-bold text-green-600">
                ${referralStats?.totalEarnings || '0.00'}
              </p>
              <p className="text-sm text-gray-500">Total referral earnings</p>
            </div>
          </div>
        </div>

        {/* Referral Link */}
        {referralStats?.referralLink && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Referral Link</h3>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralStats.referralLink}
                readOnly
                className="input flex-1"
              />
              <button onClick={copyReferralLink} className="btn-primary">
                Copy
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Share this link to earn commissions when people sign up!
            </p>
          </div>
        )}

        {/* Recent Predictions */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Predictions</h3>
          {predictions.length > 0 ? (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div key={prediction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <span className="inline-block px-2 py-1 text-xs font-semibold bg-primary-100 text-primary-800 rounded-full mb-2">
                        {prediction.sport}
                      </span>
                      <h4 className="font-medium text-gray-900">{prediction.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{prediction.description}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        Match: {format(new Date(prediction.matchDate), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">{prediction.odds}</p>
                      <p className="text-xs text-gray-500">Odds</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No predictions available.</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}