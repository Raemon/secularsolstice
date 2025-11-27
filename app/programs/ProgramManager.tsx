'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import DragAndDropList from './components/DragAndDropList';
import ProgramSelector from './components/ProgramSelector';
import VersionSelector from './components/VersionSelector';
import ProgramElementItem from './components/ProgramElementItem';
import VersionDetailPanel from '../songs/VersionDetailPanel';
import type { SongVersion } from '../songs/types';

type Program = {
  id: string;
  title: string;
  elementIds: string[];
  createdAt: string;
};

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
};

const ProgramManager = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isExpandedPreviousVersions, setIsExpandedPreviousVersions] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState({label: '', content: '', audioUrl: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const savedNewProgramTitle = localStorage.getItem('programManager-newProgramTitle');
    const savedSearchTerm = localStorage.getItem('programManager-searchTerm');
    if (savedNewProgramTitle) {
      setNewProgramTitle(savedNewProgramTitle);
    }
    if (savedSearchTerm) {
      setSearchTerm(savedSearchTerm);
    }
  }, []);

  // Save to localStorage when inputs change
  useEffect(() => {
    if (newProgramTitle) {
      localStorage.setItem('programManager-newProgramTitle', newProgramTitle);
    }
  }, [newProgramTitle]);

  useEffect(() => {
    if (searchTerm) {
      localStorage.setItem('programManager-searchTerm', searchTerm);
    }
  }, [searchTerm]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [programResponse, versionsResponse] = await Promise.all([
          fetch('/api/programs'),
          fetch('/api/song-versions'),
        ]);

        if (!programResponse.ok) {
          const data = await programResponse.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load programs');
        }

        if (!versionsResponse.ok) {
          const data = await versionsResponse.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to load song versions');
        }

        const programData = await programResponse.json();
        const versionData = await versionsResponse.json();
        setPrograms(programData.programs || []);
        setVersions(versionData.versions || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const selectedProgram = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }
    return programs.find((program) => program.id === selectedProgramId) || null;
  }, [programs, selectedProgramId]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const filteredVersions = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return versions.slice(0, 8);
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
    return versions
      .filter((version) =>
        version.songTitle.toLowerCase().includes(normalized) ||
        version.label.toLowerCase().includes(normalized)
      )
      .slice(0, 8);
  }, [searchTerm, versions]);

  const refreshProgram = (updatedProgram: Program) => {
    setPrograms((prev) =>
      prev.map((program) => (program.id === updatedProgram.id ? updatedProgram : program))
    );
  };

  const handleCreateProgram = async () => {
    const trimmed = newProgramTitle.trim();
    if (!trimmed) {
      return;
    }

    try {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create program');
      }
      setPrograms((prev) => [...prev, data.program]);
      setSelectedProgramId(data.program.id);
      setNewProgramTitle('');
      setShowCreateModal(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setNewProgramTitle('');
    setError(null);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  const handleAddElement = async (versionId: string) => {
    if (!selectedProgram) {
      return;
    }
    if (selectedProgram.elementIds.includes(versionId)) {
      setSearchTerm('');
      return;
    }

    const nextElementIds = [...selectedProgram.elementIds, versionId];

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      setSearchTerm('');
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  };

  const handleRemoveElement = async (versionId: string) => {
    if (!selectedProgram) {
      return;
    }

    const nextElementIds = selectedProgram.elementIds.filter((id) => id !== versionId);

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  };

  const handleChangeVersion = async (oldId: string, newId: string) => {
    if (!selectedProgram) {
      return;
    }

    const nextElementIds = selectedProgram.elementIds.map((id) => id === oldId ? newId : id);

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  };

  const handleReorderElements = async (reorderedElementIds: string[]) => {
    if (!selectedProgram) {
      return;
    }

    const previousElementIds = selectedProgram.elementIds;
    refreshProgram({ ...selectedProgram, elementIds: reorderedElementIds });

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: reorderedElementIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      setError(null);
    } catch (err) {
      refreshProgram({ ...selectedProgram, elementIds: previousElementIds });
      setError(err instanceof Error ? err.message : 'Failed to update program');
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && filteredVersions.length > 0) {
      event.preventDefault();
      handleAddElement(filteredVersions[0].id);
    }
  };

  const handleCreateModalKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleCreateProgram();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCloseCreateModal();
    }
  };

  const handleElementClick = useCallback(async (versionId: string) => {
    try {
      const response = await fetch(`/api/songs/versions/${versionId}`);
      if (!response.ok) {
        throw new Error('Failed to load version details');
      }
      const data = await response.json();
      setPreviousVersions(data.previousVersions || []);
      if (data.version) {
        setSelectedVersion(data.version as SongVersion);
      }
      setIsExpandedPreviousVersions(false);
      setIsCreatingVersion(false);
      setVersionError(null);
    } catch (err) {
      console.error('Error loading version details:', err);
      setVersionError(err instanceof Error ? err.message : 'Failed to load version');
      setPreviousVersions([]);
    }
  }, []);

  const handleCloseVersionPanel = () => {
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
    setVersionError(null);
  };

  const handleVersionClick = async (version: SongVersion) => {
    await handleElementClick(version.id);
  };

  const handleCreateVersionClick = () => {
    if (selectedVersion) {
      setNewVersionForm({label: selectedVersion.label || '', content: selectedVersion.content || '', audioUrl: selectedVersion.audioUrl || ''});
      setIsCreatingVersion(true);
    }
  };

  const handleCancelCreateVersion = () => {
    setIsCreatingVersion(false);
    setNewVersionForm({label: '', content: '', audioUrl: ''});
    setVersionError(null);
  };

  const handleCreateNewVersion = (songId: string) => {
    const dummyVersion: SongVersion = {
      id: 'new',
      songId: songId,
      label: 'New Version',
      content: '',
      audioUrl: '',
      previousVersionId: null,
      nextVersionId: null,
      originalVersionId: null,
      createdAt: new Date().toISOString(),
    };
    setSelectedVersion(dummyVersion);
    setPreviousVersions([]);
    setNewVersionForm({label: '', content: '', audioUrl: ''});
    setIsCreatingVersion(true);
    setSearchTerm('');
  };

  const handleFormChange = (updates: Partial<{label: string; content: string; audioUrl: string}>) => {
    setNewVersionForm(prev => ({...prev, ...updates}));
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersion) return;
    setIsSubmitting(true);
    setVersionError(null);
    try {
      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({songId: selectedVersion.songId, label: newVersionForm.label, content: newVersionForm.content, audioUrl: newVersionForm.audioUrl, previousVersionId: selectedVersion.id === 'new' ? null : selectedVersion.id}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create version');
      }
      setVersions(prev => [...prev, {id: data.version.id, songId: data.version.songId, label: data.version.label, songTitle: versions.find(v => v.songId === data.version.songId)?.songTitle || '', createdAt: data.version.createdAt}]);
      setIsCreatingVersion(false);
      setNewVersionForm({label: '', content: '', audioUrl: ''});
      await handleElementClick(data.version.id);
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : 'Failed to create version');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading programs...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex gap-3">
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onSelect={setSelectedProgramId} />
          <button type="button" onClick={handleOpenCreateModal} className="text-sm px-3 py-1">
            Create
          </button>
        </div>

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1 w-1/3">
          {!selectedProgram && (
            <p className="text-sm text-gray-600">Create or select a program to begin.</p>
          )}
          {selectedProgram && selectedProgram.elementIds.length === 0 && (
            <p className="text-sm text-gray-600">No elements yet.</p>
          )}
          {selectedProgram && selectedProgram.elementIds.length > 0 && (
            <DragAndDropList
              items={selectedProgram.elementIds}
              onReorder={handleReorderElements}
              keyExtractor={(id) => id}
              renderItem={(id, index) => {
                const version = versionMap[id];
                return <ProgramElementItem id={id} index={index} version={version} allVersions={versions} onRemove={handleRemoveElement} onChangeVersion={handleChangeVersion} onClick={handleElementClick} onCreateNewVersion={handleCreateNewVersion} />;
              }}
            />
          )}
          <VersionSelector
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filteredVersions={filteredVersions}
            onAddElement={handleAddElement}
            onKeyDown={handleKeyDown}
            onCreateVersion={handleCreateNewVersion}
            disabled={!selectedProgram}
          />
        </div>
      </div>

      {selectedVersion && (
        <VersionDetailPanel
          songTitle={versions.find(v => v.songId === selectedVersion.songId)?.songTitle || ''}
          version={selectedVersion}
          previousVersions={previousVersions}
          isExpandedPreviousVersions={isExpandedPreviousVersions}
          isCreatingVersion={isCreatingVersion}
          newVersionForm={newVersionForm}
          isSubmitting={isSubmitting}
          error={versionError}
          onClose={handleCloseVersionPanel}
          onTogglePreviousVersions={() => setIsExpandedPreviousVersions(!isExpandedPreviousVersions)}
          onVersionClick={handleVersionClick}
          onCreateVersionClick={handleCreateVersionClick}
          onCancelCreateVersion={handleCancelCreateVersion}
          onFormChange={handleFormChange}
          onSubmitVersion={handleSubmitVersion}
        />
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleCloseCreateModal}>
          <div className="bg-white p-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-3">Create New Program</h2>
            <input
              value={newProgramTitle}
              onChange={(event) => setNewProgramTitle(event.target.value)}
              onKeyDown={handleCreateModalKeyDown}
              placeholder="Program title"
              className="text-sm px-2 py-1 w-full mb-3"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={handleCloseCreateModal} className="text-sm px-3 py-1">
                Cancel
              </button>
              <button type="button" onClick={handleCreateProgram} className="text-sm px-3 py-1">
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramManager;


