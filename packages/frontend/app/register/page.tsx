'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { CountrySelect } from './CountrySelect';
import { DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

type LegalType = 'TERMS' | 'PRIVACY' | 'AGE' | 'REFERRAL' | 'COOKIES' | 'REFUND';
type LegalDoc = { type: LegalType; title: string; version: string; effectiveAt: string; url: string };

interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  age: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  acceptLegal?: boolean;
  isAdult?: boolean;
}

function RegisterInner() {
  const [isLoading, setIsLoading] = useState(false);
  const [legalVersions, setLegalVersions] = useState<Record<LegalType, string> | null>(null);
  const [mounted, setMounted] = useState(false);
  const { register: authRegister } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref') ?? '';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    defaultValues: {
      referralCode: referralCodeFromUrl || '',
      country: 'BG',
      acceptLegal: false,
      isAdult: false,
    },
  });

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (referralCodeFromUrl) setValue('referralCode', referralCodeFromUrl);
  }, [referralCodeFromUrl, setValue]);

  useEffect(() => {
    async function loadDocs() {
      try {
        const res = await fetch('/api/legal/legal-documents');
        if (!res.ok) throw new Error('Failed to load legal documents');
        const data: LegalDoc[] = await res.json();
        const map = data.reduce((acc, d) => {
          acc[d.type] = d.version;
          return acc;
        }, {} as Record<LegalType, string>);
        const required: LegalType[] = ['TERMS', 'PRIVACY', 'AGE', 'REFERRAL', 'COOKIES', 'REFUND'];
        for (const t of required) if (!map[t]) throw new Error(`Missing active version for ${t}`);
        setLegalVersions(map);
      } catch (e: any) {
        console.error(e);
        toast.error(e.message || 'Cannot load legal documents');
      }
    }
    loadDocs();
  }, []);

  const password = watch('password');

  async function onSubmit(data: RegisterForm) {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!data.acceptLegal) {
      toast.error('Моля, приемете Правните документи.');
      return;
    }
    if (!data.isAdult) {
      toast.error('Моля, потвърдете, че сте навършили 18 години.');
      return;
    }
    if (!legalVersions) {
      toast.error('Липсват версии на правните документи. Опитайте отново.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        email: data.email,
        password: data.password,
        referralCode: data.referralCode,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        age: Number(data.age),
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        ageConfirmed: true,
        consents: {
          TERMS: legalVersions.TERMS,
          PRIVACY: legalVersions.PRIVACY,
          AGE: legalVersions.AGE,
          REFERRAL: legalVersions.REFERRAL,
          COOKIES: legalVersions.COOKIES,
          REFUND: legalVersions.REFUND,
        },
      };

      const { stripeOnboardingUrl } = await authRegister(payload);
      toast.success('Account created successfully!');
      if (stripeOnboardingUrl) window.location.href = stripeOnboardingUrl;
      else router.push('/dashboard');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl">
        <Link href="/" className="flex justify-center text-2xl font-bold text-primary-600">
          Betwise
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
            sign in to your existing account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="card">
          <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
            {/* Account */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Email address</label>
                <input
                  {...register('email', { required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Please enter a valid email' } })}
                  type="email"
                  className="input mt-1"
                  placeholder="Enter your email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                  type="password"
                  className="input mt-1"
                  placeholder="Enter your password"
                />
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                <input
                  {...register('confirmPassword', { required: 'Please confirm your password', validate: v => v === password || 'Passwords do not match' })}
                  type="password"
                  className="input mt-1"
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Referral (required) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Referral Code (Required)</label>
              <input
                {...register('referralCode', { required: 'Referral code is required' })}
                type="text"
                className="input mt-1"
                placeholder="Paste your referral code"
                readOnly={!!referralCodeFromUrl}
              />
              {referralCodeFromUrl && <p className="mt-1 text-sm text-green-600">🎉 You're being referred! You'll help your referrer earn commissions.</p>}
              {errors.referralCode && <p className="mt-1 text-sm text-red-600">{errors.referralCode.message}</p>}
            </div>

            {/* Personal info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Personal information</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First name (Required)</label>
                  <input {...register('firstName', { required: 'First name is required', minLength: { value: 2, message: 'Too short' } })} type="text" className="input mt-1" />
                  {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last name (Required)</label>
                  <input {...register('lastName', { required: 'Last name is required', minLength: { value: 2, message: 'Too short' } })} type="text" className="input mt-1" />
                  {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Birth date (Required)</label>
                  <input {...register('birthDate', { required: 'Birth date is required' })} type="date" className="input mt-1" />
                  {errors.birthDate && <p className="mt-1 text-sm text-red-600">{errors.birthDate.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Age</label>
                  <input {...register('age', { required: 'Age is required', valueAsNumber: true, min: { value: 0, message: 'Invalid age' } })} type="number" className="input mt-1" placeholder="18+" />
                  {errors.age && <p className="mt-1 text-sm text-red-600">{errors.age.message}</p>}
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Address</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address line 1</label>
                  <input {...register('addressLine1', { required: 'Address line 1 is required' })} type="text" className="input mt-1" />
                  {errors.addressLine1 && <p className="mt-1 text-sm text-red-600">{errors.addressLine1.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address line 2 (optional)</label>
                  <input {...register('addressLine2')} type="text" className="input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input {...register('city', { required: 'City is required' })} type="text" className="input mt-1" />
                  {errors.city && <p className="mt-1 text-sm text-red-600">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State/Region (optional)</label>
                  <input {...register('state')} type="text" className="input mt-1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Postal code</label>
                  <input {...register('postalCode', { required: 'Postal code is required' })} type="text" className="input mt-1" />
                  {errors.postalCode && <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>}
                </div>

                <CountrySelect
                  field={register('country', { required: 'Country is required' })}
                  error={errors.country?.message}
                />
              </div>
            </div>

            {/* Consent */}
            <div className="space-y-3">
              <div className="flex items-start">
                <input id="acceptLegal" type="checkbox" className="mt-1 mr-2"
                  {...register('acceptLegal', { required: true })} />
                <label htmlFor="acceptLegal" className="text-sm text-gray-700">
                  Съгласен/на съм с <Link href="/legal" className="text-primary-600 hover:underline" target="_blank">Правните документи</Link>
                  {' '}(Общи условия, Поверителност, Възрастово ограничение, Партньорска програма, Бисквитки, Отказ и възстановяване).
                </label>
              </div>
              {errors.acceptLegal && <p className="text-sm text-red-600">Трябва да приемете Правните документи.</p>}

              <div className="flex items-start">
                <input id="isAdult" type="checkbox" className="mt-1 mr-2"
                  {...register('isAdult', { required: true })} />
                <label htmlFor="isAdult" className="text-sm text-gray-700">
                  Потвърждавам, че съм навършил/а 18 години.
                </label>
              </div>
              {errors.isAdult && <p className="text-sm text-red-600">Трябва да потвърдите, че сте 18+.</p>}

              {/* Quick links */}
              <div className="pt-2">
                <p className="mb-2 text-sm text-gray-600 flex items-center gap-2">
                  <ShieldCheckIcon className="h-4 w-4 text-primary-500" />
                  Бързи линкове към документите:
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/legal#tos" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Общи условия</Link>
                  <Link href="/legal#privacy" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Поверителност</Link>
                  <Link href="/legal#age" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Възраст</Link>
                  <Link href="/legal#referral" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Партньорска</Link>
                  <Link href="/legal#cookies" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Бисквитки</Link>
                  <Link href="/legal#refunds" className="chip-btn"><DocumentTextIcon className="h-4 w-4" /> Отказ/възстановяване</Link>
                </div>
              </div>
            </div>

            <div>
              <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center transition hover:-translate-y-0.5 hover:shadow-lg">
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Напълно изключваме SSR за регистрацията
export default dynamic(() => Promise.resolve(RegisterInner), { ssr: false });