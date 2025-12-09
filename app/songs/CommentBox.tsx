'use client';

import { useState } from 'react';
import { useUser } from '../contexts/UserContext';

interface CommentBoxProps {
  currentVersionId: string;
  onCommentPosted: (comment: {
    id: string;
    version_id: string;
    content: string;
    created_by: string;
    created_at: string;
  }) => void;
}

const CommentBox = ({ currentVersionId, onCommentPosted }: CommentBoxProps) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userName } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userName) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          versionId: currentVersionId,
          content: newComment.trim(),
          createdBy: userName,
        }),
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const newCommentData = await response.json();
      onCommentPosted(newCommentData);
      setNewComment('');
    } catch (err) {
      console.error('Error creating comment:', err);
      setError('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!userName) {
    return (
      <p className="text-gray-400 text-sm mb-4 italic">Sign in (top right) to post comments</p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment..."
        className="w-full bg-gray-600 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        rows={3}
        disabled={isSubmitting}
      />
      <div className="flex justify-end mt-2">
        <button
          type="submit"
          disabled={!newComment.trim() || isSubmitting}
          className="px-4 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </form>
  );
};

export default CommentBox;

