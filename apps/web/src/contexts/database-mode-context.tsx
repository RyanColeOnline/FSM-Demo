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
  const databaseMode: DatabaseMode = 'live';
  const client = FirestoreDomainClient.getInstance();

  useEffect(() => {
    try {
      localStorage.removeItem('fsm_database_mode');
    } catch {
      // Ignore
    }
  }, []);

  const setDatabaseMode = (_mode: DatabaseMode) => {
    // Single live mode in demo environment
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
    return {
      databaseMode: 'live' as DatabaseMode,
      setDatabaseMode: () => {},
      client: FirestoreDomainClient.getInstance(),
    };
  }
  return context;
}
