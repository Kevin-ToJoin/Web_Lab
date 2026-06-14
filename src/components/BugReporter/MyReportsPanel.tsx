import { X, Trash2, Bug, CheckCircle, AlertCircle } from 'lucide-react';
import { useBugReporter, type BugReport, type Severity } from '../../context/BugReporterContext';
import { knownBugs } from '../../data/knownBugs';

const APP_LABELS: Record<string, string> = {
  catalog:      'Product Catalog',
  ecommerce:    'E-commerce Store',
  bank:         'Bank Core System',
  healthcare:   'Patient Portal',
  trading:      'Trading Dashboard',
  registration: 'Registration Portal',
};

const severityColor: Record<Severity, string> = {
  Critical: 'var(--danger)',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      'var(--success)',
};

const ScoreBadge = ({ appId }: { appId: string }) => {
  const { getScoreForApp } = useBugReporter();
  const { found, total } = getScoreForApp(appId);
  if (total === 0) return null;
  const pct = Math.round((found / total) * 100);
  return (
    <span style={{
      fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem',
      borderRadius: 'var(--radius-full)',
      background: found > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
      color: found > 0 ? 'var(--success)' : 'var(--text-disabled)',
    }}>
      {found}/{total} bugs · {pct}%
    </span>
  );
};

const ReportCard = ({ report }: { report: BugReport }) => {
  const known = report.matchedKnownBugId
    ? knownBugs.find(b => b.id === report.matchedKnownBugId)
    : null;

  return (
    <div className="glass-panel" style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, flex: 1 }}>{report.title}</h4>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: severityColor[report.severity], flexShrink: 0 }}>
          {report.severity}
        </span>
      </div>

      {known ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <CheckCircle size={13} color="var(--success)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>
            Matched {known.id} — Level {known.level} · {known.technique}
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <AlertCircle size={13} color="var(--text-disabled)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-disabled)' }}>Unverified report</span>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: 'var(--text-disabled)', marginTop: '0.25rem' }}>
        {new Date(report.createdAt).toLocaleString()}
      </p>
    </div>
  );
};

export const MyReportsPanel = () => {
  const { isReportsPanelOpen, toggleReportsPanel, reports, clearReports, getScoreForApp } = useBugReporter();

  if (!isReportsPanelOpen) return null;

  // Group reports by app
  const byApp = Object.keys(APP_LABELS).reduce<Record<string, BugReport[]>>((acc, id) => {
    acc[id] = reports.filter(r => r.appId === id);
    return acc;
  }, {});

  const totalFound = Object.keys(APP_LABELS).reduce((sum, id) => sum + getScoreForApp(id).found, 0);
  const totalKnown = knownBugs.length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1800,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }}
      onClick={e => { if (e.target === e.currentTarget) toggleReportsPanel(); }}
    >
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: '100%', maxWidth: '500px',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--glass-border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Bug size={20} color="var(--danger)" />
              <h2 style={{ fontSize: '1.1rem' }}>My Bug Reports</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Total verified: <strong style={{ color: 'var(--success)' }}>{totalFound}</strong> / {totalKnown} known bugs
            </p>
          </div>
          <button type="button" className="btn btn-secondary" style={{ padding: '0.4rem' }} onClick={toggleReportsPanel} aria-label="Close panel">
            <X size={18} />
          </button>
        </div>

        {/* Global progress bar */}
        <div style={{ padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
          <div style={{ background: 'var(--glass-border)', borderRadius: 'var(--radius-full)', height: '6px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 'var(--radius-full)',
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              width: `${Math.round((totalFound / totalKnown) * 100)}%`,
              transition: 'width 0.5s ease',
            }} />
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '0.35rem' }}>
            {Math.round((totalFound / totalKnown) * 100)}% of all known bugs found
          </p>
        </div>

        {/* Reports by app */}
        <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-disabled)' }}>
              <Bug size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
              <p>No bug reports yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Open an app and click "File Bug Report" to start.</p>
            </div>
          ) : (
            Object.entries(byApp).map(([appId, appReports]) => {
              if (appReports.length === 0) return null;
              return (
                <div key={appId} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {APP_LABELS[appId]}
                    </h3>
                    <ScoreBadge appId={appId} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {appReports.map(r => <ReportCard key={r.id} report={r} />)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {reports.length > 0 && (
          <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--glass-border)', flexShrink: 0 }}>
            <button type="button" className="btn btn-secondary" style={{ width: '100%', color: 'var(--danger)' }} onClick={clearReports}>
              <Trash2 size={16} aria-hidden="true" /> Clear All Reports
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
