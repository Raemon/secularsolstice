'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import VersionDetailPanel from '../../songs/VersionDetailPanel';
import { useUser } from '../../contexts/UserContext';
import type { Program, VersionOption, SongSlideData } from '../types';
import type { SongVersion } from '../../songs/types';
import ProgramSelector from './components/ProgramSelector';
import ProgramStructurePanel from './ProgramStructurePanel';
import useVersionPanelManager from '../../hooks/useVersionPanelManager';
import ProgramSlidesView from '../components/ProgramSlidesView';
import { generateSlidesFromHtml } from '../../../src/components/slides/slideGenerators';
import type { Slide } from '../../../src/components/slides/types';
import { extractLyrics } from '../../../lib/lyricsExtractor';

type ProgramBrowserProps = {
  initialProgramId?: string;
  initialVersionId?: string;
};

const ProgramBrowser = ({ initialProgramId, initialVersionId }: ProgramBrowserProps) => {
  const { userName } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
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
    const collectVersionIds = (program: Program | null, visited: Set<string> = new Set()): string[] => {
      if (!program || visited.has(program.id)) {
        return [];
      }
      visited.add(program.id);
      let ids: string[] = [...program.elementIds];
      for (const childId of program.programIds) {
        const childProgram = programMap[childId] || null;
        ids = ids.concat(collectVersionIds(childProgram, visited));
      }
      visited.delete(program.id);
      return ids;
    };

    let isCancelled = false;

    const fetchVersions = () => {
      if (!selectedProgram) {
        setFullVersions({});
        return;
      }

      const versionIdSet = new Set<string>(collectVersionIds(selectedProgram));
      if (versionIdSet.size === 0) {
        setFullVersions({});
        return;
      }

      setFullVersions((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((existingId) => {
          if (!versionIdSet.has(existingId)) {
            delete next[existingId];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      
      versionIdSet.forEach((versionId) => {
        fetch(`/api/songs/versions/${versionId}`)
          .then((response) => {
            if (!response.ok) {
              return null;
            }
            return response.json();
          })
          .then((data) => {
            if (!data || !data.version || isCancelled) {
              return;
            }
            setFullVersions((prev) => ({ ...prev, [versionId]: data.version }));
          })
          .catch((err) => {
            console.error(`Failed to fetch version ${versionId}:`, err);
          });
      });
    };
    
    fetchVersions();

    return () => {
      isCancelled = true;
    };
  }, [selectedProgram, programMap]);

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
    if (!initialVersionId || hasHydratedInitialVersion.current) {
      return;
    }
    if (!programs.length) {
      return;
    }

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

  const allSlides = useMemo(() => {
    if (!selectedProgram) return [];
    
    const convertToLyricsOnly = (content: string, label: string): string => {
      try {
        const lyrics = extractLyrics(content, label);
        return `<div>${lyrics.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}</div>`;
      } catch (err) {
        console.error('Failed to extract lyrics:', err);
        return content;
      }
    };
    
    const linesPerSlide = 10;

    const buildSongSlides = (versionId: string): SongSlideData | null => {
      const version = versionMap[versionId];
      if (!version) {
        return null;
      }
      const fullVersion = fullVersions[versionId];
      let slides: Slide[] = [];
      if (fullVersion) {
        try {
          let contentToProcess = '';
          
          if (fullVersion.content) {
            contentToProcess = convertToLyricsOnly(fullVersion.content, version.label);
          } else if (fullVersion.renderedContent) {
            contentToProcess = fullVersion.renderedContent.htmlLyricsOnly || fullVersion.renderedContent.htmlFull || fullVersion.renderedContent.legacy || '';
          }
          
          if (contentToProcess) {
            slides = generateSlidesFromHtml(contentToProcess, { linesPerSlide });
            
            const titleSlide: Slide = [{ text: version.songTitle, isHeading: true, level: 1 }];
            slides.unshift(titleSlide);
          }
        } catch (err) {
          console.error(`Failed to parse content for ${versionId}:`, err);
        }
      }
      return {
        versionId: version.id,
        songTitle: version.songTitle,
        versionLabel: version.label,
        slides,
      };
    };

    const collectSlides = (program: Program | null, visited: Set<string> = new Set()): SongSlideData[] => {
      if (!program || visited.has(program.id)) {
        return [];
      }
      visited.add(program.id);
      const result: SongSlideData[] = [];
      
      for (const versionId of program.elementIds) {
        const songSlides = buildSongSlides(versionId);
        if (songSlides) {
          result.push(songSlides);
        }
      }
      
      for (const childId of program.programIds) {
        const childProgram = programMap[childId] || null;
        result.push(...collectSlides(childProgram, visited));
      }
      
      visited.delete(program.id);
      return result;
    };
    
    return collectSlides(selectedProgram, new Set());
  }, [selectedProgram, versionMap, fullVersions, programMap]);

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
            <ProgramSelector
              programs={programs}
              selectedProgramId={selectedProgramId}
              onSelect={handleProgramSelect}
            />
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
              <ProgramSlidesView slides={allSlides} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramBrowser;

