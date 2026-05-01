 
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

type BugLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

 
export interface BugDefinition {
  id: string;
  level: BugLevel;
  title: string;
  description: string;
}

interface BugTrackerState {
  foundBugs: string[];
  reportBug: (id: string) => void;
  isBugFound: (id: string) => boolean;
}

const BugTrackerContext = createContext<BugTrackerState | undefined>(undefined);

export const BugTrackerProvider = ({ children }: { children: ReactNode }) => {
  const [foundBugs, setFoundBugs] = useState<string[]>([]);

  const reportBug = (id: string) => {
    setFoundBugs((prev) => {
      if (prev.includes(id)) return prev;
      console.log(`🎉 Bug Found: ${id}`);
      return [...prev, id];
    });
  };

  const isBugFound = (id: string) => foundBugs.includes(id);

  return (
    <BugTrackerContext.Provider value={{ foundBugs, reportBug, isBugFound }}>
      {children}
    </BugTrackerContext.Provider>
  );
};

export const useBugTracker = () => {
  const context = useContext(BugTrackerContext);
  if (!context) throw new Error('useBugTracker must be used within BugTrackerProvider');
  return context;
};
