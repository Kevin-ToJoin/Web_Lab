import { type ReactNode } from 'react';
import { QAProvider } from './QAContext';
import { QAInspectorPanel } from './QAInspectorPanel';

/**
 * Split-screen wrapper for the standalone (non-routed) apps: the app renders on
 * the left (70%), the QA Inspector on the right (30%). Wrap the app's content in
 * <QALayout> and call the useQAPanel setters from inside the children to feed
 * Requirements / DB / API / Solutions into the inspector.
 */
export const QALayout = ({ children }: { children: ReactNode }) => {
  return (
    <QAProvider>
      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
        <div style={{ flex: '7', overflowY: 'auto', position: 'relative' }}>
          <div style={{ padding: '2rem' }}>
            {children}
          </div>
        </div>
        <div style={{ flex: '3', minWidth: '400px', maxWidth: '500px', borderLeft: '1px solid var(--glass-border)', zIndex: 10 }}>
          <QAInspectorPanel />
        </div>
      </div>
    </QAProvider>
  );
};
