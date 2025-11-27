'use client';

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import DragAndDropList from './components/DragAndDropList';
import ProgramSelector from './components/ProgramSelector';
import VersionSelector from './components/VersionSelector';
import ProgramElementItem from './components/ProgramElementItem';

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
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create program');
    }
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

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading programs...</p>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold">Program</label>
        <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onSelect={setSelectedProgramId} />
        <input
          value={newProgramTitle}
          onChange={(event) => setNewProgramTitle(event.target.value)}
          placeholder="New program title"
          className="text-sm px-2 py-1"
        />
        <button type="button" onClick={handleCreateProgram} className="text-sm px-3 py-1">
          Create
        </button>
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 w-1/3">
        <div className="flex-1 min-w-[280px] flex flex-col gap-1">
          <div className="text-sm font-semibold">Program elements</div>
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
                return <ProgramElementItem id={id} index={index} version={version} allVersions={versions} onRemove={handleRemoveElement} onChangeVersion={handleChangeVersion} />;
              }}
            />
          )}
            <VersionSelector
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filteredVersions={filteredVersions}
              onAddElement={handleAddElement}
              onKeyDown={handleKeyDown}
              disabled={!selectedProgram}
            />

        </div>
      </div>
    </div>
  );
};

export default ProgramManager;


