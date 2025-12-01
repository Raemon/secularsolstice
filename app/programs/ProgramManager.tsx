'use client';

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<SongVersion | null>(null);
  const [previousVersions, setPreviousVersions] = useState<SongVersion[]>([]);
  const [isExpandedPreviousVersions, setIsExpandedPreviousVersions] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState({label: '', content: '', audioUrl: '', bpm: 100, previousVersionId: '', nextVersionId: ''});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [versionError, setVersionError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isDeletingProgram, setIsDeletingProgram] = useState(false);
  const [fullVersions, setFullVersions] = useState<Record<string, SongVersion>>({});

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
        console.log(versionData.versions);
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

  useEffect(() => {
    const fetchVersions = async () => {
      if (!selectedProgram || selectedProgram.elementIds.length === 0) {
        setFullVersions({});
        return;
      }
      
      const newFullVersions: Record<string, SongVersion> = {};
      
      for (const versionId of selectedProgram.elementIds) {
        try {
          const response = await fetch(`/api/songs/versions/${versionId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.version) {
              newFullVersions[versionId] = data.version;
            }
          }
        } catch (err) {
          console.error(`Failed to fetch version ${versionId}:`, err);
        }
      }
      
      setFullVersions(newFullVersions);
    };
    
    fetchVersions();
  }, [selectedProgram]);

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

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
    
    const result: SongSlideData[] = [];
    const linesPerSlide = 10;
    
    for (const versionId of selectedProgram.elementIds) {
      const version = versionMap[versionId];
      const fullVersion = fullVersions[versionId];
      if (!version) continue;
      
      let slides: Slide[] = [];
      if (fullVersion) {
        try {
          let contentToProcess = '';
          
          if (fullVersion.content) {
            contentToProcess = convertToLyricsOnly(fullVersion.content, version.label);
          } else if (fullVersion.renderedContent) {
            // Use htmlLyricsOnly or htmlFull from the rendered content object
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
      
      result.push({
        versionId: version.id,
        songTitle: version.songTitle,
        versionLabel: version.label,
        slides: slides,
      });
    }
    
    return result;
  }, [selectedProgram, versionMap, fullVersions]);

  const filteredVersions = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return versions.slice(0, 8);
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
    return versions
      .filter((version) =>
        version.nextVersionId === null && (
          version.songTitle.toLowerCase().includes(normalized) ||
          version.label.toLowerCase().includes(normalized)
        )
      )
      .slice(0, 8);
  }, [searchTerm, versions]);

  const refreshProgram = (updatedProgram: Program) => {
    setPrograms((prev) =>
      prev.map((program) => (program.id === updatedProgram.id ? updatedProgram : program))
    );
  };

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
      if (selectedProgramId) {
        router.push(`/programs/${selectedProgramId}/${versionId}`);
      }
    } catch (err) {
      console.error('Error loading version details:', err);
      setVersionError(err instanceof Error ? err.message : 'Failed to load version');
      setPreviousVersions([]);
    }
  }, [selectedProgramId, router]);

  const handleTogglePreviousVersions = () => {
    setIsExpandedPreviousVersions(prev => !prev);
  };

  const handleCloseVersionPanel = () => {
    setSelectedVersion(null);
    setPreviousVersions([]);
    setIsExpandedPreviousVersions(false);
    setIsCreatingVersion(false);
    setVersionError(null);
    if (selectedProgramId) {
      router.push(`/programs/${selectedProgramId}`);
    }
  };

  useEffect(() => {
    if (initialVersionId) {
      handleElementClick(initialVersionId);
    }
  }, [initialVersionId, handleElementClick]);

  const handleVersionClick = async (version: SongVersion) => {
    await handleElementClick(version.id);
  };

  const handleCreateVersionClick = () => {
    if (selectedVersion) {
      setNewVersionForm({label: selectedVersion.label || '', content: selectedVersion.content || '', audioUrl: selectedVersion.audioUrl || '', bpm: selectedVersion.bpm || 100, previousVersionId: '', nextVersionId: ''});
      setIsCreatingVersion(true);
    }
  };

  const handleCancelCreateVersion = () => {
    setIsCreatingVersion(false);
    setNewVersionForm({label: '', content: '', audioUrl: '', bpm: 100, previousVersionId: '', nextVersionId: ''});
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
    setNewVersionForm({label: '', content: '', audioUrl: '', bpm: 100, previousVersionId: '', nextVersionId: ''});
    setIsCreatingVersion(true);
    setSearchTerm('');
  };

  const handleFormChange = (updates: Partial<{label: string; content: string; audioUrl: string; bpm: number}>) => {
    setNewVersionForm(prev => ({...prev, ...updates}));
  };

  const handleSubmitVersion = async () => {
    if (!selectedVersion) return;
    setIsSubmitting(true);
    setVersionError(null);
    try {
      // Generate rendered content if this is a chordmark file
      const fileType = detectFileType(newVersionForm.label, newVersionForm.content);
      const renderedContent = fileType === 'chordmark' && newVersionForm.content
        ? generateChordmarkRenderedContent(newVersionForm.content)
        : undefined;
      
      const response = await fetch('/api/songs/versions', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({songId: selectedVersion.songId, label: newVersionForm.label, content: newVersionForm.content, audioUrl: newVersionForm.audioUrl, bpm: newVersionForm.bpm, previousVersionId: selectedVersion.id === 'new' ? null : selectedVersion.id, createdBy: userName, renderedContent}),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create version');
      }
      setVersions(prev => [...prev, {
        id: data.version.id, 
        songId: data.version.songId, 
        label: data.version.label, 
        songTitle: versions.find(v => v.songId === data.version.songId)?.songTitle || '', 
        createdAt: data.version.createdAt, 
        nextVersionId: data.version.nextVersionId || null
      }]);
      setIsCreatingVersion(false);
      setNewVersionForm({label: '', content: '', audioUrl: '', bpm: 100, previousVersionId: '', nextVersionId: ''});
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
      handleCloseVersionPanel();
    } catch (err) {
      setVersionError(err instanceof Error ? err.message : 'Failed to delete version');
    } finally {
      setIsArchiving(false);
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
