'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DocumentTextIcon, ArrowTopRightOnSquareIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

type LegalType = 'TERMS' | 'PRIVACY' | 'AGE' | 'REFERRAL' | 'COOKIES' | 'REFUND';
type LegalDoc = { type: LegalType; title: string; version: string; effectiveAt: string; url: string; contentUrl?: string };

const TYPE_TO_ANCHOR: Record<LegalType, string> = {
  TERMS: 'tos',
  PRIVACY: 'privacy',
  AGE: 'age',
  REFERRAL: 'referral',
  COOKIES: 'cookies',
  REFUND: 'refunds',
};

const TYPE_TO_FALLBACK_PDF: Record<LegalType, string> = {
  TERMS: '/legal-pdfs/terms.pdf',
  PRIVACY: '/legal-pdfs/privacy.pdf',
  AGE: '/legal-pdfs/age.pdf',
  REFERRAL: '/legal-pdfs/referral.pdf',
  COOKIES: '/legal-pdfs/cookies.pdf',
  REFUND: '/legal-pdfs/refunds.pdf',
};

function isPdfUrl(u?: string) {
  if (!u) return false;
  try {
    const url = new URL(u, 'http://localhost');
    return url.pathname.toLowerCase().endsWith('.pdf');
  } catch {
    return u.toLowerCase().endsWith('.pdf');
  }
}

function LegalInner() {
  const [mounted, setMounted] = useState(false);
  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [selected, setSelected] = useState<LegalType>('TERMS');

  useEffect(() => setMounted(true), []);

  // Load active legal docs (type, version, urls)
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/legal/legal-documents');
        const data: LegalDoc[] = await res.json();
        setDocs(data);
      } catch (e) {
        // ако API е недостъпно, все пак показваме UI с fallback PDF-и
        setDocs([
          { type: 'TERMS',   title: 'Общи условия',           version: '1.0.0', effectiveAt: '', url: '/legal/tos' },
          { type: 'PRIVACY', title: 'Поверителност (GDPR)',   version: '1.0.0', effectiveAt: '', url: '/legal/privacy' },
          { type: 'AGE',     title: 'Възрастово ограничение', version: '1.0.0', effectiveAt: '', url: '/legal/age' },
          { type: 'REFERRAL',title: 'Партньорска програма',   version: '1.0.0', effectiveAt: '', url: '/legal/referral' },
          { type: 'COOKIES', title: 'Политика за бисквитки',  version: '1.0.0', effectiveAt: '', url: '/legal/cookies' },
          { type: 'REFUND',  title: 'Отказ и възстановяване', version: '1.0.0', effectiveAt: '', url: '/legal/refunds' },
        ]);
      }
    }
    load();
  }, []);

  // Hash → select type
  useEffect(() => {
    if (!mounted) return;
    const applyFromHash = () => {
      const hash = (window.location.hash || '').replace('#', '');
      const foundEntry = Object.entries(TYPE_TO_ANCHOR).find(([, anchor]) => anchor === hash);
      if (foundEntry) setSelected(foundEntry[0] as LegalType);
    };
    applyFromHash();
    window.addEventListener('hashchange', applyFromHash);
    return () => window.removeEventListener('hashchange', applyFromHash);
  }, [mounted]);

  // Programmatic selection: set state, update hash, smooth scroll
  function selectDoc(t: LegalType) {
    setSelected(t);
    const anchor = TYPE_TO_ANCHOR[t];
    if (anchor) {
      // не тригърваме навигация, само сменяме hash и скролваме
      window.history.replaceState(null, '', `#${anchor}`);
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  const currentPdfUrl = useMemo(() => {
    const d = docs.find((x) => x.type === selected);
    // приоритет: contentUrl ако е PDF → fallback към /legal-pdfs/<file>.pdf
    const preferred = d?.contentUrl && isPdfUrl(d.contentUrl) ? d.contentUrl : undefined;
    return preferred ?? TYPE_TO_FALLBACK_PDF[selected];
  }, [docs, selected]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Left: Back + Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
              aria-label="Назад към Начало"
            >
              ← Начало
            </Link>
            <Link href="/" className="text-xl font-bold text-primary-600">
              Betwise
            </Link>
          </div>

          {/* Right: PDF actions + Auth */}
          <div className="flex items-center gap-2">
            {/* Open in new tab */}
            <a
              href={currentPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" /> Отвори PDF
            </a>
            {/* Download */}
            <a
              href={currentPdfUrl}
              download
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg"
            >
              <ArrowDownTrayIcon className="h-5 w-5" /> Изтегли
            </a>

            {/* Divider (optional) */}
            <span className="mx-2 hidden sm:inline-block h-5 w-px bg-gray-200" aria-hidden="true" />

            {/* Auth buttons */}
            <Link
              href="/login"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              Вход
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </nav>

      {/* Main grid: left content + right viewer */}
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left content */}
        <div className="lg:col-span-6 space-y-6">
          <header className="rounded-xl border border-primary-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                <DocumentTextIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Правни документи</h1>
                <p className="text-sm text-gray-600">Избери документ от оглавлението. PDF-ът ще се покаже вдясно.</p>
              </div>
            </div>
          </header>

          {/* TOC */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Оглавление</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(TYPE_TO_ANCHOR).map(([type, anchor]) => {
                const active = selected === (type as LegalType);
                const label =
                  type === 'TERMS' ? '1. Общи условия' :
                  type === 'PRIVACY' ? '2. Поверителност (GDPR)' :
                  type === 'AGE' ? '3. Възрастово ограничение' :
                  type === 'REFERRAL' ? '4. Партньорска програма' :
                  type === 'COOKIES' ? '5. Бисквитки' :
                  '6. Отказ и възстановяване';
                return (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => selectDoc(type as LegalType)}
                      className={[
                        'inline-flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition',
                        active
                          ? 'border-primary-300 bg-primary-50 text-primary-700 shadow'
                          : 'border-gray-200 bg-white text-gray-700 hover:-translate-y-0.5 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 hover:shadow-sm',
                      ].join(' ')}
                    >
                      <DocumentTextIcon className="h-5 w-5" />
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Text sections with ids (for anchor scroll) */}
          <section id="tos" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">1. Общи условия</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
          <section id="privacy" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">2. Политика за поверителност (GDPR)</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
          <section id="age" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">3. Възрастово ограничение</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
          <section id="referral" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">4. Партньорска програма</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
          <section id="cookies" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">5. Политика за бисквитки</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
          <section id="refunds" className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-xl font-semibold mb-2">6. Политика за отказ и възстановяване</h3>
            <p className="text-gray-700">Обобщение/въведение… Пълният текст е в PDF вдясно.</p>
          </section>
        </div>

        {/* Right PDF viewer */}
        <aside className="lg:col-span-6">
          <div className="sticky top-4 rounded-xl border bg-white p-3 shadow-sm h-[calc(100vh-2rem)]">
            <div className="h-full w-full">
              <object
                data={`${currentPdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                type="application/pdf"
                className="h-full w-full rounded-lg"
              >
                <div className="flex h-full w-full items-center justify-center text-center">
                  <p className="text-sm text-gray-600">
                    Браузърът не поддържа вграден PDF преглед.{' '}
                    <a href={currentPdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline">
                      Отворете PDF в нов таб
                    </a>
                    {' '}или използвайте бутона за изтегляне.
                  </p>
                </div>
              </object>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

// Изключваме SSR, за да избегнем hydration mismatch
export default dynamic(() => Promise.resolve(LegalInner), { ssr: false });