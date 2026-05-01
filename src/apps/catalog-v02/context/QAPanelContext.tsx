/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  payloadTemplate?: string;
  expectedResponse?: string;
}

interface QAPanelState {
  requirementsMarkdown: string;
  setRequirements: (md: string) => void;
  
  dbTables: Record<string, any[]>;
  setDbTables: (tables: Record<string, any[]>) => void;
  
  apiEndpoints: APIEndpoint[];
  setApiEndpoints: (endpoints: APIEndpoint[]) => void;
}

const QAPanelContext = createContext<QAPanelState | undefined>(undefined);

export const QAPanelProvider = ({ children }: { children: ReactNode }) => {
  const [requirementsMarkdown, setRequirements] = useState<string>('# Select a page to view requirements');
  const [dbTables, setDbTables] = useState<Record<string, any[]>>({});
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);

  return (
    <QAPanelContext.Provider value={{
      requirementsMarkdown, setRequirements,
      dbTables, setDbTables,
      apiEndpoints, setApiEndpoints
    }}>
      {children}
    </QAPanelContext.Provider>
  );
};

export const useQAPanel = () => {
  const context = useContext(QAPanelContext);
  if (!context) throw new Error('useQAPanel must be used within QAPanelProvider');
  return context;
};
