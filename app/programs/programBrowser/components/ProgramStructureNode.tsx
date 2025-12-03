'use client';

import { type ReactElement, useState, useEffect, useRef, useMemo, type KeyboardEvent } from 'react';
import ProgramElementItem from './ProgramElementItem';
import DragAndDropList from '../../components/DragAndDropList';
import type { Program, VersionOption } from '../../types';
import { formatRelativeTimestamp } from '@/lib/dateUtils';

export type ProgramStructureNodeProps = {
  current: Program;
  depth: number;
  trail: Set<string>;
  programMap: Record<string, Program>;
  versionMap: Record<string, VersionOption>;
  versions: VersionOption[];
  selectedVersionId?: string;
  onElementClick: (versionId: string) => void;
  onReorderElements: (programId: string, reorderedElementIds: string[]) => void | Promise<void>;
  onChangeVersion: (programId: string, oldId: string, newId: string) => void | Promise<void>;
  onAddElement: (programId: string, versionId: string) => void | Promise<void>;
  onRemoveElement: (programId: string, elementId: string) => void | Promise<void>;
  canEdit: boolean;
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
  onReorderElements,
  onChangeVersion,
  onAddElement,
  onRemoveElement,
  canEdit,
}: ProgramStructureNodeProps): ReactElement => {
  const nextTrail = new Set(trail);
  nextTrail.add(current.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredVersions = useMemo(() => {
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      return [];
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, '_');
    return versions
      .filter((version) =>
        version.nextVersionId === null && (
          version.songTitle.toLowerCase().includes(normalized) ||
          version.label.toLowerCase().includes(normalized)
        )
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [searchTerm, versions]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchTerm, filteredVersions]);

  useEffect(() => {
    if (!searchTerm) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchTerm]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!filteredVersions.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(prev => prev < filteredVersions.length - 1 ? prev + 1 : prev);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (event.key === 'Enter' && selectedIndex >= 0) {
      event.preventDefault();
      void onAddElement(current.id, filteredVersions[selectedIndex].id);
      setSearchTerm('');
    }
  };

  return (
    <div className={`px-2 ${depth > 0 ? 'ml-1' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        {depth > 0 && (
          <div className="text-xl font-georgia">
            {current.title}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div ref={containerRef} className="mt-2 flex flex-col gap-1">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add song..."
            className="text-sm px-2 py-1"
          />
          {searchTerm && filteredVersions.length > 0 && (
            <div className="flex flex-col border border-gray-300">
              {filteredVersions.map((version, index) => (
                <button
                  type="button"
                  key={version.id}
                  onClick={() => {
                    void onAddElement(current.id, version.id);
                    setSearchTerm('');
                  }}
                  className={`flex justify-between items-center text-left text-sm px-2 py-1 hover:bg-black/80 ${index === selectedIndex ? 'bg-blue-100' : ''}`}
                >
                  <span><span className="font-semibold">{version.songTitle}</span> <span className="text-gray-400">{version.label}</span></span>
                  <span className="text-gray-400 ml-2">{formatRelativeTimestamp(version.createdAt)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="text-sm font-semibold">+ Song</div>
        <div className="text-sm font-semibold">+ Speech</div>
      </div>
      <div className="mt-2 flex flex-col">
        <DragAndDropList
          items={current.elementIds}
          onReorder={(reorderedElementIds) => {
            void onReorderElements(current.id, reorderedElementIds);
          }}
          renderItem={(elementId: string, index: number) => {
            const version = versionMap[elementId];
            return (
              <ProgramElementItem
                id={elementId}
                index={index}
                version={version}
                allVersions={versions}
                onRemove={() => {
                  void onRemoveElement(current.id, elementId);
                }}
                onChangeVersion={(oldId, newId) => {
                  void onChangeVersion(current.id, oldId, newId);
                }}
                onClick={onElementClick}
                selectedVersionId={selectedVersionId}
                canEdit={canEdit}
              />
            );
          }}
          keyExtractor={(elementId: string) => `${elementId}-${current.id}`}
        />
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
                onReorderElements={onReorderElements}
                onChangeVersion={onChangeVersion}
                onAddElement={onAddElement}
                onRemoveElement={onRemoveElement}
                canEdit={canEdit}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgramStructureNode;

