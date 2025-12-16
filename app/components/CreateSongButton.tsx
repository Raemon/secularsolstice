'use client';

import { useUser } from '../contexts/UserContext';
import useCreateSong from '../hooks/useCreateSong';
import type { SongRecord, SongVersionRecord } from '@/lib/songsRepository';
import Tooltip from './Tooltip';

export type CreateSongButtonProps = {
  onSongCreated?: (data?: { song?: SongRecord; version?: SongVersionRecord }) => Promise<void> | void;
  onError?: (error: string) => void;
  defaultTags?: string[];
  buttonText?: string;
  versionLabel?: string;
};

const CreateSongButton = ({ onSongCreated, onError, defaultTags, buttonText = '+ Song', versionLabel }: CreateSongButtonProps) => {
  const { canEdit, userName } = useUser();
  const {
    isCreatingSong,
    setIsCreatingSong,
    newSongTitle,
    setNewSongTitle,
    isSubmittingSong,
    error: createSongError,
    handleCreateSong,
    resetError,
  } = useCreateSong({createdBy: userName, onSongCreated, onError, defaultTags, versionLabel});

  if (!canEdit) return <Tooltip content="Enter your name (top-right of screen) to create a song"><button className="text-xs px-2 py-1 border border-gray-500 rounded-sm text-white whitespace-nowrap opacity-50" disabled={true}>{buttonText}</button></Tooltip>;

  return (
    <>
      <button
        onClick={() => setIsCreatingSong(!isCreatingSong)}
        className="text-xs px-2 py-1 border border-gray-500 rounded-md text-white whitespace-nowrap"
      >
        {buttonText}
      </button>
      {isCreatingSong && (
        <div className="mb-3">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={newSongTitle}
              onChange={(e) => { setNewSongTitle(e.target.value); resetError(); }}
              placeholder={`${buttonText} title`}
              className="flex-1 px-2 py-1 text-sm bg-black border border-gray-300"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSong()}
            />
            <button onClick={handleCreateSong} disabled={isSubmittingSong} className="text-xs px-2 py-1 bg-green-600 text-white disabled:opacity-50">
              {isSubmittingSong ? '...' : 'Create'}
            </button>
            <button onClick={() => { setIsCreatingSong(false); setNewSongTitle(''); resetError(); }} className="text-xs px-2 py-1 text-gray-400">
              Cancel
            </button>
          </div>
          {createSongError && (
            <div className="text-red-600 text-xs mt-1">{createSongError}</div>
          )}
        </div>
      )}
    </>
  );
};

export default CreateSongButton;

