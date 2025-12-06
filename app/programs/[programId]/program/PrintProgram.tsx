'use client';

import { useEffect, useState, useMemo } from 'react';
import type { Program, VersionOption } from '../../types';
import PrintProgramRenderer from './PrintProgramRenderer';
import { PrintProgramEditorWrapper } from './PrintProgramEditor';

type PrintProgramProps = {
  programId: string;
};

const PrintProgram = ({ programId }: PrintProgramProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

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

        const loadedPrograms = programsData.programs || [];
        const loadedVersions = versionsData.versions || [];
        setPrograms(loadedPrograms);
        setVersions(loadedVersions);
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
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: 11in 8.5in landscape;
          margin: 0;
        }
        p {
          margin-bottom: 0.75em;
          margin-top: 0.75em;
        }
        p:first-child {
          margin-top: 0;
        }
        p:last-child {
          margin-bottom: 0;
        }
        b, strong {
          font-weight: 600;
        }
      `}} />
      
      <div className="bg-white text-black min-h-screen pb-6 print:p-0 print:m-0 print:min-h-0">
        {isEditMode ? (
          <PrintProgramEditorWrapper
            programId={programId}
            selectedProgram={selectedProgram}
            programs={programs}
            setPrograms={setPrograms}
            versions={versions}
            setVersions={setVersions}
            versionMap={versionMap}
            programMap={programMap}
            onExitEditMode={() => setIsEditMode(false)}
            setError={setError}
          />
        ) : (
          <>
            <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
              <button onClick={() => setIsEditMode(true)} className="px-4 py-2 bg-black text-white hover:bg-gray-800">
                Edit
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-black text-white hover:bg-gray-800">
                Print Program
              </button>
            </div>
            
            {/* Sheet 1: Page 4 (left) | Page 1 (right) */}
            <div className="mb-5 w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:mb-0 print:break-after-page print:w-full print:h-full">
              {/* Page 4: Epitaph Page */}
              <div className="w-[5.5in] h-[8.5in] p-[0.5in] box-border flex flex-col justify-center items-center border-r border-dashed border-gray-300 print:border-0">
                {selectedProgram.printProgramEpitaph && (
                  <div className="text-center whitespace-pre-wrap font-georgia" dangerouslySetInnerHTML={{__html: selectedProgram.printProgramEpitaph}} />
                )}
              </div>
              
              {/* Page 1: Title Page */}
              <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center text-center">
                <h1 className="text-6xl font-georgia font-semibold">
                  {selectedProgram.title}
                </h1>
              </div>
            </div>
            
            {/* Sheet 2: Page 2 (left) | Page 3 (right) */}
            <div className="w-[11in] h-[8.5in] my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:w-full print:h-full">
              <div className="h-full px-[0.6in] py-[0.4in] box-border" style={{columnCount: 2, columnGap: '0.75in', columnFill: 'auto'}}>
                {selectedProgram.printProgramForeword && (
                  <div className="mb-4 whitespace-pre-wrap font-georgia" style={{fontSize: '16px'}} dangerouslySetInnerHTML={{__html: selectedProgram.printProgramForeword}} />
                )}
                <PrintProgramRenderer
                  program={selectedProgram}
                  level={0}
                  visited={new Set()}
                  versionMap={versionMap}
                  programMap={programMap}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default PrintProgram;

