'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Program, VersionOption } from '../../types';
import { useUser } from '@/app/contexts/UserContext';

type PrintProgramProps = {
  programId: string;
};

const PrintProgram = ({ programId }: PrintProgramProps) => {
  const { userName } = useUser();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allElements, setAllElements] = useState<React.ReactElement[]>([]);
  const [fontSize, setFontSize] = useState(16);
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

  const renderProgram = (program: Program | null, level: number = 0, visited: Set<string> = new Set()): React.ReactElement[] => {
    if (!program || visited.has(program.id)) {
      return [];
    }
    visited.add(program.id);
    
    const elements: React.ReactElement[] = [];
    
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
        const creditsValue = isEditMode ? (editedVersions[versionId] ?? '') : (version.programCredits || '');
        elements.push(
          <div key={`version-${versionId}`} className="mb-1">
            <div style={{fontFamily: 'Georgia, serif'}}>{version.songTitle}</div>
            {isEditMode ? (
              <input
                type="text"
                value={creditsValue}
                onChange={(e) => setEditedVersions({...editedVersions, [versionId]: e.target.value})}
                placeholder="Program credits"
                className="text-sm bg-transparent text-black w-full border border-gray-300 px-1 py-0.5"
                style={{fontSize: `${fontSize}px`}}
              />
            ) : (
              creditsValue && (
                <div className="text-sm text-gray-600">{creditsValue}</div>
              )
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

  // Split content evenly between two pages
  useEffect(() => {
    if (displayProgram && !loading) {
      const elements = renderProgram(displayProgram, 0);
      setAllElements(elements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayProgram, loading, isEditMode, editedVersions]);

  // Calculate font size to fit content on 2 pages
  useEffect(() => {
    if (allElements.length > 0 && contentRef.current) {
      const calculateFontSize = () => {
        const contentHeight = contentRef.current?.scrollHeight || 0;
        const twoPageHeight = 2 * (8.5 - 1.5) * 96; // 2 pages * (8.5in - 1.5in padding) * 96 DPI = ~1344px
        
        if (contentHeight > twoPageHeight) {
          const scale = twoPageHeight / contentHeight;
          const newFontSize = Math.max(8, Math.floor(16 * scale)); // Min 8px, base 16px
          setFontSize(newFontSize);
        } else {
          setFontSize(16);
        }
      };

      // Delay to ensure DOM is rendered
      const timer = setTimeout(calculateFontSize, 200);
      return () => clearTimeout(timer);
    }
  }, [allElements]);

  const midpoint = Math.ceil(allElements.length / 2);
  const page2Elements = allElements.slice(0, midpoint);
  const page3Elements = allElements.slice(midpoint);

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
        allProgramUpdates.elementIds = editedProgram.elementIds.map(id => versionIdMap[id] || id);
        allProgramUpdates.programIds = editedProgram.programIds;
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
          margin: 0.5in;
        }
      `}} />
      
      <div className="bg-white text-black min-h-screen">
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
        <div className="w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:m-0 print:break-after-page">
          {/* Page 4: Epitaph Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center border-r border-dashed border-gray-300 print:border-0">
            {isEditMode && editedProgram ? (
              <textarea
                value={editedProgram.printProgramEpitaph || ''}
                onChange={(e) => setEditedProgram({...editedProgram, printProgramEpitaph: e.target.value})}
                placeholder="Epitaph"
                className="text-center whitespace-pre-wrap font-georgia w-full h-full border border-gray-300 p-2 resize-none"
              />
            ) : (
              displayProgram.printProgramEpitaph && (
                <div className="text-center whitespace-pre-wrap font-georgia">
                  {displayProgram.printProgramEpitaph}
                </div>
              )
            )}
          </div>
          
          {/* Page 1: Title Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center text-center">
            <h1 className="text-6xl font-georgia">
              {displayProgram.title}
            </h1>
          </div>
        </div>
        
        {/* Sheet 2: Page 2 (left) | Page 3 (right) */}
        <div className="w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:m-0 print:break-after-auto" ref={contentRef}>
          {/* Page 2: First half of content */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col overflow-hidden border-r border-dashed border-gray-300 print:border-0" style={{fontSize: `${fontSize}px`}}>
            <div className="space-y-1">
              {isEditMode && editedProgram ? (
                <textarea
                  value={editedProgram.printProgramForeword || ''}
                  onChange={(e) => setEditedProgram({...editedProgram, printProgramForeword: e.target.value})}
                  placeholder="Foreword"
                  className="mb-4 whitespace-pre-wrap font-georgia w-full border border-gray-300 p-2 resize-none"
                  style={{fontSize: `${fontSize}px`}}
                />
              ) : (
                displayProgram.printProgramForeword && (
                  <div className="mb-4 whitespace-pre-wrap font-georgia">
                    {displayProgram.printProgramForeword}
                  </div>
                )
              )}
              {page2Elements}
            </div>
          </div>
          
          {/* Page 3: Second half of content */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col overflow-hidden" style={{fontSize: `${fontSize}px`}}>
            <div className="space-y-1">
              {page3Elements}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintProgram;

