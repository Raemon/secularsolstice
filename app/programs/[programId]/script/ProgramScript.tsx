'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Program, VersionOption } from '../../types';
import { extractLyrics } from '@/lib/lyricsExtractor';

type SongVersion = {
  id: string;
  songId: string;
  songTitle: string;
  label: string;
  content: string | null;
  renderedContent: {
    htmlLyricsOnly?: string;
    plainText?: string;
  } | null;
  tags?: string[];
};

type ProgramScriptProps = {
  programId: string;
};

const ProgramScript = ({ programId }: ProgramScriptProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<Map<string, SongVersion>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const programsResponse = await fetch('/api/programs');
        if (!programsResponse.ok) {
          throw new Error('Failed to load programs');
        }
        const programsData = await programsResponse.json();
        const allPrograms = programsData.programs || [];
        setPrograms(allPrograms);

        const programMap: Record<string, Program> = {};
        allPrograms.forEach((program: Program) => {
          programMap[program.id] = program;
        });

        const collectVersionIds = (prog: Program | null, visited: Set<string> = new Set()): string[] => {
          if (!prog || visited.has(prog.id)) return [];
          visited.add(prog.id);
          
          const ids: string[] = [...prog.elementIds];
          prog.programIds.forEach((childId) => {
            const childProg = programMap[childId];
            if (childProg) {
              ids.push(...collectVersionIds(childProg, visited));
            }
          });
          return ids;
        };

        const currentProgram = programMap[programId];
        if (!currentProgram) {
          throw new Error('Program not found');
        }

        const versionIds = collectVersionIds(currentProgram);
        const versionsMap = new Map<string, SongVersion>();

        for (const versionId of versionIds) {
          try {
            const versionDetailResponse = await fetch(`/api/songs/versions/${versionId}`);
            if (versionDetailResponse.ok) {
              const versionDetail = await versionDetailResponse.json();
              const ver = versionDetail.version;
              versionsMap.set(versionId, {
                id: versionId,
                songId: ver.songId,
                songTitle: ver.songTitle,
                label: ver.label,
                content: ver.content,
                renderedContent: ver.renderedContent,
                tags: [], // Will be loaded from song data if needed
              });
            }
          } catch (err) {
            console.error(`Failed to load version ${versionId}:`, err);
          }
        }

        setVersions(versionsMap);
        setError(null);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load program');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [programId]);

  const programMap = useMemo(() => {
    const map: Record<string, Program> = {};
    programs.forEach((program) => {
      map[program.id] = program;
    });
    return map;
  }, [programs]);

  const selectedProgram = programId ? programMap[programId] ?? null : null;

  const renderProgram = (program: Program | null, level: number = 0, visited: Set<string> = new Set()): React.ReactElement[] => {
    if (!program || visited.has(program.id)) {
      return [];
    }
    visited.add(program.id);
    
    const elements: React.ReactElement[] = [];
    
    if (level > 0) {
      elements.push(
        <h2 key={`program-${program.id}`} className="text-2xl mt-8 mb-4" style={{fontFamily: 'Georgia, serif'}}>
          {program.title}
        </h2>
      );
    }
    
    program.elementIds.forEach((versionId) => {
      const version = versions.get(versionId);
      if (version) {
        const isText = version.tags?.includes('text');
        const isSpeech = version.tags?.includes('speech');
        const showFullContent = isText || isSpeech;
        
        let contentToDisplay = '';
        if (showFullContent && version.content) {
          contentToDisplay = version.content;
        } else if (version.content) {
          contentToDisplay = extractLyrics(version.content, version.label);
        }
        
        elements.push(
          <div key={`version-${versionId}`} className="mb-8">
            <h3 className="text-xl mb-2" style={{fontFamily: 'Georgia, serif'}}>
              {version.songTitle}
            </h3>
            {contentToDisplay && (
              <div className="whitespace-pre-wrap">{contentToDisplay}</div>
            )}
          </div>
        );
      }
    });
    
    program.programIds.forEach((childProgramId) => {
      const childProgram = programMap[childProgramId] || null;
      elements.push(...renderProgram(childProgram, level + 1, visited));
    });
    
    visited.delete(program.id);
    return elements;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Error: {error}</div>
      </div>
    );
  }

  if (!selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div>Program not found</div>
      </div>
    );
  }

  const elements = renderProgram(selectedProgram, 0);

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl mb-8" style={{fontFamily: 'Georgia, serif'}}>
          {selectedProgram.title}
        </h1>
        {elements}
      </div>
    </div>
  );
};

export default ProgramScript;

