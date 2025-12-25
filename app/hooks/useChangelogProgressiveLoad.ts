'use client';

import { useCallback, useMemo } from 'react';
import { useProgressiveLoad } from './useProgressiveLoad';

const INITIAL_BATCH_SIZE = 20;
const FULL_BATCH_SIZE = 500;

export type ChangelogVersion = {
  id: string;
  songId: string;
  songTitle: string;
  label: string;
  content: string | null;
  previousVersionId: string | null;
  previousContent: string | null;
  createdBy: string | null;
  createdAt: string;
};

type UseChangelogProgressiveLoadResult = {
  versions: ChangelogVersion[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
};

type ChangelogParams = {
  songId?: string;
  filename?: string;
};

const useChangelogProgressiveLoad = ({ songId, filename }: ChangelogParams = {}): UseChangelogProgressiveLoadResult => {
  const fetchItems = useCallback(async (limit: number, offset: number, signal: AbortSignal): Promise<ChangelogVersion[]> => {
    const params = new URLSearchParams();
    if (songId) params.set('songId', songId);
    if (filename) params.set('filename', filename);
    if (limit > 0) params.set('limit', String(limit));
    if (offset > 0) params.set('offset', String(offset));
    const response = await fetch(`/api/changelog?${params.toString()}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch changelog: ${response.status}`);
    const data = await response.json();
    return data.versions;
  }, [songId, filename]);

  const getId = useMemo(() => (v: ChangelogVersion) => v.id, []);

  const { items, loading, loadingMore, error, hasMore, loadMore } = useProgressiveLoad<ChangelogVersion>({
    initialLimit: INITIAL_BATCH_SIZE,
    expandedLimit: FULL_BATCH_SIZE,
    fetchItems,
    getId,
  });

  return { versions: items, loading, loadingMore, error, hasMore, loadMore };
};

export default useChangelogProgressiveLoad;