'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '../../../../components/DashboardLayout';
import { api } from '../../../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../../../contexts/AuthContext';
import Link from 'next/link';

export default function PayoutsOnboardingPage() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'BG',
    birthDate: '',
  });

  const load = async () => {
    try {
      const [meRes, statusRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/payouts/status'),
      ]);
      const u = meRes.data?.data?.user;
      if (u) {
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          addressLine1: u.addressLine1 || '',
          addressLine2: u.addressLine2 || '',
          city: u.city || '',
          state: u.state || '',
          postalCode: u.postalCode || '',
          country: u.country || 'BG',
          birthDate: u.birthDate ? u.birthDate.slice(0, 10) : '',
        });
      }
      setStatus(statusRes.data?.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!authLoading && user) load(); }, [authLoading, user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/payouts/profile', form);
      toast.success('Profile saved');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const createExpressAccount = async () => {
    try {
      await api.post('/payouts/create-account', {});
      toast.success('Stripe account created');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create account');
    }
  };

  const openOnboardingOrUpdate = async () => {
    try {
      const res = await api.get('/payouts/account-link');
      const url = res?.data?.data?.url;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to open Stripe link');
    }
  };

  const connectExistingStripe = async () => {
    try {
      const res = await api.get('/payouts/connect/authorize');
      const url = res?.data?.data?.url;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to start Stripe connect');
    }
  };

  const openStripeDashboard = async () => {
    try {
      const res = await api.get('/payouts/login-link');
      const url = res?.data?.data?.url;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to open Stripe dashboard');
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-4">Loading...</div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-4">Please log in to access this page.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Stripe Account</h1>
            <p className="text-gray-600">Add or update your details, or connect an existing Stripe account to receive payouts.</p>
          </div>
          <Link href="/dashboard/payouts" className="text-primary-600 underline">
            Back to Payouts
          </Link>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* Local profile form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* form fields same as before */}
              <div>
                <label className="block text-sm text-gray-700 mb-1">First name</label>
                <input className="input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Last name</label>
                <input className="input" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Address line 1</label>
                <input className="input" value={form.addressLine1} onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Address line 2</label>
                <input className="input" value={form.addressLine2} onChange={(e) => setForm((f) => ({ ...f, addressLine2: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">City</label>
                <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">State</label>
                <input className="input" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Postal code</label>
                <input className="input" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Country (ISO2)</label>
                <input className="input" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Birth date</label>
                <input type="date" className="input" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-gray-200 rounded" onClick={saveProfile} disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>

              {!status?.stripeAccountId ? (
                <>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={createExpressAccount}>
                    Create Stripe account (Express)
                  </button>
                  <button className="px-4 py-2 bg-sky-600 text-white rounded" onClick={connectExistingStripe}>
                    Connect existing Stripe account (OAuth)
                  </button>
                </>
              ) : !status?.stripeOnboardingComplete ? (
                <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={openOnboardingOrUpdate}>
                  Complete Stripe onboarding
                </button>
              ) : (
                <>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded" onClick={openOnboardingOrUpdate}>
                    Update Stripe info
                  </button>
                  <button className="px-4 py-2 bg-slate-700 text-white rounded" onClick={openStripeDashboard}>
                    Open Stripe dashboard
                  </button>
                </>
              )}
            </div>

            <div className="p-3 bg-gray-50 rounded text-sm text-gray-700">
              <div>Stripe account: {status?.stripeAccountId || 'not created'}</div>
              <div>Onboarding complete: {status?.stripeOnboardingComplete ? 'Yes' : 'No'}</div>
              <div>Payouts enabled: {status?.stripePayoutsEnabled ? 'Yes' : 'No'}</div>
              {!!status?.stripeRequirementsDue?.length && (
                <div>Requirements due: {status.stripeRequirementsDue.join(', ')}</div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}