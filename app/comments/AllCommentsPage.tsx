'use client';

import { useEffect, useState } from 'react';

interface Comment {
  id: string;
  version_id: string;
  content: string;
  user_id: string | null;
  created_at: string;
  version_label: string;
  song_id: string;
  song_title: string;
}

const AllCommentsPage = () => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch('/api/comments');
        if (!response.ok) throw new Error('Failed to fetch comments');
        const data = await response.json();
        setComments(data);
      } catch (err) {
        console.error('Error fetching comments:', err);
        setError('Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
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

  if (isLoading) {
    return <div className="p-8 text-gray-400">Loading comments...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">{error}</div>;
  }

  if (comments.length === 0) {
    return <div className="p-8 text-gray-400">No comments yet</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">All Comments</h1>
      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="border border-gray-700 p-4 bg-gray-900">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <a href={`/songs/${comment.version_id}`} className="text-blue-400 hover:text-blue-300 hover:underline font-medium">
                  {comment.song_title}
                </a>
                <span className="text-gray-500 text-sm ml-2">({comment.version_label})</span>
              </div>
              <div className="text-xs text-gray-500">{formatDate(comment.created_at)}</div>
            </div>
            <div className="text-sm text-gray-300 mb-2">{comment.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AllCommentsPage;
