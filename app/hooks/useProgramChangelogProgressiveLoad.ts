'use client';

import { useCallback, useMemo } from 'react';
import { useProgressiveLoad } from './useProgressiveLoad';

const INITIAL_BATCH_SIZE = 20;
const FULL_BATCH_SIZE = 500;

export type ProgramChangelogVersion = {
  id: string;
  programId: string;
  programTitle: string;
  title: string | null;
  previousTitle: string | null;
  elementCount: number;
  previousElementCount: number | null;
  programCount: number;
  previousProgramCount: number | null;
  videoUrl: string | null;
  previousVideoUrl: string | null;
  printProgramForeword: string | null;
  previousPrintProgramForeword: string | null;
  printProgramEpitaph: string | null;
  previousPrintProgramEpitaph: string | null;
  isSubprogram: boolean;
  previousIsSubprogram: boolean | null;
  locked: boolean;
  previousLocked: boolean | null;
  archived: boolean;
  previousArchived: boolean | null;
  createdBy: string | null;
  createdAt: string;
};

export type UseProgramChangelogProgressiveLoadResult = {
  versions: ProgramChangelogVersion[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
};

type ProgramChangelogParams = {
  programId?: string;
};

const useProgramChangelogProgressiveLoad = ({ programId }: ProgramChangelogParams = {}): UseProgramChangelogProgressiveLoadResult => {
  const fetchItems = useCallback(async (limit: number, offset: number, signal: AbortSignal): Promise<ProgramChangelogVersion[]> => {
    const params = new URLSearchParams();
    if (programId) params.set('programId', programId);
    if (limit > 0) params.set('limit', String(limit));
    if (offset > 0) params.set('offset', String(offset));
    const response = await fetch(`/api/program-changelog?${params.toString()}`, { signal });
    if (!response.ok) throw new Error(`Failed to fetch program changelog: ${response.status}`);
    const data = await response.json();
    return data.versions;
  }, [programId]);

  const getId = useMemo(() => (v: ProgramChangelogVersion) => v.id, []);

  const { items, loading, loadingMore, error, hasMore, loadMore, refetch } = useProgressiveLoad<ProgramChangelogVersion>({
    initialLimit: INITIAL_BATCH_SIZE,
    expandedLimit: FULL_BATCH_SIZE,
    fetchItems,
    fetchAll: !!programId,
    getId,
  });

  return { versions: items, loading, loadingMore, error, hasMore, loadMore, refetch };
};

export default useProgramChangelogProgressiveLoad;
