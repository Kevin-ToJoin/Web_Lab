import { useState } from 'react';
import { useQAPanel } from '../context/QAPanelContext';
import { BookOpen, Database, TerminalSquare, Send } from 'lucide-react';

// ─── Minimal Markdown Renderer ────────────────────────────────────────────────
// Handles: ## h2, ### h3, **bold**, `inline code`, - list items, ```code blocks```
const renderMarkdown = (md: string) => {
  const lines = md.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];

  const flushList = (key: string) => {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key} style={{ paddingLeft: '1.25rem', margin: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {listBuffer.map((item, idx) => (
          <li key={idx} style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
        ))}
      </ul>
    );
    listBuffer = [];
  };

  const inlineFormat = (text: string): string =>
    text
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-main)">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.15);color:#93c5fd;padding:0.1rem 0.3rem;border-radius:3px;font-size:0.85em">$1</code>');

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    if (line.startsWith('```')) {
      flushList(`flush-before-code-${i}`);
      const fenceLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        fenceLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={`code-${i}`} style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem 1rem', margin: '0.75rem 0', overflowX: 'auto' }}>
          <code style={{ fontSize: '0.8rem', color: '#93c5fd', fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {fenceLines.join('\n')}
          </code>
        </pre>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushList(`flush-${i}`);
      elements.push(<h3 key={i} style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: '1.25rem 0 0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7 }}>{line.slice(4)}</h3>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      flushList(`flush-${i}`);
      elements.push(<h2 key={i} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 0.75rem', borderBottom: '1px solid rgba(59,130,246,0.2)', paddingBottom: '0.4rem' }}>{line.slice(3)}</h2>);
      i++; continue;
    }

    // List items
    if (line.startsWith('- ')) {
      listBuffer.push(line.slice(2));
      i++; continue;
    }

    // Horizontal rule
    if (line.startsWith('---')) {
      flushList(`flush-hr-${i}`);
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }} />);
      i++; continue;
    }

    // Blank line
    if (line.trim() === '') {
      flushList(`flush-blank-${i}`);
      elements.push(<div key={i} style={{ height: '0.5rem' }} />);
      i++; continue;
    }

    // Regular paragraph
    flushList(`flush-p-${i}`);
    elements.push(
      <p key={i} style={{ color: 'var(--text-muted)', lineHeight: 1.7, margin: '0.25rem 0' }}
        dangerouslySetInnerHTML={{ __html: inlineFormat(line) }} />
    );
    i++;
  }

  flushList('flush-end');
  return elements;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const QAInspectorPanel = () => {
  const [activeTab, setActiveTab] = useState<'reqs' | 'db' | 'api'>('reqs');
  const { requirementsMarkdown, dbTables, apiEndpoints } = useQAPanel();
  // Each endpoint gets its own response state, keyed by index
  const [apiResponses, setApiResponses] = useState<Record<number, string>>({});

  const setResponse = (idx: number, text: string) =>
    setApiResponses(prev => ({ ...prev, [idx]: text }));

  const tabs = [
    { id: 'reqs' as const, label: 'Reqs',  icon: <BookOpen size={14} aria-hidden="true" /> },
    { id: 'db'   as const, label: 'DB',    icon: <Database size={14} aria-hidden="true" /> },
    { id: 'api'  as const, label: 'API',   icon: <TerminalSquare size={14} aria-hidden="true" /> },
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>

      {/* Tab bar */}
      <div role="tablist" aria-label="QA Inspector" style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)', flexShrink: 0 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              transition: 'all 150ms',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div role="tabpanel" style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>

        {/* Requirements Tab */}
        {activeTab === 'reqs' && (
          <div>
            {requirementsMarkdown
              ? renderMarkdown(requirementsMarkdown)
              : <p style={{ color: 'var(--text-disabled)' }}>No requirements loaded for this page.</p>
            }
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'db' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.keys(dbTables).length === 0 ? (
              <p style={{ color: 'var(--text-disabled)' }}>No database tables loaded for this view.</p>
            ) : (
              Object.entries(dbTables).map(([tableName, data]) => (
                <div key={tableName}>
                  <h3 style={{ marginBottom: '0.75rem', color: 'var(--primary)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    ▸ {tableName}
                  </h3>
                  <div style={{ background: '#0d1117', border: '1px solid #1e293b', padding: '0.75rem 1rem', borderRadius: '6px', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.75rem', color: '#93c5fd', lineHeight: 1.6 }}>
                      {JSON.stringify(data, null, 2)}
                    </pre>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {apiEndpoints.length === 0 ? (
              <p style={{ color: 'var(--text-disabled)' }}>No API endpoints for this view.</p>
            ) : (
              apiEndpoints.map((ep, i) => {
                const methodColor = ep.method === 'GET' ? '#34d399' : ep.method === 'POST' ? '#60a5fa' : ep.method === 'DELETE' ? '#f87171' : '#fbbf24';
                const response = apiResponses[i];
                return (
                  <div key={i} className="glass-panel" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, color: methodColor, fontFamily: 'monospace', fontSize: '0.8rem', background: `${methodColor}18`, padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                        {ep.method}
                      </span>
                      <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>{ep.path}</code>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>{ep.description}</p>

                    {ep.payloadTemplate && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-disabled)', display: 'block', marginBottom: '0.25rem' }}>
                          Request body (JSON):
                        </label>
                        <textarea
                          aria-label={`Request body for ${ep.method} ${ep.path}`}
                          style={{ width: '100%', background: '#0d1117', color: '#e2e8f0', border: '1px solid #1e293b', padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.75rem', borderRadius: '4px', minHeight: '72px', resize: 'vertical' }}
                          defaultValue={ep.payloadTemplate}
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      aria-label={`Send ${ep.method} request to ${ep.path}`}
                      className="btn btn-primary"
                      style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', gap: '0.35rem' }}
                      onClick={() => {
                        setResponse(i, '⏳  Simulating network latency...');
                        setTimeout(() => {
                          setResponse(i, ep.expectedResponse
                            ? `200 OK\n\n${ep.expectedResponse}`
                            : `200 OK\n\n{}`);
                        }, 800);
                      }}
                    >
                      <Send size={12} aria-hidden="true" /> Send
                    </button>

                    {response && (
                      <div style={{ marginTop: '0.75rem', background: '#0d1117', border: '1px solid #1e293b', padding: '0.75rem', borderRadius: '4px' }}>
                        <pre style={{ margin: 0, fontSize: '0.72rem', color: response.includes('200') ? '#34d399' : '#f87171', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {response}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
