import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatRelativeTimestamp } from '@/lib/dateUtils';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

const VersionSelector = ({searchTerm, onSearchChange, filteredVersions, onAddElement, onKeyDown, onCreateVersion, disabled}: {searchTerm: string, onSearchChange: (value: string) => void, filteredVersions: VersionOption[], onAddElement: (versionId: string) => void, onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void, onCreateVersion: (songId: string) => void, disabled: boolean}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm, filteredVersions]);

  useEffect(() => {
    if (!searchTerm || disabled) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onSearchChange('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm, disabled, onSearchChange]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filteredVersions.length) {
      onKeyDown(event);
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
      onAddElement(filteredVersions[selectedIndex].id);
    } else {
      onKeyDown(event);
    }
  };

  return (
    <div ref={containerRef} className="flex-1 min-w-[280px] flex flex-col gap-1">
      <div className="text-sm font-semibold">Add element</div>
      <input
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a song or version label"
        disabled={disabled}
        className="text-sm px-2 py-1"
      />
      {!disabled && searchTerm && filteredVersions.length > 0 && (
        <div className="flex flex-col border border-gray-300">
            {filteredVersions.map((version, index) => (
              <button
                type="button"
                key={version.id}
                onClick={() => onAddElement(version.id)}
                className={`flex justify-between items-center text-left text-sm px-2 py-1 hover:bg-black/80 ${index === selectedIndex ? 'bg-blue-100' : ''}`}
              >
                <span><span className="font-semibold">{version.songTitle}</span> <span className="text-gray-400">{version.label}</span></span>
                <span className="text-gray-400 ml-2">{formatRelativeTimestamp(version.createdAt)}</span>
              </button>
            ))}
          <div className="border-t border-gray-300">
            <button
              type="button"
              onClick={() => onCreateVersion(filteredVersions[0].songId)}
              className="w-full text-left px-2 py-1 text-sm text-blue-400 hover:bg-blue-50"
            >
              + Create new version
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionSelector;

