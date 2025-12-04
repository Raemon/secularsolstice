'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';

const SUGGESTED_TAGS = ['song', 'speech', 'act 1', 'act 2', 'act 3', 'act 4'];

const SongTags = ({songId, initialTags = []}: {songId?: string; initialTags?: string[]}) => {
  const { canEdit } = useUser();
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [isUpdatingTags, setIsUpdatingTags] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const filteredSuggestions = SUGGESTED_TAGS.filter(tag => 
    !tags.includes(tag) && tag.toLowerCase().includes(newTag.toLowerCase())
  );

  const handleAddTag = async (tagOverride?: string) => {
    const trimmedTag = (tagOverride ?? newTag).trim();
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
      <div className="flex gap-2 relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={(e) => { setNewTag(e.target.value); setShowDropdown(true); setHighlightedIndex(-1); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={(e) => { if (!dropdownRef.current?.contains(e.relatedTarget as Node)) setShowDropdown(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
                  handleAddTag(filteredSuggestions[highlightedIndex]);
                  setShowDropdown(false);
                  setHighlightedIndex(-1);
                } else {
                  handleAddTag();
                }
              } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightedIndex(prev => Math.max(prev - 1, -1));
              } else if (e.key === 'Escape') {
                setShowDropdown(false);
                setHighlightedIndex(-1);
              }
            }}
            placeholder="Add tag"
            disabled={isUpdatingTags}
            className="text-xs px-2 py-1 border border-gray-300 disabled:opacity-50"
          />
          {showDropdown && filteredSuggestions.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 mt-1 bg-white border border-gray-300 shadow-sm z-10 min-w-[120px]">
              {filteredSuggestions.map((tag, index) => (
                <div
                  key={tag}
                  className={`text-xs px-2 py-1 bg-black/90 text-white hover:text-primary cursor-pointer ${index === highlightedIndex ? 'text-primary' : 'hover:bg-gray-100'}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { handleAddTag(tag); setShowDropdown(false); setHighlightedIndex(-1); }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {tag}
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => handleAddTag()}
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

