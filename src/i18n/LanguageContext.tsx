import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { strings, type Lang } from './strings';

const STORAGE_KEY = 'testlab101_lang';

// Default language: a saved choice wins; otherwise fall back to the browser's
// language (Spanish for es-*, English for everything else).
function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch { /* localStorage may be unavailable */ }
  const nav = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* ignore */ }
    try { document.documentElement.lang = l; } catch { /* ignore */ }
  }, []);

  const toggle = useCallback(() => setLangState(prev => {
    const next: Lang = prev === 'es' ? 'en' : 'es';
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    try { document.documentElement.lang = next; } catch { /* ignore */ }
    return next;
  }), []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const entry = strings[key];
    // Missing keys surface the key itself so gaps are obvious in the UI.
    let text = entry ? entry[lang] : key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return text;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggle, t }}>
      {children}
    </I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within a LanguageProvider');
  return ctx;
}
