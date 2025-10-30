'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  theme?: ThemeChoice; // 'light' | 'dark'
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

/* ---------- UI helpers ---------- */

function Section({
  id,
  title,
  subtitle,
  icon,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="card p-5 md:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{icon}</div>
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle ? <p className="text-sm text-foreground/70">{subtitle}</p> : null}
          </div>
        </div>
        <div className="pt-2">{children}</div>
      </div>
    </section>
  );
}

function ThemePreview({
  selected,
  onSelect,
}: {
  selected: 'light' | 'dark' | undefined;
  onSelect: (t: 'light' | 'dark') => void;
}) {
  const Tile = ({
    mode,
    label,
    desc,
  }: {
    mode: 'light' | 'dark';
    label: string;
    desc: string;
  }) => {
    const active = selected === mode;
    return (
      <button
        type="button"
        onClick={() => onSelect(mode)}
        className={[
          'relative w-full rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-primary',
          active ? 'ring-2 ring-primary border-primary' : 'border-border hover:border-foreground/30',
        ].join(' ')}
        aria-pressed={active}
      >
        <div
          className={[
            'aspect-[4/3] w-full rounded-t-lg overflow-hidden',
            mode === 'dark' ? 'bg-black' : 'bg-white',
          ].join(' ')}
        >
          <div className="p-3 grid gap-2">
            <div
              className={[
                'h-4 w-24 rounded',
                mode === 'dark' ? 'bg-white/10' : 'bg-black/10',
              ].join(' ')}
            />
            <div className="flex gap-2">
              <div
                className={[
                  'h-16 w-1/2 rounded',
                  mode === 'dark' ? 'bg-white/10' : 'bg-black/10',
                ].join(' ')}
              />
              <div
                className={[
                  'h-16 w-1/2 rounded',
                  mode === 'dark' ? 'bg-white/10' : 'bg-black/10',
                ].join(' ')}
              />
            </div>
          </div>
        </div>
        <div className="p-3 text-left">
          <div className="font-medium">{label}</div>
          <div className="text-sm text-foreground/70">{desc}</div>
        </div>
        {active ? (
          <div className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
            Selected
          </div>
        ) : null}
      </button>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Tile mode="light" label="Light" desc="Ясна, светла визия" />
      <Tile mode="dark" label="Dark" desc="Истинско тъмна (AMOLED)" />
    </div>
  );
}

function Segmented({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value?: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border p-1 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'px-3 py-1.5 text-sm rounded-md transition',
              active ? 'bg-primary text-primary-foreground shadow' : 'hover:bg-foreground/5',
            ].join(' ')}
            aria-pressed={active}
            aria-label={opt.label}
            name={name}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TagsInput({
  values,
  onChange,
  placeholder = 'Add and press Enter',
}: {
  values: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  const add = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (values.includes(v)) return;
    onChange([...values, v]);
    setInput('');
  };

  const remove = (val: string) => {
    onChange(values.filter((x) => x !== val));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
      e.preventDefault();
      add(input);
    } else if (e.key === 'Backspace' && !input && values.length) {
      remove(values[values.length - 1]);
    }
  };

  return (
    <div className="input min-h-[44px] flex items-center gap-2 flex-wrap">
      {values.map((v) => (
        <span key={v} className="inline-flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-1 text-sm">
          {v}
          <button
            type="button"
            onClick={() => remove(v)}
            className="opacity-70 hover:opacity-100"
            aria-label={`Remove ${v}`}
            title="Remove"
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="flex-1 min-w-[140px] bg-transparent outline-none"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['animate-pulse rounded bg-foreground/10', className].join(' ')} />;
}

function StickySaveBar({
  visible,
  saving,
  onSubmit,
}: {
  visible: boolean;
  saving: boolean;
  onSubmit: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-[280px] md:right-8 z-30">
      <div className="card shadow-lg border border-border flex items-center justify-between p-3">
        <div className="text-sm">
          Имате незапазени промени
          {saving ? <span className="ml-2 text-foreground/70">Запазване...</span> : null}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Към начало
          </button>
          <button type="button" className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            Запази
          </button>
        </div>
      </div>
    </div>
  );
}

// UPDATED: add `enabled` flag so the hook can be called unconditionally
function useActiveSection(ids: string[], enabled = true) {
  const [active, setActive] = useState<string>(ids[0] || '');

  useEffect(() => {
    if (!enabled || !ids?.length) {
      // Reset to first or empty when disabled
      setActive(ids[0] || '');
      return;
    }

    const observers: IntersectionObserver[] = [];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setActive(id);
          });
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.1, 0.5, 1] }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [enabled, ids.join(',')]);

  return active;
}

/* ------------------------- Page ------------------------- */

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [loadingSettings, setLoadingSettings] = useState(true);

  const { register, handleSubmit, reset, watch, setValue, formState } = useForm<SettingsDTO>({
    defaultValues: {
      preferences: {
        oddsFormat: 'decimal',
        theme: 'light',
        notifications: { email: true, push: false, dailySummary: false, marketing: false },
        favoriteSports: [],
        currency: 'EUR',
      },
    },
  });

  // IMPORTANT: define and call the hook BEFORE any early returns
  const sectionIds = useMemo(
    () => ['appearance', 'profile', 'betting', 'notifications', 'currency', 'privacy'],
    []
  );
  const observeEnabled = !authLoading && !!user;
  const active = useActiveSection(sectionIds, observeEnabled);

  // 1) Load from backend (with graceful 404 fallback)
  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      try {
        setLoadingSettings(true);
        const res = await api.get('/settings');
        const data = res.data?.data as SettingsDTO;

        if (data?.birthDate) {
          const d = new Date(data.birthDate);
          if (!Number.isNaN(d.getTime())) {
            const yyyy = d.getUTCFullYear();
            const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
            const dd = String(d.getUTCDate()).padStart(2, '0');
            data.birthDate = `${yyyy}-${mm}-${dd}`;
          }
        }

        const normalizedTheme = normalizeTheme(data?.preferences?.theme);
        data.preferences.theme = normalizedTheme;

        reset(data);
        applyTheme(normalizedTheme);
      } catch (e: any) {
        const status = e?.response?.status;
        const message = e?.response?.data?.message;
        if (status === 404) {
          const saved = getStoredTheme();
          const t = normalizeTheme(saved || 'light');
          reset({
            email: '',
            preferences: {
              oddsFormat: 'decimal',
              theme: t,
              notifications: { email: true, push: false, dailySummary: false, marketing: false },
              favoriteSports: [],
              currency: 'EUR',
            },
          } as any);
          applyTheme(t);
        } else {
          toast.error(message || 'Failed to load settings');
        }
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, [authLoading, user, reset]);

  // 2) Init theme from localStorage to minimize FOUC
  useEffect(() => {
    try {
      initTheme();
      const saved = getStoredTheme();
      setValue('preferences.theme', saved, { shouldDirty: false, shouldValidate: false });
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3) Auto-sync theme with debounce
  const currentTheme = watch('preferences.theme');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    const t = normalizeTheme(currentTheme);
    setTheme(t);

    if (user) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        api.patch('/settings', { preferences: { theme: t } }).catch(() => {
          // ignore errors (incl. 404) – local theme still applies
        });
      }, 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme, user]);

  const prefs = watch('preferences');

  // 4) Save – only valid values
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
      const status = e?.response?.status;
      const first = e?.response?.data?.errors?.[0]?.msg;
      if (status === 404) {
        toast.error('Профилът не е намерен (404). Провери входа/базата.');
      } else {
        toast.error(first || e?.response?.data?.message || 'Неуспешно запазване');
      }
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

  const handleAnchor = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  return (
    <DashboardLayout>
      <div className="p-0 md:p-6">
        {/* Header / User summary */}
        <div className="card md:mb-6 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40" />
            <div>
              <h1 className="text-2xl font-semibold">Настройки</h1>
              <p className="text-sm text-foreground/70">
                {user?.email ?? '—'} • Управлявай профила, външния вид и предпочитанията си
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground/60">Тема:</span>
            <div className="text-xs rounded bg-foreground/10 px-2 py-1">{prefs?.theme || '—'}</div>
            <span className="text-xs text-foreground/60">Валута:</span>
            <div className="text-xs rounded bg-foreground/10 px-2 py-1">{prefs?.currency || '—'}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <fieldset disabled={disabled} className={disabled ? 'opacity-60 pointer-events-none' : ''}>
            <div className="grid md:grid-cols-[220px,1fr] gap-4 md:gap-6">
              {/* Left Nav */}
              <aside className="md:sticky md:top-20 self-start hidden md:block">
                <nav className="card p-2">
                  <ul className="text-sm">
                    {sectionIds.map((id) => (
                      <li key={id}>
                        <button
                          type="button"
                          onClick={() => handleAnchor(id)}
                          className={[
                            'w-full text-left px-3 py-2 rounded-md transition',
                            active === id ? 'bg-primary text-primary-foreground' : 'hover:bg-foreground/5',
                          ].join(' ')}
                        >
                          {id === 'appearance' && '🎨  Appearance'}
                          {id === 'profile' && '👤  Profile'}
                          {id === 'betting' && '🎯  Betting'}
                          {id === 'notifications' && '🔔  Notifications'}
                          {id === 'currency' && '💱  Currency'}
                          {id === 'privacy' && '🔒  Privacy'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
              </aside>

              {/* Content */}
              <div className="space-y-6">
                {/* Appearance */}
                <Section
                  id="appearance"
                  title="Appearance"
                  subtitle="Избери как да изглежда приложението за теб"
                  icon={<span>🎨</span>}
                >
                  {loadingSettings ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      <Skeleton className="h-44" />
                      <Skeleton className="h-44" />
                    </div>
                  ) : (
                    <>
                      <ThemePreview
                        selected={prefs?.theme as 'light' | 'dark' | undefined}
                        onSelect={(t) => setValue('preferences.theme', t as ThemeChoice, { shouldDirty: true })}
                      />

                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">Odds format</div>
                        <Segmented
                          name="oddsFormat"
                          value={prefs?.oddsFormat}
                          onChange={(val) => setValue('preferences.oddsFormat', val as any, { shouldDirty: true })}
                          options={[
                            { value: 'decimal', label: 'Decimal' },
                            { value: 'fractional', label: 'Fractional' },
                            { value: 'american', label: 'American' },
                          ]}
                        />
                      </div>
                    </>
                  )}
                </Section>

                {/* Profile */}
                <Section id="profile" title="Профил" subtitle="Основни лични данни за фактуриране и контакт" icon={<span>👤</span>}>
                  {loadingSettings ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Skeleton key={i} className="h-10" />
                      ))}
                    </div>
                  ) : (
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
                  )}
                </Section>

                {/* Betting */}
                <Section id="betting" title="Предпочитания за залози" subtitle="Формат на коефициенти, сума по подразбиране и любими спортове" icon={<span>🎯</span>}>
                  {loadingSettings ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10 md:col-span-2" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Default stake slider + number */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Default stake</label>
                        <div className="flex items-center gap-3">
                          <input
                            className="w-full"
                            type="range"
                            min={0}
                            max={1000}
                            step={1}
                            value={Number.isFinite(prefs?.defaultStake ?? NaN) ? Number(prefs?.defaultStake) : 0}
                            onChange={(e) =>
                              setValue('preferences.defaultStake', Number(e.target.value), { shouldDirty: true })
                            }
                          />
                          <input
                            className="input w-28"
                            type="number"
                            step="1"
                            placeholder="Amount"
                            {...register('preferences.defaultStake', { valueAsNumber: true })}
                          />
                        </div>
                        <p className="text-xs text-foreground/60">Бърза настройка чрез плъзгач + точна стойност вдясно</p>
                      </div>

                      {/* Favorite sports tags */}
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Favorite sports</label>
                        <TagsInput
                          values={(prefs?.favoriteSports || []) as string[]}
                          onChange={(vals) =>
                            setValue('preferences.favoriteSports', vals, { shouldDirty: true })
                          }
                          placeholder="Напр. football, tennis, basketball"
                        />
                        <p className="text-xs text-foreground/60">
                          Натисни Enter/Comma за добавяне. Кликни X за премахване.
                        </p>
                      </div>
                    </div>
                  )}
                </Section>

                {/* Notifications */}
                <Section id="notifications" title="Известия" subtitle="Как и кога да те уведомяваме" icon={<span>🔔</span>}>
                  {loadingSettings ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.notifications.email')} /> Email
                      </label>
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.notifications.push')} /> Push
                      </label>
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.notifications.dailySummary')} /> Daily summary
                      </label>
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.notifications.marketing')} /> Marketing
                      </label>
                    </div>
                  )}
                </Section>

                {/* Currency */}
                <Section id="currency" title="Валута" subtitle="Избери предпочитана валута за показване" icon={<span>💱</span>}>
                  {loadingSettings ? (
                    <Skeleton className="h-10 w-52" />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <select className="input" {...register('preferences.currency')}>
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="BGN">BGN</option>
                      </select>
                    </div>
                  )}
                </Section>

                {/* Privacy */}
                <Section id="privacy" title="Поверителност" subtitle="Контролирай какво е видимо за другите" icon={<span>🔒</span>}>
                  {loadingSettings ? (
                    <div className="space-y-3">
                      <Skeleton className="h-8" />
                      <Skeleton className="h-8" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.publicProfile')} /> Public profile
                      </label>
                      <label className="flex gap-3 items-center card px-4 py-3">
                        <input type="checkbox" {...register('preferences.showReferralPublic')} /> Show referral stats publicly
                      </label>
                    </div>
                  )}
                </Section>

                {/* Save button area */}
                <div className="flex justify-end">
                  <button className="btn btn-primary" type="submit" disabled={loadingSettings || formState.isSubmitting}>
                    {formState.isSubmitting ? 'Запазване...' : 'Запази'}
                  </button>
                </div>
              </div>
            </div>
          </fieldset>
        </form>

        {/* Sticky Save bar */}
        <StickySaveBar
          visible={formState.isDirty && !loadingSettings}
          saving={formState.isSubmitting}
          onSubmit={() => handleSubmit(onSubmit)()}
        />
      </div>
    </DashboardLayout>
  );
}