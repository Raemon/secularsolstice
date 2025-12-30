'use client';

import { useState, useEffect } from 'react';

interface Program {
  id: string;
  title: string;
  createdAt: string;
}

const PastVersionUsage = ({ versionId }: { versionId: string }) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!versionId || versionId === 'new') {
      setIsLoading(false);
      return;
    }
    const fetchPrograms = async () => {
      try {
        const response = await fetch(`/api/programs/by-version/${versionId}`);
        if (!response.ok) throw new Error('Failed to fetch programs');
        const data = await response.json();
        setPrograms(data.programs || []);
      } catch (err) {
        console.error('Error fetching programs for version:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPrograms();
  }, [versionId]);

  if (isLoading || programs.length === 0) {
    return null;
  }

  return (
    <div className="text-xs text-gray-400">
      Used in:{' '}
      {programs.map((program, index) => (
        <span key={program.id}>
          <a href={`/programs/${program.id}`} className="text-blue-400 hover:text-blue-600 underline">
            {program.title}
          </a>
          {index < programs.length - 1 && ', '}
        </span>
      ))}
    </div>
  );
};

export default PastVersionUsage;
