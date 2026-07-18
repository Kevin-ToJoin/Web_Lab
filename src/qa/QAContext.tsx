/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

// A live response returned by an endpoint handler. `status` drives the
// colour of the rendered response; `body` is pretty-printed as JSON.
export interface APIResponse {
  status: number;
  body: unknown;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  payloadTemplate?: string;
  // Legacy: a hardcoded canned response string (catalog pages still use this).
  expectedResponse?: string;
  // Preferred: a real handler executed when "Send" is clicked. It receives the
  // raw request-body text typed into the textarea (if any) and returns a live
  // response — this is what makes the API tester actually functional.
  handler?: (requestBody: string) => APIResponse | Promise<APIResponse>;
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

export const QAProvider = ({ children }: { children: ReactNode }) => {
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

// Back-compat alias — catalog code imports `QAPanelProvider`.
export const QAPanelProvider = QAProvider;

export const useQAPanel = () => {
  const context = useContext(QAPanelContext);
  if (!context) throw new Error('useQAPanel must be used within QAProvider');
  return context;
};
