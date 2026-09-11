'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CanonicalCustomer, CustomerPaginationParams } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export interface UsePaginatedCustomersOptions {
  pageSize?: number;
  initialSearchField?: string;
  initialSearchQuery?: string;
  initialSyncFilter?: string;
  initialStatusFilter?: string;
}

export function usePaginatedCustomers(options: UsePaginatedCustomersOptions = {}) {
  const { pageSize = 30, initialSearchField = 'Customer Name', initialSearchQuery = '', initialSyncFilter = 'All', initialStatusFilter = 'All' } = options;
  const { databaseMode, client } = useDatabaseMode();

  const [page, setPage] = useState<number>(1);
  const [customers, setCustomers] = useState<CanonicalCustomer[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);

  const [searchField, setSearchField] = useState<string>(initialSearchField);
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);
  const [syncFilter, setSyncFilter] = useState<string>(initialSyncFilter);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter);

  // Stack of cursors for each page: cursorStack[0] = null (page 1), cursorStack[1] = endCursor of page 1, etc.
  const cursorStackRef = useRef<Array<{ name?: string; qbName?: string; id: string } | null>>([null]);

  const loadPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);

    const cursor = cursorStackRef.current[targetPage - 1] || null;

    try {
      const result = await client.fetchCustomersPaginated({
        mode: databaseMode,
        pageSize,
        cursor,
        searchField,
        searchQuery,
        customerStatus: statusFilter,
        syncFilter,
      });

      setCustomers(result.customers);
      setTotalCount(result.totalCount);
      setHasNextPage(result.hasNextPage);
      setHasPrevPage(targetPage > 1);
      setPage(targetPage);

      // Store cursor for next page if available
      if (result.endCursor && cursorStackRef.current.length <= targetPage) {
        cursorStackRef.current[targetPage] = result.endCursor;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode, pageSize, searchField, searchQuery, statusFilter, syncFilter]);

  // When filters or search query change, reset to Page 1
  useEffect(() => {
    cursorStackRef.current = [null];
    setPage(1);

    const timer = setTimeout(() => {
      loadPage(1);
    }, 200); // 200ms debounce for snappy typing

    return () => clearTimeout(timer);
  }, [databaseMode, searchField, searchQuery, syncFilter, statusFilter, loadPage]);

  // Database mode and customer save/update change listener
  useEffect(() => {
    const handleReload = () => {
      cursorStackRef.current = [null];
      setPage(1);
      loadPage(1);
    };
    window.addEventListener('fsm_database_mode_changed', handleReload);
    window.addEventListener('fsm_customer_saved', handleReload);
    window.addEventListener('fsm_customers_updated', handleReload);
    return () => {
      window.removeEventListener('fsm_database_mode_changed', handleReload);
      window.removeEventListener('fsm_customer_saved', handleReload);
      window.removeEventListener('fsm_customers_updated', handleReload);
    };
  }, [loadPage]);

  const nextPage = () => {
    if (hasNextPage && !loading) {
      loadPage(page + 1);
    }
  };

  const prevPage = () => {
    if (page > 1 && !loading) {
      loadPage(page - 1);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    customers,
    page,
    pageSize,
    totalCount,
    totalPages,
    loading,
    error,
    hasNextPage,
    hasPrevPage,
    searchField,
    setSearchField,
    searchQuery,
    setSearchQuery,
    syncFilter,
    setSyncFilter,
    statusFilter,
    setStatusFilter,
    nextPage,
    prevPage,
    refresh: () => loadPage(page),
  };
}
