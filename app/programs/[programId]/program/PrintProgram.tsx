'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Program, VersionOption } from '../../types';

type PrintProgramProps = {
  programId: string;
};

const PrintProgram = ({ programId }: PrintProgramProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [programsResponse, versionsResponse] = await Promise.all([
          fetch('/api/programs'),
          fetch('/api/song-versions'),
        ]);

        if (!programsResponse.ok || !versionsResponse.ok) {
          throw new Error('Failed to load data');
        }

        const programsData = await programsResponse.json();
        const versionsData = await versionsResponse.json();

        setPrograms(programsData.programs || []);
        setVersions(versionsData.versions || []);
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

  const versionMap = useMemo(() => {
    const map: Record<string, VersionOption> = {};
    versions.forEach((version) => {
      map[version.id] = version;
    });
    return map;
  }, [versions]);

  const selectedProgram = programId ? programMap[programId] ?? null : null;

  const renderProgram = (program: Program | null, level: number = 0, visited: Set<string> = new Set()): React.ReactElement[] => {
    if (!program || visited.has(program.id)) {
      return [];
    }
    visited.add(program.id);
    
    const elements: JSX.Element[] = [];
    
    if (level > 0) {
      elements.push(
        <h2 key={`program-${program.id}`} className="text-3xl font-georgia mt-6 mb-2">
          {program.title}
        </h2>
      );
    }
    
    program.elementIds.forEach((versionId) => {
      const version = versionMap[versionId];
      if (version) {
        elements.push(
          <div key={`version-${versionId}`} className="ml-4 mb-1">
            <div style={{fontFamily: 'Georgia, serif'}}>{version.songTitle}</div>
            {version.programCredits && (
              <div className="text-sm text-gray-600 ml-2">{version.programCredits}</div>
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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading program...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  if (!selectedProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Program not found</div>
      </div>
    );
  }

  return (
    <div className="bg-white text-black p-8 max-w-4xl mx-auto">
      <style jsx global>{`
        @media print {
          body {
            background: white;
          }
          .no-print, header, nav, button {
            display: none !important;
          }
          .print-container {
            padding: 0;
            max-width: none;
          }
        }
      `}</style>
      <button onClick={() => window.print()} className="no-print mb-4 px-4 py-2 bg-black text-white hover:bg-gray-800">
        Print Program
      </button>
      <div className="print-container">
        <h1 className="text-3xl font-bold mb-6">{selectedProgram.title}</h1>
        <div className="space-y-1">
          {renderProgram(selectedProgram, 0)}
        </div>
      </div>
    </div>
  );
};

export default PrintProgram;

