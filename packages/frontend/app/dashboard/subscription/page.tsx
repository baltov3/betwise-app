'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../../components/DashboardLayout';
import { api } from '../../../lib/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface Subscription {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string;
}

const PLANS = {
  BASIC: { name: 'Basic', price: 9.99, features: ['Daily predictions', 'Basic analytics', 'Email support'] },
  PREMIUM: { name: 'Premium', price: 19.99, features: ['Premium predictions', 'Advanced analytics', 'Priority support'] },
  VIP: { name: 'VIP', price: 39.99, features: ['VIP predictions', 'Personal advisor', '24/7 support'] },
};

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await api.get('/subscriptions/status');
      setSubscription(response.data.data.subscription);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    try {
      const response = await api.post('/subscriptions/create', { plan });
      window.location.href = response.data.data.url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create subscription');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setCancelLoading(true);
    try {
      await api.post('/subscriptions/cancel');
      toast.success('Subscription cancelled successfully');
      fetchSubscription();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-gray-600">Manage your subscription plan</p>
        </div>

        {/* Current Subscription */}
        {subscription && (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subscription</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-xl font-bold text-primary-600">
                  {PLANS[subscription.plan as keyof typeof PLANS]?.name || subscription.plan}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-sm font-medium capitalize ${
                  subscription.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {subscription.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Start Date</p>
                <p className="text-sm">{format(new Date(subscription.startDate), 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">End Date</p>
                <p className="text-sm">{format(new Date(subscription.endDate), 'MMM dd, yyyy')}</p>
              </div>
            </div>
            
            {subscription.status === 'ACTIVE' && (
              <div className="mt-6">
                <button
                  onClick={handleCancel}
                  disabled={cancelLoading}
                  className="btn-danger"
                >
                  {cancelLoading ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">
            {subscription ? 'Upgrade Plans' : 'Choose a Plan'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(PLANS).map(([key, plan]) => {
              const isCurrentPlan = subscription?.plan === key;
              const isDowngrade = subscription && 
                Object.keys(PLANS).indexOf(key) < Object.keys(PLANS).indexOf(subscription.plan);
              
              return (
                <div key={key} className={`card ${isCurrentPlan ? 'ring-2 ring-primary-600' : ''}`}>
                  {isCurrentPlan && (
                    <div className="absolute -top-1  left-1/2 transform -translate-x-1/2">
                     
                    </div>
                  )}
                  
                  <h4 className="text-xl font-bold text-gray-900">{plan.name}</h4>
                  <p className="text-3xl font-bold text-primary-600 my-4">
                    ${plan.price}
                    <span className="text-sm text-gray-500">/month</span>
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  {!isCurrentPlan && (
                    <button
                      onClick={() => handleUpgrade(key)}
                      disabled={isDowngrade}
                      className={`w-full ${
                        isDowngrade ? 'btn-secondary opacity-50 cursor-not-allowed' : 'btn-primary'
                      }`}
                    >
                      {isDowngrade ? 'Downgrade Not Available' : 'Choose Plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}