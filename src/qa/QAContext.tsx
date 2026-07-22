/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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

// A page that keeps its answers in the protected backend (server-gated) sets
// this instead of `setSolutions`: just which app + which bugIds are on the view.
// The actual solution content is fetched from /api/solutions on unlock.
export interface RemoteSolutionsRef {
  app: string;
  bugIds: string[];
}

interface QAPanelState {
  requirementsMarkdown: string;
  setRequirements: (md: string) => void;

  dbTables: Record<string, any[]>;
  setDbTables: (tables: Record<string, any[]>) => void;

  apiEndpoints: APIEndpoint[];
  setApiEndpoints: (endpoints: APIEndpoint[]) => void;

  // Inline solutions: content shipped in the client bundle (legacy path, still
  // used by modules whose answers have not been moved server-side yet).
  solutions: BugSolution[];
  setSolutions: (solutions: BugSolution[]) => void;

  // Server-gated solutions: the page registers only bugIds; content is fetched.
  remoteSolutions: RemoteSolutionsRef | null;
  setRemoteSolutions: (ref: RemoteSolutionsRef | null) => void;

  solutionsUnlocked: boolean;
  solutionsLoading: boolean;
  solutionsError: string | null;
  // Async: for inline modules it resolves the client-side check; for server-gated
  // modules it validates the key on the server and fetches the answers.
  unlockSolutions: (password: string) => Promise<boolean>;
}

const QAPanelContext = createContext<QAPanelState | undefined>(undefined);

const SOLUTIONS_PASSWORD = 'REVEAL';
// Where the answers function lives. In production the app is served from
// tojoin.org/Lab101 — a proxy in front of a *different* project — so a
// same-origin /api call never reaches this project's function. We therefore
// call the Web_Lab deployment directly (cross-origin, CORS-enabled). Override
// with VITE_SOLUTIONS_API to point at a custom domain; dev uses same-origin.
const SOLUTIONS_ENDPOINT =
  (import.meta.env.VITE_SOLUTIONS_API as string | undefined) ||
  (import.meta.env.PROD ? 'https://web-lab-lime-one.vercel.app/api/solutions' : '/api/solutions');

export const QAProvider = ({ children }: { children: ReactNode }) => {
  const [requirementsMarkdown, setRequirements] = useState<string>('## Select a page\nNavigate to any page to load its requirements.');
  const [dbTables,     setDbTables]     = useState<Record<string, any[]>>({});
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([]);
  const [solutions,    setSolutions]    = useState<BugSolution[]>([]);
  const [remoteSolutions, setRemoteSolutions] = useState<RemoteSolutionsRef | null>(null);
  const [solutionsUnlocked, setSolutionsUnlocked] = useState(false);
  const [solutionsLoading, setSolutionsLoading] = useState(false);
  const [solutionsError, setSolutionsError] = useState<string | null>(null);
  // Full answer map for the current server-gated app, keyed by bugId (so the
  // stored values carry no bugId of their own). Kept only after a successful
  // unlock. Never persisted; lost on reload (a fresh unlock re-fetches).
  const [fetchedAnswers, setFetchedAnswers] = useState<Record<string, Omit<BugSolution, 'bugId'>> | null>(null);

  const unlockSolutions = useCallback(async (password: string): Promise<boolean> => {
    const key = password.trim();

    // Server-gated path: let the backend validate the key and hand back answers.
    if (remoteSolutions) {
      setSolutionsError(null);
      setSolutionsLoading(true);
      try {
        const res = await fetch(SOLUTIONS_ENDPOINT, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ app: remoteSolutions.app, key }),
        });
        if (res.status === 401) return false; // wrong key
        if (!res.ok) {
          setSolutionsError(`Answers service returned ${res.status}. Is it configured?`);
          return false;
        }
        const data = await res.json();
        setFetchedAnswers((data?.answers ?? {}) as Record<string, Omit<BugSolution, 'bugId'>>);
        setSolutionsUnlocked(true);
        return true;
      } catch {
        setSolutionsError('Could not reach the answers service (no /api in this environment).');
        return false;
      } finally {
        setSolutionsLoading(false);
      }
    }

    // Inline path (legacy modules): client-side check against the shared code.
    if (key.toUpperCase() === SOLUTIONS_PASSWORD) {
      setSolutionsUnlocked(true);
      return true;
    }
    return false;
  }, [remoteSolutions]);

  // For server-gated views, resolve the current page's bugIds against the
  // fetched answer map; otherwise fall back to the inline solutions.
  const resolvedSolutions: BugSolution[] = remoteSolutions
    ? (fetchedAnswers
        ? remoteSolutions.bugIds
            .map(id => (fetchedAnswers[id] ? { bugId: id, ...fetchedAnswers[id] } : null))
            .filter((s): s is BugSolution => s !== null)
        : [])
    : solutions;

  return (
    <QAPanelContext.Provider value={{
      requirementsMarkdown, setRequirements,
      dbTables, setDbTables,
      apiEndpoints, setApiEndpoints,
      solutions: resolvedSolutions, setSolutions,
      remoteSolutions, setRemoteSolutions,
      solutionsUnlocked, solutionsLoading, solutionsError, unlockSolutions,
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
