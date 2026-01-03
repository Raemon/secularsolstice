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

  if (!canEdit) return <Tooltip content="Enter your name (top-right of screen) to create a song">
    <button className="text-xs px-2 py-1 border border-gray-500 rounded-sm text-white whitespace-nowrap opacity-50" disabled={true}>{buttonText}</button>
    </Tooltip>;

  return (
    <>
      <button
        onClick={() => setIsCreatingSong(!isCreatingSong)}
        className="text-xs px-2 py-1 border border-gray-500 rounded-sm text-white whitespace-nowrap"
      >
        {buttonText}
      </button>
      {isCreatingSong && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setIsCreatingSong(false); setNewSongTitle(''); resetError(); }}>
          <div className="p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">Create New {buttonText.replace('+ ', '')}</h2>
            <input
              type="text"
              value={newSongTitle}
              onChange={(e) => { setNewSongTitle(e.target.value); resetError(); }}
              placeholder={`${buttonText.replace('+ ', '')} title`}
              className="text-sm px-2 py-1 w-full mb-3"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSong()}
              autoFocus
            />
            {createSongError && (
              <div className="text-red-600 text-xs mb-3">{createSongError}</div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setIsCreatingSong(false); setNewSongTitle(''); resetError(); }} className="text-sm px-3 py-1">
                Cancel
              </button>
              <button onClick={handleCreateSong} disabled={isSubmittingSong} className="text-sm px-3 py-1">
                {isSubmittingSong ? '...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CreateSongButton;
