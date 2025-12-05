'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import type { Program, VersionOption } from '../../types';

type PrintProgramProps = {
  programId: string;
};

const PrintProgram = ({ programId }: PrintProgramProps) => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [versions, setVersions] = useState<VersionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allElements, setAllElements] = useState<React.ReactElement[]>([]);
  const [fontSize, setFontSize] = useState(16);
  const contentRef = useRef<HTMLDivElement>(null);

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
        elements.push(
          <div key={`version-${versionId}`} className="mb-1">
            <div style={{fontFamily: 'Georgia, serif'}}>{version.songTitle}</div>
            {version.programCredits && (
              <div className="text-sm text-gray-600">{version.programCredits}</div>
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
    if (selectedProgram && !loading) {
      const elements = renderProgram(selectedProgram, 0);
      setAllElements(elements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProgram, loading]);

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
          margin: 0.5in;
        }
      `}} />
      
      <div className="bg-white text-black min-h-screen">
        <button onClick={() => window.print()} className="print:hidden fixed top-4 right-4 px-4 py-2 bg-black text-white hover:bg-gray-800 z-50">
          Print Program
        </button>
        
        {/* Sheet 1: Page 4 (left) | Page 1 (right) */}
        <div className="w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:m-0 print:break-after-page">
          {/* Page 4: Epitaph Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center border-r border-dashed border-gray-300 print:border-0">
            {selectedProgram.printProgramEpitaph && (
              <div className="text-center whitespace-pre-wrap font-georgia">
                {selectedProgram.printProgramEpitaph}
              </div>
            )}
          </div>
          
          {/* Page 1: Title Page */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center text-center">
            <h1 className="text-6xl font-georgia">
              {selectedProgram.title}
            </h1>
          </div>
        </div>
        
        {/* Sheet 2: Page 2 (left) | Page 3 (right) */}
        <div className="w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:m-0 print:break-after-auto" ref={contentRef}>
          {/* Page 2: First half of content */}
          <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col overflow-hidden border-r border-dashed border-gray-300 print:border-0" style={{fontSize: `${fontSize}px`}}>
            <div className="space-y-1">
              {selectedProgram.printProgramForeword && (
                <div className="mb-4 whitespace-pre-wrap font-georgia">
                  {selectedProgram.printProgramForeword}
                </div>
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

