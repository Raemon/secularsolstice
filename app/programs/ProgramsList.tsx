'use client';

import { useEffect, useState } from 'react';
import type { Program } from './types';
import ProgramItem from './ProgramItem';

const ProgramsList = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrograms = async () => {
      try {
        const response = await fetch('/api/programs');
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to load programs');
        }
        const data = await response.json();
        setPrograms(data.programs || []);
      } catch (err) {
        console.error('Failed to load programs:', err);
        setError(err instanceof Error ? err.message : 'Failed to load programs');
      } finally {
        setIsLoading(false);
      }
    };
    loadPrograms();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading programs...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  const topLevelPrograms = programs.filter((p) => !p.isSubprogram && !p.archived);

  if (!topLevelPrograms.length) {
    return <div className="p-8 text-gray-400">No programs yet.</div>;
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl">
        {topLevelPrograms.map((program) => (
          <ProgramItem key={program.id} program={program} />
        ))}
      </div>
    </div>
  );
};

export default ProgramsList;