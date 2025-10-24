'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownTrayIcon, ArrowTopRightOnSquareIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

type LegalType = 'TERMS' | 'PRIVACY' | 'AGE' | 'REFERRAL' | 'COOKIES' | 'REFUND';
type LegalDoc = { type: LegalType; title: string; version: string; effectiveAt: string; url: string; contentUrl?: string };

export default function TermsOfServicePage() {
  const [terms, setTerms] = useState<LegalDoc | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    (async () => {
      try {
        const res = await fetch('/api/legal/legal-documents');
        if (res.ok) {
          const data: LegalDoc[] = await res.json();
          const t = data.find(d => d.type === 'TERMS') || null;
          setTerms(t);
        }
      } catch {
        // ignore; ще покажем fallback дата
      }
    })();
  }, []);

  const lastUpdated = useMemo(() => {
    if (terms?.effectiveAt) return new Date(terms.effectiveAt).toLocaleDateString('bg-BG');
    return new Date().toLocaleDateString('bg-BG');
  }, [terms]);

  const pdfHref = `/legal-pdfs/tos-v${terms?.version || '1.0.0'}.pdf`;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600">Betwise</Link>
          <div className="flex items-center gap-2">
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" /> Отвори PDF в нов таб
            </a>
            <a
              href={pdfHref}
              download
              className="inline-flex items-center gap-2 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-lg"
            >
              <ArrowDownTrayIcon className="h-5 w-5" /> Изтегли PDF
            </a>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
              <DocumentTextIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ОБЩИ УСЛОВИЯ ЗА ПОЛЗВАНЕ НА ПРИЛОЖЕНИЕТО Bet-wise</h1>
              <p className="text-sm text-gray-600">Последна актуализация: {lastUpdated} {terms?.version ? `(версия ${terms.version})` : ''}</p>
            </div>
          </div>
          <Link href="/legal" className="text-sm text-primary-600 hover:underline">← Назад към Правни документи</Link>
        </header>

        <article className="prose max-w-none">
          <h2 id="section-1">1. Общи положения</h2>
          <p>1.1. Настоящите Общи условия уреждат отношенията между Bet-wise („Дружеството“, „Ние“) и лицето, което използва мобилното приложение Bet-wise („Потребител“, „Вие“).</p>
          <p>1.2. Чрез натискане на бутона „Съгласен съм с Общите условия“ при регистрация, Потребителят потвърждава, че е прочел, разбрал и приел всички клаузи на настоящите Общи условия.</p>
          <p>1.3. Ако не сте съгласни с Общите условия, нямате право да използвате приложението и регистрацията ви няма да бъде активирана.</p>

          <h2 id="section-2">2. Предмет на услугата</h2>
          <p>2.1. Приложението Bet-wise предоставя информационни и аналитични прогнози за спортни събития, предназначени само за лична употреба.</p>
          <p>2.2. Прогнозите и анализите са само с информативен и аналитичен характер и не представляват залог, инвестиционен съвет или гарантирана печалба.</p>
          <p>2.3. Платформата не приема залози и не участва в хазартни дейности.</p>

          <h2 id="section-3">3. Регистрация и акаунт</h2>
          <p>3.1. За да използва услугата, Потребителят трябва да създаде акаунт, като предостави точни и актуални данни.</p>
          <p>3.2. Всеки Потребител може да има само един акаунт.</p>
          <p>3.3. Потребителят носи отговорност за сигурността на своите данни за вход и за всички действия, извършени чрез неговия акаунт.</p>

          <h2 id="section-4">4. Абонамент и плащане</h2>
          <p>4.1. Достъпът до прогнозите и анализите се осигурява чрез платен абонамент.</p>
          <p>4.2. Цените на абонаментните планове се публикуват в приложението и могат да бъдат променяни с предварително известие.</p>
          <p>4.3. Плащанията се извършват по електронен път чрез интегрираните методи (например Stripe, PayPal, Revolut и др.).</p>
          <p>4.4. При успешно плащане абонаментът се активира автоматично за съответния период.</p>
          <p>4.5. Потребителят може да прекрати автоматичното подновяване по всяко време.</p>

          <h2 id="section-5">5. Партньорска (реферална) програма</h2>
          <p>5.1. Всеки регистриран Потребител може да участва в партньорската програма, като споделя своя уникален линк за покани.</p>
          <p>5.2. При регистрация на нов потребител чрез линка и извършено първо плащане, Партньорът получава комисионна:</p>
          <ul>
            <li>50% от първия месечен абонамент;</li>
            <li>20% от всеки следващ месец, докато клиентът остава активен.</li>
          </ul>
          <p>5.3. Комисионните се изплащат ежемесечно чрез посочените методи.</p>
          <p>5.4. Забранено е използването на фалшиви акаунти, подвеждаща реклама или неправомерно разпространение.</p>
          <p>5.5. При нарушение Дружеството има право да прекрати достъпа на партньора и да анулира неизплатени комисионни.</p>

          <h2 id="section-6">6. Ограничение на отговорността</h2>
          <p>6.1. Прогнозите и анализите са създадени въз основа на статистика и мнение, но не гарантират резултат.</p>
          <p>6.2. Потребителят носи пълна отговорност за всички действия, решения и евентуални залози, които прави въз основа на информацията.</p>
          <p>6.3. Bet-wise не носи отговорност за финансови загуби или неблагоприятни резултати, произтичащи от използването на прогнозите.</p>

          <h2 id="section-7">7. Интелектуална собственост</h2>
          <p>7.1. Всички анализи, графики, текстове и данни в приложението са изключителна собственост на Bet-wise.</p>
          <p>7.2. Забранено е копиране, споделяне или разпространение без изрично писмено съгласие.</p>

          <h2 id="section-8">8. Отказ и възстановяване</h2>
          <p>8.1. Потребителят има право да прекрати абонамента по всяко време.</p>
          <p>8.2. Възстановявания на вече заплатени суми се извършват само при доказан технически проблем или грешка в системата.</p>

          <h2 id="section-9">9. Защита на личните данни</h2>
          <p>9.1. Bet-wise обработва личните данни на потребителите съгласно Политиката за поверителност, достъпна в приложението.</p>
          <p>9.2. Данните се използват единствено за предоставяне на услугата и не се споделят с трети лица без правно основание.</p>

          <h2 id="section-10">10. Промени в Общите условия</h2>
          <p>10.1. Bet-wise може да изменя Общите условия с цел подобряване на услугата или спазване на законови изисквания.</p>
          <p>10.2. Всички промени влизат в сила от датата на публикуването им в приложението.</p>

          <h2 id="section-11">11. Приложимо право</h2>
          <p>11.1. Настоящите Общи условия се тълкуват съгласно законодателството на Република България.</p>
          <p>11.2. Всички спорове се решават по взаимно съгласие, а при невъзможност — от компетентния съд.</p>
        </article>
      </main>
    </div>
  );
}