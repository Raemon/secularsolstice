'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Program } from '../programs/types';
import ProgramItem from '../programs/ProgramItem';

export const FeedbackProgramList = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/programs');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load programs');
      }
      const data = await response.json();
      setPrograms((data.programs || []).filter((p: Program) => !p.isSubprogram && !p.archived));
      setError(null);
    } catch (err) {
      console.error('Failed to load programs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load programs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading programs...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  if (!programs.length) {
    return <div className="p-8 text-gray-400">No programs yet.</div>;
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        {programs.map((program) => (
          <ProgramItem key={program.id} program={program} linkPrefix="/feedback" />
        ))}
      </div>
    </div>
  );
};