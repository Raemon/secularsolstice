'use client';

import VersionContent from './VersionContent';
import VersionMetadata from './VersionMetadata';
import PreviousVersionsList from './PreviousVersionsList';
import CreateVersionForm from './CreateVersionForm';
import VersionHeader from './VersionHeader';
import type { SongVersion } from './types';
import { useUser } from '../contexts/UserContext';

const VersionDetailPanel = ({songTitle, version, previousVersions, isExpandedPreviousVersions, isCreatingVersion, newVersionForm, isSubmitting, isArchiving, error, onClose, onTogglePreviousVersions, onVersionClick, onCreateVersionClick, onCancelCreateVersion, onFormChange, onSubmitVersion, onArchiveVersion}: {
  songTitle: string;
  version: SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null };
  previousVersions: SongVersion[];
  isExpandedPreviousVersions: boolean;
  isCreatingVersion: boolean;
  newVersionForm: { label: string; content: string; audioUrl: string; bpm: number };
  isSubmitting: boolean;
  isArchiving: boolean;
  error: string | null;
  onClose: () => void;
  onTogglePreviousVersions: () => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string; bpm: number }>) => void;
  onSubmitVersion: () => void;
  onArchiveVersion: () => void;
}) => {
  const { canEdit } = useUser();

  return (
    <div className="border-l border-gray-200 pl-4 w-full h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide lg:p-20 relative">
      <h2 className="font-georgia -ml-8 text-2xl mb-2 flex items-center gap-3">
        <button
          onClick={() => !isCreatingVersion && onClose()}
          className="text-gray-400 hover:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
          disabled={isCreatingVersion}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        {songTitle.replace(/_/g, ' ')}
      </h2>
      <div className="mb-2 flex items-center justify-between sticky top-[-80px]">
        <VersionHeader version={version} />
        {canEdit && (
          <div className="flex items-center gap-2">
            {isCreatingVersion && (
              <button
                onClick={onSubmitVersion}
                className="text-blue-400 text-xs hover:text-blue-800"
                disabled={isSubmitting || isArchiving}
              >
                Save
              </button>
            )}
            {isCreatingVersion && version.id !== 'new' && (
              <button
                onClick={onArchiveVersion}
                className="text-red-600 text-xs hover:text-red-800"
                disabled={isSubmitting || isArchiving}
              >
                Delete
              </button>
            )}
            <button
              onClick={isCreatingVersion ? onCancelCreateVersion : onCreateVersionClick}
              className="text-gray-400 text-xs hover:text-gray-200"
              disabled={isSubmitting || isArchiving}
            >
              {isCreatingVersion ? 'Cancel' : 'Edit'}
            </button>
          </div>
        )}
      </div>
      
      {isCreatingVersion ? (
        <CreateVersionForm
          form={newVersionForm}
          onFormChange={onFormChange}
          onSubmit={onSubmitVersion}
          onCancel={onCancelCreateVersion}
          isSubmitting={isSubmitting || isArchiving}
          error={error}
          autosaveKey={`version-${version.id}`}
          versionCreatedAt={version.createdAt}
        />
      ) : (
        <>
          <VersionContent version={version} />
          <VersionMetadata version={version} />
          <PreviousVersionsList
            previousVersions={previousVersions}
            currentLabel={version.label}
            isExpanded={isExpandedPreviousVersions}
            onToggle={onTogglePreviousVersions}
            onVersionClick={onVersionClick}
          />
          <div className="mt-4 pt-4 border-t border-gray-200 flex gap-4">
            <a
              href={`/songs/${version.id}/print`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs hover:text-blue-600 underline"
            >
              Print View
            </a>
            <a
              href={`/songs/${version.id}/slides`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 text-xs hover:text-blue-600 underline"
            >
              Slides View
            </a>
          </div>
        </>
      )}
    </div>
  );
};

export default VersionDetailPanel;



