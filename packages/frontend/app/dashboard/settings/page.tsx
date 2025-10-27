'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import {api} from '../../../lib/api';

type Preferences = {
  oddsFormat?: 'decimal' | 'fractional' | 'american';
  defaultStake?: number;
  favoriteSports?: string[];
  notifications?: { email?: boolean; push?: boolean; dailySummary?: boolean; marketing?: boolean };
  theme?: 'system' | 'light' | 'dark';
  language?: string;
  timeZone?: string;
  currency?: 'EUR' | 'USD' | 'BGN';
  publicProfile?: boolean;
  showReferralPublic?: boolean;
};

type SettingsDTO = {
  email: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string | null;
  age?: number | null;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  preferences?: Preferences;
  subscription?: { plan: string; status: string; endDate?: string | null };
  stripeOnboardingComplete?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeChargesEnabled?: boolean;
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsDTO>({
    defaultValues: {
      preferences: {
        oddsFormat: 'decimal',
        theme: 'system',
        notifications: { email: true, push: false, dailySummary: false, marketing: false },
        favoriteSports: [],
        currency: 'EUR',
      },
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    (async () => {
      try {
        const res = await api.get('/settings');
        reset(res.data.data);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load settings');
      }
    })();
  }, [authLoading, user, reset]);

  const prefs = watch('preferences');

  const onSubmit = async (data: SettingsDTO) => {
    try {
      const payload: Partial<SettingsDTO> = {
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate || undefined,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        preferences: data.preferences,
      };
      await api.patch('/settings', payload);
      toast.success('Настройките са запазени');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Неуспешно запазване');
    }
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="p-4">Зареждане...</div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="p-4">Моля, влез в профила си, за да достъпиш настройките.</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-semibold">Настройки</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <section className="space-y-4">
            <h2 className="text-lg font-medium">Профил</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input" placeholder="First name" {...register('firstName')} />
              <input className="input" placeholder="Last name" {...register('lastName')} />
              <input className="input" type="date" {...register('birthDate')} />
              <input className="input" placeholder="City" {...register('city')} />
              <input className="input" placeholder="Address line 1" {...register('addressLine1')} />
              <input className="input" placeholder="Address line 2" {...register('addressLine2')} />
              <input className="input" placeholder="State" {...register('state')} />
              <input className="input" placeholder="Postal code" {...register('postalCode')} />
              <input className="input" placeholder="Country (ISO-2)" {...register('country')} />
              <input className="input" placeholder="Email" disabled {...register('email')} />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Предпочитания за залози</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="input" {...register('preferences.oddsFormat')}>
                <option value="decimal">Decimal</option>
                <option value="fractional">Fractional</option>
                <option value="american">American</option>
              </select>
              <input className="input" type="number" step="0.01" placeholder="Default stake" {...register('preferences.defaultStake', { valueAsNumber: true })} />
              <input
                className="input"
                placeholder="Favorite sports (comma-separated)"
                value={(prefs?.favoriteSports || []).join(', ')}
                onChange={(e) =>
                  setValue(
                    'preferences.favoriteSports',
                    e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                  )
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Известия</h2>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.notifications.email')} /> Email
            </label>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.notifications.push')} /> Push
            </label>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.notifications.dailySummary')} /> Daily summary
            </label>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.notifications.marketing')} /> Marketing emails
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Визия и локализация</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select className="input" {...register('preferences.theme')}>
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <input className="input" placeholder="Language (e.g. bg, en)" {...register('preferences.language')} />
              <input className="input" placeholder="Time zone (e.g. Europe/Sofia)" {...register('preferences.timeZone')} />
              <select className="input" {...register('preferences.currency')}>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="BGN">BGN</option>
              </select>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-medium">Поверителност</h2>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.publicProfile')} /> Public profile
            </label>
            <label className="flex gap-2 items-center">
              <input type="checkbox" {...register('preferences.showReferralPublic')} /> Show referral stats publicly
            </label>
          </section>

          <div>
            <button className="btn btn-primary" type="submit">Запази</button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}