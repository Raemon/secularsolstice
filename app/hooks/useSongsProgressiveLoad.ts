'use client';

import { useCallback, useMemo } from 'react';
import { useProgressiveLoad } from './useProgressiveLoad';
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
  const fetchItems = useCallback(async (limit: number, offset: number, signal: AbortSignal): Promise<Song[]> => {
    const params = new URLSearchParams();
    if (limit > 0) params.set('limit', String(limit));
    if (offset > 0) params.set('offset', String(offset));
    const response = await fetch(`/api/songs?${params.toString()}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch songs: ${response.status}`);
    const data = await response.json();
    return data.songs;
  }, []);

  const getId = useMemo(() => (s: Song) => s.id, []);

  const { items, loading, loadingMore, error, refetch } = useProgressiveLoad<Song>({
    initialLimit: INITIAL_BATCH_SIZE,
    expandedLimit: 0, // Not used with fetchAll
    fetchItems,
    fetchAll: true,
    getId,
  });

  return { songs: items, loading, loadingMore, error, refetch };
};

export default useSongsProgressiveLoad;
