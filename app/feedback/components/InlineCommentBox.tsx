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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment]);

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
        placeholder="comments..."
        className="w-full bg-transparent px-2 py-1 text-xs border-top border-gray-600 outline-none resize-none transition-all rounded-sm placeholder:text-gray-600"
        rows={1}
        disabled={isSubmitting}
      />
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </form>
  );
};

export default InlineCommentBox;




