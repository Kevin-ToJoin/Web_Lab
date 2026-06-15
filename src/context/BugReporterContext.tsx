/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { knownBugs } from '../data/knownBugs';

export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface BugReport {
  id: string;
  appId: string;
  title: string;
  severity: Severity;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  createdAt: string;
  matchedKnownBugId?: string;
}

interface BugReporterState {
  reports: BugReport[];
  isModalOpen: boolean;
  isReportsPanelOpen: boolean;
  currentAppId: string;
  openModal: (appId: string) => void;
  closeModal: () => void;
  toggleReportsPanel: () => void;
  submitReport: (data: Omit<BugReport, 'id' | 'createdAt' | 'matchedKnownBugId'>) => BugReport;
  getScoreForApp: (appId: string) => { found: number; total: number };
  clearReports: () => void;
}

const BugReporterContext = createContext<BugReporterState | undefined>(undefined);

const STORAGE_KEY = 'testlab101_reports';

const matchKnownBug = (appId: string, title: string): string | undefined => {
  const lower = title.toLowerCase();
  const appBugs = knownBugs.filter(b => b.appId === appId);
  // Pick the bug with the BEST keyword overlap (>= 2 hits), not merely the first
  // one to reach the threshold. This disambiguates bugs with overlapping keywords.
  let best: { id: string; hits: number } | undefined;
  for (const bug of appBugs) {
    const hits = bug.keywords.filter(kw => lower.includes(kw.toLowerCase())).length;
    if (hits >= 2 && (!best || hits > best.hits)) {
      best = { id: bug.id, hits };
    }
  }
  return best?.id;
};

export const BugReporterProvider = ({ children }: { children: ReactNode }) => {
  const [reports, setReports] = useState<BugReport[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    } catch {
      return [];
    }
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReportsPanelOpen, setIsReportsPanelOpen] = useState(false);
  const [currentAppId, setCurrentAppId] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const openModal = (appId: string) => {
    setCurrentAppId(appId);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);
  const toggleReportsPanel = () => setIsReportsPanelOpen(p => !p);

  const submitReport = (data: Omit<BugReport, 'id' | 'createdAt' | 'matchedKnownBugId'>): BugReport => {
    const report: BugReport = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      matchedKnownBugId: matchKnownBug(data.appId, data.title),
    };
    setReports(prev => [report, ...prev]);
    return report;
  };

  const getScoreForApp = (appId: string) => {
    const total = knownBugs.filter(b => b.appId === appId).length;
    const foundIds = new Set(
      reports.filter(r => r.appId === appId && r.matchedKnownBugId).map(r => r.matchedKnownBugId)
    );
    return { found: foundIds.size, total };
  };

  const clearReports = () => setReports([]);

  return (
    <BugReporterContext.Provider value={{
      reports, isModalOpen, isReportsPanelOpen, currentAppId,
      openModal, closeModal, toggleReportsPanel,
      submitReport, getScoreForApp, clearReports,
    }}>
      {children}
    </BugReporterContext.Provider>
  );
};

export const useBugReporter = () => {
  const ctx = useContext(BugReporterContext);
  if (!ctx) throw new Error('useBugReporter must be used within BugReporterProvider');
  return ctx;
};
