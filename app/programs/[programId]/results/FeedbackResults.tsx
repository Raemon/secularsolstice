'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Program } from '@/app/programs/types';
import Tooltip from '@/app/components/Tooltip';
import ProgramTitle from '@/app/feedback/components/ProgramTitle';
import Link from 'next/link';

type VoteRecord = {
  // do not include name field
  id: string;
  weight: number;
  type: string;
  versionId: string;
  songId: string;
  createdAt: string;
  category: string;
};

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type Comment = {
  id: string;
  version_id: string;
  content: string;
  created_by: string;
  created_at: string;
  version_label?: string;
};

export type SortOption = 'quality' | 'singability' | 'title' | 'program' | 'comments';

type FeedbackResultsProps = {
  programId: string;
};

const SortButton = ({sortOption, currentSort, onSort, label}:{sortOption: SortOption, currentSort: SortOption, onSort: (option: SortOption) => void, label: string}) => {
  return (
    <div onClick={() => onSort(sortOption)} className={`cursor-pointer ${currentSort === sortOption ? 'text-white' : 'text-gray-500'}`}>{label}</div>
  );
};

const FeedbackResults = ({ programId }: FeedbackResultsProps) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [subPrograms, setSubPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [votes, setVotes] = useState<Record<string, VoteRecord[]>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [sortBy, setSortBy] = useState<SortOption>('program');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/programs/${programId}/results`);
        if (!response.ok) throw new Error('Failed to load results');
        const data = await response.json();
        setProgram(data.program);
        setSubPrograms(data.subPrograms || []);
        setVersions(data.versions || []);
        setVotes(data.votes || {});
        setComments(data.comments || {});
      } catch (err) {
        console.error('Failed to load results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };
    loadAllData();
  }, [programId]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const getVotesByCategory = (versionId: string, category: string) => {
    return (votes[versionId] || []).filter(v => v.category === category);
  };

  const getQualityScore = (versionId: string) => {
    const qualityVotes = getVotesByCategory(versionId, 'quality');
    return qualityVotes.reduce((acc, v) => acc + v.weight, 0);
  };

  const getSingabilityAvg = (versionId: string) => {
    const singabilityVotes = getVotesByCategory(versionId, 'singability');
    if (singabilityVotes.length === 0) return 0;
    return singabilityVotes.reduce((acc, v) => acc + v.weight, 0) / singabilityVotes.length;
  };

  const allElementIds = useMemo(() => {
    if (!program) return [];
    return [
      ...(program.elementIds || []),
      ...subPrograms.flatMap(sp => sp.elementIds || [])
    ];
  }, [program, subPrograms]);

  const sortedElementIds = useMemo(() => {
    const ids = [...allElementIds];
    if (sortBy === 'quality') {
      ids.sort((a, b) => getQualityScore(b) - getQualityScore(a));
    } else if (sortBy === 'singability') {
      ids.sort((a, b) => getSingabilityAvg(b) - getSingabilityAvg(a));
    } else if (sortBy === 'title') {
      ids.sort((a, b) => {
        const titleA = versionMap[a]?.songTitle || '';
        const titleB = versionMap[b]?.songTitle || '';
        return titleA.localeCompare(titleB);
      });
    } else if (sortBy === 'comments') {
      ids.sort((a, b) => {
        const commentsA = comments[a]?.length || 0;
        const commentsB = comments[b]?.length || 0;
        return commentsB - commentsA;
      });
    } else if (sortBy === 'program') {
      // Keep original program order (no sorting needed)
    }
    return ids;
  }, [allElementIds, sortBy, votes, comments]);

  if (isLoading) {
    return <div>loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Program not found.</p>
        </div>
      </div>
    );
  }

  const renderSongRow = (versionId: string) => {
    const version = versionMap[versionId];
    if (!version) return null;

    const qualityVotes = getVotesByCategory(versionId, 'quality');
    const singabilityAvg = getSingabilityAvg(versionId);
    const isSpeech = version.tags?.includes('speech');
    const versionComments = comments[versionId] || [];

    return (
      <div
        key={versionId}
        className="border-b border-gray-500 px-2 py-2"
      >
        <div className="grid items-center gap-4 text-sm" style={{ gridTemplateColumns: gridColumns }}>
          <div className={`font-georgia text-base ${isSpeech ? 'italic' : ''}`}>
            {version.songTitle}
          </div>
          <div className="flex items-center gap-1">
            {qualityVotes.length === 0 ? (
              <span className="text-gray-400 text-[11px]">No votes</span>
            ) : (
              qualityVotes.map((vote) => {
                const size = Math.abs(vote.weight) === 3 ? 12 : 6;
                const color = vote.weight > 0 ? 'var(--primary)' : vote.weight === 0 ? '#fff' : '#9ca3af';
                const tooltip = `${vote.type} (${vote.weight > 0 ? '+' : ''}${vote.weight})`;
                return (
                  <Tooltip key={vote.id} content={tooltip}>
                    <span
                      className="inline-block rounded-full"
                      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color }}
                    />
                  </Tooltip>
                );
              })
            )}
          </div>
          <div className="text-base">
            {singabilityAvg > 0 ? singabilityAvg.toFixed(1) : '-'}
          </div>
          <div className="text-base flex-2 w-full">
            {versionComments.length > 0 && (
            <div className="mt-2 ml-2 space-y-1">
              {versionComments.map((comment) => (
                <div key={comment.id} className="text-xs text-gray-300">
                  {comment.content}
                </div>
              ))}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  const gridColumns = '300px 1fr 50px 2fr';


  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <ProgramTitle title={program.title} suffix="Results" />

        {allElementIds.length > 0 && (
          <div className="mb-8">
            <div className="grid items-center gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium" style={{ gridTemplateColumns: gridColumns }}>
              <SortButton sortOption="title" currentSort={sortBy} onSort={setSortBy} label="Song/Speech" />
              <SortButton sortOption="quality" currentSort={sortBy} onSort={setSortBy} label="Rating" />
              <SortButton sortOption="singability" currentSort={sortBy} onSort={setSortBy} label="Singability" />
              <SortButton sortOption="comments" currentSort={sortBy} onSort={setSortBy} label="Comments" />
            </div>
            {sortedElementIds.map(renderSongRow)}
          </div>
        )}
        <Link href={`/feedback/${programId}`} className="text-primary hover:underline block text-center my-24">Back to Feedback</Link>
      </div>
    </div>
  );
};

export default FeedbackResults;
