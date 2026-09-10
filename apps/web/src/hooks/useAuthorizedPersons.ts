'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalAuthorizedPerson } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useAuthorizedPersons(customerId?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [contacts, setContacts] = useState<CanonicalAuthorizedPerson[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadContacts = useCallback(async () => {
    if (!customerId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchAuthorizedPersons(customerId, databaseMode);
      setContacts(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch authorized persons');
    } finally {
      setLoading(false);
    }
  }, [client, customerId, databaseMode]);

  useEffect(() => {
    loadContacts();
    const handleModeChange = () => loadContacts();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadContacts]);

  return {
    contacts,
    loading,
    error,
    refresh: loadContacts,
  };
}
