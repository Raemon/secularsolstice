'use client';
import ProgramItem from './programs/ProgramItem';
import type { Program } from './programs/types';
import Link from 'next/link';
import useProgramsProgressiveLoad from './hooks/useProgramsProgressiveLoad';

type RecentProgramsProps = {
  initialPrograms?: Program[];
};

const RecentPrograms = ({ initialPrograms }: RecentProgramsProps = {}) => {
  const { programs: clientPrograms, loading: clientLoading } = useProgramsProgressiveLoad();
  const programs = initialPrograms || clientPrograms;
  const loading = initialPrograms ? false : clientLoading;
  // Filter to top-level non-archived programs and take first 4
  const recentPrograms = programs
    .filter((p) => !p.isSubprogram && !p.archived)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  if (loading) return <div className="text-gray-400 text-sm">Loading...</div>;
  if (!recentPrograms.length) return <div className="text-gray-400 text-sm">No recent programs</div>;

  return (
    <div>
      {recentPrograms.map(program => (
        <ProgramItem key={program.id} program={program} />
      ))}
      <Link href="/programs" className="text-gray-500 p-2 text-sm text-right w-full block">View all</Link>
    </div>
  );
};

export default RecentPrograms;