export type ThemeChoice = 'light' | 'dark';

// Нормализация на стари стойности към новите две
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function normalizeTheme(input: any): ThemeChoice {
  if (input === 'dark' || input === 'light') return input;
  if (input === 'darker') return 'dark';     // legacy "AMOLED" -> dark
  if (input === 'system') {
    return systemPrefersDark() ? 'dark' : 'light';
  }
  return 'light';
}

const STORAGE_KEY = 'theme';

export function getStoredTheme(): ThemeChoice {
  if (typeof window === 'undefined') return 'light';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return normalizeTheme(raw);
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  const effective = normalizeTheme(choice);

  root.classList.toggle('dark', effective === 'dark'); // Tailwind dark клас
  root.setAttribute('data-theme', effective);          // За CSS променливи, ако ползвате
}

export function setTheme(choice: ThemeChoice) {
  if (typeof window === 'undefined') return;
  const normalized = normalizeTheme(choice);
  window.localStorage.setItem(STORAGE_KEY, normalized);
  applyTheme(normalized);
}

export function initTheme() {
  const saved = getStoredTheme();
  applyTheme(saved);

  // Ако някой има legacy 'system' в локално състояние, ще се ре-аплайне при промяна
  if (typeof window !== 'undefined') {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const current = getStoredTheme();
      if (current !== 'light' && current !== 'dark') {
        applyTheme(normalizeTheme('system'));
      }
    };
    if ('addEventListener' in mql) {
      mql.addEventListener('change', onChange);
    } else if ('addListener' in mql) {
      // older browsers expose addListener; use an any-cast to satisfy TS typings
      (mql as any).addListener(onChange);
    }
  }
}