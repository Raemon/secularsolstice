import { useCallback } from 'react';
import type { Program } from './types';

const useProgram = (program: Program | null, refreshProgram: (updatedProgram: Program) => void, setError?: (error: string | null) => void, userId?: string | null) => {
  const handleReorder = useCallback(async (reorderedElementIds: string[]) => {
    if (!program) {
      return;
    }

    const previousElementIds = program.elementIds;
    refreshProgram({ ...program, elementIds: reorderedElementIds });

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: reorderedElementIds, programIds: program.programIds, userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      if (setError) setError(null);
    } catch (err) {
      refreshProgram({ ...program, elementIds: previousElementIds });
      if (setError) setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  }, [program, refreshProgram, setError, userId]);

  const handleAdd = useCallback(async (versionId: string, onSuccess?: () => void) => {
    if (!program) {
      return;
    }
    if (program.elementIds.includes(versionId)) {
      if (onSuccess) onSuccess();
      return;
    }

    const nextElementIds = [...program.elementIds, versionId];

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds, userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      if (setError) setError(null);
      if (onSuccess) onSuccess();
    } catch (err) {
      if (setError) setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  }, [program, refreshProgram, setError, userId]);

  const handleDelete = useCallback(async (versionId: string) => {
    if (!program) {
      return;
    }

    const nextElementIds = program.elementIds.filter((id) => id !== versionId);

    try {
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds, userId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      if (setError) setError(null);
    } catch (err) {
      if (setError) setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  }, [program, refreshProgram, setError, userId]);

  return { handleReorder, handleAdd, handleDelete };
};

export default useProgram;
