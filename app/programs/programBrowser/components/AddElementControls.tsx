'use client';

import { useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react';
import type { VersionOption } from '../../types';
import { formatRelativeTimestamp } from '@/lib/dateUtils';
import CreateSongButton from '../../../components/CreateSongButton';
import type { SongRecord, SongVersionRecord } from '@/lib/songsRepository';

export type AddElementControlsProps = {
  programId: string;
  versions: VersionOption[];
  onAddElement: (programId: string, versionId: string) => void | Promise<void>;
  onSongCreated?: (data?: { song?: SongRecord; version?: SongVersionRecord }) => Promise<void> | void;
};

const AddElementControls = ({ programId, versions, onAddElement, onSongCreated }: AddElementControlsProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredVersions = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return [];
    }
    return versions
      .filter((version) =>
        version.nextVersionId === null && (
          version.songTitle.trim().toLowerCase().includes(normalizedSearch) ||
          version.label.trim().toLowerCase().includes(normalizedSearch)
        )
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [searchTerm, versions]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm, filteredVersions]);

  useEffect(() => {
    if (!searchTerm) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filteredVersions.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(prev => prev < filteredVersions.length - 1 ? prev + 1 : prev);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      void onAddElement(programId, filteredVersions[selectedIndex].id);
      setSearchTerm('');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div ref={containerRef} className="mt-2 flex flex-col gap-1">
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add song..."
          className="text-sm px-2 py-1"
        />
        {searchTerm && filteredVersions.length > 0 && (
          <div className="flex flex-col border border-gray-300">
            {filteredVersions.map((version, index) => (
              <button
                type="button"
                key={version.id}
                onClick={() => {
                  void onAddElement(programId, version.id);
                  setSearchTerm('');
                }}
                className={`flex justify-between items-center text-left text-sm px-2 py-1 hover:bg-black/80 ${index === selectedIndex ? 'bg-blue-100' : ''}`}
              >
                <span><span className="font-semibold">{version.songTitle}</span> <span className="text-gray-400">{version.label}</span></span>
                <span className="text-gray-400 ml-2">{formatRelativeTimestamp(version.createdAt)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <CreateSongButton
        onSongCreated={onSongCreated}
      />
      <CreateSongButton
        defaultTags={['speech']}
        buttonText="+ Speech"
        onSongCreated={async (data?: { song?: SongRecord; version?: SongVersionRecord }) => {
          if (data?.version?.id) {
            await onAddElement(programId, data.version.id);
          }
          if (onSongCreated) {
            await onSongCreated(data);
          }
        }}
      />
    </div>
  );
};

export default AddElementControls;

