'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';

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

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme(theme: 'system' | 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effective = theme === 'system' ? getSystemTheme() : theme;
  if (effective === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
  try { localStorage.setItem('theme', theme); } catch {}
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);

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

  // 1) Зареждане на данните от бекенда и попълване на формата
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        setLoadingSettings(true);
        const res = await api.get('/settings');
        const data = res.data?.data as SettingsDTO;

        // Нормализиране на birthDate (input type="date" изисква YYYY-MM-DD)
        const mapped: SettingsDTO = {
          ...data,
          birthDate: data?.birthDate ? data.birthDate.slice(0, 10) : undefined,
          preferences: {
            oddsFormat: data?.preferences?.oddsFormat ?? 'decimal',
            theme: data?.preferences?.theme ?? 'system',
            notifications: {
              email: data?.preferences?.notifications?.email ?? true,
              push: data?.preferences?.notifications?.push ?? false,
              dailySummary: data?.preferences?.notifications?.dailySummary ?? false,
              marketing: data?.preferences?.notifications?.marketing ?? false,
            },
            favoriteSports: data?.preferences?.favoriteSports ?? [],
            currency: data?.preferences?.currency ?? 'EUR',
            language: data?.preferences?.language ?? undefined,
            timeZone: data?.preferences?.timeZone ?? undefined,
            publicProfile: data?.preferences?.publicProfile ?? false,
            showReferralPublic: data?.preferences?.showReferralPublic ?? false,
          },
        };
        reset(mapped);

        // Прилагане на тема от бекенда
        const t = mapped?.preferences?.theme as 'system' | 'light' | 'dark' | undefined;
        if (t) applyTheme(t);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [authLoading, user, reset]);

  // 2) Прилагаме локално запазената тема веднага (преди API да върне)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        applyTheme(saved as any);
        setValue('preferences.theme', saved as any, { shouldDirty: false, shouldValidate: false });
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Автосинк на тема при промяна
  const currentTheme = watch('preferences.theme');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const t = (currentTheme || 'system') as 'system' | 'light' | 'dark';
    applyTheme(t);
    if (user) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        api.patch('/settings', { preferences: { theme: t } }).catch(() => {});
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, user]);

  const prefs = watch('preferences');

  // 4) Запазване – изпращаме само валидни стойности
  const onSubmit = async (data: SettingsDTO) => {
    try {
      const defaultStake =
        typeof data?.preferences?.defaultStake === 'number' && Number.isFinite(data.preferences.defaultStake)
          ? data.preferences.defaultStake
          : undefined;

      const payload: Partial<SettingsDTO> = {
        firstName: data.firstName?.trim() || undefined,
        lastName: data.lastName?.trim() || undefined,
        birthDate: data.birthDate || undefined,
        addressLine1: data.addressLine1?.trim() || undefined,
        addressLine2: data.addressLine2?.trim() || undefined,
        city: data.city?.trim() || undefined,
        state: data.state?.trim() || undefined,
        postalCode: data.postalCode?.trim() || undefined,
        country: data.country?.trim() || undefined, // Може "BG" или "Bulgaria" – бекендът нормализира
        preferences: {
          ...data.preferences,
          defaultStake,
          favoriteSports: (data.preferences?.favoriteSports || []).filter((s) => s && s.trim()),
        },
      };
      await api.patch('/settings', payload);
      toast.success('Настройките са запазени');
    } catch (e: any) {
      const first = e?.response?.data?.errors?.[0]?.msg;
      toast.error(first || e?.response?.data?.message || 'Неуспешно запазване');
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

  const disabled = loadingSettings;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-8">
        <h1 className="text-2xl font-semibold">Настройки</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <fieldset disabled={disabled} className={disabled ? 'opacity-60 pointer-events-none' : ''}>
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
                <input className="input" placeholder="Country (напр. BG или Bulgaria)" {...register('country')} />
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
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  placeholder="Default stake"
                  {...register('preferences.defaultStake', { valueAsNumber: true })}
                />
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
              <button className="btn btn-primary" type="submit" disabled={disabled}>Запази</button>
            </div>
          </fieldset>
        </form>
      </div>
    </DashboardLayout>
  );
}