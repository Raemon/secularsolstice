'use client';
import { useEffect, useState } from 'react';
import ProgramItem from './programs/ProgramItem';
import type { Program } from './programs/types';

const RecentPrograms = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/programs/recent?limit=6')
      .then(res => res.json())
      .then(data => { setPrograms(data.programs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!programs.length) return <div className="text-gray-400 text-sm">No recent programs</div>;

  return (
    <div>
      {programs.map(program => (
        <ProgramItem key={program.id} program={program as Program} />
      ))}
    </div>
  );
};

export default RecentPrograms;