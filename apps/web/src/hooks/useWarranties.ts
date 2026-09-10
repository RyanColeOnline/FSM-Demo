'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalWarranty } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useWarranties() {
  const { databaseMode, client } = useDatabaseMode();
  const [warranties, setWarranties] = useState<CanonicalWarranty[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWarranties = useCallback(async () => {
    setLoading(true);
    try {
      const list = await client.fetchWarranties(databaseMode);
      setWarranties(list);
    } catch (err) {
      console.error('Failed to load warranties:', err);
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadWarranties();
  }, [loadWarranties]);

  const saveWarranty = useCallback(
    async (item: CanonicalWarranty) => {
      setWarranties((prev) => {
        const idx = prev.findIndex((w) => w.id === item.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = item;
          return next;
        }
        return [item, ...prev];
      });

      return client.saveWarranty(item, databaseMode);
    },
    [client, databaseMode]
  );

  const deleteWarranty = useCallback(
    async (id: string) => {
      setWarranties((prev) => prev.filter((w) => w.id !== id));
      return client.deleteWarranty(id, databaseMode);
    },
    [client, databaseMode]
  );

  return {
    warranties,
    loading,
    saveWarranty,
    deleteWarranty,
    reload: loadWarranties,
  };
}
