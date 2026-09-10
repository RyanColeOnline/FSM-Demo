'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalEquipment } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useEquipment(
  customerId?: string,
  locationId?: string,
  customerName?: string,
  customerNumber?: string,
  legacyId?: string
) {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const queryKey = [
    'equipment',
    databaseMode,
    customerId || '',
    locationId || '',
    customerName || '',
    customerNumber || '',
    legacyId || '',
  ];

  const {
    data: equipment = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalEquipment[], Error>({
    queryKey,
    queryFn: async () => {
      return client.fetchEquipment(customerId, locationId, customerName, customerNumber, legacyId, databaseMode);
    },
    staleTime: 1000 * 60 * 2,
  });

  const saveEquipmentMutation = useMutation({
    mutationFn: async (item: CanonicalEquipment) => {
      return client.saveEquipment(item, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', databaseMode] });
    },
  });

  const deleteEquipmentMutation = useMutation({
    mutationFn: async (equipmentId: string) => {
      return client.deleteEquipment(equipmentId, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment', databaseMode] });
    },
  });

  return {
    equipment,
    loading,
    error: error ? error.message : null,
    refresh,
    saveEquipment: saveEquipmentMutation.mutateAsync,
    deleteEquipment: deleteEquipmentMutation.mutateAsync,
    isSaving: saveEquipmentMutation.isPending,
  };
}
