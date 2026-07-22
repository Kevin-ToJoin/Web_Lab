import { Languages } from 'lucide-react';
import { useI18n } from './LanguageContext';
import type { Lang } from './strings';

// A compact ES | EN segmented toggle. Switches the whole UI language and
// persists the choice. `compact` drops the leading icon for tight headers.
export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();

  const pill = (value: Lang, label: string) => {
    const active = lang === value;
    return (
      <button
        type="button"
        onClick={() => setLang(value)}
        aria-pressed={active}
        aria-label={value === 'es' ? 'Español' : 'English'}
        style={{
          border: 'none',
          background: active ? 'var(--primary)' : 'transparent',
          color: active ? '#fff' : 'var(--text-muted)',
          fontWeight: 700,
          fontSize: '0.7rem',
          letterSpacing: '0.04em',
          padding: '0.2rem 0.55rem',
          borderRadius: 'var(--radius-full)',
          cursor: active ? 'default' : 'pointer',
          transition: 'all 150ms',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label={lang === 'es' ? 'Cambiar idioma' : 'Change language'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.15rem',
        padding: '0.15rem',
        background: 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--radius-full)',
      }}
    >
      {!compact && <Languages size={14} aria-hidden="true" style={{ color: 'var(--text-muted)', margin: '0 0.15rem' }} />}
      {pill('es', 'ES')}
      {pill('en', 'EN')}
    </div>
  );
}
