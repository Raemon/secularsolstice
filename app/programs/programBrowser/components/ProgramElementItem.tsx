'use client';

import ChevronDropdown from '@/app/components/ChevronDropdown';
import { formatRelativeTimestamp } from '@/lib/dateUtils';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
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
  isEditing?: boolean;
  selectedVersionId?: string;
  isPendingDeletion?: boolean;
};

const ProgramElementItem = ({id, version, allVersions, onRemove, onChangeVersion, onClick, onCreateNewVersion, canEdit, isEditing, selectedVersionId, isPendingDeletion}: ProgramElementItemProps) => {
  const songVersions = version ? allVersions.filter(v => v.songId === version.songId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
  const dropdownOptions = songVersions.map(v => ({value: v.id, label: `${v.label} - ${formatRelativeTimestamp(v.createdAt)}`}));
  const sameLabelVersions = version ? songVersions.filter(v => v.label === version.label) : [];
  const isLatestVersion = sameLabelVersions.length === 0 || version?.id === sameLabelVersions[0]?.id;
  const isSpeech = version?.tags?.includes('speech');

  return (
    <div className={`text-sm ${isEditing ? 'pl-[8px]' : ''} flex items-center gap-4 hover:bg-black cursor-pointer group  ${selectedVersionId === id && 'text-primary'} ${isPendingDeletion ? 'opacity-50 line-through' : ''}`}>
      <span className={`font-georgia text-base flex-1 min-w-0 py-1 truncate hover:text-blue-400 ${isSpeech ? 'italic' : ''} w-[100px] truncate overflow-hidden text-ellipsis sm:w-auto`} onClick={() => onClick?.(id)}>
        {version?.songTitle}
      </span>
      <div className={`text-gray-400 flex items-center gap-2 shrink-0 text-xs ${!isLatestVersion && 'opacity-50'}`}>
        <span className={`${selectedVersionId === id ? 'text-primary' : 'text-gray-400'} truncate w-[50px] sm:w-[200px] py-1 `} onClick={() => onClick?.(id)}>
          {version?.label ?? id}
        </span>
        <span className="text-gray-400 w-[40px] text-right">{formatRelativeTimestamp(version?.createdAt ?? '')}</span>
        {canEdit && <ChevronDropdown
            value={id}
            options={dropdownOptions}
            onChange={(newId) => {
              if (newId && newId !== id) {
                onChangeVersion(id, newId);
              }
            }}
          />
        }
      </div>
      {canEdit && isEditing && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(id); }} draggable={false} className="text-xs px-2 py-0.5 text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 z-[1]">X</button>
      )}
    </div>
  );
};

export default ProgramElementItem;
