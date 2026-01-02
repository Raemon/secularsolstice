'use client';

import useCombinedChangelogProgressiveLoad from '@/app/hooks/useCombinedChangelogProgressiveLoad';
import SongChangelogItem from './SongChangelogItem';
import ProgramChangelogItem from './ProgramChangelogItem';

const ChangelogPage = () => {
  const { items, loading, loadingMore, error, hasMore, loadMore } = useCombinedChangelogProgressiveLoad();

  if (loading) return <div className="p-4 text-gray-400">Loading changelog...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-mono mb-4 text-gray-200">Changelog</h1>
      <div className="space-y-1 max-w-full">
        {items.map((item) => {
          if (item.type === 'song') {
            return <SongChangelogItem key={`s-${item.data.id}`} version={item.data} showType />;
          } else {
            return <ProgramChangelogItem key={`p-${item.data.id}`} version={item.data} showType />;
          }
        })}
        {loadingMore && <span className="text-xs text-gray-500">loading...</span>}
        {hasMore && !loadingMore && (
          <button onClick={loadMore} className="text-xs text-gray-500 hover:text-gray-300 mt-2">load more...</button>
        )}
      </div>
    </div>
  );
};

export default ChangelogPage;
