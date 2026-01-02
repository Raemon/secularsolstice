'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Program } from './types';
import ProgramItem from './ProgramItem';

const ProgramsList = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState<'alphabetical' | 'recently-updated'>('recently-updated');

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

  const topLevelPrograms = useMemo(() => programs.filter((p) => !p.isSubprogram && !p.archived), [programs]);

  const filteredPrograms = useMemo(() => {
    let result = topLevelPrograms;
    if (search.trim()) {
      const lowerSearch = search.toLowerCase();
      result = result.filter((p) => p.title.toLowerCase().includes(lowerSearch));
    }
    return result.sort((a, b) => {
      if (sortOption === 'alphabetical') {
        return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [topLevelPrograms, search, sortOption]);

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading programs...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  if (!topLevelPrograms.length) {
    return <div className="p-8 text-gray-400">No programs yet.</div>;
  }

  return (
    <div className="pt-8 px-4">
      <div className="mx-auto max-w-xl">
        <div className="flex gap-2 items-center mb-4">
          <input
            type="text"
            placeholder="Search programs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-2 py-1 w-full max-w-md bg-transparent border-0 border-b border-gray-500 outline-none text-sm max-w-[200px] mr-auto"
          />
          <div className="flex gap-0">
            <button
              onClick={() => setSortOption('alphabetical')}
              className={`text-xs px-2 whitespace-nowrap outline-none border-none ${sortOption === 'alphabetical' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
            >A-Z</button>
            <button
              onClick={() => setSortOption('recently-updated')}
              className={`text-xs px-2 whitespace-nowrap border-l border-gray-500 ${sortOption === 'recently-updated' ? 'underline text-white' : 'text-gray-400 hover:underline'}`}
            >Recent</button>
          </div>
        </div>
        {filteredPrograms.map((program) => (
          <ProgramItem key={program.id} program={program} />
        ))}
        {search && !filteredPrograms.length && (
          <div className="text-gray-400">No programs match "{search}"</div>
        )}
      </div>
    </div>
  );
};

export default ProgramsList;