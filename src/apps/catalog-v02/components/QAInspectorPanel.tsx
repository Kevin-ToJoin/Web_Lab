import { useState } from 'react';
import { useQAPanel } from '../context/QAPanelContext';
import { BookOpen, Database, TerminalSquare, Send } from 'lucide-react';

export const QAInspectorPanel = () => {
  const [activeTab, setActiveTab] = useState<'reqs' | 'db' | 'api'>('reqs');
  const { requirementsMarkdown, dbTables, apiEndpoints } = useQAPanel();
  

  const [apiResponse, setApiResponse] = useState('');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--surface-color)', borderLeft: '1px solid var(--glass-border)' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
        <button 
          onClick={() => setActiveTab('reqs')}
          style={{ flex: 1, padding: '1rem', background: activeTab === 'reqs' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'reqs' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <BookOpen size={16} /> Reqs
        </button>
        <button 
          onClick={() => setActiveTab('db')}
          style={{ flex: 1, padding: '1rem', background: activeTab === 'db' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'db' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Database size={16} /> DB
        </button>
        <button 
          onClick={() => setActiveTab('api')}
          style={{ flex: 1, padding: '1rem', background: activeTab === 'api' ? 'rgba(255,255,255,0.05)' : 'transparent', border: 'none', color: activeTab === 'api' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <TerminalSquare size={16} /> API
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
        
        {/* Requirements Tab */}
        {activeTab === 'reqs' && (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
            {requirementsMarkdown}
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'db' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {Object.keys(dbTables).length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No database tables loaded for this view.</p>
            ) : (
              Object.entries(dbTables).map(([tableName, data]) => (
                <div key={tableName}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', fontFamily: 'monospace' }}>Table: {tableName}</h3>
                  <div style={{ background: '#0f172a', padding: '1rem', borderRadius: 'var(--radius-sm)', overflowX: 'auto' }}>
                    <pre style={{ margin: 0, fontSize: '0.8rem', color: '#38bdf8' }}>
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
              <p style={{ color: 'var(--text-muted)' }}>No relevant API endpoints for this view.</p>
            ) : (
              apiEndpoints.map((ep, i) => (
                <div key={i} className="glass-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', color: ep.method === 'GET' ? '#34d399' : ep.method === 'POST' ? '#60a5fa' : '#f87171' }}>{ep.method}</span>
                    <span style={{ fontFamily: 'monospace' }}>{ep.path}</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>{ep.description}</p>
                  
                  {ep.method !== 'GET' && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Payload body (JSON):</label>
                      <textarea 
                        style={{ width: '100%', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', padding: '0.5rem', fontFamily: 'monospace', borderRadius: '4px', minHeight: '80px', marginTop: '0.25rem' }}
                        defaultValue={ep.payloadTemplate}
                      />
                    </div>
                  )}

                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' }}
                    onClick={() => {
                      setApiResponse("Simulating network latency...");
                      setTimeout(() => {
                        setApiResponse(ep.expectedResponse || "200 OK: {}");
                      }, 800);
                    }}
                  >
                    <Send size={14} /> Send Request
                  </button>

                  {apiResponse && (
                    <div style={{ marginTop: '1rem', background: '#000', padding: '1rem', borderRadius: '4px' }}>
                      <pre style={{ margin: 0, fontSize: '0.75rem', color: apiResponse.includes('200') ? '#34d399' : '#f87171' }}>{apiResponse}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </div>
  );
};
