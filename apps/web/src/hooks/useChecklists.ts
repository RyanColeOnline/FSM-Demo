'use client';

import { useState, useEffect, useCallback } from 'react';
import { CanonicalChecklistTemplate, CanonicalChecklistInstance } from '@murphys/domain';
import { useDatabaseMode } from '@/contexts/database-mode-context';

export function useChecklists(jobId?: string) {
  const { databaseMode, client } = useDatabaseMode();
  const [templates, setTemplates] = useState<CanonicalChecklistTemplate[]>([]);
  const [instances, setInstances] = useState<CanonicalChecklistInstance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadChecklists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tList, iList] = await Promise.all([
        client.fetchChecklistTemplates(databaseMode),
        client.fetchChecklistInstances(jobId, databaseMode),
      ]);
      setTemplates(tList);
      setInstances(iList);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch checklists');
    } finally {
      setLoading(false);
    }
  }, [client, jobId, databaseMode]);

  useEffect(() => {
    loadChecklists();
    const handleModeChange = () => loadChecklists();
    window.addEventListener('fsm_database_mode_changed', handleModeChange);
    return () => window.removeEventListener('fsm_database_mode_changed', handleModeChange);
  }, [loadChecklists]);

  const saveChecklistTemplate = async (template: any): Promise<boolean> => {
    const success = await client.saveChecklistTemplate(template, databaseMode);
    if (success) {
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === template.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = template;
          return updated;
        }
        return [template, ...prev];
      });
    }
    return success;
  };

  const deleteChecklistTemplate = async (templateId: string): Promise<boolean> => {
    const success = await client.deleteChecklistTemplate(templateId, databaseMode);
    if (success) {
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    }
    return success;
  };

  const saveChecklistInstance = async (instance: CanonicalChecklistInstance): Promise<boolean> => {
    const success = await client.saveChecklistInstance(instance, databaseMode);
    if (success) {
      setInstances((prev) => {
        const idx = prev.findIndex((i) => i.id === instance.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = instance;
          return updated;
        }
        return [instance, ...prev];
      });
    }
    return success;
  };

  const deleteChecklistInstance = async (instanceId: string): Promise<boolean> => {
    const success = await client.deleteChecklistInstance(instanceId, databaseMode);
    if (success) {
      setInstances((prev) => prev.filter((i) => i.id !== instanceId));
    }
    return success;
  };

  return {
    templates,
    instances,
    loading,
    error,
    refresh: loadChecklists,
    saveTemplate: saveChecklistTemplate,
    deleteTemplate: deleteChecklistTemplate,
    saveChecklistInstance,
    deleteChecklistInstance,
  };
}
