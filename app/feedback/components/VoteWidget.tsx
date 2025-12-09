'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import Tooltip from '@/app/components/Tooltip';

type VoteRecord = {
  id: string;
  name: string;
  weight: number;
  type: string;
  versionId: string;
  songId: string;
  createdAt: string;
  category: string;
};

type VoteOption = {
  weight: number;
  label: string;
  tooltip?: string;
};
export const voteOptions: Record<string, VoteOption[]> = {
  "quality": [
    { weight: -3, label: 'Hate' },
    { weight: -1, label: 'Dislike' },
    { weight: 0, label: 'Eh' },
    { weight: 1, label: 'Like' },
    { weight: 3, label: 'Love' },
  ],
  "singability": [
    { weight: -1, label: 'Easy', tooltip: 'Easy to sing' },
    { weight: 0, label: 'Med', tooltip: 'Medium difficulty to sing' },
    { weight: 1, label: 'Hard', tooltip: 'Hard to sing' },
  ],
};

const VoteWidget = ({ versionId, songId, category, hideVotes = false }: {versionId: string; songId: string, category: 'quality' | 'singability', hideVotes?: boolean}) => {
  const { userName } = useUser();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const loadVotes = useCallback(async () => {
    if (hideVotes) return
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/votes?versionId=${versionId}&category=${category}`);
      if (!response.ok) {
        throw new Error('Failed to load votes');
      }
      const data = await response.json();
      const fetchedVotes = data.votes || [];
      setVotes(fetchedVotes);
    } catch (err) {
      console.error('Failed to load votes:', err);
      setError('Unable to load votes');
    } finally {
      setIsLoading(false);
    }
  }, [versionId, category]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  const handleVote = async (option: { weight: number; label: string; }) => {
    const trimmedName = userName.trim();
    if (trimmedName.length < 3) {
      setError('Set your name (3+ chars) to vote');
      return;
    }

    setError(null);
    const previousVotes = votes;
    const existing = votes.find((vote) => vote.name === trimmedName);

    // Toggle off if clicking the same vote
    if (existing && existing.weight === option.weight) {
      const updatedVotes = votes.filter((vote) => vote.name !== trimmedName);
      setVotes(updatedVotes);
      setIsSaving(true);

      try {
        const response = await fetch(`/api/votes?versionId=${versionId}&name=${encodeURIComponent(trimmedName)}&category=${category}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete vote');
        }

        const data = await response.json();
        const savedVotes = data.votes || updatedVotes;
        setVotes(savedVotes);
      } catch (err) {
        console.error('Failed to delete vote:', err);
        setVotes(previousVotes);
        setError('Unable to delete vote');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    const optimisticVote: VoteRecord = {
      id: existing?.id || `temp-${Date.now()}`,
      name: trimmedName,
      weight: option.weight,
      type: option.label,
      versionId,
      songId,
      createdAt: existing?.createdAt || new Date().toISOString(),
      category,
    };

    const updatedVotes = existing
      ? votes.map((vote) => vote.name === trimmedName ? optimisticVote : vote)
      : [...votes, optimisticVote];

    setVotes(updatedVotes);
    setIsSaving(true);

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          songId,
          name: trimmedName,
          weight: option.weight,
          type: option.label,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save vote');
      }

      const data = await response.json();
      const savedVotes = data.votes || updatedVotes;
      setVotes(savedVotes);
    } catch (err) {
      console.error('Failed to save vote:', err);
      setVotes(previousVotes);
      setError('Unable to save vote');
    } finally {
      setIsSaving(false);
    }
  };

  const currentWeight = useMemo(() => {
    const trimmedName = userName.trim();
    if (!trimmedName) {
      return undefined;
    }
    const existing = votes.find((vote) => vote.name === trimmedName);
    return existing?.weight;
  }, [userName, votes]);

  const voteDots = <VoteDots votes={votes} isLoading={isLoading} />;

  const options = voteOptions[category];
  

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-2 py-1 p-1">
        {options.map((option) => {
          const button = <button
              key={option.label}
              onClick={() => handleVote(option)}
              aria-label={option.label}
              aria-pressed={currentWeight === option.weight}
              className={`px-2 py-1 rounded-md disabled:opacity-50 
                ${currentWeight === option.weight && 'bg-gray-500'} 
                ${category === 'quality' && 'border border-gray-500'}`}
            >
              {option.label}
            </button>
          if (option.tooltip) {
            return <Tooltip key={option.label} content={option.tooltip}>{button}</Tooltip>;
          }
          return button;
        })}
      </div>

      {!hideVotes && <div className="flex items-center gap-1">
        {voteDots}
      </div>}
      {error && <span className="text-red-600 ml-2">{error}</span>}
    </div>
  );
};

const VoteDots = ({votes, isLoading}: {votes: VoteRecord[]; isLoading: boolean}) => {
  if (isLoading) {
    return <span className="text-gray-400">Loading votes...</span>;
  }
  if (votes.length === 0) {
    return <span className="text-gray-400">No votes</span>;
  }
  return (
    <>
      {votes.map((vote) => {
        const size = Math.abs(vote.weight) === 3 ? 12 : 6;
        const color = vote.weight > 0 ? 'var(--primary)' : vote.weight === 0 ? '#fff' : '#9ca3af';
        return (
          <Tooltip key={vote.id} content={vote.name}>
            <span
              key={vote.id}
              title={vote.name}
              className="inline-block rounded-full"
              style={{ width: `${size}px`, height: `${size}px`, backgroundColor: color }}
            />
          </Tooltip>
        );
      })}
    </>
  );
};

export default VoteWidget;
