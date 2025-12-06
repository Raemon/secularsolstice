'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Program } from '../programs/types';
import SimpleProgramElement from './components/SimpleProgramElement';
import SimpleDetailPanel from './components/SimpleDetailPanel';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type SimpleProgramProps = {
  initialProgramId?: string;
};

const SimpleProgram = ({ initialProgramId }: SimpleProgramProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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

  const selectedVersion = selectedVersionId ? versionMap[selectedVersionId] : null;

  return (
    <div className="p-4">
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-4">
            <select
              value={selectedProgramId || ''}
              onChange={(e) => setSelectedProgramId(e.target.value)}
              className="bg-black text-white px-2 py-1 text-sm"
            >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.title}</option>
            ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            {selectedProgram?.programIds.map((subProgramId) => {
              const subProgram = programMap[subProgramId];
              if (!subProgram) return null;
              return (
                <div key={subProgramId} className="mb-3">
                  <div className="text-xs text-gray-400 mb-1">{subProgram.title}</div>
                  <div className="flex flex-col">
                    {subProgram.elementIds.map((elementId, index) => {
                      const version = versionMap[elementId];
                      return (
                        <SimpleProgramElement
                          key={elementId}
                          version={version}
                          index={index}
                          onClick={() => setSelectedVersionId(elementId)}
                          isSelected={selectedVersionId === elementId}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {selectedProgram?.elementIds.map((elementId, index) => {
              const version = versionMap[elementId];
              return (
                <SimpleProgramElement
                  key={elementId}
                  version={version}
                  index={index}
                  onClick={() => setSelectedVersionId(elementId)}
                  isSelected={selectedVersionId === elementId}
                />
              );
            })}
          </div>
        </div>
        {selectedVersion && (
          <div className="flex-1">
            <SimpleDetailPanel
              version={selectedVersion}
              onClose={() => setSelectedVersionId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleProgram;

