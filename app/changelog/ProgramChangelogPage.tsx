'use client';

import useProgramChangelogProgressiveLoad from '@/app/hooks/useProgramChangelogProgressiveLoad';
import ProgramChangelogItem from './ProgramChangelogItem';

const ProgramChangelogPage = ({programId, compact = false}: {programId?: string; compact?: boolean} = {}) => {
  const { versions, loading, loadingMore, error, hasMore, loadMore } = useProgramChangelogProgressiveLoad({ programId });

  if (loading) return <div className={compact ? "text-gray-400 text-xs" : "p-4 text-gray-400"}>Loading program changelog...</div>;
  if (error) return <div className={compact ? "text-red-500 text-xs" : "p-4 text-red-500"}>Error: {error}</div>;
  if (compact && versions.length === 0) return null;

  return (
    <div className={compact ? "max-w-full" : "p-4 max-w-5xl mx-auto"}>
      {!compact && <h1 className="text-xl font-mono mb-4 text-gray-200">Program Changelog</h1>}
      <div className="space-y-1 max-w-full">
        {versions.map((version) => <ProgramChangelogItem key={version.id} version={version} compact={compact} />)}
        {loadingMore && <span className="text-xs text-gray-500">loading...</span>}
        {!compact && hasMore && !loadingMore && (
          <button onClick={loadMore} className="text-xs text-gray-500 hover:text-gray-300 mt-2">load more...</button>
        )}
      </div>
    </div>
  );
};

export default ProgramChangelogPage;
