'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VersionDetailPanel from '../../songs/VersionDetailPanel';
import { useUser } from '../../contexts/UserContext';
import type { Program, VersionOption } from '../types';
import type { SongVersion } from '../../songs/types';
import ProgramSelector from './components/ProgramSelector';
import ProgramStructurePanel from './ProgramStructurePanel';
import ProgramViews from './ProgramViews';
import useVersionPanelManager from '../../hooks/useVersionPanelManager';

type ProgramBrowserProps = {
  initialProgramId?: string;
  initialVersionId?: string;
};

const ProgramBrowser = ({ initialProgramId, initialVersionId }: ProgramBrowserProps) => {
  const { userName, canEdit } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const hasHydratedInitialVersion = useRef(false);
  const getBasePath = useCallback(
    () => (selectedProgramId ? `/programs/${selectedProgramId}` : '/programs'),
    [selectedProgramId],
  );
  const resolveSongContext = useCallback(
    (selectedVersion: SongVersion | null) => ({
      songId: selectedVersion?.songId ?? null,
      previousVersionId: selectedVersion?.id ?? null,
    }),
    [],
  );
  const loadPrograms = useCallback(async () => {
    setIsLoadingPrograms(true);
    try {
      const response = await fetch('/api/programs');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load programs');
      }
      const data = await response.json();
      setPrograms(data.programs || []);
      setDataError(null);
    } catch (err) {
      console.error('Failed to load programs:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to load programs');
    } finally {
      setIsLoadingPrograms(false);
    }
  }, []);

  const loadVersionOptions = useCallback(async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch('/api/song-versions');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load song versions');
      }
      const data = await response.json();
      setVersions(data.versions || []);
      setDataError(null);
    } catch (err) {
      console.error('Failed to load song versions:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to load song versions');
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  useEffect(() => {
    loadVersionOptions();
  }, [loadVersionOptions]);
  
  const {
    selectedVersion,
    previousVersions,
    isExpandedPreviousVersions,
    isCreatingVersion,
    newVersionForm,
    clearSelection,
    togglePreviousVersions,
    handleVersionClick,
    handleClosePanel,
    handleCreateVersionClick,
    handleCancelCreateVersion,
    handleFormChange,
    handleSubmitVersion,
    handleArchiveVersion,
    panelError,
    isSubmitting,
    isArchiving,
    resetPanelError,
  } = useVersionPanelManager({
    userName,
    getBasePath,
    resolveSongContext,
    onVersionCreated: loadVersionOptions,
    onVersionArchived: loadVersionOptions,
  });

  const loading = isLoadingPrograms || isLoadingVersions;

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((program) => {
      map[program.id] = program;
    });
    return map;
  }, [programs]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const selectedProgram = selectedProgramId ? programMap[selectedProgramId] ?? null : null;

  useEffect(() => {
    if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const handleProgramSelect = (programId: string | null) => {
    if (selectedProgramId === programId) {
      return;
    }
    setSelectedProgramId(programId);
    clearSelection();
    resetPanelError();
    if (typeof window !== 'undefined') {
      if (programId) {
        window.history.pushState(null, '', `/programs/${programId}`);
      } else {
        window.history.pushState(null, '', '/programs');
      }
    }
  };

  const handleReorderElements = useCallback(async (programId: string, reorderedElementIds: string[]) => {
    const program = programMap[programId];
    if (!program) {
      return;
    }
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: reorderedElementIds, programIds: program.programIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to reorder elements');
      }
      const data = await response.json();
      setPrograms((prev) => prev.map((p) => (p.id === programId ? data.program : p)));
    } catch (err) {
      console.error('Failed to reorder elements:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to reorder elements');
    }
  }, [programMap]);

  const handleChangeVersion = useCallback(async (programId: string, oldId: string, newId: string) => {
    const program = programMap[programId];
    if (!program) {
      return;
    }
    const nextElementIds = program.elementIds.map((id) => id === oldId ? newId : id);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update program');
      }
      const data = await response.json();
      setPrograms((prev) => prev.map((p) => (p.id === programId ? data.program : p)));
      setDataError(null);
    } catch (err) {
      console.error('Failed to change version:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to change version');
    }
  }, [programMap]);

  const handleAddElement = useCallback(async (programId: string, versionId: string) => {
    const program = programMap[programId];
    if (!program) {
      return;
    }
    if (program.elementIds.includes(versionId)) {
      return;
    }
    const nextElementIds = [...program.elementIds, versionId];
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to add element');
      }
      const data = await response.json();
      setPrograms((prev) => prev.map((p) => (p.id === programId ? data.program : p)));
      setDataError(null);
    } catch (err) {
      console.error('Failed to add element:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to add element');
    }
  }, [programMap]);

  const handleRemoveElement = useCallback(async (programId: string, elementId: string) => {
    const program = programMap[programId];
    if (!program) {
      return;
    }
    const nextElementIds = program.elementIds.filter((id) => id !== elementId);
    try {
      const response = await fetch(`/api/programs/${programId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to remove element');
      }
      const data = await response.json();
      setPrograms((prev) => prev.map((p) => (p.id === programId ? data.program : p)));
      setDataError(null);
    } catch (err) {
      console.error('Failed to remove element:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to remove element');
    }
  }, [programMap]);

  const handleCreateSubprogram = useCallback(async () => {
    if (!selectedProgramId || !userName) {
      return;
    }
    const parentProgram = programMap[selectedProgramId];
    if (!parentProgram) {
      return;
    }
    const title = typeof window !== 'undefined' ? window.prompt('Subprogram title') : null;
    const trimmedTitle = (title ?? '').trim();
    if (!trimmedTitle) {
      return;
    }
    try {
      const createResponse = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle, createdBy: userName, isSubprogram: true }),
      });
      const createData = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(createData.error || 'Failed to create subprogram');
      }
      const newProgram: Program = createData.program;
      setPrograms((prev) => prev.some((p) => p.id === newProgram.id) ? prev : [...prev, newProgram]);
      const updatedProgramIds = parentProgram.programIds.includes(newProgram.id) ? parentProgram.programIds : [...parentProgram.programIds, newProgram.id];
      const patchResponse = await fetch(`/api/programs/${parentProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: parentProgram.elementIds, programIds: updatedProgramIds }),
      });
      const patchData = await patchResponse.json().catch(() => ({}));
      if (!patchResponse.ok) {
        throw new Error(patchData.error || 'Failed to attach subprogram');
      }
      setPrograms((prev) => prev.map((p) => {
        if (p.id === parentProgram.id) {
          return patchData.program;
        }
        if (p.id === newProgram.id) {
          return newProgram;
        }
        return p;
      }));
      setDataError(null);
    } catch (err) {
      console.error('Failed to create subprogram:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to create subprogram');
    }
  }, [programMap, selectedProgramId, userName]);

  const containsVersion = useCallback(
    (program: Program | null, targetVersionId: string, visited: Set<string>): boolean => {
      if (!program || visited.has(program.id)) {
        return false;
      }
      if (program.elementIds.includes(targetVersionId)) {
        return true;
      }
      visited.add(program.id);
      const found = program.programIds.some((childId) =>
        containsVersion(programMap[childId] ?? null, targetVersionId, visited),
      );
      visited.delete(program.id);
      return found;
    },
    [programMap],
  );

  useEffect(() => {
    if (!initialVersionId || hasHydratedInitialVersion.current) return;
    if (!programs.length) return;

    hasHydratedInitialVersion.current = true;

    if (!selectedProgramId && initialProgramId && programMap[initialProgramId]) {
      setSelectedProgramId(initialProgramId);
    } else if (!selectedProgramId) {
      const programWithVersion = programs.find((program) =>
        containsVersion(program, initialVersionId, new Set()),
      );
      if (programWithVersion) {
        setSelectedProgramId(programWithVersion.id);
      }
    }

    handleVersionClick(initialVersionId, { skipUrlUpdate: true });
  }, [
    containsVersion,
    handleVersionClick,
    initialProgramId,
    initialVersionId,
    programMap,
    programs,
    selectedProgramId,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading programs...</p>
        </div>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-red-600">Error: {dataError}</p>
        </div>
      </div>
    );
  }

  if (!programs.length) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">No programs yet.</p>
        </div>
      </div>
    );
  }

  const activeSongTitle =
    (selectedVersion && versionMap[selectedVersion.id]?.songTitle) || selectedVersion?.label || '';

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4 justify-center">
          <div>
            <div className="flex items-center justify-between">
              <ProgramSelector
                programs={programs}
                selectedProgramId={selectedProgramId}
                onSelect={handleProgramSelect}
                onProgramCreated={(program) => setPrograms((prev) => prev.some((p) => p.id === program.id) ? prev : [...prev, program])}
              />
              <div className="flex items-center gap-2">
                {canEdit && userName && selectedProgramId && (
                  <button
                    type="button"
                    onClick={handleCreateSubprogram}
                    className="text-sm px-2 py-1 underline"
                  >
                    Create subprogram
                  </button>
                )}
                <ProgramViews programId={selectedProgramId} />
              </div>
            </div>
            <ProgramStructurePanel
              program={selectedProgram}
              programMap={programMap}
              versions={versions}
              versionMap={versionMap}
              selectedVersionId={selectedVersion?.id}
              onVersionClick={handleVersionClick}
              onReorderElements={handleReorderElements}
              onChangeVersion={handleChangeVersion}
              onAddElement={handleAddElement}
              onRemoveElement={handleRemoveElement}
              canEdit={canEdit}
              onSongCreated={loadVersionOptions}
            />
          </div>  
          {selectedVersion ? (
            <div className="flex-3 flex-grow">
              <VersionDetailPanel
                songTitle={activeSongTitle.replace(/_/g, ' ')}
                version={selectedVersion}
                previousVersions={previousVersions}
                isExpandedPreviousVersions={isExpandedPreviousVersions}
                isCreatingVersion={isCreatingVersion}
                newVersionForm={newVersionForm}
                isSubmitting={isSubmitting}
                isArchiving={isArchiving}
                error={panelError}
                songId={selectedVersion.songId}
                tags={[]}
                onClose={handleClosePanel}
                onTogglePreviousVersions={togglePreviousVersions}
                onVersionClick={(version: SongVersion) => handleVersionClick(version.id)}
                onCreateVersionClick={handleCreateVersionClick}
                onCancelCreateVersion={handleCancelCreateVersion}
                onFormChange={handleFormChange}
                onSubmitVersion={handleSubmitVersion}
                onArchiveVersion={handleArchiveVersion}
              />
            </div>
          ) : (
            <div className="flex-3 flex-grow">
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramBrowser;

