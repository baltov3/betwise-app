import Link from 'next/link';
import { ArrowRightIcon, ChartBarIcon, GiftIcon, ShieldCheckIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const features = [
    {
      icon: ChartBarIcon,
      title: 'Expert Predictions',
      description: 'Get access to professional sports predictions with detailed analysis and odds.',
    },
    {
      icon: GiftIcon,
      title: 'Referral Program',
      description: 'Earn commissions by referring friends and building your network.',
    },
    {
      icon: ShieldCheckIcon,
      title: 'Trusted Platform',
      description: 'Secure payments and reliable service you can count on.',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-primary-600">
                Betwise
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/pricing" className="text-gray-700 hover:text-primary-600">
                Pricing
              </Link>

              {/* NEW: красив бутон „Правни документи“ */}
              <Link
                href="/legal"
                className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-white px-4 py-2 text-sm font-medium text-primary-700 shadow-sm transition
                           hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800 hover:shadow-md"
                aria-label="Правни документи"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Правни документи
              </Link>

              <Link href="/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/register" className="btn-primary">
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-secondary-600">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Win More with Expert
              <span className="block text-yellow-300">Sports Predictions</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-100">
              Join thousands of successful bettors who trust our premium predictions.
              Get started today and earn through our referral program.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4 sm:gap-x-6">
              <Link
                href="/register"
                className="btn bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 text-lg shadow transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Get Started
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </Link>

              {/* NEW: втори CTA към правни документи */}
              <Link
                href="/legal"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-white ring-1 ring-white/40 backdrop-blur transition
                           hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Правни документи
              </Link>

              <Link href="/pricing" className="text-white hover:text-gray-200">
                View Pricing <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-base font-semibold leading-7 text-primary-600">Everything you need</h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Why Choose Betwise?
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col">
                  <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                    <feature.icon className="h-5 w-5 flex-none text-primary-600" aria-hidden="true" />
                    {feature.title}
                  </dt>
                  <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to start winning?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-100">
              Join Betwise today and get access to premium predictions plus earn through referrals.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Link href="/register" className="btn bg-white text-primary-600 hover:bg-gray-50 px-8 py-3 transition hover:-translate-y-0.5 hover:shadow-lg">
                Get started
              </Link>

              {/* NEW: бърз линк в CTA към /legal */}
              <Link
                href="/legal"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-white ring-1 ring-white/40 backdrop-blur transition
                           hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-lg"
              >
                <DocumentTextIcon className="h-5 w-5" />
                Правни документи
              </Link>

              <Link href="/pricing" className="text-white hover:text-gray-200">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="/pricing" className="text-gray-400 hover:text-gray-500">
              Pricing
            </Link>
            {/* NEW: линк във футъра */}
            <Link href="/legal" className="text-gray-400 hover:text-gray-500">
              Правни документи
            </Link>
            <Link href="/login" className="text-gray-400 hover:text-gray-500">
              Login
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} Betwise. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}