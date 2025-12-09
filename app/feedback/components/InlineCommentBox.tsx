'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

interface InlineCommentBoxProps {
  versionId: string;
  onCommentPosted?: (comment: {
    id: string;
    version_id: string;
    content: string;
    created_by: string;
    created_at: string;
  }) => void;
}

const InlineCommentBox = ({ versionId, onCommentPosted }: InlineCommentBoxProps) => {
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userName } = useUser();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = () => {
    if (!newComment.trim()) {
      setIsExpanded(false);
    }
  };

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
          versionId: versionId,
          content: newComment.trim(),
          createdBy: userName,
        }),
      });

      if (!response.ok) throw new Error('Failed to create comment');

      const newCommentData = await response.json();
      if (onCommentPosted) {
        onCommentPosted(newCommentData);
      }
      setNewComment('');
      setIsExpanded(false);
    } catch (err) {
      console.error('Error creating comment:', err);
      setError('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setNewComment('');
      setIsExpanded(false);
      textareaRef.current?.blur();
    }
  };

  if (!userName) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
      <textarea
        ref={textareaRef}
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="comment..."
        className="w-64 bg-transparent px-2 py-1 text-xs border-top border-gray-600 outline-none focus:outline-gray-500 focus:outline-1 resize-none transition-all rounded-sm"
        rows={isExpanded ? 3 : 1}
        disabled={isSubmitting}
      />
      {isExpanded && (
        <div className="flex justify-end gap-1 mt-1">
          <button
            type="button"
            onClick={() => {
              setNewComment('');
              setIsExpanded(false);
            }}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </form>
  );
};

export default InlineCommentBox;



