'use client';

import { useCallback, useState } from 'react';
import { detectFileType } from '@/lib/lyricsExtractor';
import { generateChordmarkRenderedContent } from '../chordmark-converter/clientRenderUtils';
import type { SongVersion } from '../songs/types';
import useSongVersionPanel from './useSongVersionPanel';

type ResolveSongContext = (selectedVersion: SongVersion | null) => {
  songId: string | null;
  previousVersionId?: string | null;
};

type VersionSelectionOptions = {
  initialVersion?: SongVersion;
  skipUrlUpdate?: boolean;
};

type UseVersionPanelManagerOptions = {
  userName: string | null;
  getBasePath: () => string;
  resolveSongContext: ResolveSongContext;
  onVersionCreated?: (version: SongVersion) => Promise<void> | void;
  onVersionArchived?: (version: SongVersion) => Promise<void> | void;
};

const useVersionPanelManager = ({
  userName,
  getBasePath,
  resolveSongContext,
  onVersionCreated,
  onVersionArchived,
}: UseVersionPanelManagerOptions) => {
  const panelState = useSongVersionPanel();
  const {
    selectedVersion,
    newVersionForm,
    selectVersionById,
    clearSelection,
    startEditingVersion,
    cancelEditing,
    updateForm,
  } = panelState;

  const [panelError, setPanelError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const resetPanelError = useCallback(() => setPanelError(null), []);

  const pushHistory = useCallback(
    (path: string) => {
      if (typeof window !== 'undefined') {
        window.history.pushState(null, '', path);
      }
    },
    [],
  );

  const handleVersionClick = useCallback(
    async (versionId: string, options?: VersionSelectionOptions) => {
      if (!versionId) {
        return;
      }

      if (selectedVersion?.id === versionId) {
        clearSelection();
        setPanelError(null);
        if (!options?.skipUrlUpdate) {
          pushHistory(getBasePath());
        }
        return;
      }

      setPanelError(null);
      const version = await selectVersionById(versionId, {
        initialVersion: options?.initialVersion,
        onError: (message) => setPanelError(message),
      });

      if (version && !options?.skipUrlUpdate) {
        pushHistory(`${getBasePath()}/${versionId}`);
      }
    },
    [selectedVersion?.id, clearSelection, selectVersionById, getBasePath, pushHistory],
  );

  const handleClosePanel = useCallback(() => {
    clearSelection();
    resetPanelError();
    pushHistory(getBasePath());
  }, [clearSelection, getBasePath, pushHistory, resetPanelError]);

  const handleCreateVersionClick = useCallback(() => {
    if (!selectedVersion) {
      return;
    }
    startEditingVersion(selectedVersion);
    setPanelError(null);
  }, [selectedVersion, startEditingVersion]);

  const handleCancelCreateVersion = useCallback(() => {
    cancelEditing();
    resetPanelError();
  }, [cancelEditing, resetPanelError]);

  const handleFormChange = useCallback(
    (updates: Partial<typeof newVersionForm>) => {
      resetPanelError();
      updateForm(updates);
    },
    [resetPanelError, updateForm],
  );

  const handleSubmitVersion = useCallback(async () => {
    const trimmedLabel = newVersionForm.label.trim();
    if (!trimmedLabel) {
      setPanelError('Label is required');
      return;
    }

    if (!userName || userName.trim().length < 3) {
      setPanelError('Please set your username (at least 3 characters) before creating versions');
      return;
    }

    const { songId, previousVersionId } = resolveSongContext(selectedVersion);
    if (!songId) {
      setPanelError('Could not determine song ID for this version');
      return;
    }

    setIsSubmitting(true);
    resetPanelError();

    try {
      const fileType = detectFileType(trimmedLabel, newVersionForm.content);
      const renderedContent =
        fileType === 'chordmark' && newVersionForm.content
          ? generateChordmarkRenderedContent(newVersionForm.content)
          : undefined;

      const form = newVersionForm as typeof newVersionForm & { slideCredits?: string; programCredits?: string; slidesMovieUrl?: string; slideMovieStart?: number; blobUrl?: string; };

      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          songId,
          label: trimmedLabel,
          content: form.content || null,
          audioUrl: form.audioUrl || null,
          slidesMovieUrl: form.slidesMovieUrl || null,
          slideMovieStart: form.slideMovieStart ?? null,
          bpm: form.bpm || null,
          transpose: form.transpose ?? null,
          previousVersionId: previousVersionId || null,
          createdBy: userName,
          renderedContent,
          slideCredits: form.slideCredits || null,
          programCredits: form.programCredits || null,
          blobUrl: form.blobUrl || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create version');
      }

      const data = await response.json();

      cancelEditing();
      await onVersionCreated?.(data.version as SongVersion);
      await selectVersionById(data.version.id as string, { initialVersion: data.version as SongVersion });
      pushHistory(`${getBasePath()}/${data.version.id as string}`);
    } catch (err) {
      console.error('Error creating version:', err);
      setPanelError(err instanceof Error ? err.message : 'Failed to create version');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    newVersionForm,
    userName,
    resolveSongContext,
    selectedVersion,
    cancelEditing,
    onVersionCreated,
    selectVersionById,
    pushHistory,
    getBasePath,
    resetPanelError,
  ]);

  const handleArchiveVersion = useCallback(async () => {
    if (!selectedVersion) {
      return;
    }

    if (typeof window !== 'undefined' && !window.confirm('Delete this version?')) {
      return;
    }

    setIsArchiving(true);
    resetPanelError();

    try {
      const response = await fetch(`/api/songs/versions/${selectedVersion.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete version');
      }

      await onVersionArchived?.(selectedVersion);
      clearSelection();
      pushHistory(getBasePath());
    } catch (err) {
      console.error('Error deleting version:', err);
      setPanelError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsArchiving(false);
    }
  }, [selectedVersion, onVersionArchived, clearSelection, pushHistory, getBasePath, resetPanelError]);

  return {
    ...panelState,
    panelError,
    isSubmitting,
    isArchiving,
    resetPanelError,
    handleVersionClick,
    handleClosePanel,
    handleCreateVersionClick,
    handleCancelCreateVersion,
    handleFormChange,
    handleSubmitVersion,
    handleArchiveVersion,
  };
};

export type { VersionSelectionOptions };
export default useVersionPanelManager;

