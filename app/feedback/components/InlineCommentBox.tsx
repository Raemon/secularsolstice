'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

interface InlineCommentBoxProps {
  versionId: string;
  existingComment?: {
    id: string;
    version_id: string;
    content: string;
    created_by: string;
    created_at: string;
  } | null;
  onCommentPosted?: (comment: {
    id: string;
    version_id: string;
    content: string;
    created_by: string;
    created_at: string;
  }) => void;
}

const InlineCommentBox = ({ versionId, existingComment, onCommentPosted }: InlineCommentBoxProps) => {
  const [newComment, setNewComment] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userId, userName } = useUser();
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
    if (existingComment && !newComment) {
      setNewComment(existingComment.content);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userName || !userId || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const isEditing = !!existingComment;
      const response = await fetch('/api/comments', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          isEditing
            ? {
                commentId: existingComment.id,
                content: newComment.trim(),
                userId: userId,
              }
            : {
                versionId: versionId,
                content: newComment.trim(),
                userId: userId,
                createdBy: userName,
              }
        ),
      });

      if (!response.ok) throw new Error(`Failed to ${isEditing ? 'update' : 'create'} comment`);

      const newCommentData = await response.json();
      if (onCommentPosted) {
        onCommentPosted(newCommentData);
      }
      setNewComment('');
      setIsExpanded(false);
    } catch (err) {
      console.error('Error saving comment:', err);
      setError('Failed to save comment');
    } finally {
      setIsSubmitting(false);
    }
  };


  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitComment(e);
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

  const displayText = existingComment ? existingComment.content : newComment;

  return (
    <form onSubmit={submitComment} className="w-full h-full" onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}>
      <textarea
        ref={textareaRef}
        value={isExpanded ? newComment : displayText}
        onChange={(e) => setNewComment(e.target.value)}
        onFocus={handleFocus}
        onBlur={() => { setNewComment(''); setIsExpanded(false); }}
        onKeyDown={handleKeyDown}
        placeholder="comment..."
        className="w-full bg-transparent px-2 py-1 text-xs border-top border-gray-600 outline-none resize-none transition-all rounded-sm placeholder:text-gray-600"
        rows={1}
        disabled={isSubmitting}
      />
      {isExpanded && (
        <button type="button" onMouseDown={(e) => { e.preventDefault(); submitComment(e); }} disabled={isSubmitting} className="absolute bottom-0 right-0 text-xs px-2 py-1 text-white disabled:opacity-50">
          {isSubmitting ? '...' : (!!existingComment ? 'Save Edit' : 'Save')}
        </button>
      )}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </form>
  );
};

export default InlineCommentBox;




