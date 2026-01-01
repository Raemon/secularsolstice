'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import VersionDetailPanel from '../../songs/VersionDetailPanel';
import { useUser } from '../../contexts/UserContext';
import type { Program, VersionOption } from '../types';
import type { SongVersion } from '../../songs/types';
import ProgramSelector from './components/ProgramSelector';
import ProgramStructurePanel from './ProgramStructurePanel';
import ProgramViews from './ProgramViews';
import ProgramEditPanel from './ProgramEditPanel';
import useVersionPanelManager from '../../hooks/useVersionPanelManager';
import Link from 'next/link';

type PendingElementChanges = Record<string, string[]>;

type ProgramBrowserProps = {
  initialProgramId?: string;
  initialVersionId?: string;
};

const ProgramBrowser = ({ initialProgramId, initialVersionId }: ProgramBrowserProps) => {
  const pathname = usePathname();
  const { userName, canEdit, isAdmin } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [pendingElementChanges, setPendingElementChanges] = useState<PendingElementChanges>({});
  const [pendingDeletions, setPendingDeletions] = useState<Set<string>>(new Set());
  const [isSavingChanges, setIsSavingChanges] = useState(false);
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

  const collectProgramHierarchy = useCallback((programId: string | null, visited: Set<string> = new Set()): Set<string> => {
    if (!programId || visited.has(programId)) return visited;
    const program = programs.find((p) => p.id === programId);
    if (!program) return visited;
    visited.add(programId);
    program.programIds.forEach((subId) => collectProgramHierarchy(subId, visited));
    return visited;
  }, [programs]);

  const replaceVersionInProgramHierarchy = useCallback(async (oldVersionId: string, newVersionId: string) => {
    const hierarchyIds = collectProgramHierarchy(selectedProgramId);
    const programsToUpdate = programs.filter((p) => hierarchyIds.has(p.id) && p.elementIds.includes(oldVersionId));
    const updatePromises = programsToUpdate.map(async (program) => {
      const nextElementIds = program.elementIds.map((id) => id === oldVersionId ? newVersionId : id);
      try {
        const response = await fetch(`/api/programs/${program.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds }),
        });
        if (!response.ok) {
          console.error(`Failed to update program ${program.id}`);
          return null;
        }
        const data = await response.json();
        return data.program as Program;
      } catch (err) {
        console.error(`Failed to update program ${program.id}:`, err);
        return null;
      }
    });
    const updatedPrograms = await Promise.all(updatePromises);
    const successfulUpdates = updatedPrograms.filter((p): p is Program => p !== null);
    if (successfulUpdates.length > 0) {
      setPrograms((prev) => prev.map((p) => {
        const updated = successfulUpdates.find((u) => u.id === p.id);
        return updated ?? p;
      }));
    }
  }, [programs, selectedProgramId, collectProgramHierarchy]);
  
  const handleVersionCreated = useCallback(async (newVersion: SongVersion) => {
    const oldVersionId = newVersion.previousVersionId;
    if (oldVersionId) {
      await replaceVersionInProgramHierarchy(oldVersionId, newVersion.id);
    }
    await loadVersionOptions();
  }, [replaceVersionInProgramHierarchy, loadVersionOptions]);

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
    onVersionCreated: handleVersionCreated,
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

  // When editing, overlay pending changes on top of actual program data
  const effectiveProgramMap = useMemo(() => {
    if (!isEditingProgram || Object.keys(pendingElementChanges).length === 0) {
      return programMap;
    }
    const map: Record<string, Program> = { ...programMap };
    Object.entries(pendingElementChanges).forEach(([programId, elementIds]) => {
      if (map[programId]) {
        map[programId] = { ...map[programId], elementIds };
      }
    });
    return map;
  }, [programMap, pendingElementChanges, isEditingProgram]);

  const hasPendingChanges = Object.keys(pendingElementChanges).length > 0 || pendingDeletions.size > 0;

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const selectedProgram = selectedProgramId ? effectiveProgramMap[selectedProgramId] ?? null : null;

  const isProgramLocked = useCallback((programId: string): boolean => {
    const program = programMap[programId];
    return program?.locked ?? false;
  }, [programMap]);

  const parentProgram = useMemo(() => {
    if (!selectedProgramId) return null;
    return programs.find((p) => p.programIds.includes(selectedProgramId)) ?? null;
  }, [programs, selectedProgramId]);

  useEffect(() => {
    if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
  }, [programs, selectedProgramId]);

  const handleProgramSelect = (programId: string | null) => {
    if (selectedProgramId === programId) {
      return;
    }
    if (hasPendingChanges) {
      const confirmed = typeof window !== 'undefined' && window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
      setPendingElementChanges({});
      setPendingDeletions(new Set());
    }
    setSelectedProgramId(programId);
    setIsEditingProgram(false);
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

  const handleEditClick = () => {
    clearSelection();
    setIsEditingProgram(true);
  };

  const handleVersionClickWithEditClose = useCallback((versionId: string, options?: { skipUrlUpdate?: boolean }) => {
    if (hasPendingChanges) {
      const confirmed = typeof window !== 'undefined' && window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
      setPendingElementChanges({});
      setPendingDeletions(new Set());
    }
    setIsEditingProgram(false);
    return handleVersionClick(versionId, options);
  }, [handleVersionClick, hasPendingChanges]);

  const handleCloseEditPanel = () => {
    if (hasPendingChanges) {
      const confirmed = typeof window !== 'undefined' && window.confirm('You have unsaved changes. Discard them?');
      if (!confirmed) return;
    }
    handleCancelPendingChanges();
  };

  const handleProgramUpdated = (updatedProgram: Program) => {
    setPrograms((prev) => prev.map((p) => (p.id === updatedProgram.id ? updatedProgram : p)));
  };

  const handleReorderElements = useCallback(async (programId: string, reorderedElementIds: string[]) => {
    const program = effectiveProgramMap[programId];
    if (!program) {
      return;
    }
    if (isEditingProgram) {
      setPendingElementChanges((prev) => ({ ...prev, [programId]: reorderedElementIds }));
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
  }, [effectiveProgramMap, isEditingProgram]);

  const handleChangeVersion = useCallback(async (programId: string, oldId: string, newId: string) => {
    const program = effectiveProgramMap[programId];
    if (!program) {
      return;
    }
    const nextElementIds = program.elementIds.map((id) => id === oldId ? newId : id);
    if (isEditingProgram) {
      setPendingElementChanges((prev) => ({ ...prev, [programId]: nextElementIds }));
      return;
    }
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
  }, [effectiveProgramMap, isEditingProgram]);

  const handleAddElement = useCallback(async (programId: string, versionId: string) => {
    const program = effectiveProgramMap[programId];
    if (!program) {
      return;
    }
    if (program.elementIds.includes(versionId)) {
      return;
    }
    const nextElementIds = [...program.elementIds, versionId];
    if (isEditingProgram) {
      setPendingElementChanges((prev) => ({ ...prev, [programId]: nextElementIds }));
      return;
    }
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
  }, [effectiveProgramMap, isEditingProgram]);

  const handleRemoveElement = useCallback(async (programId: string, elementId: string) => {
    const program = effectiveProgramMap[programId];
    if (!program) {
      return;
    }
    if (isEditingProgram) {
      setPendingDeletions((prev) => new Set(prev).add(elementId));
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
  }, [effectiveProgramMap, isEditingProgram]);

  const handleSavePendingChanges = useCallback(async () => {
    const entries = Object.entries(pendingElementChanges);
    const programsToUpdate = new Map<string, string[]>();
    entries.forEach(([programId, elementIds]) => {
      programsToUpdate.set(programId, elementIds);
    });
    if (pendingDeletions.size > 0) {
      const hierarchyIds = collectProgramHierarchy(selectedProgramId);
      programs.filter((p) => hierarchyIds.has(p.id)).forEach((program) => {
        const currentElements = programsToUpdate.get(program.id) ?? program.elementIds;
        const filteredElements = currentElements.filter((id) => !pendingDeletions.has(id));
        if (filteredElements.length !== currentElements.length) {
          programsToUpdate.set(program.id, filteredElements);
        }
      });
    }
    if (programsToUpdate.size === 0) {
      setIsEditingProgram(false);
      setPendingDeletions(new Set());
      return;
    }
    setIsSavingChanges(true);
    const results = await Promise.allSettled(
      Array.from(programsToUpdate.entries()).map(async ([programId, elementIds]) => {
        const program = programMap[programId];
        if (!program) throw new Error(`Program ${programId} not found`);
        const response = await fetch(`/api/programs/${programId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elementIds, programIds: program.programIds }),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Failed to update program ${programId}`);
        }
        const data = await response.json();
        return { programId, program: data.program as Program };
      })
    );
    const succeeded: Program[] = [];
    const failedIds: string[] = [];
    const errors: string[] = [];
    results.forEach((result, index) => {
      const programId = Array.from(programsToUpdate.keys())[index];
      if (result.status === 'fulfilled') {
        succeeded.push(result.value.program);
      } else {
        failedIds.push(programId);
        errors.push(result.reason?.message || 'Unknown error');
      }
    });
    if (succeeded.length > 0) {
      setPrograms((prev) => prev.map((p) => {
        const updated = succeeded.find((u) => u.id === p.id);
        return updated ?? p;
      }));
    }
    if (failedIds.length > 0) {
      setPendingElementChanges((prev) => {
        const next: Record<string, string[]> = {};
        failedIds.forEach((id) => { if (prev[id]) next[id] = prev[id]; });
        return next;
      });
      console.error('Failed to save some changes:', errors);
      setDataError(`Failed to save: ${errors.join(', ')}`);
    } else {
      setPendingElementChanges({});
      setPendingDeletions(new Set());
      setIsEditingProgram(false);
      setDataError(null);
    }
    setIsSavingChanges(false);
  }, [pendingElementChanges, pendingDeletions, programMap, programs, selectedProgramId, collectProgramHierarchy]);

  const handleCancelPendingChanges = useCallback(() => {
    setPendingElementChanges({});
    setPendingDeletions(new Set());
    setIsEditingProgram(false);
  }, []);

  const handleCreateSubprogram = useCallback(async (programId: string) => {
    if (!programId || !userName) {
      return;
    }
    const parentProgram = programMap[programId];
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
  }, [programMap, userName]);

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

  useEffect(() => {
    // Clear version selection when navigating back to program list or program detail (without version)
    // Pathname patterns:
    // - /programs -> no version
    // - /programs/[programId] -> no version
    // - /programs/[programId]/[versionId] -> has version
    const segments = pathname.split('/').filter(Boolean);
    if (segments[0] === 'programs' && segments.length <= 2) {
      clearSelection();
    }
  }, [pathname, clearSelection]);

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
    <div className="px-2 py-1 sm:p-4">
      canEdit: {canEdit ? 'true' : 'false'}<br/>
      isEditingProgram: {isEditingProgram ? 'true' : 'false'}<br/>
      pendingDeletions: {JSON.stringify(pendingDeletions)}<br/>
      pendingElementChanges: {JSON.stringify(pendingElementChanges)}<br/>
      hasPendingChanges: {hasPendingChanges ? 'true' : 'false'}<br/>
      isSavingChanges: {isSavingChanges ? 'true' : 'false'}<br/>
      isProgramLocked: {isProgramLocked(selectedProgramId ?? '') ? 'true' : 'false'}<br/>
      parentProgram: {JSON.stringify(parentProgram)}<br/>
      <div className="flex flex-col gap-4">
        <div className={`flex ${selectedVersion || isEditingProgram ? '' : 'mx-auto'} gap-4 overflow-x-scroll w-full sm:w-auto sm:overflow-x-visible`}>
          <div className={`overflow-x-scroll sm:overflow-x-visible ${selectedVersion || isEditingProgram ? 'hidden xl:block' : ''} w-auto`}>
            {parentProgram && (
              <div className="text-sm text-gray-400 mb-4">
                Part of <Link href={`/programs/${parentProgram.id}`} className="text-white hover:underline">{parentProgram.title}</Link>
              </div>
            )}
            <div className="flex items-center justify-between">
              <ProgramSelector
                programs={programs}
                selectedProgramId={selectedProgramId}
                onSelect={handleProgramSelect}
                onProgramCreated={(program) => setPrograms((prev) => prev.some((p) => p.id === program.id) ? prev : [...prev, program])}
              />
            </div>
            <div className="mt-4 ml-1 mb-8">
              <ProgramViews programId={selectedProgramId ?? ''} canEdit={canEdit} isLocked={isProgramLocked(selectedProgramId ?? '')} isEditing={isEditingProgram} hasPendingChanges={hasPendingChanges} isSaving={isSavingChanges} onEditClick={handleEditClick} onSaveClick={handleSavePendingChanges} onCancelClick={handleCancelPendingChanges} />
            </div>
            <ProgramStructurePanel
              program={selectedProgram}
              programMap={effectiveProgramMap}
              versions={versions}
              versionMap={versionMap}
              selectedVersionId={selectedVersion?.id}
              onVersionClick={handleVersionClickWithEditClose}
              onReorderElements={handleReorderElements}
              onChangeVersion={handleChangeVersion}
              onAddElement={handleAddElement}
              onRemoveElement={handleRemoveElement}
              canEdit={canEdit}
              isEditing={isEditingProgram}
              onSongCreated={loadVersionOptions}
              onCreateSubprogram={handleCreateSubprogram}
              isProgramLocked={isProgramLocked}
              pendingDeletions={pendingDeletions}
            />
          </div>  
          {selectedVersion ? (
            <div className="flex-3 flex-grow min-w-0">
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
                tags={versionMap[selectedVersion.id]?.tags || []}
                songId={selectedVersion.songId}
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
          ) : isEditingProgram && selectedProgramId ? (
            <div className="flex-3 flex-grow min-w-0">
              <ProgramEditPanel
                programId={selectedProgramId}
                onClose={handleCloseEditPanel}
                onProgramUpdated={handleProgramUpdated}
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
