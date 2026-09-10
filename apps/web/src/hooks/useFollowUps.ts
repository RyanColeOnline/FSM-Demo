'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalFollowUpFlag } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useFollowUps(assignedTo?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [followUps, setFollowUps] = useState<CanonicalFollowUpFlag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadFollowUps = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchFollowUps(assignedTo, databaseMode);
      setFollowUps(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch follow-ups');
    } finally {
      setLoading(false);
    }
  }, [client, assignedTo, databaseMode]);

  useEffect(() => {
    loadFollowUps();
    const handleModeChange = () => loadFollowUps();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadFollowUps]);

  const saveFollowUp = async (flag: CanonicalFollowUpFlag): Promise<boolean> => {
    const success = await client.saveFollowUp(flag, databaseMode);
    if (success) {
      setFollowUps((prev) => {
        const idx = prev.findIndex((f) => f.id === flag.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = flag;
          return updated;
        }
        return [flag, ...prev];
      });
    }
    return success;
  };

  return {
    followUps,
    loading,
    error,
    refresh: loadFollowUps,
    saveFollowUp,
  };
}
