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
  newVersionForm: { label: string; content: string; audioUrl: string };
  isSubmitting: boolean;
  error: string | null;
  onClose: () => void;
  onTogglePreviousVersions: () => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
  onFormChange: (updates: Partial<{ label: string; content: string; audioUrl: string }>) => void;
  onSubmitVersion: () => void;
}) => {
  return (
    <div className="border-l border-gray-200 pl-4 w-full max-w-xl">
      <h2 className="font-mono text-lg font-semibold text-gray-900 mb-2">{songTitle.replace(/_/g, ' ')}</h2>
      <div className="mb-2">
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={onClose}
            className="text-gray-400 text-xs"
          >
            × Close
          </button>
          <button
            onClick={isCreatingVersion ? onCancelCreateVersion : onCreateVersionClick}
            className="text-gray-600 text-xs"
            disabled={isSubmitting}
          >
            {isCreatingVersion ? 'Cancel' : 'Edit'}
          </button>
        </div>
        <h3 className="font-mono text-sm font-medium text-gray-800 mb-1">
          {version.label}
        </h3>
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



