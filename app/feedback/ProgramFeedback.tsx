'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Program } from '../programs/types';
import FeedbackElement from './components/FeedbackElement';
import FeedbackDetail from './components/FeedbackDetail';

type VersionOption = {
  id: string;
  songId: string;
  label: string;
  songTitle: string;
  createdAt: string;
  tags: string[];
};

type FullVersion = {
  id: string;
  songId: string;
  label: string;
  createdAt: string;
  content?: string | null;
};

type SimpleProgramProps = {
  initialProgramId?: string;
};

const ProgramFeedback = ({ initialProgramId }: SimpleProgramProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);
  const [isLoadingVersions, setIsLoadingVersions] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(initialProgramId ?? null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [versionCache, setVersionCache] = useState<Record<string, FullVersion>>({});

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

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const loadVersionOptions = useCallback(async () => {
    setIsLoadingVersions(true);
    try {
      const response = await fetch('/api/song-versions');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load song versions');
      }
      const data = await response.json();
      const versionsData = data.versions || [];
      setVersions(versionsData);
      setDataError(null);
    } catch (err) {
      console.error('Failed to load song versions:', err);
      setDataError(err instanceof Error ? err.message : 'Failed to load song versions');
    } finally {
      setIsLoadingVersions(false);
    }
  }, []);

  useEffect(() => {
    loadVersionOptions();
  }, [loadVersionOptions]);

  useEffect(() => {
    if (versions.length === 0) return;
    const loadVersionsContent = async () => {
      try {
        const versionIds = versions.map(v => v.id);
        const response = await fetch('/api/songs/versions/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionIds })
        });
        if (response.ok) {
          const data = await response.json();
          setVersionCache(data.versions || {});
        }
      } catch (err) {
        console.error('Failed to load version content:', err);
      }
    };
    loadVersionsContent();
  }, [versions]);

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

  const handleSelectProgram = (programId: string) => {
    if (selectedProgramId === programId) {
      setSelectedProgramId(null);
      setSelectedVersionId(null);
    } else {
      setSelectedProgramId(programId);
      setSelectedVersionId(null);
    }
  };

  return (
    <div className="p-4">
      <div className="flex gap-4">
        {selectedVersion && (
            <div className="flex-1 max-w-xl">
              <FeedbackDetail
                version={selectedVersion}
                onClose={() => setSelectedVersionId(null)}
                cachedVersion={versionCache[selectedVersion.id]}
              />
            </div>
          )}
        <div className="flex flex-col gap-1 w-full lg:max-w-4xl mx-auto">
          <div className="mb-4">
            <select
              value={selectedProgramId || ''}
              onChange={(e) => handleSelectProgram(e.target.value)}
              className="bg-black text-white px-2 py-1 text-sm"
            >
            {programs.map((program) => (
              <option key={program.id} value={program.id}>{program.title}</option>
            ))}
            </select>
          </div>
          <div>
            {selectedProgram?.programIds.map((subProgramId) => {
              const subProgram = programMap[subProgramId];
              if (!subProgram) return null;
              return (
                <div key={subProgramId} className="mb-3">
                  <div className="font-georgia text-2xl text-center my-4">{subProgram.title}</div>
                  <div className="grid grid-cols-[275px_310px_200px_1fr] items-center gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium">
                    <div>song/speech</div>
                    <div>quality</div>
                    <div>singability</div>
                    <div>comments</div>
                  </div>
                  <div className="flex flex-col">
                    {subProgram.elementIds.map((elementId, index) => {
                      const version = versionMap[elementId];
                      return (
                        <FeedbackElement
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
            {selectedProgram?.elementIds && selectedProgram.elementIds.length > 0 && (
              <>
                <div className="grid grid-cols-[275px_310px_200px_1fr] items-center gap-4 text-sm px-2 py-1 border-b border-gray-700 text-gray-400 font-medium">
                  <div>song/speech</div>
                  <div>quality</div>
                  <div>singability</div>
                  <div>comments</div>
                </div>
                {selectedProgram.elementIds.map((elementId, index) => {
                  const version = versionMap[elementId];
                  return (
                    <FeedbackElement
                      key={elementId}
                      version={version}
                      index={index}
                      onClick={() => setSelectedVersionId(elementId)}
                      isSelected={selectedVersionId === elementId}
                    />
                  );
                })}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProgramFeedback;

