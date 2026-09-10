'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalCall } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useCalls() {
  const { databaseMode, client } = useDatabaseMode();
  const [calls, setCalls] = useState<CanonicalCall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCalls = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchCalls(databaseMode);
      setCalls(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadCalls();
    const handleModeChange = () => loadCalls();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadCalls]);

  const saveCall = async (call: CanonicalCall): Promise<boolean> => {
    const success = await client.saveCall(call, databaseMode);
    if (success) {
      setCalls((prev) => {
        const idx = prev.findIndex((c) => c.id === call.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = call;
          return updated;
        }
        return [call, ...prev];
      });
    }
    return success;
  };

  const deleteCall = async (callId: string): Promise<boolean> => {
    const success = await client.deleteCall(callId, databaseMode);
    if (success) {
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    }
    return success;
  };

  return {
    calls,
    loading,
    error,
    refresh: loadCalls,
    saveCall,
    deleteCall,
  };
}