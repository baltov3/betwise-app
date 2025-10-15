'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '../../../../lib/api';
import { toast } from 'react-hot-toast';

export default function PayoutsOnboardingPage() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const go = async () => {
      try {
        const res = await api.post('/payouts/account-link', {});
        const url = res?.data?.data?.url;
        if (url) {
          window.location.href = url;
        } else {
          toast.error('Failed to get onboarding link');
          router.push('/dashboard/payouts');
        }
      } catch (e: any) {
        toast.error(e?.response?.data?.message || 'Failed to start onboarding');
        router.push('/dashboard/payouts');
      }
    };
    go();
  }, [router, search]);

  return <div className="p-4">Redirecting to Stripe onboarding...</div>;
}