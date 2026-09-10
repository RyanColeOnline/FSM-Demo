'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalProposal } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useProposals(customerId?: string, jobId?: string, customerName?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const queryKey = [
    'proposals',
    databaseMode,
    customerId || '',
    jobId || '',
    customerName || '',
  ];

  const {
    data: proposals = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalProposal[], Error>({
    queryKey,
    queryFn: async () => {
      return client.fetchProposals(customerId, jobId, customerName, databaseMode);
    },
    staleTime: 1000 * 60 * 2,
  });

  const saveProposalMutation = useMutation({
    mutationFn: async (proposal: CanonicalProposal) => {
      return client.saveProposal(proposal, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals', databaseMode] });
    },
  });

  return {
    proposals,
    loading,
    error: error ? error.message : null,
    refresh,
    saveProposal: saveProposalMutation.mutateAsync,
    isSaving: saveProposalMutation.isPending,
  };
}
