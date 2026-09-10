'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalDispatchGroup } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useDispatchGroups() {
  const { databaseMode, client } = useDatabaseMode();
  const [dispatchGroups, setDispatchGroups] = useState<CanonicalDispatchGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDispatchGroups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchDispatchGroups(databaseMode);
      setDispatchGroups(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dispatch groups');
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadDispatchGroups();
    const handleModeChange = () => loadDispatchGroups();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadDispatchGroups]);

  const saveDispatchGroup = async (group: CanonicalDispatchGroup): Promise<boolean> => {
    const success = await client.saveDispatchGroup(group, databaseMode);
    if (success) {
      setDispatchGroups((prev) => {
        const idx = prev.findIndex((g) => g.id === group.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = group;
          return updated;
        }
        return [...prev, group];
      });
    }
    return success;
  };

  const deleteDispatchGroup = async (groupId: string): Promise<boolean> => {
    const success = await client.deleteDispatchGroup(groupId, databaseMode);
    if (success) {
      setDispatchGroups((prev) => prev.filter((g) => g.id !== groupId));
    }
    return success;
  };

  const getDispatchGroupById = (id: string): CanonicalDispatchGroup | undefined => {
    return dispatchGroups.find((g) => g.id === id);
  };

  return {
    dispatchGroups,
    loading,
    error,
    refresh: loadDispatchGroups,
    saveDispatchGroup,
    deleteDispatchGroup,
    getDispatchGroupById,
  };
}
