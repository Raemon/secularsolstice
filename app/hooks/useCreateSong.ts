'use client';

import { useCallback, useState } from 'react';

type UseCreateSongOptions = {
  userName: string | null;
  onSongCreated?: () => Promise<void> | void;
  onError?: (error: string) => void;
};

const useCreateSong = ({ userName, onSongCreated, onError }: UseCreateSongOptions) => {
  const [isCreatingSong, setIsCreatingSong] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [isSubmittingSong, setIsSubmittingSong] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateSong = useCallback(async () => {
    if (!newSongTitle.trim()) {
      const errorMessage = 'Song title is required';
      setError(errorMessage);
      onError?.(errorMessage);
      return;
    }
    
    setIsSubmittingSong(true);
    setError(null);
    
    try {
      const response = await fetch('/api/songs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newSongTitle.trim(), createdBy: userName }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          throw new Error(`Failed to create song: ${response.status} ${response.statusText}`);
        }
        const errorMessage = errorData.details || errorData.error || 'Failed to create song';
        throw new Error(errorMessage);
      }

      setIsCreatingSong(false);
      setNewSongTitle('');
      await onSongCreated?.();
    } catch (err) {
      console.error('Error creating song:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create song';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsSubmittingSong(false);
    }
  }, [newSongTitle, userName, onSongCreated, onError]);

  const resetError = useCallback(() => setError(null), []);

  return {
    isCreatingSong,
    setIsCreatingSong,
    newSongTitle,
    setNewSongTitle,
    isSubmittingSong,
    error,
    handleCreateSong,
    resetError,
  };
};

export default useCreateSong;

