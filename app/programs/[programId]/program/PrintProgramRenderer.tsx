import type { Program, VersionOption } from '../../types';

type ProgramRendererProps = {
  program: Program | null;
  level?: number;
  visited?: Set<string>;
  versionMap: Record<string, VersionOption>;
  programMap: Record<string, Program>;
  isEditMode: boolean;
  editedVersions: Record<string, string>;
  setEditedVersions: (versions: Record<string, string>) => void;
};

const PrintProgramRenderer = ({program, level = 0, visited = new Set(), versionMap, programMap, isEditMode, editedVersions, setEditedVersions}: ProgramRendererProps): React.ReactElement[] => {
  if (!program || visited.has(program.id)) {
    return [];
  }
  visited.add(program.id);
  
  const elements: React.ReactElement[] = [];
  
  if (level > 0) {
    elements.push(
      <h2 key={`program-${program.id}`} className="font-georgia mb-4 font-semibold text-[18px]">
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
          <div style={{fontFamily: 'Georgia, serif', fontSize: '14px'}}>{version.songTitle}</div>
          {isEditMode ? (
            <input
              type="text"
              value={creditsValue}
              onChange={(e) => setEditedVersions({...editedVersions, [versionId]: e.target.value})}
              placeholder="Program credits"
              className="bg-transparent text-black w-full border border-gray-300 px-1 py-0.5"
              style={{fontSize: '12px'}}
            />
          ) : (
            creditsValue && (
              <div className="text-gray-600 text-[12px]">{creditsValue}</div>
            )
          )}
        </div>
      );
    }
  });
  
  program.programIds.forEach((childProgramId) => {
    const childProgram = programMap[childProgramId] || null;
    elements.push(...PrintProgramRenderer({program: childProgram, level: level + 1, visited, versionMap, programMap, isEditMode, editedVersions, setEditedVersions}));
  });
  
  visited.delete(program.id);
  return elements;
};

export default PrintProgramRenderer;

