'use client';

import { useEffect, useRef, useState } from 'react';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

const ProgramElementItem = ({id, index, version, allVersions, onRemove, onChangeVersion}: {id: string, index: number, version?: VersionOption, allVersions: VersionOption[], onRemove: (id: string) => void, onChangeVersion: (oldId: string, newId: string) => void}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const songVersions = version ? allVersions.filter(v => v.songId === version.songId) : [];
  
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="text-sm px-2 py-1 flex items-center gap-2 hover:bg-gray-50">
      <span className="font-semibold">{index + 1}.</span>
      <span className="font-georgia w-[200px] truncate">{version?.songTitle.replace(/_/g, ' ')}</span>
      <div className="relative" ref={dropdownRef}>
        <button type="button" onClick={() => setIsOpen(!isOpen)} draggable={false} className="text-gray-600 hover:text-gray-900 flex items-center gap-1">
          {version?.label ?? id}
          <span className="text-xs">▼</span>
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 bg-white border border-gray-300 shadow-lg min-w-[200px]">
            <div className="max-h-[200px] overflow-y-auto">
              {songVersions.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    if (v.id !== id) {
                      onChangeVersion(id, v.id);
                    }
                    setIsOpen(false);
                  }}
                  draggable={false}
                  className={`w-full text-left px-2 py-1 text-sm hover:bg-gray-100 ${v.id === id ? 'bg-gray-100 font-semibold' : ''}`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-300">
              <button
                type="button"
                onClick={() => {
                  window.open(`/songs?song=${version?.songId}`, '_blank');
                  setIsOpen(false);
                }}
                draggable={false}
                className="w-full text-left px-2 py-1 text-sm text-blue-600 hover:bg-blue-50"
              >
                + Create new version
              </button>
            </div>
          </div>
        )}
      </div>
      <button type="button" onClick={() => onRemove(id)} draggable={false} className="text-xs px-2 py-0.5 ml-auto text-red-600 hover:text-red-800">X</button>
    </div>
  );
};

export default ProgramElementItem;

