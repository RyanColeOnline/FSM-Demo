'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalMaintenancePlan } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useMaintenancePlans(customerId?: string, customerName?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const queryKey = [
    'maintenance_plans',
    databaseMode,
    customerId || '',
    customerName || '',
  ];

  const {
    data: plans = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalMaintenancePlan[], Error>({
    queryKey,
    queryFn: async () => {
      return client.fetchMaintenancePlans(customerId, customerName, databaseMode);
    },
    staleTime: 1000 * 60 * 2,
  });

  const savePlanMutation = useMutation({
    mutationFn: async (plan: CanonicalMaintenancePlan) => {
      return client.saveMaintenancePlan(plan, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans', databaseMode] });
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return (client as any).deleteMaintenancePlan(planId, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance_plans', databaseMode] });
    },
  });

  return {
    plans,
    loading,
    error: error ? error.message : null,
    refresh,
    savePlan: savePlanMutation.mutateAsync,
    deletePlan: deletePlanMutation.mutateAsync,
    isSaving: savePlanMutation.isPending,
    isDeleting: deletePlanMutation.isPending,
  };
}

