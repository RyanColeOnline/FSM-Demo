'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalCustomer } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useCustomers() {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const {
    data: customers = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalCustomer[], Error>({
    queryKey: ['customers', databaseMode],
    queryFn: async () => {
      return client.fetchCustomers(databaseMode);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const saveCustomerMutation = useMutation({
    mutationFn: async (customer: CanonicalCustomer) => {
      return client.saveCustomer(customer, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', databaseMode] });
    },
  });

  const getCustomerById = (id: string): CanonicalCustomer | undefined => {
    return customers.find((c) => c.id === id);
  };

  return {
    customers,
    loading,
    error: error ? error.message : null,
    refresh,
    saveCustomer: saveCustomerMutation.mutateAsync,
    isSaving: saveCustomerMutation.isPending,
    getCustomerById,
  };
}
