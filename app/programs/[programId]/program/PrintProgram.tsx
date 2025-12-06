'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Program, VersionOption } from '../../types';
import { useUser } from '@/app/contexts/UserContext';
import TiptapEditor from './TiptapEditor';
import PrintProgramRenderer from './PrintProgramRenderer';

type PrintProgramProps = {
  programId: string;
};

const PrintProgram = ({ programId }: PrintProgramProps) => {
  const { userName } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProgram, setEditedProgram] = useState<Program | null>(null);
  const [editedVersions, setEditedVersions] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

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
        const program = loadedPrograms.find((p: Program) => p.id === programId);
        if (program) {
          setEditedProgram({...program});
        }
        const versionCreditsMap: Record<string, string> = {};
        loadedVersions.forEach((v: VersionOption) => {
          versionCreditsMap[v.id] = v.programCredits || '';
        });
        setEditedVersions(versionCreditsMap);
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
  const displayProgram = isEditMode && editedProgram ? editedProgram : selectedProgram;

  // Generate program content elements
  const allElements = useMemo(() => {
    if (displayProgram && !loading) {
      return PrintProgramRenderer({program: displayProgram, level: 0, visited: new Set(), versionMap, programMap, isEditMode, editedVersions, setEditedVersions});
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProgram, loading, isEditMode, editedVersions]);

  const handleSave = async () => {
    if (!editedProgram || !selectedProgram || !userName) return;
    setSaving(true);
    try {
      // Update program foreword/epitaph if changed
      const programUpdates: {printProgramForeword?: string | null; printProgramEpitaph?: string | null} = {};
      if (editedProgram.printProgramForeword !== selectedProgram.printProgramForeword) {
        programUpdates.printProgramForeword = editedProgram.printProgramForeword;
      }
      if (editedProgram.printProgramEpitaph !== selectedProgram.printProgramEpitaph) {
        programUpdates.printProgramEpitaph = editedProgram.printProgramEpitaph;
      }

      // Find versions with changed programCredits
      const versionUpdates = Object.keys(editedVersions).filter(
        versionId => editedVersions[versionId] !== (versionMap[versionId]?.programCredits || '')
      );

      // Create new versions for changed credits
      const versionIdMap: Record<string, string> = {};
      const newVersionsData: VersionOption[] = [];
      if (versionUpdates.length > 0) {
        await Promise.all(versionUpdates.map(async (oldVersionId) => {
          const versionResponse = await fetch(`/api/songs/versions/${oldVersionId}`);
          if (!versionResponse.ok) throw new Error(`Failed to fetch version ${oldVersionId}`);
          const { version } = await versionResponse.json();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, nextVersionId, originalVersionId, archived, createdAt, songTitle, previousVersionId, createdBy, programCredits, ...versionFields } = version;
          const createResponse = await fetch('/api/songs/versions', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              ...versionFields,
              previousVersionId: oldVersionId,
              createdBy: userName,
              programCredits: editedVersions[oldVersionId] || null,
            }),
          });
          if (!createResponse.ok) throw new Error(`Failed to create new version for ${oldVersionId}`);
          const { version: newVersion } = await createResponse.json();
          versionIdMap[oldVersionId] = newVersion.id;
          const oldVersion = versionMap[oldVersionId];
          newVersionsData.push({
            ...newVersion,
            songTitle: oldVersion.songTitle,
            tags: oldVersion.tags,
          });
        }));
      }

      // Update program with all changes at once
      const allProgramUpdates: {printProgramForeword?: string | null; printProgramEpitaph?: string | null; elementIds?: string[]; programIds?: string[]} = {...programUpdates};
      if (Object.keys(versionIdMap).length > 0) {
        // Replace old version IDs with new version IDs in the program's elementIds
        allProgramUpdates.elementIds = selectedProgram.elementIds.map(id => versionIdMap[id] || id);
        allProgramUpdates.programIds = selectedProgram.programIds;
      }

      if (Object.keys(allProgramUpdates).length > 0) {
        const response = await fetch(`/api/programs/${programId}`, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(allProgramUpdates),
        });
        if (!response.ok) throw new Error('Failed to update program');
        const data = await response.json();
        const updatedPrograms = programs.map(p => p.id === programId ? data.program : p);
        setPrograms(updatedPrograms);
        setEditedProgram({...data.program});
      }

      // Update local versions state with new versions
      if (newVersionsData.length > 0) {
        setVersions(prev => [...prev, ...newVersionsData]);
      }

      setIsEditMode(false);
      setError(null);
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
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

  if (!displayProgram) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-gray-600">Loading...</div>
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
        <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
          {isEditMode ? (
            <>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => {
                setIsEditMode(false);
                if (selectedProgram) {
                  setEditedProgram({...selectedProgram});
                }
                const versionCreditsMap: Record<string, string> = {};
                versions.forEach((v) => {
                  versionCreditsMap[v.id] = v.programCredits || '';
                });
                setEditedVersions(versionCreditsMap);
              }} className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setIsEditMode(true)} className="px-4 py-2 bg-black text-white hover:bg-gray-800">
                Edit
              </button>
              <button onClick={() => window.print()} className="px-4 py-2 bg-black text-white hover:bg-gray-800">
                Print Program
              </button>
            </>
          )}
        </div>
        
        {/* Sheet 1: Page 4 (left) | Page 1 (right) */}
        <div className="mb-5 w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:mb-0 print:break-after-page print:w-full print:h-full">
          {/* Page 4: Epitaph Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.5in] box-border flex flex-col justify-center items-center border-r border-dashed border-gray-300 print:border-0">
            {isEditMode && editedProgram ? (
              <TiptapEditor
                value={editedProgram.printProgramEpitaph || ''}
                onChange={(html) => setEditedProgram({...editedProgram, printProgramEpitaph: html})}
                placeholder="Epitaph"
                className="text-center whitespace-pre-wrap font-georgia font-semibold w-full h-full border border-gray-300 p-2"
              />
            ) : (
              displayProgram.printProgramEpitaph && (
                <div className="text-center whitespace-pre-wrap font-georgia" dangerouslySetInnerHTML={{__html: displayProgram.printProgramEpitaph}} />
              )
            )}
          </div>
          
          {/* Page 1: Title Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center text-center">
            <h1 className="text-6xl font-georgia font-semibold">
              {displayProgram.title}
            </h1>
          </div>
        </div>
        
        {/* Sheet 2: Page 2 (left) | Page 3 (right) */}
        <div className="w-[11in] h-[8.5in] my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:w-full print:h-full" ref={contentRef}>
          <div className="h-full px-[0.6in] py-[0.4in] box-border" style={{columnCount: 2, columnGap: '0.75in', columnFill: 'auto'}}>
            {isEditMode && editedProgram ? (
              <TiptapEditor
                value={editedProgram.printProgramForeword || ''}
                onChange={(html) => setEditedProgram({...editedProgram, printProgramForeword: html})}
                placeholder="Foreword"
                className="mb-4 whitespace-pre-wrap font-georgia w-full border border-gray-300 p-2"
              />
            ) : (
              displayProgram.printProgramForeword && (
                <div className="mb-4 whitespace-pre-wrap font-georgia" style={{fontSize: '16px'}} dangerouslySetInnerHTML={{__html: displayProgram.printProgramForeword}} />
              )
            )}
            {allElements}
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintProgram;

