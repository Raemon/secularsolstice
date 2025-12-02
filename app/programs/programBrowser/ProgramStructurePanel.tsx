'use client';

import { type ReactElement } from 'react';
import ProgramStructureNode from './components/ProgramStructureNode';
import type { Program, VersionOption } from '../types';

export type ProgramStructurePanelProps = {
  program: Program | null;
  programMap: Record<string, Program>;
  versions: VersionOption[];
  versionMap: Record<string, VersionOption>;
  selectedVersionId?: string;
  onVersionClick: (versionId: string) => void | Promise<void>;
  onReorderElements: (programId: string, reorderedElementIds: string[]) => void | Promise<void>;
};

const ProgramStructurePanel = ({
  program,
  programMap,
  versions,
  versionMap,
  selectedVersionId,
  onVersionClick,
  onReorderElements,
}: ProgramStructurePanelProps): ReactElement => {
  if (!program) {
    return (
      <div className="border-l border-gray-200 pl-4 w-full max-w-xl h-[calc(100vh-2rem)] overflow-y-auto scrollbar-hide">
        <p className="text-sm text-gray-400">Select a program to explore its contents.</p>
      </div>
    );
  }

  const handleElementClick = (versionId: string) => {
    void onVersionClick(versionId);
  };

  return (
    <div className="w-full max-w-xl h-[calc(100vh-100px)] overflow-y-auto scrollbar-hide">
      <ProgramStructureNode
        current={program}
        depth={0}
        trail={new Set()}
        programMap={programMap}
        versionMap={versionMap}
        versions={versions}
        selectedVersionId={selectedVersionId}
        onElementClick={handleElementClick}
        onReorderElements={onReorderElements}
      />
    </div>
  );
};

export default ProgramStructurePanel;

