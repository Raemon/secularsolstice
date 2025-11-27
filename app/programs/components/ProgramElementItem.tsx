'use client';

import ChevronDropdown from '@/app/components/ChevronDropdown';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

const ProgramElementItem = ({id, index, version, allVersions, onRemove, onChangeVersion, onClick, onCreateNewVersion}: {id: string, index: number, version?: VersionOption, allVersions: VersionOption[], onRemove: (id: string) => void, onChangeVersion: (oldId: string, newId: string) => void, onClick?: (versionId: string) => void, onCreateNewVersion?: (songId: string) => void}) => {
  const songVersions = version ? allVersions.filter(v => v.songId === version.songId) : [];
  const dropdownOptions = songVersions.map(v => ({value: v.id, label: v.label}));

  return (
    <div className="text-sm px-2 py-1 flex items-center gap-2 hover:bg-gray-50 cursor-pointer" onClick={() => onClick?.(id)}>
      <span className="font-semibold">{index + 1}.</span>
      <span className="font-georgia w-[200px] truncate hover:text-blue-600">{version?.songTitle.replace(/_/g, ' ')}</span>
      <div className="flex items-center gap-1">
        <span className="text-gray-600">{version?.label ?? id}</span>
        <ChevronDropdown
          value={id}
          options={dropdownOptions}
          onChange={(newId) => {
            if (newId && newId !== id) {
              onChangeVersion(id, newId);
            }
          }}
          footer={
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (version?.songId && onCreateNewVersion) {
                  onCreateNewVersion(version.songId);
                }
              }}
            >
              + Create new version
            </div>
          }
        />
      </div>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(id); }} draggable={false} className="text-xs px-2 py-0.5 ml-auto text-red-600 hover:text-red-800">X</button>
    </div>
  );
};

export default ProgramElementItem;

