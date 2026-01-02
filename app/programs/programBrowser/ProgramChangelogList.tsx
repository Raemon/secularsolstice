'use client';

import { useEffect } from 'react';
import useProgramChangelogProgressiveLoad from '../../hooks/useProgramChangelogProgressiveLoad';
import ProgramChangelogItem from '../../changelog/ProgramChangelogItem';

type ProgramChangelogListProps = {
  programId: string;
};

const ProgramChangelogList = ({ programId }: ProgramChangelogListProps) => {
  const { versions, loading: changelogLoading, loadingMore, error: changelogError, hasMore, loadMore, refetch: refetchChangelog } = useProgramChangelogProgressiveLoad({ programId });

  useEffect(() => {
    const interval = setInterval(() => {
      void refetchChangelog();
    }, 5000);
    return () => clearInterval(interval);
  }, [refetchChangelog]);

  return (
    <div className="mt-8 pt-8 border-t border-gray-700">
      <h3 className="text-lg font-mono mb-4 text-gray-200">Changelog</h3>
      {changelogLoading ? (
        <div className="text-gray-400 text-sm">Loading changelog...</div>
      ) : changelogError ? (
        <div className="text-red-500 text-sm">Error: {changelogError}</div>
      ) : versions.length === 0 ? (
        <div className="text-gray-400 text-sm">No changelog entries</div>
      ) : (
        <div className="space-y-1">
          {versions.map((version) => <ProgramChangelogItem key={version.id} version={version} compact={true} />)}
          {loadingMore && <span className="text-xs text-gray-500">loading...</span>}
          {hasMore && !loadingMore && (
            <button onClick={loadMore} className="text-xs text-gray-500 hover:text-gray-300 mt-2">load more...</button>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramChangelogList;

