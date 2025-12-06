'use client';

import { useCallback, useState } from 'react';
import type { SongVersion } from '../songs/types';

const defaultFormState = {
  label: '',
  content: '',
  audioUrl: '',
  slidesMovieUrl: '',
  bpm: 100,
  transpose: 0,
  previousVersionId: '',
  nextVersionId: '',
  slideCredits: '',
  programCredits: '',
};

type VersionFormState = typeof defaultFormState;

type SelectVersionOptions = {
  initialVersion?: SongVersion;
  onError?: (message: string) => void;
};

const useSongVersionPanel = () => {
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isExpandedPreviousVersions, setIsExpandedPreviousVersions] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState<VersionFormState>(defaultFormState);

  const selectVersionById = useCallback(async (versionId: string, options?: SelectVersionOptions) => {
    if (options?.initialVersion) {
      setSelectedVersion(options.initialVersion);
    }
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
    try {
      const response = await fetch(`/api/songs/versions/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to load version details');
      }
      const data = await response.json();
      setPreviousVersions(data.previousVersions || []);
      if (data.version) {
        setSelectedVersion(data.version as SongVersion);
        return data.version as SongVersion;
      }
    } catch (err) {
      console.error('Error loading version details:', err);
      setPreviousVersions([]);
      if (options?.onError) {
        options.onError(err instanceof Error ? err.message : 'Failed to load version');
      }
    }
    return null;
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
  }, []);

  const togglePreviousVersions = useCallback(() => {
    setIsExpandedPreviousVersions((prev) => !prev);
  }, []);

  const startEditingVersion = useCallback((version?: SongVersion | null) => {
    if (version) {
      setNewVersionForm({
        label: version.label || '',
        content: version.content || '',
        audioUrl: version.audioUrl || '',
        slidesMovieUrl: version.slidesMovieUrl || '',
        bpm: version.bpm || 100,
        transpose: version.transpose ?? 0,
        previousVersionId: version.previousVersionId || '',
        nextVersionId: version.nextVersionId || '',
        slideCredits: version.slideCredits || '',
        programCredits: version.programCredits || '',
      });
    } else {
      setNewVersionForm(defaultFormState);
    }
    setIsCreatingVersion(true);
  }, []);

  const cancelEditing = useCallback(() => {
    setIsCreatingVersion(false);
    setNewVersionForm(defaultFormState);
  }, []);

  const updateForm = useCallback((updates: Partial<VersionFormState>) => {
    setNewVersionForm((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    selectedVersion,
    previousVersions,
    isExpandedPreviousVersions,
    isCreatingVersion,
    newVersionForm,
    selectVersionById,
    clearSelection,
    togglePreviousVersions,
    startEditingVersion,
    cancelEditing,
    updateForm,
    setSelectedVersion,
    setPreviousVersions,
    setIsCreatingVersion,
  };
};

export default useSongVersionPanel;


