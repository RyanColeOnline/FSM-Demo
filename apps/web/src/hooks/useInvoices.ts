'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalInvoice } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export interface UsePaginatedInvoicesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  startDate?: string;
  endDate?: string;
}

export function usePaginatedInvoices(options: UsePaginatedInvoicesOptions = {}) {
  const { databaseMode } = useDatabaseMode();
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  const queryKey = [
    'paginated-invoices',
    databaseMode,
    page,
    pageSize,
    options.search || '',
    options.status || 'All',
    options.paymentStatus || 'All',
    options.startDate || '',
    options.endDate || '',
  ];

  return useQuery<{
    invoices: CanonicalInvoice[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }, Error>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        mode: databaseMode,
        page: String(page),
        pageSize: String(pageSize),
        search: options.search || '',
        status: options.status || 'All',
        paymentStatus: options.paymentStatus || 'All',
        startDate: options.startDate || '',
        endDate: options.endDate || '',
      });
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch paginated invoices');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}

export function useInvoices(customerId?: string, jobId?: string, customerName?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const queryKey = [
    'invoices',
    databaseMode,
    customerId || '',
    jobId || '',
    customerName || '',
  ];

  const {
    data: invoices = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalInvoice[], Error>({
    queryKey,
    queryFn: async () => {
      return client.fetchInvoices(customerId, jobId, customerName, databaseMode);
    },
    staleTime: 1000 * 60 * 2,
  });

  const saveInvoiceMutation = useMutation({
    mutationFn: async (invoice: CanonicalInvoice) => {
      return client.saveInvoice(invoice, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', databaseMode] });
      queryClient.invalidateQueries({ queryKey: ['paginated-invoices', databaseMode] });
    },
  });

  return {
    invoices,
    loading,
    error: error ? error.message : null,
    refresh,
    saveInvoice: saveInvoiceMutation.mutateAsync,
    isSaving: saveInvoiceMutation.isPending,
  };
}
