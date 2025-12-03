'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import ProgramHeaderControls from './components/ProgramHeaderControls';
import ProgramElementsSection from './components/ProgramElementsSection';
import ProgramViewPanel from './components/ProgramViewPanel';
import CreateProgramModal from './components/CreateProgramModal';
import type { SongVersion } from '../songs/types';
import { useUser } from '../contexts/UserContext';
import { generateSlidesFromHtml } from '../../src/components/slides/slideGenerators';
import type { Slide } from '../../src/components/slides/types';
import { extractLyrics, detectFileType } from '../../lib/lyricsExtractor';
import { generateChordmarkRenderedContent } from '../chordmark-converter/clientRenderUtils';
import type { Program, VersionOption, SongSlideData } from './types';
import useSongVersionPanel from '../hooks/useSongVersionPanel';

type ProgramManagerProps = {
  initialProgramId?: string;
  initialVersionId?: string;
};

const ProgramManager = ({ initialProgramId, initialVersionId }: ProgramManagerProps) => {
  const { canEdit, userName } = useUser();
  const router = useRouter();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const {
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
  } = useSongVersionPanel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDeletingProgram, setIsDeletingProgram] = useState(false);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});
  const fullVersionsRef = useRef(fullVersions);
  useEffect(() => {
    fullVersionsRef.current = fullVersions;
  }, [fullVersions]);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((program) => {
      map[program.id] = program;
    });
    return map;
  }, [programs]);
  const collectProgramTree = useCallback((program: Program | null, visited: Set<string> = new Set()): Program[] => {
    if (!program || visited.has(program.id)) {
      return [];
    }
    visited.add(program.id);
    let result: Program[] = [program];
    for (const childId of program.programIds) {
      const childProgram = programMap[childId] || null;
      result = result.concat(collectProgramTree(childProgram, visited));
    }
    visited.delete(program.id);
    return result;
  }, [programMap]);

  // Load from localStorage on mount
  useEffect(() => {
  const savedNewProgramTitle = localStorage.getItem('programManager-newProgramTitle');
    if (savedNewProgramTitle) {
      setNewProgramTitle(savedNewProgramTitle);
    }
  }, []);

  // Save to localStorage when inputs change
  useEffect(() => {
    if (newProgramTitle) {
      localStorage.setItem('programManager-newProgramTitle', newProgramTitle);
    }
  }, [newProgramTitle]);

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
        console.log(versionData.versions);
        setPrograms(programData.programs || []);
        setVersions(versionData.versions || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (initialProgramId) {
      setSelectedProgramId(initialProgramId);
    } else if (!selectedProgramId && programs.length > 0) {
      setSelectedProgramId(programs[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programs, initialProgramId]);

  const selectedProgram = useMemo(() => {
    if (!selectedProgramId) {
      return null;
    }
    return programs.find((program) => program.id === selectedProgramId) || null;
  }, [programs, selectedProgramId]);

  const programReferencesTarget = useCallback((startId: string, targetId: string, visited: Set<string> = new Set()) => {
    if (startId === targetId) {
      return true;
    }
    if (visited.has(startId)) {
      return false;
    }
    visited.add(startId);
    const program = programMap[startId];
    if (!program) {
      visited.delete(startId);
      return false;
    }
    const result = program.programIds.some((childId) => programReferencesTarget(childId, targetId, visited));
    visited.delete(startId);
    return result;
  }, [programMap]);

  const canReferenceProgram = useCallback((sourceProgram: Program | null, targetProgramId: string) => {
    if (!sourceProgram) {
      return false;
    }
    if (targetProgramId === sourceProgram.id) {
      return false;
    }
    if (sourceProgram.programIds.includes(targetProgramId)) {
      return false;
    }
    return !programReferencesTarget(targetProgramId, sourceProgram.id);
  }, [programReferencesTarget]);

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

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);
  const versionMapRef = useRef(versionMap);
  useEffect(() => {
    versionMapRef.current = versionMap;
  }, [versionMap]);

  const handleSelectProgram = (programId: string | null) => {
    setSelectedProgramId(programId);
    if (programId) {
      router.push(`/programs/${programId}`);
    } else {
      router.push('/programs');
    }
  };

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
        tags: version.tags || [],
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

  const filteredVersions = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return versions.slice(0, 8).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
    return versions
      .filter((version) =>
        version.nextVersionId === null && (
          version.songTitle.toLowerCase().includes(normalized) ||
          version.label.toLowerCase().includes(normalized)
        )
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [searchTerm, versions]);

  const refreshProgram = useCallback((updatedProgram: Program) => {
    setPrograms((prev) =>
      prev.map((program) => (program.id === updatedProgram.id ? updatedProgram : program))
    );
  }, []);
  const updateProgramElementReferences = useCallback(async (oldVersionId: string, newVersionId: string) => {
    if (!selectedProgram) {
      return;
    }
    const relatedPrograms = collectProgramTree(selectedProgram);
    if (relatedPrograms.length === 0) {
      return;
    }
    const programsToUpdate = relatedPrograms.filter((program) => program.elementIds.includes(oldVersionId));
    if (programsToUpdate.length === 0) {
      return;
    }
    await Promise.all(programsToUpdate.map(async (program) => {
      const nextElementIds = program.elementIds.map((id) => id === oldVersionId ? newVersionId : id);
      const response = await fetch(`/api/programs/${program.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: nextElementIds, programIds: program.programIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
    }));
  }, [selectedProgram, collectProgramTree, refreshProgram]);

  const handleArchiveProgram = async () => {
    if (!selectedProgram) {
      return;
    }
    if (!window.confirm('Are you sure?')) {
      return;
    }
    setIsDeletingProgram(true);
    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}/archive`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete program');
      }
      let nextPrograms: Program[] = [];
      let nextProgramId: string | null = null;
      setPrograms((prev) => {
        nextPrograms = prev.filter((program) => program.id !== selectedProgram.id);
        return nextPrograms;
      });
      setSelectedProgramId((currentSelectedId) => {
        if (currentSelectedId !== selectedProgram.id) {
          nextProgramId = currentSelectedId;
          return currentSelectedId;
        }
        nextProgramId = nextPrograms.length > 0 ? nextPrograms[0].id : null;
        return nextProgramId;
      });
      setError(null);
      if (nextProgramId) {
        router.push(`/programs/${nextProgramId}`);
      } else {
        router.push('/programs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete program');
    } finally {
      setIsDeletingProgram(false);
    }
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
        body: JSON.stringify({ title: trimmed, createdBy: userName }),
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
      router.push(`/programs/${data.program.id}`);
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
        body: JSON.stringify({ elementIds: nextElementIds, programIds: selectedProgram.programIds }),
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
        body: JSON.stringify({ elementIds: nextElementIds, programIds: selectedProgram.programIds }),
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
        body: JSON.stringify({ elementIds: nextElementIds, programIds: selectedProgram.programIds }),
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
        body: JSON.stringify({ elementIds: reorderedElementIds, programIds: selectedProgram.programIds }),
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

  const handleAddProgram = async (programId: string) => {
    if (!selectedProgram) {
      return;
    }
    if (!canReferenceProgram(selectedProgram, programId)) {
      setError('Cannot add that program (duplicate or circular reference).');
      return;
    }
    const nextProgramIds = [...selectedProgram.programIds, programId];
    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: selectedProgram.elementIds, programIds: nextProgramIds }),
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

  const handleRemoveProgram = async (programId: string) => {
    if (!selectedProgram) {
      return;
    }
    const nextProgramIds = selectedProgram.programIds.filter((id) => id !== programId);
    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: selectedProgram.elementIds, programIds: nextProgramIds }),
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

  const handleReorderProgramIds = async (reorderedProgramIds: string[]) => {
    if (!selectedProgram) {
      return;
    }

    const previousProgramIds = selectedProgram.programIds;
    refreshProgram({ ...selectedProgram, programIds: reorderedProgramIds });

    try {
      const response = await fetch(`/api/programs/${selectedProgram.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elementIds: selectedProgram.elementIds, programIds: reorderedProgramIds }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update program');
      }
      refreshProgram(data.program);
      setError(null);
    } catch (err) {
      refreshProgram({ ...selectedProgram, programIds: previousProgramIds });
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
    setVersionError(null);
    setPendingVersionId(versionId);
    const existingVersion = fullVersionsRef.current[versionId];
    const fallback = existingVersion
      ? existingVersion
      : (() => {
          const fallbackOption = versionMapRef.current[versionId];
          if (!fallbackOption) {
            return null;
          }
          return {
            id: fallbackOption.id,
            songId: fallbackOption.songId,
            label: fallbackOption.label,
            content: '',
            audioUrl: '',
            previousVersionId: null,
            nextVersionId: fallbackOption.nextVersionId,
            originalVersionId: null,
            renderedContent: null,
            bpm: null,
            archived: false,
            createdAt: fallbackOption.createdAt,
            createdBy: null,
          } as SongVersion;
        })();
    const version = await selectVersionById(versionId, {
      initialVersion: fallback || undefined,
      onError: (message) => setVersionError(message),
    });
    if (version) {
      setFullVersions((prev) => ({ ...prev, [version.id]: version }));
    }
    if (version && selectedProgramId) {
      router.push(`/programs/${selectedProgramId}/${version.id}`);
    }
    setPendingVersionId(null);
  }, [selectVersionById, selectedProgramId, router]);

  const handleTogglePreviousVersions = () => {
    togglePreviousVersions();
  };

  const handleCloseVersionPanel = () => {
    clearSelection();
    setVersionError(null);
    if (selectedProgramId) {
      router.push(`/programs/${selectedProgramId}`);
    }
  };

  useEffect(() => {
    if (!initialVersionId) {
      return;
    }
    handleElementClick(initialVersionId);
  }, [initialVersionId, handleElementClick]);

  const handleVersionClick = async (version: SongVersion) => {
    await handleElementClick(version.id);
  };

  const handleCreateVersionClick = () => {
    if (selectedVersion) {
      startEditingVersion(selectedVersion);
    }
  };

  const handleCancelCreateVersion = () => {
    cancelEditing();
    setVersionError(null);
  };

  const handleCreateNewVersion = (songId: string) => {
    const dummyVersion: SongVersion = {
      id: 'new',
      songId: songId,
      label: 'New Version',
      content: '',
      audioUrl: '',
      bpm: null,
      transpose: null,
      previousVersionId: null,
      nextVersionId: null,
      originalVersionId: null,
      renderedContent: null,
      archived: false,
      createdAt: new Date().toISOString(),
      createdBy: userName,
    };
    setSelectedVersion(dummyVersion);
    setPreviousVersions([]);
    startEditingVersion();
    setSearchTerm('');
  };

  const handleFormChange = (updates: Partial<{label: string; content: string; audioUrl: string; bpm: number; transpose: number}>) => {
    updateForm(updates);
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersion) return;
    setIsSubmitting(true);
    setVersionError(null);
    try {
      const previousVersionId = selectedVersion.id === 'new' ? null : selectedVersion.id;
      // Generate rendered content if this is a chordmark file
      const fileType = detectFileType(newVersionForm.label, newVersionForm.content);
      const renderedContent = fileType === 'chordmark' && newVersionForm.content
        ? generateChordmarkRenderedContent(newVersionForm.content)
        : undefined;
      
      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({songId: selectedVersion.songId, label: newVersionForm.label, content: newVersionForm.content, audioUrl: newVersionForm.audioUrl, bpm: newVersionForm.bpm, transpose: newVersionForm.transpose ?? null, previousVersionId, createdBy: userName, renderedContent}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create version');
      }
      const existingVersion = versions.find(v => v.songId === data.version.songId);
      setVersions(prev => [...prev, {
        id: data.version.id, 
        songId: data.version.songId, 
        label: data.version.label, 
        songTitle: existingVersion?.songTitle || '', 
        createdAt: data.version.createdAt, 
        nextVersionId: data.version.nextVersionId || null,
        tags: existingVersion?.tags || []
      }]);
      setFullVersions((prev) => ({ ...prev, [data.version.id]: data.version }));
      if (previousVersionId) {
        await updateProgramElementReferences(previousVersionId, data.version.id);
      }
      cancelEditing();
      await handleElementClick(data.version.id);
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : 'Failed to create version');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveVersion = async () => {
    if (!selectedVersion || selectedVersion.id === 'new') {
      return;
    }
    if (!window.confirm('Delete this version?')) {
      return;
    }
    setIsArchiving(true);
    setVersionError(null);
    const archivedId = selectedVersion.id;
    try {
      const response = await fetch(`/api/songs/versions/${archivedId}/archive`, {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete version');
      }

      const programsToUpdate = programs.filter((program) => program.elementIds.includes(archivedId));
      if (programsToUpdate.length > 0) {
        await Promise.all(
          programsToUpdate.map(async (program) => {
            const nextElementIds = program.elementIds.filter((id) => id !== archivedId);
            const updateResponse = await fetch(`/api/programs/${program.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ elementIds: nextElementIds }),
            });
            const updateData = await updateResponse.json().catch(() => ({}));
            if (!updateResponse.ok) {
              throw new Error(updateData.error || 'Failed to update program');
            }
            refreshProgram(updateData.program);
          })
        );
      }

      setVersions((prev) => prev.filter((version) => version.id !== archivedId));
      setFullVersions((prev) => {
        if (!prev[archivedId]) {
          return prev;
        }
        const next = { ...prev };
        delete next[archivedId];
        return next;
      });
      handleCloseVersionPanel();
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsArchiving(false);
    }
  };
  
  return (
    <div className="p-4 flex gap-3">
      <div className="flex-1 flex flex-col gap-3">
        <ProgramHeaderControls
          programs={programs}
          selectedProgramId={selectedProgramId}
          onSelectProgram={handleSelectProgram}
          canEdit={canEdit}
          onCreateProgram={handleOpenCreateModal}
          onArchiveProgram={handleArchiveProgram}
          isDeletingProgram={isDeletingProgram}
          selectedProgram={selectedProgram}
        />

        {error && (
          <div className="text-sm text-red-600">
            {error}
          </div>
        )}

        <ProgramElementsSection
          selectedProgram={selectedProgram}
          versions={versions}
          versionMap={versionMap}
          selectedVersionId={selectedVersion?.id}
          filteredVersions={filteredVersions}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onAddElement={handleAddElement}
          onRemoveElement={handleRemoveElement}
          onReorderElements={handleReorderElements}
          onChangeVersion={handleChangeVersion}
          onElementClick={handleElementClick}
          onCreateVersion={handleCreateNewVersion}
          onKeyDown={handleKeyDown}
          canEdit={canEdit}
          programs={programs}
          programMap={programMap}
          onAddProgram={handleAddProgram}
          onRemoveProgram={handleRemoveProgram}
          onReorderProgramIds={handleReorderProgramIds}
          canReferenceProgram={canReferenceProgram}
        />
      </div>

      <ProgramViewPanel
        selectedProgram={selectedProgram}
        selectedVersion={selectedVersion}
        versions={versions}
        previousVersions={previousVersions}
        isExpandedPreviousVersions={isExpandedPreviousVersions}
        isCreatingVersion={isCreatingVersion}
        newVersionForm={newVersionForm}
        isSubmitting={isSubmitting}
        isArchiving={isArchiving}
        versionError={versionError}
        slides={allSlides}
        isVersionLoading={Boolean(pendingVersionId)}
        onCloseVersionPanel={handleCloseVersionPanel}
        onTogglePreviousVersions={handleTogglePreviousVersions}
        onVersionClick={handleVersionClick}
        onCreateVersionClick={handleCreateVersionClick}
        onCancelCreateVersion={handleCancelCreateVersion}
        onFormChange={handleFormChange}
        onSubmitVersion={handleSubmitVersion}
        onArchiveVersion={handleArchiveVersion}
      />

      <CreateProgramModal
        visible={showCreateModal}
        newProgramTitle={newProgramTitle}
        onChangeTitle={setNewProgramTitle}
        onClose={handleCloseCreateModal}
        onSubmit={handleCreateProgram}
        onKeyDown={handleCreateModalKeyDown}
      />
    </div>
  );
};

export default ProgramManager;
