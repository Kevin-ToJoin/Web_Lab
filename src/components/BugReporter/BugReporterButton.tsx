import { useLocation } from 'react-router-dom';
import { Bug } from 'lucide-react';
import { useBugReporter } from '../../context/BugReporterContext';

// Map URL prefixes to appId strings used in BugReporterContext / knownBugs
const pathToAppId = (pathname: string): string | null => {
  if (pathname.startsWith('/catalog'))      return 'catalog';
  if (pathname.startsWith('/ecommerce'))    return 'ecommerce';
  if (pathname.startsWith('/bank'))         return 'bank';
  if (pathname.startsWith('/healthcare'))   return 'healthcare';
  if (pathname.startsWith('/trading'))      return 'trading';
  if (pathname.startsWith('/registration')) return 'registration';
  return null; // hub — button hidden
};

export const BugReporterButton = () => {
  const { pathname } = useLocation();
  const { openModal } = useBugReporter();

  const appId = pathToAppId(pathname);
  if (!appId) return null; // don't show on the hub

  return (
    <button
      type="button"
      aria-label="File a bug report"
      onClick={() => openModal(appId)}
      style={{
        position: 'fixed',
        bottom: '1.75rem',
        right: '1.75rem',
        zIndex: 1500,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--danger)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        fontWeight: 700,
        fontSize: '0.875rem',
        boxShadow: '0 4px 20px rgba(239,68,68,0.45)',
        transition: 'transform 150ms, box-shadow 150ms',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 28px rgba(239,68,68,0.55)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.transform = '';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(239,68,68,0.45)';
      }}
    >
      <Bug size={16} aria-hidden="true" />
      File Bug Report
    </button>
  );
};
