'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import DashboardLayout from '../../../components/DashboardLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { api } from '../../../lib/api';
import { applyTheme, initTheme, getStoredTheme, setTheme, normalizeTheme, type ThemeChoice } from '../../../lib/theme';

type Preferences = {
  oddsFormat?: 'decimal' | 'fractional' | 'american';
  defaultStake?: number;
  favoriteSports?: string[];
  notifications?: { email?: boolean; push?: boolean; dailySummary?: boolean; marketing?: boolean };
  theme?: ThemeChoice; // само 'light' | 'dark'
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
  preferences: Preferences;
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);

  const { register, handleSubmit, reset, watch, setValue } = useForm<SettingsDTO>({
    defaultValues: {
      preferences: {
        oddsFormat: 'decimal',
        theme: 'light', // по подразбиране имаме само light/dark
        notifications: { email: true, push: false, dailySummary: false, marketing: false },
        favoriteSports: [],
        currency: 'EUR',
      },
    },
  });

  // 1) Зареждане от бекенда
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        setLoadingSettings(true);
        const res = await api.get('/settings');
        const data = res.data?.data as SettingsDTO;

        // Нормализираме birthDate за input type="date"
        if (data?.birthDate) {
          const d = new Date(data.birthDate);
          if (!Number.isNaN(d.getTime())) {
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            data.birthDate = `${yyyy}-${mm}-${dd}`;
          }
        }

        // Нормализираме тема от бекенда (възможно е legacy: 'system'/'darker')
        const normalizedTheme = normalizeTheme(data?.preferences?.theme);
        data.preferences.theme = normalizedTheme;

        reset(data);
        applyTheme(normalizedTheme);
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [authLoading, user, reset]);

  // 2) Инициализация от localStorage, минимизираме FOUC
  useEffect(() => {
    try {
      initTheme();
      const saved = getStoredTheme();
      setValue('preferences.theme', saved, { shouldDirty: false, shouldValidate: false });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Автосинк тема при промяна
  const currentTheme = watch('preferences.theme');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const t = normalizeTheme(currentTheme);
    setTheme(t); // локално + applyTheme

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
        country: data.country?.trim() || undefined,
        preferences: {
          ...data.preferences,
          theme: normalizeTheme(data.preferences?.theme),
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
            {/* Appearance – само две опции */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Appearance</h2>
              <div role="radiogroup" aria-label="Theme" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="card flex items-center gap-3">
                  <input type="radio" value="light" {...register('preferences.theme')} />
                  <div>
                    <div>Light</div>
                    <div className="text-sm text-foreground/70">Светла тема</div>
                  </div>
                </label>
                <label className="card flex items-center gap-3">
                  <input type="radio" value="dark" {...register('preferences.theme')} />
                  <div>
                    <div>Dark</div>
                    <div className="text-sm text-foreground/70">Истинско тъмна (AMOLED)</div>
                  </div>
                </label>
              </div>
            </section>

            {/* Профил */}
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

            {/* Предпочитания за залози */}
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

            {/* Известия */}
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
                <input type="checkbox" {...register('preferences.notifications.marketing')} /> Marketing
              </label>
            </section>

            {/* Валута */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Валута</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select className="input" {...register('preferences.currency')}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="BGN">BGN</option>
                </select>
              </div>
            </section>

            {/* Поверителност */}
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
              <button className="btn btn-primary" type="submit" disabled={loadingSettings}>Запази</button>
            </div>
          </fieldset>
        </form>
      </div>
    </DashboardLayout>
  );
}