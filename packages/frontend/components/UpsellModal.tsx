'use client';

import React from 'react';
import Link from 'next/link';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  bullets?: string[];
  ctaHref?: string;
  ctaText?: string;
  secondaryCtaHref?: string;
  secondaryCtaText?: string;
};

export default function UpsellModal({
  open,
  onClose,
  title = 'Отключи пълния достъп до прогнозите',
  bullets = [
    'Пълни анализи и детайлни обосновки',
    'Ранен достъп до VIP прогнози',
    'По-високи комисиони от реферали',
  ],
  ctaHref = '/pricing',
  ctaText = 'Виж плановете',
  secondaryCtaHref = '/dashboard/subscription',
  secondaryCtaText = 'Управление на абонамент',
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button aria-label="Close" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <ul className="mt-4 space-y-2 text-sm text-gray-700">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2">
              <span className="mt-1 text-primary-600">★</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={ctaHref} className="btn-primary text-center">{ctaText}</Link>
          <Link href={secondaryCtaHref} className="btn-secondary text-center">{secondaryCtaText}</Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Абонирай се сега и отключи съдържанието веднага. Можеш да отмениш по всяко време.
        </p>
      </div>
    </div>
  );
}