'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalAppointment } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useAppointments(customerId?: string, jobNumber?: string, customerName?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const {
    data: appointments = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalAppointment[], Error>({
    queryKey: ['appointments', databaseMode, customerId || '', jobNumber || '', customerName || ''],
    queryFn: async () => {
      return client.fetchAppointments(customerId, jobNumber, customerName, databaseMode);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    gcTime: 1000 * 60 * 10,
  });

  const saveAppointmentMutation = useMutation({
    mutationFn: async (appointment: CanonicalAppointment) => {
      return client.saveAppointment(appointment, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const deleteAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return client.deleteAppointment(appointmentId, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  return {
    appointments,
    loading,
    error: error ? error.message : null,
    refresh,
    saveAppointment: saveAppointmentMutation.mutateAsync,
    isSaving: saveAppointmentMutation.isPending,
    deleteAppointment: deleteAppointmentMutation.mutateAsync,
    isDeleting: deleteAppointmentMutation.isPending,
  };
}
