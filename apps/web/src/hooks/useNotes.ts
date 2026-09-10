'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalNote } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useNotes(customerId?: string, jobId?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [notes, setNotes] = useState<CanonicalNote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchNotes(customerId, jobId, databaseMode);
      setNotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
  }, [client, customerId, jobId, databaseMode]);

  useEffect(() => {
    loadNotes();
    const handleModeChange = () => loadNotes();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadNotes]);

  const saveNote = async (note: CanonicalNote): Promise<boolean> => {
    const success = await client.saveNote(note, databaseMode);
    if (success) {
      setNotes((prev) => {
        const idx = prev.findIndex((n) => n.id === note.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = note;
          return updated;
        }
        return [note, ...prev];
      });
    }
    return success;
  };

  const deleteNote = async (noteId: string): Promise<boolean> => {
    const success = await client.deleteNote(noteId, databaseMode);
    if (success) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
    return success;
  };

  return {
    notes,
    loading,
    error,
    refresh: loadNotes,
    saveNote,
    deleteNote,
  };
}
