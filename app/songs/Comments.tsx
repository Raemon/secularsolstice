'use client';

import { useState, useEffect } from 'react';
import CommentBox from './CommentBox';

interface Comment {
  id: string;
  version_id: string;
  content: string;
  created_by: string;
  created_at: string;
  version_label?: string;
}

const Comments = ({ songId, currentVersionId }: { songId: string; currentVersionId: string }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComments();
  }, [songId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/comments?songId=${songId}`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    }
  };

  const handleCommentPosted = (newCommentData: Comment) => {
    setComments([newCommentData, ...comments]);
  };

  // Separate comments by whether they're on the current version or not
  const currentVersionComments = comments.filter(c => c.version_id === currentVersionId);
  const otherVersionComments = comments.filter(c => c.version_id !== currentVersionId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <h3 className="text-xs text-gray-400 mb-3">Comments</h3>
      
      <CommentBox currentVersionId={currentVersionId} onCommentPosted={handleCommentPosted} />

      {/* Comments list */}
      <div className="space-y-3">
        {currentVersionComments.length === 0 && otherVersionComments.length === 0 ? (
          <p className="text-gray-400 text-sm italic">No comments yet</p>
        ) : (
          <>
            {/* Current version comments */}
            {currentVersionComments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-blue-400 pl-3 py-1">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-sm">{comment.created_by}</span>
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}

            {/* Other version comments - half opacity */}
            {otherVersionComments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-gray-300 pl-3 py-1 opacity-50">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.created_by}</span>
                    {comment.version_label && (
                      <span className="text-xs text-gray-400">on {comment.version_label}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default Comments;

