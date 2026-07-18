import { useState, useEffect, useRef } from 'react';
import { X, Bug, CheckCircle } from 'lucide-react';
import { useBugReporter, type Severity } from '../../context/BugReporterContext';

const SEVERITIES: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

const severityColor: Record<Severity, string> = {
  Critical: 'var(--danger)',
  High:     '#f97316',
  Medium:   '#eab308',
  Low:      'var(--success)',
};

export const BugReporterModal = () => {
  const { isModalOpen, closeModal, submitReport, currentAppId } = useBugReporter();

  const [title,             setTitle]             = useState('');
  const [severity,          setSeverity]          = useState<Severity>('Medium');
  const [stepsToReproduce,  setStepsToReproduce]  = useState('');
  const [expectedResult,    setExpectedResult]    = useState('');
  const [actualResult,      setActualResult]      = useState('');
  const [submitted,         setSubmitted]         = useState<null | { matched: boolean; bugId?: string }>(null);
  const [errors,            setErrors]            = useState<Record<string, string>>({});

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  // Remember what was focused before opening so we can restore it on close.
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const handleClose = () => {
    setTitle(''); setSeverity('Medium'); setStepsToReproduce('');
    setExpectedResult(''); setActualResult('');
    setSubmitted(null); setErrors({});
    closeModal();
    // Restore focus to the trigger that opened the modal.
    lastFocusedRef.current?.focus?.();
  };

  // Capture the previously-focused element and move focus into the dialog on open.
  useEffect(() => {
    if (!isModalOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    // Focus the first field (or the dialog) once it has rendered.
    const id = window.setTimeout(() => {
      (titleInputRef.current ?? dialogRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isModalOpen]);

  // Escape to close + simple focus trap on Tab.
  useEffect(() => {
    if (!isModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim())            e.title            = 'Title is required.';
    if (!stepsToReproduce.trim()) e.stepsToReproduce = 'Steps are required.';
    if (!expectedResult.trim())   e.expectedResult   = 'Expected result is required.';
    if (!actualResult.trim())     e.actualResult     = 'Actual result is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const report = submitReport({ appId: currentAppId, title, severity, stepsToReproduce, expectedResult, actualResult });
    setSubmitted({ matched: !!report.matchedKnownBugId, bugId: report.matchedKnownBugId });
  };

  const inputErr = (field: string) => ({
    border: errors[field] ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
  });
  // Accessibility props for a field: marks invalid state and links the error text.
  const a11y = (field: string) => ({
    'aria-invalid': errors[field] ? true : undefined,
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-reporter-title"
        tabIndex={-1}
        className="glass-panel"
        style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}
      >

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bug size={22} color="var(--danger)" aria-hidden="true" />
            <h2 id="bug-reporter-title" style={{ fontSize: '1.25rem' }}>File a Bug Report</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleClose} style={{ padding: '0.4rem' }} aria-label="Close bug report dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* Success state */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={56} color="var(--success)" style={{ marginBottom: '1rem' }} aria-hidden="true" />
            <h3 style={{ marginBottom: '0.75rem' }}>Bug Report Filed!</h3>
            {submitted.matched ? (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.25rem' }}>✅ Real bug confirmed!</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your report matches known bug <code style={{ color: 'var(--primary)' }}>{submitted.bugId}</code>. It's been added to your score.</p>
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Report saved. Couldn't automatically match this to a known bug — your instructor can verify it manually.</p>
              </div>
            )}
            <button type="button" className="btn btn-primary" onClick={handleClose}>Done</button>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="input-group">
              <label className="input-label" htmlFor="br-title">Bug Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input id="br-title" ref={titleInputRef} className="input-field" style={inputErr('title')} type="text" value={title}
                {...a11y('title')}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g. "Back button navigates to invalid URL"' />
              {errors.title && <span id="title-error" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.title}</span>}
            </div>

            {/* Severity */}
            <div className="input-group">
              <span className="input-label" id="br-severity-label">Severity</span>
              <div role="radiogroup" aria-labelledby="br-severity-label" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SEVERITIES.map(s => (
                  <button key={s} type="button" role="radio" aria-checked={severity === s} onClick={() => setSeverity(s)}
                    style={{
                      padding: '0.35rem 0.9rem', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', border: '1px solid',
                      borderColor: severity === s ? severityColor[s] : 'var(--glass-border)',
                      background: severity === s ? `color-mix(in srgb, ${severityColor[s]} 15%, transparent)` : 'transparent',
                      color: severity === s ? severityColor[s] : 'var(--text-muted)',
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div className="input-group">
              <label className="input-label" htmlFor="br-steps">Steps to Reproduce <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea id="br-steps" className="input-field" style={{ ...inputErr('stepsToReproduce'), minHeight: '80px', resize: 'vertical' }}
                {...a11y('stepsToReproduce')}
                value={stepsToReproduce} onChange={e => setStepsToReproduce(e.target.value)}
                placeholder={'1. Navigate to...\n2. Click...\n3. Observe...'} />
              {errors.stepsToReproduce && <span id="stepsToReproduce-error" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.stepsToReproduce}</span>}
            </div>

            {/* Expected */}
            <div className="input-group">
              <label className="input-label" htmlFor="br-expected">Expected Result <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea id="br-expected" className="input-field" style={{ ...inputErr('expectedResult'), minHeight: '60px', resize: 'vertical' }}
                {...a11y('expectedResult')}
                value={expectedResult} onChange={e => setExpectedResult(e.target.value)}
                placeholder="What should happen according to the requirements?" />
              {errors.expectedResult && <span id="expectedResult-error" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.expectedResult}</span>}
            </div>

            {/* Actual */}
            <div className="input-group">
              <label className="input-label" htmlFor="br-actual">Actual Result <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea id="br-actual" className="input-field" style={{ ...inputErr('actualResult'), minHeight: '60px', resize: 'vertical' }}
                {...a11y('actualResult')}
                value={actualResult} onChange={e => setActualResult(e.target.value)}
                placeholder="What actually happened?" />
              {errors.actualResult && <span id="actualResult-error" style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.actualResult}</span>}
            </div>

            <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem' }} onClick={handleSubmit}>
              <Bug size={16} aria-hidden="true" /> Submit Bug Report
            </button>
          </>
        )}
      </div>
    </div>
  );
};
