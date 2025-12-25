'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type ProgressiveLoadConfig<T> = {
  initialLimit: number;
  expandedLimit: number;
  fetchItems: (limit: number, offset: number, signal: AbortSignal) => Promise<T[]>;
  // Optional: set to true to fetch ALL items after initial batch (uses offset instead of limit)
  fetchAll?: boolean;
  // Optional: for fetchAll mode, extract IDs to exclude duplicates
  getId?: (item: T) => string;
};

export type ProgressiveLoadResult<T> = {
  items: T[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
};

export const useProgressiveLoad = <T>({
  initialLimit,
  expandedLimit,
  fetchItems,
  fetchAll = false,
  getId,
}: ProgressiveLoadConfig<T>): ProgressiveLoadResult<T> => {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentOffset, setCurrentOffset] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);
    loadedIdsRef.current.clear();

    try {
      // First batch - quick initial load
      const initialBatch = await fetchItems(initialLimit, 0, signal);
      if (signal.aborted) return;
      
      setItems(initialBatch);
      if (getId) {
        initialBatch.forEach(item => loadedIdsRef.current.add(getId(item)));
      }
      setLoading(false);

      // If we got fewer than requested, there's nothing more
      if (initialBatch.length < initialLimit) {
        setHasMore(false);
        return;
      }

      // Load expanded batch in background
      setLoadingMore(true);
      
      if (fetchAll) {
        // Fetch remaining items (all items not in initial batch)
        const remainingBatch = await fetchItems(0, initialLimit, signal);
        if (signal.aborted) return;
        
        // Merge without duplicates
        if (getId) {
          const newItems = remainingBatch.filter(item => !loadedIdsRef.current.has(getId(item)));
          newItems.forEach(item => loadedIdsRef.current.add(getId(item)));
          setItems(prev => [...prev, ...newItems]);
        } else {
          setItems(prev => [...prev, ...remainingBatch]);
        }
        setHasMore(false);
      } else {
        // Fetch up to expanded limit (replaces initial batch)
        const expandedBatch = await fetchItems(expandedLimit, 0, signal);
        if (signal.aborted) return;
        
        setItems(expandedBatch);
        if (getId) {
          loadedIdsRef.current.clear();
          expandedBatch.forEach(item => loadedIdsRef.current.add(getId(item)));
        }
        setCurrentOffset(expandedBatch.length);
        setHasMore(expandedBatch.length >= expandedLimit);
      }
      
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Progressive load error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchItems, initialLimit, expandedLimit, fetchAll, getId]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoadingMore(true);
    try {
      const pageSize = expandedLimit - initialLimit; // Use difference as page size
      const nextBatch = await fetchItems(pageSize, currentOffset, signal);
      if (signal.aborted) return;
      
      if (getId) {
        const newItems = nextBatch.filter(item => !loadedIdsRef.current.has(getId(item)));
        newItems.forEach(item => loadedIdsRef.current.add(getId(item)));
        setItems(prev => [...prev, ...newItems]);
      } else {
        setItems(prev => [...prev, ...nextBatch]);
      }
      
      setCurrentOffset(prev => prev + nextBatch.length);
      setHasMore(nextBatch.length >= pageSize);
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Load more error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchItems, expandedLimit, initialLimit, currentOffset, getId]);

  useEffect(() => {
    load();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [load]);

  return { items, loading, loadingMore, error, hasMore, loadMore, refetch: load };
};

export default useProgressiveLoad;
