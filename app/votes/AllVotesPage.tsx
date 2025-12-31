'use client';

import { useEffect, useState } from 'react';

interface Vote {
  id: string;
  version_id: string;
  weight: number;
  type: string;
  category: string;
  created_at: string;
  version_label: string;
  song_id: string;
  song_title: string;
}

const AllVotesPage = () => {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      try {
        const response = await fetch('/api/votes');
        if (!response.ok) throw new Error('Failed to fetch votes');
        const data = await response.json();
        setVotes(data);
      } catch (err) {
        console.error('Error fetching votes:', err);
        setError('Failed to load votes');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  };

  const getVoteLabel = (vote: Vote) => {
    return `${vote.type} (${vote.weight > 0 ? '+' : ''}${vote.weight})`;
  };

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading votes...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (votes.length === 0) {
    return <div className="p-8 text-gray-400">No votes yet</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">All Votes</h1>
      <div className="space-y-4">
        {votes.map((vote) => (
          <div key={vote.id} className="border border-gray-700 p-4 bg-gray-900">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <a href={`/songs/${vote.song_id}/${vote.version_id}`} className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
                  {vote.song_title}
                </a>
                <span className="text-gray-500 text-sm ml-2">({vote.version_label})</span>
              </div>
              <div className="text-xs text-gray-500">{formatDate(vote.created_at)}</div>
            </div>
            <div className="text-sm text-gray-300 mb-2">{getVoteLabel(vote)}</div>
            <div className="text-xs text-gray-500">{vote.category}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllVotesPage;
