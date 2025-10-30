'use client';

import Link from 'next/link';
import { CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { useMemo } from 'react';

const plans = [
  {
    name: 'Basic',
    price: 9.99,
    description: 'Perfect for casual bettors',
    features: [
      'Access to daily predictions',
      'Basic analytics',
      'Email support',
      '10% referral commission',
    ],
  },
  {
    name: 'Premium',
    price: 19.99,
    description: 'Most popular for serious bettors',
    features: [
      'All Basic features',
      'Premium predictions',
      'Advanced analytics',
      'Priority support',
      '15% referral commission',
      'Live chat support',
    ],
    popular: true,
  },
  {
    name: 'VIP',
    price: 39.99,
    description: 'For professional bettors',
    features: [
      'All Premium features',
      'VIP-only predictions',
      'Personal betting advisor',
      '24/7 phone support',
      '20% referral commission',
      'Exclusive webinars',
    ],
  },
];

function planSlug(name: string) {
  return name.toLowerCase();
}

export default function PricingPage() {
  const { user } = useAuth();

  // Smart CTAs that DO NOT log you out:
  // - If logged in: go to dashboard subscription/checkout with plan
  // - If logged out: go to register with preselected plan
  const ctaForPlan = useMemo(
    () =>
      (name: string) =>
        user
          ? `/dashboard/subscription?plan=${encodeURIComponent(planSlug(name))}`
          : `/register?plan=${encodeURIComponent(planSlug(name))}`,
    [user]
  );

  const brandHref = user ? '/dashboard' : '/';

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 sticky top-0 z-20 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href={brandHref} className="text-xl font-bold text-primary-600">
                Betwise
              </Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/pricing" className="text-primary-600 font-medium">
                Pricing
              </Link>
              {user ? (
                <>
                  <Link href="/dashboard" className="btn-secondary">
                    Dashboard
                  </Link>
                  <Link href="/dashboard/subscription" className="btn-primary">
                    Manage subscription
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary">
                    Login
                  </Link>
                  <Link href="/register" className="btn-primary">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Pricing Section */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Pricing</h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Choose the right plan for you
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              All plans include our core features. Upgrade anytime to get more predictions and higher referral commissions.
            </p>
          </div>

          <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            {plans.map((plan, planIdx) => {
              const popular = Boolean(plan.popular);
              const ctaHref = ctaForPlan(plan.name);
              const ctaText = user ? 'Select plan' : 'Get started';

              return (
                <div
                  key={plan.name}
                  className={`flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 ${
                    popular
                      ? 'ring-2 ring-primary-600 relative'
                      : planIdx === 0
                      ? 'lg:rounded-r-none'
                      : planIdx === plans.length - 1
                      ? 'lg:rounded-l-none'
                      : 'lg:rounded-none'
                  }`}
                >
                  {popular && (
                    <div className="absolute -top-5 left-0 right-0 mx-auto w-32">
                      <div className="rounded-full bg-primary-600 px-3 py-2 text-sm font-semibold text-white text-center">
                        Most popular
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between gap-x-4">
                      <h3 className="text-lg font-semibold leading-8 text-gray-900">{plan.name}</h3>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-gray-600">{plan.description}</p>
                    <p className="mt-6 flex items-baseline gap-x-1">
                      <span className="text-4xl font-bold tracking-tight text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-sm font-semibold leading-6 text-gray-600">/month</span>
                    </p>
                    <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-x-3">
                          <CheckIcon className="h-6 w-5 flex-none text-primary-600" aria-hidden="true" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href={ctaHref}
                    className={`mt-8 btn text-center ${
                      popular
                        ? 'bg-primary-600 text-white hover:bg-primary-500'
                        : 'btn-secondary'
                    }`}
                  >
                    {ctaText}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl divide-y divide-gray-900/10">
            <h2 className="text-2xl font-bold leading-10 tracking-tight text-gray-900">
              Frequently asked questions
            </h2>
            <dl className="mt-10 space-y-6 divide-y divide-gray-900/10">
              {[
                {
                  question: 'How does the referral program work?',
                  answer:
                    'When you refer someone and they subscribe, you earn a commission based on your plan level. Basic users earn 10%, Premium users earn 15%, and VIP users earn 20% of the subscription fee.',
                },
                {
                  question: 'Can I cancel my subscription anytime?',
                  answer:
                    'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
                },
                {
                  question: 'What payment methods do you accept?',
                  answer:
                    'We accept all major credit cards through Stripe. Your payments are secure and encrypted.',
                },
                {
                  question: 'How accurate are your predictions?',
                  answer:
                    'Our expert analysts have a track record of 75% success rate across all sports. However, past performance does not guarantee future results.',
                },
              ].map((faq) => (
                <div key={faq.question} className="pt-6">
                  <dt className="text-base font-semibold leading-7 text-gray-900">{faq.question}</dt>
                  <dd className="mt-2 text-base leading-7 text-gray-600">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}