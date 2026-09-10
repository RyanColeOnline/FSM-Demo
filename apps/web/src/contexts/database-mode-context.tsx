'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { DatabaseMode, FirestoreDomainClient } from '@murphys/domain';

interface DatabaseModeContextValue {
  databaseMode: DatabaseMode;
  setDatabaseMode: (mode: DatabaseMode) => void;
  client: FirestoreDomainClient;
}

const DatabaseModeContext = createContext<DatabaseModeContextValue | undefined>(undefined);

export function DatabaseModeProvider({ children }: { children: React.ReactNode }) {
  const [databaseMode, setDatabaseModeState] = useState<DatabaseMode>('live');
  const client = FirestoreDomainClient.getInstance();

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('fsm_database_mode') as DatabaseMode;
      if (savedMode === 'sandbox' || savedMode === 'live') {
        setDatabaseModeState(savedMode);
      } else {
        setDatabaseModeState('live');
      }
    } catch {
      // Fallback to live
      setDatabaseModeState('live');
    }
  }, []);

  const setDatabaseMode = (mode: DatabaseMode) => {
    setDatabaseModeState(mode);
    try {
      localStorage.setItem('fsm_database_mode', mode);
      // Dispatch custom storage event for multi-tab sync
      window.dispatchEvent(new Event('fsm_database_mode_changed'));
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <DatabaseModeContext.Provider value={{ databaseMode, setDatabaseMode, client }}>
      {children}
    </DatabaseModeContext.Provider>
  );
}

export function useDatabaseMode() {
  const context = useContext(DatabaseModeContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      databaseMode: 'sandbox' as DatabaseMode,
      setDatabaseMode: () => {},
      client: FirestoreDomainClient.getInstance(),
    };
  }
  return context;
}
