'use client';

import { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';

const SongTags = ({songId, initialTags = []}: {songId?: string; initialTags?: string[]}) => {
  const { canEdit } = useUser();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const handleAddTag = async () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag || tags.includes(trimmedTag) || !songId) {
      return;
    }
    const updatedTags = [...tags, trimmedTag];
    setTags(updatedTags);
    setNewTag('');
    setIsUpdatingTags(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (!response.ok) {
        throw new Error('Failed to update tags');
      }
    } catch (err) {
      console.error('Error updating tags:', err);
      setTags(tags);
    } finally {
      setIsUpdatingTags(false);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!songId) return;
    const updatedTags = tags.filter(t => t !== tagToRemove);
    setTags(updatedTags);
    setIsUpdatingTags(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (!response.ok) {
        throw new Error('Failed to update tags');
      }
    } catch (err) {
      console.error('Error updating tags:', err);
      setTags(tags);
    } finally {
      setIsUpdatingTags(false);
    }
  };

  if (!canEdit || !songId) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 mb-4">
      <div className="text-xs text-gray-400">Tags</div>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 flex items-center gap-1">
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              disabled={isUpdatingTags}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag();
            }
          }}
          placeholder="Add tag"
          disabled={isUpdatingTags}
          className="text-xs px-2 py-1 border border-gray-300 disabled:opacity-50"
        />
        <button
          onClick={handleAddTag}
          disabled={isUpdatingTags || !newTag.trim() || tags.includes(newTag.trim())}
          className="text-xs px-2 py-1 text-blue-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  );
};

export default SongTags;

