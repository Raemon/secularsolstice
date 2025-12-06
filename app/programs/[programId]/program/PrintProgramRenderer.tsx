import type { Program, VersionOption } from '../../types';

type ProgramRendererProps = {
  program: Program;
  level?: number;
  visited?: Set<string>;
  versionMap: Record<string, VersionOption>;
  programMap: Record<string, Program>;
};

const PrintProgramRenderer = ({program, level = 0, visited = new Set(), versionMap, programMap}: ProgramRendererProps) => {
  if (visited.has(program.id)) {
    return null;
  }
  
  const newVisited = new Set(visited);
  newVisited.add(program.id);
  
  return (
    <>
      {level > 0 && (
        <h2 className="font-georgia mb-4 font-semibold text-[18px]">
          {program.title}
        </h2>
      )}
      
      {program.elementIds.map((versionId) => {
        const version = versionMap[versionId];
        if (!version) return null;
        
        const creditsValue = version.programCredits || '';
        return (
          <div key={`version-${versionId}`} className="mb-1">
            <span className="font-georgia text-[15px] font-semibold">{version.songTitle}.</span> {creditsValue && (
              <span className={`text-gray-600 text-[10px] ${creditsValue.length > 60 ? 'block' : 'inline-block'}`}>{creditsValue}</span>
            )}
          </div>
        );
      })}
      
      {program.programIds.map((childProgramId) => {
        const childProgram = programMap[childProgramId];
        if (!childProgram) return null;
        return (
          <PrintProgramRenderer
            key={`program-${childProgramId}`}
            program={childProgram}
            level={level + 1}
            visited={newVisited}
            versionMap={versionMap}
            programMap={programMap}
          />
        );
      })}
    </>
  );
};

export default PrintProgramRenderer;
