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

export interface BugSolution {
  bugId: string;
  title: string;
  location: string;
  technique: string;
  buggyCode: string;
  fixedCode: string;
  explanation: string;
}

interface QAPanelState {
  requirementsMarkdown: string;
  setRequirements: (md: string) => void;

  dbTables: Record<string, any[]>;
  setDbTables: (tables: Record<string, any[]>) => void;

  apiEndpoints: APIEndpoint[];
  setApiEndpoints: (endpoints: APIEndpoint[]) => void;

  solutions: BugSolution[];
  setSolutions: (solutions: BugSolution[]) => void;

  solutionsUnlocked: boolean;
  unlockSolutions: (password: string) => boolean;
}

const QAPanelContext = createContext<QAPanelState | undefined>(undefined);

const SOLUTIONS_PASSWORD = 'REVEAL';

export const QAPanelProvider = ({ children }: { children: ReactNode }) => {
  const [requirementsMarkdown, setRequirements] = useState<string>('## Select a page\nNavigate to any page to load its requirements.');
  const [dbTables,     setDbTables]     = useState<Record<string, any[]>>({});
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [solutions,    setSolutions]    = useState<BugSolution[]>([]);
  const [solutionsUnlocked, setSolutionsUnlocked] = useState(false);

  const unlockSolutions = (password: string): boolean => {
    if (password.trim().toUpperCase() === SOLUTIONS_PASSWORD) {
      setSolutionsUnlocked(true);
      return true;
    }
    return false;
  };

  return (
    <QAPanelContext.Provider value={{
      requirementsMarkdown, setRequirements,
      dbTables, setDbTables,
      apiEndpoints, setApiEndpoints,
      solutions, setSolutions,
      solutionsUnlocked, unlockSolutions,
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
