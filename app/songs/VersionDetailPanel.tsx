import VersionContent from './VersionContent';
import VersionMetadata from './VersionMetadata';
import PreviousVersionsList from './PreviousVersionsList';
import CreateVersionForm from './CreateVersionForm';
import type { SongVersion } from './types';

const VersionDetailPanel = ({songTitle, version, previousVersions, isExpandedPreviousVersions, isCreatingVersion, newVersionForm, isSubmitting, error, onClose, onTogglePreviousVersions, onVersionClick, onCreateVersionClick, onCancelCreateVersion, onFormChange, onSubmitVersion}: {
  songTitle: string;
  version: SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null };
  previousVersions: SongVersion[];
  isExpandedPreviousVersions: boolean;
  isCreatingVersion: boolean;
  newVersionForm: { label: string; content: string; audioUrl: string; bpm: number };
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onTogglePreviousVersions: () => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string; bpm: number }>) => void;
  onSubmitVersion: () => void;
}) => {
  return (
    <div className="border-l border-gray-200 pl-4 w-full h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide lg:p-20">
      <h2 className="font-mono -ml-8 text-lg font-semibold text-gray-900 mb-2 flex items-center gap-3">
        <button
          onClick={() => !isCreatingVersion && onClose()}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-gray-400"
          disabled={isCreatingVersion}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        {songTitle.replace(/_/g, ' ')}
      </h2>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-800 mb-1">
          {version.label}
        </h3>
        <div className="flex items-center gap-2">
          {isCreatingVersion && (
            <button
              onClick={onSubmitVersion}
              className="text-blue-600 text-xs hover:text-blue-800"
              disabled={isSubmitting}
            >
              Save
            </button>
          )}
          <button
            onClick={isCreatingVersion ? onCancelCreateVersion : onCreateVersionClick}
            className="text-gray-600 text-xs hover:text-gray-800"
            disabled={isSubmitting}
          >
            {isCreatingVersion ? 'Cancel' : 'Edit'}
          </button>
        </div>
      </div>
      
      {isCreatingVersion ? (
        <CreateVersionForm
          form={newVersionForm}
          onFormChange={onFormChange}
          onSubmit={onSubmitVersion}
          onCancel={onCancelCreateVersion}
          isSubmitting={isSubmitting}
          error={error}
        />
      ) : (
        <>
          <PreviousVersionsList
            previousVersions={previousVersions}
            currentLabel={version.label}
            isExpanded={isExpandedPreviousVersions}
            onToggle={onTogglePreviousVersions}
            onVersionClick={onVersionClick}
          />
          <VersionContent version={version} />
          <VersionMetadata version={version} />
        </>
      )}
    </div>
  );
};

export default VersionDetailPanel;



