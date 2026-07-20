import { knownBugs } from '../data/knownBugs';

// Renders the ISTQB classification chips for a bug, looked up from the registry
// by id so the taxonomy has a single source of truth. Returns null for bugs that
// haven't been tagged yet (apps still pending re-curation).
export const IstqbTags = ({ bugId }: { bugId: string }) => {
  const bug = knownBugs.find(b => b.id === bugId);
  if (!bug || !bug.characteristic) return null;

  const chips: { label: string; value: string; accent?: boolean }[] = [];
  if (bug.testType) chips.push({ label: 'Type', value: bug.testType, accent: true });
  if (bug.characteristic) chips.push({ label: 'Quality', value: bug.characteristic });
  if (bug.testDesign) chips.push({ label: 'Technique', value: bug.testDesign });
  if (bug.testLevel) chips.push({ label: 'Level', value: bug.testLevel });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.7rem' }}>
      {chips.map(c => (
        <span
          key={c.label}
          style={{
            fontSize: '0.65rem',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            letterSpacing: '0.03em',
            padding: '0.2rem 0.45rem',
            borderRadius: '5px',
            border: '1px solid',
            borderColor: c.accent ? 'color-mix(in srgb, var(--primary) 45%, transparent)' : 'var(--glass-border)',
            background: c.accent ? 'color-mix(in srgb, var(--primary) 12%, transparent)' : 'rgba(255,255,255,0.03)',
            color: c.accent ? 'var(--primary)' : 'var(--text-muted)',
            display: 'inline-flex',
            gap: '0.35rem',
            alignItems: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ opacity: 0.55 }}>{c.label}</span>
          <span style={{ fontWeight: 600 }}>{c.value}</span>
        </span>
      ))}
    </div>
  );
};
