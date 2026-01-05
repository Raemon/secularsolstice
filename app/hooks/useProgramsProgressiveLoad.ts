'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Program } from '../programs/types';

const INITIAL_BATCH_SIZE = 20;

// Module-level cache to persist programs across navigations
let cachedPrograms: Program[] = [];
let cacheTimestamp = 0;

type UseProgramsProgressiveLoadResult = {
  programs: Program[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const useProgramsProgressiveLoad = (): UseProgramsProgressiveLoadResult => {
  const hasCachedData = cachedPrograms.length > 0;
  const [programs, setPrograms] = useState<Program[]>(cachedPrograms);
  const [loading, setLoading] = useState(!hasCachedData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountTimestampRef = useRef(cacheTimestamp);

  const fetchPrograms = useCallback(async (isRefetch = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Only show loading if we don't have cached data
    if (cachedPrograms.length === 0) setLoading(true);
    setError(null);

    try {
      // Fetch initial batch
      const params = new URLSearchParams();
      params.set('limit', String(INITIAL_BATCH_SIZE));
      const initialRes = await fetch(`/api/programs?${params.toString()}`, { signal });
      if (!initialRes.ok) throw new Error(`Failed to fetch programs: ${initialRes.status}`);
      const initialData = await initialRes.json();
      const initialPrograms: Program[] = initialData.programs;
      if (signal.aborted) return;

      // Update cache and state with initial batch
      cachedPrograms = initialPrograms;
      cacheTimestamp = Date.now();
      setPrograms(initialPrograms);
      setLoading(false);

      if (initialPrograms.length < INITIAL_BATCH_SIZE) return;

      // Fetch remaining in background
      setLoadingMore(true);
      const remainingParams = new URLSearchParams();
      remainingParams.set('offset', String(INITIAL_BATCH_SIZE));
      const remainingRes = await fetch(`/api/programs?${remainingParams.toString()}`, { signal });
      if (!remainingRes.ok) throw new Error(`Failed to fetch remaining programs: ${remainingRes.status}`);
      const remainingData = await remainingRes.json();
      if (signal.aborted) return;

      const loadedIds = new Set(initialPrograms.map(p => p.id));
      const newPrograms = (remainingData.programs as Program[]).filter(p => !loadedIds.has(p.id));
      const allPrograms = [...initialPrograms, ...newPrograms];
      cachedPrograms = allPrograms;
      cacheTimestamp = Date.now();
      setPrograms(allPrograms);
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Programs load error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // If cache was updated by another instance, sync state
    if (cacheTimestamp > mountTimestampRef.current && cachedPrograms.length > 0) {
      setPrograms(cachedPrograms);
      mountTimestampRef.current = cacheTimestamp;
    }
    fetchPrograms();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchPrograms]);

  const refetch = useCallback(async () => {
    await fetchPrograms(true);
  }, [fetchPrograms]);

  return { programs, loading, loadingMore, error, refetch };
};

export default useProgramsProgressiveLoad;