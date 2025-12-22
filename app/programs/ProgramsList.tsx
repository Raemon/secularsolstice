'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Program } from './types';

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
      <ul className="space-y-4 mx-auto max-w-4xl">
        {topLevelPrograms.map((program) => {
          const firstVersionId = program.elementIds[0];
          const href = firstVersionId
            ? `/programs/${program.id}/${firstVersionId}`
            : `/programs/${program.id}`;
          return (
            <li key={program.id}>
              <Link href={href} className="text-2xl text-white font-georgia hover:underline">
                {program.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ProgramsList;
