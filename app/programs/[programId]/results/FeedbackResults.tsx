'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Program } from '@/app/programs/types';
import ProgramTitle from '@/app/feedback/components/ProgramTitle';
import Link from 'next/link';
import FilterCheckbox from './FilterCheckbox';

// Vote record with performer info for filtering
type VoteRecord = {
  id: string;
  weight: number;
  type: string;
  versionId: string;
  songId: string;
  createdAt: string;
  category: string;
  userId?: string | null;
  isPerformer?: boolean;
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
  user_id: string | null;
  created_at: string;
  version_label?: string;
};

export type SortOption = 'quality' | 'singability' | 'title' | 'program' | 'comments' | 'position';

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
  const [showSongs, setShowSongs] = useState(true);
  const [showSpeeches, setShowSpeeches] = useState(true);
  const [showPerformerFeedback, setShowPerformerFeedback] = useState(true);

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
    let filteredVotes = (votes[versionId] || []).filter(v => v.category === category);
    if (!showPerformerFeedback) {
      filteredVotes = filteredVotes.filter(v => !v.isPerformer);
    }
    return filteredVotes;
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

  const positionMap = useMemo(() => {
    const map: Record<string, number> = {};
    allElementIds.forEach((id, index) => {
      map[id] = index + 1;
    });
    return map;
  }, [allElementIds]);

  const sortedElementIds = useMemo(() => {
    let ids = [...allElementIds];
    
    // Filter by showSongs and showSpeeches
    ids = ids.filter(id => {
      const version = versionMap[id];
      if (!version) return false;
      const isSpeech = version.tags?.includes('speech');
      if (isSpeech && !showSpeeches) return false;
      if (!isSpeech && !showSongs) return false;
      return true;
    });
    
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
    } else if (sortBy === 'position') {
      ids.sort((a, b) => (positionMap[a] || 0) - (positionMap[b] || 0));
    } else if (sortBy === 'program') {
      // Keep original program order (no sorting needed)
    }
    return ids;
  }, [allElementIds, sortBy, votes, comments, positionMap, showSongs, showSpeeches, versionMap, showPerformerFeedback]);

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
    const position = positionMap[versionId];

    return (
      <div
        key={versionId}
        className="border-b border-gray-500 px-2 py-2"
      >
        <div className="grid items-center gap-4 text-sm" style={{ gridTemplateColumns: gridColumns }}>
          <div className="text-gray-400">
            {position}
          </div>
          <div className={`font-georgia text-base ${isSpeech ? 'italic' : ''}`}>
            {version.songTitle}
          </div>
          <div className="flex items-center gap-1 max-w-[200px] flex-wrap">
            {qualityVotes.length === 0 ? (
              <span className="text-gray-400 text-[11px]">No votes</span>
            ) : (
              qualityVotes.sort((a, b) => b.weight - a.weight).map((vote) => {
                const size = Math.abs(vote.weight) === 3 ? 12 : 6;
                const color = vote.weight > 0 ? 'var(--primary)' : vote.weight === 0 ? '#fff' : '#9ca3af';
                const tooltip = `${vote.type} (${vote.weight > 0 ? '+' : ''}${vote.weight})`;
                return (
                    <span
                      key={vote.id}
                      className="inline-block rounded-full"
                      title={tooltip}
                      style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color }}
                    />
                );
              })
            )}
          </div>
          <div className="text-sm text-center">
            {singabilityAvg > 0 ? `${(singabilityAvg).toFixed(0)}/3` : <span className="text-gray-400 text-[11px]">
                {!isSpeech && 'No votes'}
              </span>}
          </div>
          <div className="text-base flex-2 w-full">
            {versionComments.length > 0 && (
            <div className="space-y-3">
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

  const gridColumns = '25px 300px 1fr 50px 2fr';


  return (
    <div className="min-h-screen p-4">
      <div className="max-w-5xl mx-auto">
        <ProgramTitle title={program.title} suffix="Results" />

        <div className="flex gap-4 text-sm justify-center mb-12 text-gray-500">
          <FilterCheckbox checked={showSongs} onChange={() => setShowSongs(!showSongs)} label="Songs" />
          <FilterCheckbox checked={showSpeeches} onChange={() => setShowSpeeches(!showSpeeches)} label="Speeches" />
          <FilterCheckbox checked={showPerformerFeedback} onChange={() => setShowPerformerFeedback(!showPerformerFeedback)} label="Performer Feedback" tooltip="Show feedback from people who performed at this program" />
        </div>

        {allElementIds.length > 0 && (
          <div className="mb-8">
            <div className="grid items-center gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium" style={{ gridTemplateColumns: gridColumns }}>
              <SortButton sortOption="position" currentSort={sortBy} onSort={setSortBy} label="#" />
              <SortButton sortOption="title" currentSort={sortBy} onSort={setSortBy} label="Song/Speech" />
              <SortButton sortOption="quality" currentSort={sortBy} onSort={setSortBy} label="Rating" />
              <SortButton sortOption="singability" currentSort={sortBy} onSort={setSortBy} label="Singability" />
              <SortButton sortOption="comments" currentSort={sortBy} onSort={setSortBy} label="Comments" />
            </div>
            {sortedElementIds.map(renderSongRow)}
          </div>
        )}
        <div className="flex justify-center">
          <Link href={`/feedback/${programId}`} className="text-primary hover:underline block text-center my-24 outline outline-1 outline-gray-500 rounded-md px-4 py-2">Back to Feedback</Link>

        </div>
      </div>
    </div>
  );
};

export default FeedbackResults;
