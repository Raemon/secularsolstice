'use client';

import { useState } from 'react';
import SongTags from './SongTags';
import SongTitle from './SongTitle';
import { useUser } from '../contexts/UserContext';

const SongInfoHeader = ({songId, title, tags = [], onClose, disableClose = false, onArchive}: {
  songId?: string;
  title: string;
  tags?: string[];
  onClose: () => void;
  disableClose?: boolean;
  onArchive?: () => void;
}) => {
  const { canEdit } = useUser();
  const [isArchiving, setIsArchiving] = useState(false);
  const handleArchive = async () => {
    if (!songId || !canEdit) return;
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true }),
      });
      if (!response.ok) throw new Error('Failed to archive song');
      onArchive?.();
      onClose();
    } catch (err) {
      console.error('Error archiving song:', err);
    } finally {
      setIsArchiving(false);
    }
  };
  return (
    <>
      <h2 className="font-georgia sm:-ml-8 text-4xl my-8 sm:mt-0 flex items-center gap-3 text-balance">
        <button
          onClick={() => !disableClose && onClose()}
          className="hidden sm:block text-gray-400 hover:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
          disabled={disableClose}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <SongTitle songId={songId} title={title} />
        {/* commented out until I can make archiving a bit more safe --Ray */}
        {/* {songId && canEdit && (
          <button
            onClick={handleArchive}
            disabled={isArchiving}
            className="text-gray-500 hover:text-red-500 text-xs disabled:opacity-50"
            title="Archive song"
          >
            {isArchiving ? '...' : 'archive'}
          </button>
        )} */}
      </h2>
      <SongTags songId={songId} initialTags={tags} />
    </>
  );
};

export default SongInfoHeader;



