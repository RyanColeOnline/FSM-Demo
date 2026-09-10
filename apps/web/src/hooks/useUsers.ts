'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalUser } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useUsers() {
  const { databaseMode, client } = useDatabaseMode();
  const [users, setUsers] = useState<CanonicalUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchUsers(databaseMode);
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [client, databaseMode]);

  useEffect(() => {
    loadUsers();
    const handleModeChange = () => loadUsers();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadUsers]);

  const saveUser = async (user: CanonicalUser): Promise<boolean> => {
    const success = await client.saveUser(user, databaseMode);
    if (success) {
      setUsers((prev) => {
        const idx = prev.findIndex((u) => u.id === user.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = user;
          return updated;
        }
        return [user, ...prev];
      });
    }
    return success;
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    const success = await client.deleteUser(userId, databaseMode);
    if (success) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    return success;
  };

  const getUserById = (id: string): CanonicalUser | undefined => {
    return users.find((u) => u.id === id);
  };

  return {
    users,
    loading,
    error,
    refresh: loadUsers,
    saveUser,
    deleteUser,
    getUserById,
  };
}
