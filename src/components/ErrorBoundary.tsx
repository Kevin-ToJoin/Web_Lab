import { Component, type ReactNode } from 'react';
import { Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  appName?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    // Full reload (not a router navigate) to guarantee a clean remount after a crash.
    // Uses Vite's BASE_URL so this still lands on the hub when served under /Lab101.
    window.location.href = import.meta.env.BASE_URL;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '1.5rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)'
        }}>
          <Bug size={56} color="var(--danger)" />
          <h1 style={{ fontSize: '2rem' }}>App Crashed</h1>
          {this.props.appName && (
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
              The <strong>{this.props.appName}</strong> environment encountered an unhandled error.
            </p>
          )}
          <code style={{
            background: 'rgba(239,68,68,0.1)',
            color: 'var(--danger)',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
            maxWidth: '600px',
            wordBreak: 'break-word'
          }}>
            {this.state.message || 'Unknown error'}
          </code>
          <button
            onClick={this.handleReset}
            style={{
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '0.75rem 2rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600
            }}
          >
            Return to Hub
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
