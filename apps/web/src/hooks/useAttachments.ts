'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalAttachment } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useAttachments(customerId?: string, jobId?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [attachments, setAttachments] = useState<CanonicalAttachment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await client.fetchAttachments(customerId, jobId, databaseMode);
      setAttachments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attachments');
    } finally {
      setLoading(false);
    }
  }, [client, customerId, jobId, databaseMode]);

  useEffect(() => {
    loadAttachments();
    const handleModeChange = () => loadAttachments();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadAttachments]);

  const saveAttachment = async (attachment: CanonicalAttachment): Promise<boolean> => {
    const success = await client.saveAttachment(attachment, databaseMode);
    if (success) {
      setAttachments((prev) => {
        const idx = prev.findIndex((a) => a.id === attachment.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = attachment;
          return updated;
        }
        return [attachment, ...prev];
      });
    }
    return success;
  };

  const deleteAttachment = async (attachmentId: string): Promise<boolean> => {
    const success = await client.deleteAttachment(attachmentId, databaseMode);
    if (success) {
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    }
    return success;
  };

  return {
    attachments,
    loading,
    error,
    refresh: loadAttachments,
    saveAttachment,
    deleteAttachment,
  };
}
