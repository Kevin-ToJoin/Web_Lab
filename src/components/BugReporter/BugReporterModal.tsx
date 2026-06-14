import { useState } from 'react';
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

  const handleClose = () => {
    setTitle(''); setSeverity('Medium'); setStepsToReproduce('');
    setExpectedResult(''); setActualResult('');
    setSubmitted(null); setErrors({});
    closeModal();
  };

  const inputErr = (field: string) => ({
    border: errors[field] ? '1px solid var(--danger)' : '1px solid var(--glass-border)',
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
      <div className="glass-panel" style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Bug size={22} color="var(--danger)" />
            <h2 style={{ fontSize: '1.25rem' }}>File a Bug Report</h2>
          </div>
          <button type="button" className="btn btn-secondary" onClick={handleClose} style={{ padding: '0.4rem' }} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Success state */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={56} color="var(--success)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.75rem' }}>Bug Report Filed!</h3>
            {submitted.matched ? (
              <>
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'var(--success)', fontWeight: 600, marginBottom: '0.25rem' }}>✅ Real bug confirmed!</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Your report matches known bug <code style={{ color: 'var(--primary)' }}>{submitted.bugId}</code>. It's been added to your score.</p>
                </div>
              </>
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
              <label className="input-label">Bug Title <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input className="input-field" style={inputErr('title')} type="text" value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder='e.g. "Back button navigates to invalid URL"' />
              {errors.title && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.title}</span>}
            </div>

            {/* Severity */}
            <div className="input-group">
              <label className="input-label">Severity</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {SEVERITIES.map(s => (
                  <button key={s} type="button" onClick={() => setSeverity(s)}
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
              <label className="input-label">Steps to Reproduce <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="input-field" style={{ ...inputErr('stepsToReproduce'), minHeight: '80px', resize: 'vertical' }}
                value={stepsToReproduce} onChange={e => setStepsToReproduce(e.target.value)}
                placeholder={'1. Navigate to...\n2. Click...\n3. Observe...'} />
              {errors.stepsToReproduce && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.stepsToReproduce}</span>}
            </div>

            {/* Expected */}
            <div className="input-group">
              <label className="input-label">Expected Result <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="input-field" style={{ ...inputErr('expectedResult'), minHeight: '60px', resize: 'vertical' }}
                value={expectedResult} onChange={e => setExpectedResult(e.target.value)}
                placeholder="What should happen according to the requirements?" />
              {errors.expectedResult && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.expectedResult}</span>}
            </div>

            {/* Actual */}
            <div className="input-group">
              <label className="input-label">Actual Result <span style={{ color: 'var(--danger)' }}>*</span></label>
              <textarea className="input-field" style={{ ...inputErr('actualResult'), minHeight: '60px', resize: 'vertical' }}
                value={actualResult} onChange={e => setActualResult(e.target.value)}
                placeholder="What actually happened?" />
              {errors.actualResult && <span style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{errors.actualResult}</span>}
            </div>

            <button type="button" className="btn btn-primary" style={{ width: '100%', padding: '0.875rem', marginTop: '0.5rem' }} onClick={handleSubmit}>
              <Bug size={16} /> Submit Bug Report
            </button>
          </>
        )}
      </div>
    </div>
  );
};
