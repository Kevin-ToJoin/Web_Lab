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

      {/* Right Side: QA Inspector (30%) — the catalog's real API & database
          testing lives in the downloadable Docker lab, so the simulated DB/API
          tabs are hidden and an "API Lab" tab explains how to download & run it. */}
      <div style={{ flex: '3', minWidth: '400px', maxWidth: '500px', borderLeft: '1px solid var(--glass-border)', zIndex: 10 }}>
        <QAInspectorPanel
          showDataTabs={false}
          dockerLab={{
            name: 'TechMart Catalog API',
            port: 4002,
            bugCount: 13,
            // Served by the web app itself (public/labs/) so the download works
            // regardless of the source repo's visibility and never gets lost.
            composeUrl: `${import.meta.env.BASE_URL}labs/catalog-docker-compose.yml`,
          }}
        />
      </div>

    </div>
  );
};
