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
  onChangeVersion: (programId: string, oldId: string, newId: string) => void | Promise<void>;
  onAddElement: (programId: string, versionId: string) => void | Promise<void>;
  onRemoveElement: (programId: string, elementId: string) => void | Promise<void>;
  canEdit: boolean;
};

const ProgramStructurePanel = ({
  program,
  programMap,
  versions,
  versionMap,
  selectedVersionId,
  onVersionClick,
  onReorderElements,
  onChangeVersion,
  onAddElement,
  onRemoveElement,
  canEdit,
}: ProgramStructurePanelProps): ReactElement => {
  if (!program) {
    return (
      <div className="border-l border-gray-200 pl-4 w-full">
        <p className="text-sm text-gray-400">Select a program to explore its contents.</p>
      </div>
    );
  }

  const handleElementClick = (versionId: string) => {
    void onVersionClick(versionId);
  };

  return (
    <div className="w-full max-w-xl">
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
        onChangeVersion={onChangeVersion}
        onAddElement={onAddElement}
        onRemoveElement={onRemoveElement}
        canEdit={canEdit}
      />
    </div>
  );
};

export default ProgramStructurePanel;

