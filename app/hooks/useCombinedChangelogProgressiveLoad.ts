'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChangelogVersion } from './useChangelogProgressiveLoad';
import { ProgramChangelogVersion } from './useProgramChangelogProgressiveLoad';

const INITIAL_BATCH_SIZE = 20;
const FULL_BATCH_SIZE = 500;

export type CombinedChangelogItem =
  | { type: 'song'; data: ChangelogVersion }
  | { type: 'program'; data: ProgramChangelogVersion };

type UseCombinedChangelogResult = {
  items: CombinedChangelogItem[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
};

const useCombinedChangelogProgressiveLoad = (): UseCombinedChangelogResult => {
  const [items, setItems] = useState<CombinedChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [songOffset, setSongOffset] = useState(0);
  const [programOffset, setProgramOffset] = useState(0);
  const [songHasMore, setSongHasMore] = useState(true);
  const [programHasMore, setProgramHasMore] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedIdsRef = useRef<Set<string>>(new Set());

  const fetchBoth = useCallback(async (limit: number, sOffset: number, pOffset: number, signal: AbortSignal) => {
    const [songRes, programRes] = await Promise.all([
      fetch(`/api/changelog?limit=${limit}&offset=${sOffset}`, { signal }),
      fetch(`/api/program-changelog?limit=${limit}&offset=${pOffset}`, { signal }),
    ]);
    if (!songRes.ok) throw new Error(`Failed to fetch song changelog: ${songRes.status}`);
    if (!programRes.ok) throw new Error(`Failed to fetch program changelog: ${programRes.status}`);
    const songData = await songRes.json();
    const programData = await programRes.json();
    return {
      songs: songData.versions as ChangelogVersion[],
      programs: programData.versions as ProgramChangelogVersion[],
    };
  }, []);

  const mergeAndSort = useCallback((songs: ChangelogVersion[], programs: ProgramChangelogVersion[]): CombinedChangelogItem[] => {
    const combined: CombinedChangelogItem[] = [
      ...songs.map(s => ({ type: 'song' as const, data: s })),
      ...programs.map(p => ({ type: 'program' as const, data: p })),
    ];
    combined.sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime());
    return combined;
  }, []);

  const load = useCallback(async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    setError(null);
    loadedIdsRef.current.clear();

    try {
      const { songs, programs } = await fetchBoth(INITIAL_BATCH_SIZE, 0, 0, signal);
      if (signal.aborted) return;

      const merged = mergeAndSort(songs, programs);
      merged.forEach(item => {
        const id = item.type === 'song' ? `s-${item.data.id}` : `p-${item.data.id}`;
        loadedIdsRef.current.add(id);
      });
      setItems(merged);
      setSongOffset(songs.length);
      setProgramOffset(programs.length);
      setSongHasMore(songs.length >= INITIAL_BATCH_SIZE);
      setProgramHasMore(programs.length >= INITIAL_BATCH_SIZE);
      setHasMore(songs.length >= INITIAL_BATCH_SIZE || programs.length >= INITIAL_BATCH_SIZE);
      setLoading(false);

      // Load expanded batch in background
      if (songs.length >= INITIAL_BATCH_SIZE || programs.length >= INITIAL_BATCH_SIZE) {
        setLoadingMore(true);
        const { songs: moreSongs, programs: morePrograms } = await fetchBoth(FULL_BATCH_SIZE, 0, 0, signal);
        if (signal.aborted) return;

        const expandedMerged = mergeAndSort(moreSongs, morePrograms);
        loadedIdsRef.current.clear();
        expandedMerged.forEach(item => {
          const id = item.type === 'song' ? `s-${item.data.id}` : `p-${item.data.id}`;
          loadedIdsRef.current.add(id);
        });
        setItems(expandedMerged);
        setSongOffset(moreSongs.length);
        setProgramOffset(morePrograms.length);
        setSongHasMore(moreSongs.length >= FULL_BATCH_SIZE);
        setProgramHasMore(morePrograms.length >= FULL_BATCH_SIZE);
        setHasMore(moreSongs.length >= FULL_BATCH_SIZE || morePrograms.length >= FULL_BATCH_SIZE);
        setLoadingMore(false);
      }
    } catch (err) {
      if (signal.aborted) return;
      console.error('Combined changelog load error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
      setLoadingMore(false);
    }
  }, [fetchBoth, mergeAndSort]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoadingMore(true);
    try {
      const pageSize = FULL_BATCH_SIZE - INITIAL_BATCH_SIZE;
      const [songRes, programRes] = await Promise.all([
        songHasMore ? fetch(`/api/changelog?limit=${pageSize}&offset=${songOffset}`, { signal }) : Promise.resolve(null),
        programHasMore ? fetch(`/api/program-changelog?limit=${pageSize}&offset=${programOffset}`, { signal }) : Promise.resolve(null),
      ]);

      let newSongs: ChangelogVersion[] = [];
      let newPrograms: ProgramChangelogVersion[] = [];

      if (songRes && songRes.ok) {
        const data = await songRes.json();
        newSongs = data.versions;
      }
      if (programRes && programRes.ok) {
        const data = await programRes.json();
        newPrograms = data.versions;
      }
      if (signal.aborted) return;

      const merged = mergeAndSort(newSongs, newPrograms);
      const deduped = merged.filter(item => {
        const id = item.type === 'song' ? `s-${item.data.id}` : `p-${item.data.id}`;
        if (loadedIdsRef.current.has(id)) return false;
        loadedIdsRef.current.add(id);
        return true;
      });

      setItems(prev => [...prev, ...deduped].sort((a, b) => new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime()));
      setSongOffset(prev => prev + newSongs.length);
      setProgramOffset(prev => prev + newPrograms.length);
      setSongHasMore(newSongs.length >= pageSize);
      setProgramHasMore(newPrograms.length >= pageSize);
      setHasMore(newSongs.length >= pageSize || newPrograms.length >= pageSize);
      setLoadingMore(false);
    } catch (err) {
      if (signal.aborted) return;
      console.error('Load more error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, songOffset, programOffset, songHasMore, programHasMore, mergeAndSort]);

  useEffect(() => {
    load();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [load]);

  return { items, loading, loadingMore, error, hasMore, loadMore };
};

export default useCombinedChangelogProgressiveLoad;

