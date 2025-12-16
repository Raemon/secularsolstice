'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

const SongTitle = ({songId, title}: {songId?: string; title: string}) => {
  const { canEdit } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [displayTitle, setDisplayTitle] = useState(title);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isUpdating, setIsUpdating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditedTitle(title);
    setDisplayTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmedTitle = editedTitle.trim();
    if (!trimmedTitle || !songId) {
      setIsEditing(false);
      setEditedTitle(displayTitle);
      return;
    }
    if (trimmedTitle === displayTitle) {
      setIsEditing(false);
      return;
    }
    const previousTitle = displayTitle;
    setDisplayTitle(trimmedTitle);
    setIsEditing(false);
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      if (!response.ok) {
        throw new Error('Failed to update title');
      }
    } catch (err) {
      console.error('Error updating title:', err);
      setDisplayTitle(previousTitle);
      setEditedTitle(previousTitle);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedTitle(displayTitle);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editedTitle}
        onChange={(e) => setEditedTitle(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className="font-georgia text-2xl bg-transparent border-b border-gray-400 outline-none disabled:opacity-50"
        style={{ width: `${Math.max(editedTitle.length, 10)}ch` }}
      />
    );
  }

  return (
    <span className="flex items-center gap-2">
      {displayTitle}
      {songId && (
        <button
          onClick={() => { setEditedTitle(displayTitle); setIsEditing(true); }}
          disabled={!canEdit}
          className={`text-gray-400 hover:text-gray-600 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={canEdit ? 'Edit title' : 'Set username to edit'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default SongTitle;
