'use client';

import { useState } from 'react';
import type { Program, VersionOption } from '../../types';
import { useUser } from '@/app/contexts/UserContext';
import TiptapEditor from './TiptapEditor';

type ProgramEditorProps = {
  program: Program | null;
  level?: number;
  visited?: Set<string>;
  versionMap: Record<string, VersionOption>;
  programMap: Record<string, Program>;
  editedProgram: Program;
  setEditedProgram: (program: Program) => void;
  editedVersions: Record<string, string>;
  setEditedVersions: (versions: Record<string, string>) => void;
};

const PrintProgramEditor = ({program, level = 0, visited = new Set(), versionMap, programMap, editedProgram, setEditedProgram, editedVersions, setEditedVersions}: ProgramEditorProps): React.ReactElement[] => {
  if (!program || visited.has(program.id)) {
    return [];
  }
  visited.add(program.id);
  
  const programTitle = level > 0 ? [
    <h2 key={`program-${program.id}`} className="font-georgia mb-4 font-semibold text-[18px]">
      {program.title}
    </h2>
  ] : [];
  
  const versionElements = program.elementIds.map((versionId) => {
    const version = versionMap[versionId];
    if (!version) return null;
    
    const creditsValue = editedVersions[versionId] ?? '';
    return (
      <div key={`version-${versionId}`} className="mb-1">
        <div style={{fontFamily: 'Georgia, serif', fontSize: '14px'}}>{version.songTitle}</div>
        <input
          type="text"
          value={creditsValue}
          onChange={(e) => setEditedVersions({...editedVersions, [versionId]: e.target.value})}
          placeholder="Program credits"
          className="bg-transparent text-black w-full border border-gray-300 px-1 py-0.5"
          style={{fontSize: '12px'}}
        />
      </div>
    );
  }).filter((el): el is React.ReactElement => el !== null);
  
  const childProgramElements = program.programIds.flatMap((childProgramId) => {
    const childProgram = programMap[childProgramId] || null;
    return PrintProgramEditor({program: childProgram, level: level + 1, visited, versionMap, programMap, editedProgram, setEditedProgram, editedVersions, setEditedVersions});
  });
  
  visited.delete(program.id);
  return [...programTitle, ...versionElements, ...childProgramElements];
};

type PrintProgramEditorWrapperProps = {
  programId: string;
  selectedProgram: Program;
  programs: Program[];
  setPrograms: (programs: Program[]) => void;
  versions: VersionOption[];
  setVersions: (versions: VersionOption[]) => void;
  versionMap: Record<string, VersionOption>;
  programMap: Record<string, Program>;
  onExitEditMode: () => void;
  setError: (error: string | null) => void;
};

export const PrintProgramEditorWrapper = ({programId, selectedProgram, programs, setPrograms, versions, setVersions, versionMap, programMap, onExitEditMode, setError}: PrintProgramEditorWrapperProps) => {
  const { userName } = useUser();
  const [editedProgram, setEditedProgram] = useState<Program>({...selectedProgram});
  const [editedVersions, setEditedVersions] = useState<Record<string, string>>(() => {
    const versionCreditsMap: Record<string, string> = {};
    versions.forEach((v) => {
      versionCreditsMap[v.id] = v.programCredits || '';
    });
    return versionCreditsMap;
  });
  const [saving, setSaving] = useState(false);

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
      }

      // Update local versions state with new versions
      if (newVersionsData.length > 0) {
        setVersions([...versions, ...newVersionsData]);
      }

      onExitEditMode();
      setError(null);
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onExitEditMode();
  };

  const allElements = PrintProgramEditor({program: editedProgram, level: 0, visited: new Set(), versionMap, programMap, editedProgram, setEditedProgram, editedVersions, setEditedVersions});

  return (
    <>
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={handleCancel} className="px-4 py-2 bg-gray-500 text-white hover:bg-gray-600">
          Cancel
        </button>
      </div>
      
      {/* Sheet 1: Page 4 (left) | Page 1 (right) */}
      <div className="mb-5 w-[11in] h-[8.5in] flex flex-row my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:mb-0 print:break-after-page print:w-full print:h-full">
        {/* Page 4: Epitaph Page */}
        <div className="w-[5.5in] h-[8.5in] p-[0.5in] box-border flex flex-col justify-center items-center border-r border-dashed border-gray-300 print:border-0">
          <TiptapEditor
            value={editedProgram.printProgramEpitaph || ''}
            onChange={(html) => setEditedProgram({...editedProgram, printProgramEpitaph: html})}
            placeholder="Epitaph"
            className="text-center whitespace-pre-wrap font-georgia font-semibold w-full h-full border border-gray-300 p-2"
          />
        </div>
        
        {/* Page 1: Title Page */}
        <div className="w-[5.5in] h-[8.5in] p-[0.75in] box-border flex flex-col justify-center items-center text-center">
          <h1 className="text-6xl font-georgia font-semibold">
            {editedProgram.title}
          </h1>
        </div>
      </div>
      
      {/* Sheet 2: Page 2 (left) | Page 3 (right) */}
      <div className="w-[11in] h-[8.5in] my-5 mx-auto shadow-[0_0_10px_rgba(0,0,0,0.1)] bg-white print:shadow-none print:my-0 print:mx-0 print:w-full print:h-full">
        <div className="h-full px-[0.6in] py-[0.4in] box-border" style={{columnCount: 2, columnGap: '0.75in', columnFill: 'auto'}}>
          <TiptapEditor
            value={editedProgram.printProgramForeword || ''}
            onChange={(html) => setEditedProgram({...editedProgram, printProgramForeword: html})}
            placeholder="Foreword"
            className="mb-4 whitespace-pre-wrap font-georgia w-full border border-gray-300 p-2"
          />
          {allElements}
        </div>
      </div>
    </>
  );
};

export default PrintProgramEditor;

