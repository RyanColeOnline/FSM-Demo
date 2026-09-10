'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalPriceBookItem } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function usePriceBook() {
  const { databaseMode, client } = useDatabaseMode();
  const [items, setItems] = useState<CanonicalPriceBookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPriceBook = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchPriceBook(databaseMode);
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch price book');
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadPriceBook();
    const handleModeChange = () => loadPriceBook();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadPriceBook]);

  const savePriceBookItem = async (item: CanonicalPriceBookItem): Promise<boolean> => {
    const success = await client.savePriceBookItem(item, databaseMode);
    if (success) {
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === item.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = item;
          return updated;
        }
        return [item, ...prev];
      });
    }
    return success;
  };

  return {
    items,
    loading,
    error,
    refresh: loadPriceBook,
    savePriceBookItem,
  };
}
