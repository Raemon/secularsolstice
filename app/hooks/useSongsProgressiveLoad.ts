'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song } from '../songs/types';

const INITIAL_BATCH_SIZE = 16;

type UseSongsProgressiveLoadResult = {
  songs: Song[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const useSongsProgressiveLoad = (): UseSongsProgressiveLoadResult => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialSongIdsRef = useRef<string[]>([]);

  const fetchInitialBatch = useCallback(async (signal: AbortSignal): Promise<Song[]> => {
    const response = await fetch(`/api/songs?limit=${INITIAL_BATCH_SIZE}&offset=0`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch songs: ${response.status}`);
    const data = await response.json();
    return data.songs;
  }, []);

  const fetchRemainingSongs = useCallback(async (excludeIds: string[], signal: AbortSignal): Promise<Song[]> => {
    const response = await fetch(`/api/songs?excludeIds=${excludeIds.join(',')}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch remaining songs: ${response.status}`);
    const data = await response.json();
    return data.songs;
  }, []);

  const loadSongs = useCallback(async () => {
    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);

    try {
      // First batch - the 20 most recently updated songs
      const initialBatch = await fetchInitialBatch(signal);
      if (signal.aborted) return;
      setSongs(initialBatch);
      initialSongIdsRef.current = initialBatch.map(s => s.id);
      setLoading(false);

      // If we got fewer than the batch size, there's nothing more to load
      if (initialBatch.length < INITIAL_BATCH_SIZE) {
        return;
      }

      // Now fetch the rest in the background
      setLoadingMore(true);
      const remainingSongs = await fetchRemainingSongs(initialSongIdsRef.current, signal);
      if (signal.aborted) return;
      // Merge: initial batch first (already sorted by recent), then remaining
      setSongs(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newSongs = remainingSongs.filter(s => !existingIds.has(s.id));
        return [...prev, ...newSongs];
      });
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchInitialBatch, fetchRemainingSongs]);

  useEffect(() => {
    loadSongs();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadSongs]);

  return { songs, loading, loadingMore, error, refetch: loadSongs };
};

export default useSongsProgressiveLoad;
