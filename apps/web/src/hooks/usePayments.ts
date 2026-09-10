'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalPaymentRecord } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function usePayments(customerId?: string, customerNumber?: string, customerName?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [payments, setPayments] = useState<CanonicalPaymentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchPayments(customerId, customerNumber, customerName, databaseMode);
      setPayments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [client, customerId, customerNumber, customerName, databaseMode]);

  useEffect(() => {
    loadPayments();
    const handleModeChange = () => loadPayments();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadPayments]);

  return {
    payments,
    loading,
    error,
    refresh: loadPayments,
  };
}
