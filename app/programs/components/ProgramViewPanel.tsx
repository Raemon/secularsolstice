import ProgramSlidesView from './ProgramSlidesView';
import VersionDetailPanel from '../../songs/VersionDetailPanel';
import type { SongVersion } from '../../songs/types';
import type { Program, VersionOption, SongSlideData } from '../types';

type ProgramViewPanelProps = {
  selectedProgram: Program | null;
  selectedVersion: SongVersion | null;
  versions: VersionOption[];
  previousVersions: SongVersion[];
  isExpandedPreviousVersions: boolean;
  isCreatingVersion: boolean;
  newVersionForm: {
    label: string;
    content: string;
    audioUrl: string;
    slidesMovieUrl: string;
    slideMovieStart: number;
    bpm: number;
    transpose: number;
    previousVersionId: string;
    nextVersionId: string;
    slideCredits: string;
    programCredits: string;
  };
  isSubmitting: boolean;
  isArchiving: boolean;
  versionError: string | null;
  slides: SongSlideData[];
  isVersionLoading: boolean;
  onCloseVersionPanel: () => void;
  onTogglePreviousVersions: () => void;
  onVersionClick: (version: SongVersion) => void;
  onCreateVersionClick: () => void;
  onCancelCreateVersion: () => void;
  onFormChange: (updates: Partial<{label: string; content: string; audioUrl: string; slidesMovieUrl: string; slideMovieStart: number; bpm: number; transpose: number; previousVersionId: string; nextVersionId: string; slideCredits: string; programCredits: string;}>) => void;
  onSubmitVersion: () => void;
  onArchiveVersion: () => void;
};

const ProgramViewPanel = ({selectedProgram, selectedVersion, versions, previousVersions, isExpandedPreviousVersions, isCreatingVersion, newVersionForm, isSubmitting, isArchiving, versionError, slides, isVersionLoading, onCloseVersionPanel, onTogglePreviousVersions, onVersionClick, onCreateVersionClick, onCancelCreateVersion, onFormChange, onSubmitVersion, onArchiveVersion}: ProgramViewPanelProps) => {
  if (selectedProgram && !selectedVersion) {
    return (
      <div className="w-1/3 overflow-y-auto max-h-screen">
        <ProgramSlidesView slides={slides} />
      </div>
    );
  }

  if (!selectedVersion) {
    return null;
  }

  const songTitle = versions.find(v => v.songId === selectedVersion.songId)?.songTitle || '';

  return (
    <VersionDetailPanel
      songTitle={songTitle}
      version={selectedVersion}
      previousVersions={previousVersions}
      isExpandedPreviousVersions={isExpandedPreviousVersions}
      isCreatingVersion={isCreatingVersion}
      newVersionForm={newVersionForm}
      isSubmitting={isSubmitting}
      isArchiving={isArchiving}
      error={versionError}
      isLoadingVersion={isVersionLoading}
      songId={selectedVersion.songId}
      tags={[]}
      onClose={onCloseVersionPanel}
      onTogglePreviousVersions={onTogglePreviousVersions}
      onVersionClick={onVersionClick}
      onCreateVersionClick={onCreateVersionClick}
      onCancelCreateVersion={onCancelCreateVersion}
      onFormChange={onFormChange}
      onSubmitVersion={onSubmitVersion}
      onArchiveVersion={onArchiveVersion}
    />
  );
};

export default ProgramViewPanel;


