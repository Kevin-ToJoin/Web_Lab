import { Outlet } from 'react-router-dom';
import { QAInspectorPanel } from '../components/QAInspectorPanel';

export const CatalogV02Layout = () => {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--bg-base)' }}>
      
      {/* Left Side: The App (70%) */}
      <div style={{ flex: '7', overflowY: 'auto', position: 'relative' }}>
        <div style={{ padding: '2rem' }}>
          <Outlet />
        </div>
      </div>

      {/* Right Side: QA Inspector (30%) — DB/API tabs hidden: the catalog's real
          API & database testing lives in the downloadable Docker lab, so the web
          inspector stays focused on Requirements, Bug Reporter, and Solutions. */}
      <div style={{ flex: '3', minWidth: '400px', maxWidth: '500px', borderLeft: '1px solid var(--glass-border)', zIndex: 10 }}>
        <QAInspectorPanel showDataTabs={false} />
      </div>

    </div>
  );
};
