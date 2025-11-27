import { useEffect, useRef, type KeyboardEvent } from 'react';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

const VersionSelector = ({searchTerm, onSearchChange, filteredVersions, onAddElement, onKeyDown, disabled}: {searchTerm: string, onSearchChange: (value: string) => void, filteredVersions: VersionOption[], onAddElement: (versionId: string) => void, onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void, disabled: boolean}) => {
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={containerRef} className="flex-1 min-w-[280px] flex flex-col gap-1">
      <div className="text-sm font-semibold">Add element</div>
      <input
        value={searchTerm}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a song or version label"
        disabled={disabled}
        className="text-sm px-2 py-1"
      />
      {!disabled && searchTerm && filteredVersions.length > 0 && (
        <div className="flex flex-col">
          {filteredVersions.map((version) => (
            <button
              type="button"
              key={version.id}
              onClick={() => onAddElement(version.id)}
              className="text-left text-sm px-2 py-1 hover:bg-gray-100"
            >
              <span className="font-semibold">{version.songTitle}</span> <span className="text-gray-600">{version.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VersionSelector;

