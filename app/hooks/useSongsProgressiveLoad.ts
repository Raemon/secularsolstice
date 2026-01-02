'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Song } from '../songs/types';

const INITIAL_BATCH_SIZE = 16;

// Module-level cache to persist songs across navigations
let cachedSongs: Song[] = [];
let cacheTimestamp = 0;

type UseSongsProgressiveLoadResult = {
  songs: Song[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const useSongsProgressiveLoad = (): UseSongsProgressiveLoadResult => {
  const hasCachedData = cachedSongs.length > 0;
  const [songs, setSongs] = useState<Song[]>(cachedSongs);
  const [loading, setLoading] = useState(!hasCachedData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountTimestampRef = useRef(cacheTimestamp);

  const fetchSongs = useCallback(async (isRefetch = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Only show loading if we don't have cached data
    if (cachedSongs.length === 0) setLoading(true);
    setError(null);

    try {
      // Fetch initial batch
      const params = new URLSearchParams();
      params.set('limit', String(INITIAL_BATCH_SIZE));
      const initialRes = await fetch(`/api/songs?${params.toString()}`, { signal });
      if (!initialRes.ok) throw new Error(`Failed to fetch songs: ${initialRes.status}`);
      const initialData = await initialRes.json();
      const initialSongs: Song[] = initialData.songs;
      if (signal.aborted) return;

      // Update cache and state with initial batch
      cachedSongs = initialSongs;
      cacheTimestamp = Date.now();
      setSongs(initialSongs);
      setLoading(false);

      if (initialSongs.length < INITIAL_BATCH_SIZE) return;

      // Fetch remaining in background
      setLoadingMore(true);
      const remainingParams = new URLSearchParams();
      remainingParams.set('offset', String(INITIAL_BATCH_SIZE));
      const remainingRes = await fetch(`/api/songs?${remainingParams.toString()}`, { signal });
      if (!remainingRes.ok) throw new Error(`Failed to fetch remaining songs: ${remainingRes.status}`);
      const remainingData = await remainingRes.json();
      if (signal.aborted) return;

      const loadedIds = new Set(initialSongs.map(s => s.id));
      const newSongs = (remainingData.songs as Song[]).filter(s => !loadedIds.has(s.id));
      const allSongs = [...initialSongs, ...newSongs];
      cachedSongs = allSongs;
      cacheTimestamp = Date.now();
      setSongs(allSongs);
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Songs load error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // If cache was updated by another instance, sync state
    if (cacheTimestamp > mountTimestampRef.current && cachedSongs.length > 0) {
      setSongs(cachedSongs);
      mountTimestampRef.current = cacheTimestamp;
    }
    fetchSongs();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchSongs]);

  const refetch = useCallback(async () => {
    await fetchSongs(true);
  }, [fetchSongs]);

  return { songs, loading, loadingMore, error, refetch };
};

export default useSongsProgressiveLoad;
