'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return (
    <button
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg
                 border border-transparent bg-gray-100 text-gray-700 hover:bg-gray-200
                 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700
                 transition-colors"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {currentTheme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}