'use client';

import { type ReactElement } from 'react';
import ProgramElementItem from './ProgramElementItem';
import type { Program, VersionOption } from '../../types';

const noop = () => {};

export type ProgramStructureNodeProps = {
  current: Program;
  depth: number;
  trail: Set<string>;
  programMap: Record<string, Program>;
  versionMap: Record<string, VersionOption>;
  versions: VersionOption[];
  selectedVersionId?: string;
  onElementClick: (versionId: string) => void;
};

const ProgramStructureNode = ({
  current,
  depth,
  trail,
  programMap,
  versionMap,
  versions,
  selectedVersionId,
  onElementClick,
}: ProgramStructureNodeProps): ReactElement => {
  const nextTrail = new Set(trail);
  nextTrail.add(current.id);

  return (
    <div className={`px-2 ${depth > 0 ? 'ml-1' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        {depth > 0 && (
          <div className="text-xl font-georgia">
            {current.title}
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-col divide-y divide-gray-900">
        {current.elementIds.map((elementId: string, index: number): ReactElement => {
          const version = versionMap[elementId];
          return (
            <ProgramElementItem
              key={`${elementId}-${current.id}`}
              id={elementId}
              index={index}
              version={version}
              allVersions={versions}
              onRemove={noop}
              onChangeVersion={noop}
              onClick={onElementClick}
              canEdit={false}
              selectedVersionId={selectedVersionId}
            />
          );
        })}
      </div>
      {current.programIds.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {current.programIds.map((childId: string): ReactElement => {
            if (nextTrail.has(childId)) {
              return (
                <div key={`${childId}-cycle`} className="text-xs text-red-400">
                  Circular reference detected for {childId}
                </div>
              );
            }
            const childProgram = programMap[childId];
            if (!childProgram) {
              return (
                <div key={`${childId}-missing`} className="text-xs text-gray-500">
                  Program {childId} unavailable.
                </div>
              );
            }
            return (
              <ProgramStructureNode
                key={`${childId}-${current.id}`}
                current={childProgram}
                depth={depth + 1}
                trail={nextTrail}
                programMap={programMap}
                versionMap={versionMap}
                versions={versions}
                selectedVersionId={selectedVersionId}
                onElementClick={onElementClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgramStructureNode;

