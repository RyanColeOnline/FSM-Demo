'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CanonicalJob } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export interface UseJobsOptions {
  customerId?: string;
  customerNumber?: string;
  customerName?: string;
}

export function useJobs(
  arg1?: string | UseJobsOptions,
  argCustNum?: string,
  argCustName?: string
) {
  const options: UseJobsOptions =
    typeof arg1 === 'string'
      ? { customerId: arg1, customerNumber: argCustNum, customerName: argCustName }
      : arg1 || {};

  const { databaseMode, client } = useDatabaseMode();
  const queryClient = useQueryClient();

  const queryKey = [
    'jobs',
    databaseMode,
    options.customerId || '',
    options.customerNumber || '',
    options.customerName || '',
  ];

  const {
    data: jobs = [],
    isLoading: loading,
    error,
    refetch: refresh,
  } = useQuery<CanonicalJob[], Error>({
    queryKey,
    queryFn: async () => {
      if (options.customerNumber) {
        return client.fetchJobs(undefined, options.customerNumber, options.customerName, databaseMode);
      }
      if (options.customerId) {
        return client.fetchJobs(options.customerId, undefined, options.customerName, databaseMode);
      }
      if (options.customerName) {
        return client.fetchJobs(undefined, undefined, options.customerName, databaseMode);
      }
      return client.fetchJobs(databaseMode);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    gcTime: 1000 * 60 * 10,
  });

  const saveJobMutation = useMutation({
    mutationFn: async (job: CanonicalJob) => {
      return client.saveJob(job, databaseMode);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated-jobs'] });
    },
  });

  const getJobById = (id: string): CanonicalJob | undefined => {
    return jobs.find((j) => j.id === id || j.jobNumber === id);
  };

  return {
    jobs,
    loading,
    error: error ? error.message : null,
    refresh,
    saveJob: saveJobMutation.mutateAsync,
    isSaving: saveJobMutation.isPending,
    getJobById,
  };
}

export interface UsePaginatedJobsOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  jobType?: string;
  startDate?: string;
  endDate?: string;
  flagged?: boolean;
  followUpType?: string;
  assignee?: string;
}

export function usePaginatedJobs(options: UsePaginatedJobsOptions = {}) {
  const { databaseMode } = useDatabaseMode();
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;

  const queryKey = [
    'paginated-jobs',
    databaseMode,
    page,
    pageSize,
    options.search || '',
    options.status || 'All',
    options.jobType || 'All',
    options.startDate || '',
    options.endDate || '',
    options.flagged ? 'true' : 'false',
    options.followUpType || '',
    options.assignee || '',
  ];

  return useQuery<{
    jobs: CanonicalJob[];
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
        jobType: options.jobType || 'All',
        startDate: options.startDate || '',
        endDate: options.endDate || '',
        flagged: options.flagged ? 'true' : 'false',
        followUpType: options.followUpType || '',
        assignee: options.assignee || 'All',
      });
      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch paginated jobs');
      }
      return res.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    gcTime: 1000 * 60 * 10,
  });
}
