'use client';

import VersionContent from './VersionContent';
import VersionMetadata from './VersionMetadata';
import CreateVersionForm from './CreateVersionForm';
import VersionHeader from './VersionHeader';
import SongTags from './SongTags';
import SongTitle from './SongTitle';
import ChangelogPage from '../changelog/ChangelogPage';
import type { SongVersion } from './types';
import { useUser } from '../contexts/UserContext';
import Tooltip from '../components/Tooltip';

const VersionActionButtons = ({isCreatingVersion, version, isSubmitting, isArchiving, canEdit, onSubmitVersion, onArchiveVersion, onCreateVersionClick, onCancelCreateVersion}: {
  isCreatingVersion: boolean;
  version: SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null };
  isSubmitting: boolean;
  isArchiving: boolean;
  canEdit: boolean;
  onSubmitVersion: () => void;
  onArchiveVersion: () => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      {isCreatingVersion && (
        <button
          onClick={onSubmitVersion}
          className="text-blue-400 text-xs hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting || isArchiving || !canEdit}
        >
          Save
        </button>
      )}
      {isCreatingVersion && version.id !== 'new' && (
        <button
          onClick={onArchiveVersion}
          className="text-red-600 text-xs hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-red-800"
          disabled={isSubmitting || isArchiving || !canEdit}
        >
          Delete
        </button>
      )}
      <button
        onClick={isCreatingVersion ? onCancelCreateVersion : onCreateVersionClick}
        className="text-gray-400 text-xs hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isSubmitting || isArchiving || !canEdit}
      >
        {isCreatingVersion ? 'Cancel' : 'Edit'}
      </button>
    </div>
  );
};

const VersionDetailPanel = ({songTitle, version, isCreatingVersion, newVersionForm, isSubmitting, isArchiving, error, isLoadingVersion = false, songId, tags: initialTags = [], onClose, onCreateVersionClick, onCancelCreateVersion, onFormChange, onSubmitVersion, onArchiveVersion, onTitleChange}: {
  songTitle: string;
  version: SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null };
  previousVersions: SongVersion[];
  isExpandedPreviousVersions: boolean;
  isCreatingVersion: boolean;
  newVersionForm: { label: string; content: string; audioUrl: string; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string };
  isSubmitting: boolean;
  isArchiving: boolean;
  error: string | null;
  isLoadingVersion?: boolean;
  songId?: string;
  tags?: string[];
  onClose: () => void;
  onTogglePreviousVersions: () => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string }>) => void;
  onSubmitVersion: () => void;
  onArchiveVersion: () => void;
  onTitleChange?: (newTitle: string) => void;
}) => {
  const { canEdit } = useUser();

  if (isLoadingVersion) {
    return (
      <div className="border-l border-gray-200 pl-4 w-full h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide lg:p-20 relative flex items-center justify-center text-gray-400">
        Loading version...
      </div>
    );
  }

  return (
    <div className="border-l border-gray-200 pl-4 w-full h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide lg:p-20 relative ">
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
        <SongTitle songId={songId} title={songTitle} onTitleChange={onTitleChange} />
      </h2>
      <SongTags songId={songId} initialTags={initialTags} />
      <div className="mb-2 flex items-center justify-between sticky top-[-80px]">
        <VersionHeader version={version} />
          {canEdit ? (
            <VersionActionButtons
              isCreatingVersion={isCreatingVersion}
              version={version}
              isSubmitting={isSubmitting}
              isArchiving={isArchiving}
              canEdit={canEdit}
              onSubmitVersion={onSubmitVersion}
              onArchiveVersion={onArchiveVersion}
              onCreateVersionClick={onCreateVersionClick}
              onCancelCreateVersion={onCancelCreateVersion}
            />
          ) : (
            <Tooltip content="to edit, type your name in the top-right">
              <VersionActionButtons
                isCreatingVersion={isCreatingVersion}
                version={version}
                isSubmitting={isSubmitting}
                isArchiving={isArchiving}
                canEdit={canEdit}
                onSubmitVersion={onSubmitVersion}
                onArchiveVersion={onArchiveVersion}
                onCreateVersionClick={onCreateVersionClick}
                onCancelCreateVersion={onCancelCreateVersion}
              />
            </Tooltip>
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
          {songId && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-xs text-gray-400 mb-2">History</h3>
              <ChangelogPage songId={songId} compact />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VersionDetailPanel;



