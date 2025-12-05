'use client';

import ChevronDropdown from '@/app/components/ChevronDropdown';
import { formatRelativeTimestamp } from '@/lib/dateUtils';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

export type ProgramElementItemProps = {
  id: string;
  index: number;
  version?: VersionOption;
  allVersions: VersionOption[];
  onRemove: (id: string) => void;
  onChangeVersion: (oldId: string, newId: string) => void;
  onClick?: (versionId: string) => void;
  onCreateNewVersion?: (songId: string) => void;  
  canEdit: boolean;
  selectedVersionId?: string;
};

const ProgramElementItem = ({id, index, version, allVersions, onRemove, onChangeVersion, onClick, onCreateNewVersion, canEdit, selectedVersionId}: ProgramElementItemProps) => {
  const songVersions = version ? allVersions.filter(v => v.songId === version.songId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  const dropdownOptions = songVersions.map(v => ({value: v.id, label: `${v.label} - ${formatRelativeTimestamp(v.createdAt)}`}));
  const isLatestVersion = songVersions.length === 0 || version?.id === songVersions[0]?.id;

  return (
    <div className={`text-sm px-2 py-1 flex items-center gap-2 hover:bg-black cursor-pointer group ${selectedVersionId === id && 'text-primary'}`} onClick={() => onClick?.(id)}>
      <span className="font-georgia text-base w-[250px] truncate hover:text-blue-400">{version?.songTitle}</span>
      <div className="flex items-center gap-1">
        <div className={`text-gray-400 w-[150px] truncate flex items-center justify-between gap-1 ${!isLatestVersion && 'opacity-50'}`}>
          <span className={`${selectedVersionId === id ? 'text-primary' : 'text-gray-300'} w-[180px] truncate`}>{version?.label ?? id}</span>
          <span className="text-gray-400 text-xs">{formatRelativeTimestamp(version?.createdAt ?? '')}</span>
        </div>
        <ChevronDropdown
          value={id}
          options={dropdownOptions}
          onChange={(newId) => {
            if (newId && newId !== id) {
              onChangeVersion(id, newId);
            }
          }}
          footer={canEdit ? (
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
          ) : undefined}
        />
      </div>
      {canEdit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(id); }} draggable={false} className="text-xs px-2 py-0.5 ml-auto text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100">X</button>
      )}
    </div>
  );
};

export default ProgramElementItem;

