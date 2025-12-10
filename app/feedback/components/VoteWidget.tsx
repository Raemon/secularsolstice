'use client';

import { useCallback, useEffect, useState } from 'react';
import { useUser } from '../../contexts/UserContext';
import Tooltip from '@/app/components/Tooltip';

// CRITICAL: This type must NEVER include 'name' field
// Vote names are NEVER sent from the API to protect voter privacy
type VoteRecord = {
  id: string;
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
    { weight: 3, label: 'Easy', tooltip: 'Easy to sing' },
    { weight: 2, label: 'Med', tooltip: 'Medium difficulty to sing' },
    { weight: 1, label: 'Hard', tooltip: 'Hard to sing' },
  ],
};

export type PreloadedVote = {
  version_id: string;
  weight: number;
  type: string;
  category: string;
  created_at: string;
};

export type VoteWidgetProps = {
  versionId: string;
  songId: string;
  category: 'quality' | 'singability';
  hideVotes?: boolean;
  preloadedUserVote?: PreloadedVote | null;
};

const VoteWidget: React.FC<VoteWidgetProps> = ({ versionId, songId, category, hideVotes = false, preloadedUserVote }) => {
  const { userId, userName } = useUser();
  const [votes, setVotes] = useState<VoteRecord[]>([]);
  const [currentUserVote, setCurrentUserVote] = useState<VoteRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVotes = useCallback(async () => {
    if (hideVotes) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const userParam = userId ? `&userId=${encodeURIComponent(userId)}` : '';
      const response = await fetch(`/api/votes?versionId=${versionId}&category=${category}${userParam}`);
      if (!response.ok) {
        throw new Error('Failed to load votes');
      }
      const data = await response.json();
      const fetchedVotes = data.votes || [];
      setVotes(fetchedVotes);
      setCurrentUserVote(data.currentUserVote || null);
    } catch (err) {
      console.error('Failed to load votes:', err);
      setError('Unable to load votes');
    } finally {
      setIsLoading(false);
    }
  }, [versionId, category, userId, hideVotes]);

  useEffect(() => {
    loadVotes();
  }, [loadVotes]);

  useEffect(() => {
    if (preloadedUserVote) {
      setCurrentUserVote({
        id: preloadedUserVote.version_id,
        weight: preloadedUserVote.weight,
        type: preloadedUserVote.type,
        versionId: preloadedUserVote.version_id,
        songId: songId,
        createdAt: preloadedUserVote.created_at,
        category: preloadedUserVote.category,
      });
    }
  }, [preloadedUserVote, songId]);

  const handleVote = async (option: { weight: number; label: string; }) => {
    const trimmedName = userName.trim();
    if (trimmedName.length < 3) {
      setError('Set your name (3+ chars) to vote');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    setError(null);
    const previousVotes = votes;
    const previousUserVote = currentUserVote;

    // Toggle off if clicking the same vote
    if (currentUserVote && currentUserVote.weight === option.weight) {
      // Remove user's vote from the count
      setCurrentUserVote(null);
      setIsSaving(true);

      try {
        const response = await fetch(`/api/votes?versionId=${versionId}&userId=${encodeURIComponent(userId)}&category=${category}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete vote');
        }

        const data = await response.json();
        setVotes(data.votes || []);
        setCurrentUserVote(data.currentUserVote || null);
      } catch (err) {
        console.error('Failed to delete vote:', err);
        setVotes(previousVotes);
        setCurrentUserVote(previousUserVote);
        setError('Unable to delete vote');
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Optimistic update for current user's vote
    const optimisticVote: VoteRecord = {
      id: currentUserVote?.id || `temp-${Date.now()}`,
      weight: option.weight,
      type: option.label,
      versionId,
      songId,
      createdAt: currentUserVote?.createdAt || new Date().toISOString(),
      category,
    };

    setCurrentUserVote(optimisticVote);
    setIsSaving(true);

    try {
      const response = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId,
          songId,
          userId,
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
      setVotes(data.votes || []);
      setCurrentUserVote(data.currentUserVote || null);
    } catch (err) {
      console.error('Failed to save vote:', err);
      setVotes(previousVotes);
      setCurrentUserVote(previousUserVote);
      setError('Unable to save vote');
    } finally {
      setIsSaving(false);
    }
  };

  const options = voteOptions[category];
  
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <div className="flex items-center gap-1 py-1 p-1">
        {options.map((option) => {
          const button = <button
              key={option.label}
              onClick={() => handleVote(option)}
              aria-label={option.label}
              aria-pressed={currentUserVote?.weight === option.weight}
              className={`px-[6px] py-[3px] rounded-md disabled:opacity-50 
                ${currentUserVote?.weight === option.weight && 'bg-gray-500'} 
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
        <VoteDots votes={votes} isLoading={isLoading} />
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
        const size = Math.abs(vote.weight) === 3 ? 6 : 3;
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
      })}
    </>
  );
};

export default VoteWidget;

