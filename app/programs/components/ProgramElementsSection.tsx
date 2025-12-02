import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactElement } from 'react';
import DragAndDropList from './DragAndDropList';
import ProgramElementItem from './ProgramElementItem';
import ProgramReferenceItem from './ProgramReferenceItem';
import VersionSelector from './VersionSelector';
import type { Program, VersionOption } from '../types';

const noopRemove = () => {};
const noopChangeVersion = () => {};
const noopCreateVersion = () => {};

const ProgramElementsSection = ({selectedProgram, versions, versionMap, selectedVersionId, filteredVersions, searchTerm, onSearchChange, onAddElement, onRemoveElement, onReorderElements, onChangeVersion, onElementClick, onCreateVersion, onKeyDown, canEdit, programs, programMap, onAddProgram, onRemoveProgram, onReorderProgramIds, canReferenceProgram}: {selectedProgram: Program | null, versions: VersionOption[], versionMap: Record<string, VersionOption>, selectedVersionId: string | undefined, filteredVersions: VersionOption[], searchTerm: string, onSearchChange: (value: string) => void, onAddElement: (versionId: string) => void, onRemoveElement: (versionId: string) => void, onReorderElements: (ids: string[]) => void, onChangeVersion: (oldId: string, newId: string) => void, onElementClick: (versionId: string) => void, onCreateVersion: (songId: string) => void, onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void, canEdit: boolean, programs: Program[], programMap: Record<string, Program>, onAddProgram: (programId: string) => void, onRemoveProgram: (programId: string) => void, onReorderProgramIds: (ids: string[]) => void, canReferenceProgram: (sourceProgram: Program | null, targetProgramId: string) => boolean}) => {
  const [isProgramPickerOpen, setIsProgramPickerOpen] = useState(false);
  const [programSearchTerm, setProgramSearchTerm] = useState('');
  const [programSelectedIndex, setProgramSelectedIndex] = useState(-1);
  const programPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isProgramPickerOpen) {
      setProgramSearchTerm('');
      setProgramSelectedIndex(-1);
    }
  }, [isProgramPickerOpen]);

  useEffect(() => {
    if (!canEdit) {
      setIsProgramPickerOpen(false);
    }
  }, [canEdit]);

  useEffect(() => {
    if (!isProgramPickerOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (programPickerRef.current && !programPickerRef.current.contains(event.target as Node)) {
        setIsProgramPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProgramPickerOpen]);

  useEffect(() => {
    setIsProgramPickerOpen(false);
    setProgramSearchTerm('');
  }, [selectedProgram?.id]);

  const filteredPrograms = useMemo(() => {
    if (!selectedProgram) {
      return [];
    }
    const eligiblePrograms = programs.filter(program => canReferenceProgram(selectedProgram, program.id));
    if (!programSearchTerm.trim()) {
      return eligiblePrograms.slice(0, 8);
    }
    const normalized = programSearchTerm.trim().toLowerCase();
    return eligiblePrograms
      .filter(program => program.title.toLowerCase().includes(normalized))
      .slice(0, 8);
  }, [programSearchTerm, programs, selectedProgram, canReferenceProgram]);

  const handleProgramInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsProgramPickerOpen(false);
      return;
    }

    if (!filteredPrograms.length) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setProgramSelectedIndex(prev => prev < filteredPrograms.length - 1 ? prev + 1 : prev);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setProgramSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (event.key === 'Enter' && programSelectedIndex >= 0) {
      event.preventDefault();
      const selected = filteredPrograms[programSelectedIndex];
      if (selected) {
        onAddProgram(selected.id);
        setIsProgramPickerOpen(false);
        setProgramSearchTerm('');
        setProgramSelectedIndex(-1);
      }
    }
  };

  const handleSelectProgram = (programId: string) => {
    onAddProgram(programId);
    setIsProgramPickerOpen(false);
    setProgramSearchTerm('');
    setProgramSelectedIndex(-1);
  };

  const renderChildProgramElements = (programId: string, depth: number, visited: Set<string>): ReactElement | null => {
    const program = programMap[programId];
    if (!program) {
      return (
        <div key={`${programId}-${depth}-missing`} className="text-xs text-gray-400" style={{marginLeft: depth * 16}}>
          Program unavailable
        </div>
      );
    }
    if (visited.has(programId)) {
      return (
        <div key={`${programId}-${depth}-cycle`} className="text-xs text-red-500" style={{marginLeft: depth * 16}}>
          Circular reference detected
        </div>
      );
    }
    const nextVisited = new Set(visited);
    nextVisited.add(programId);
    return (
      <div key={`${programId}-${depth}`} className="flex flex-col gap-1" style={{marginLeft: depth * 16}}>
        <div className="text-xs text-gray-400">{program.title}</div>
        {program.elementIds.length === 0 && program.programIds.length === 0 && (
          <div className="text-xs text-gray-500">No elements</div>
        )}
        {program.elementIds.map((elementId, index) => {
          const version = versionMap[elementId];
          return (
            <ProgramElementItem
              key={`${elementId}-${program.id}-nested-${depth}`}
              id={elementId}
              index={index}
              version={version}
              allVersions={versions}
              onRemove={noopRemove}
              onChangeVersion={noopChangeVersion}
              onClick={onElementClick}
              onCreateNewVersion={noopCreateVersion}
              canEdit={canEdit}
              selectedVersionId={selectedVersionId}
            />
          );
        })}
        {program.programIds.map(childId => (
          <div key={`${childId}-${programId}-nested`}>
            {renderChildProgramElements(childId, depth + 1, nextVisited)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-1">
      {!selectedProgram && (
        <p className="text-sm text-gray-400">Create or select a program to begin.</p>
      )}
      {selectedProgram && selectedProgram.elementIds.length === 0 && selectedProgram.programIds.length === 0 && (
        <p className="text-sm text-gray-400">No elements yet.</p>
      )}
      {selectedProgram && selectedProgram.elementIds.length > 0 && (
        <DragAndDropList
          items={selectedProgram.elementIds}
          onReorder={onReorderElements}
          keyExtractor={(id) => `${id}-${selectedProgram.id}`}
          renderItem={(id, index) => {
            const version = versionMap[id];
            return <ProgramElementItem 
              id={id} 
              index={index} 
              version={version} 
              allVersions={versions} 
              onRemove={onRemoveElement} 
              onChangeVersion={onChangeVersion} 
              onClick={onElementClick} 
              onCreateNewVersion={onCreateVersion} 
              canEdit={canEdit} 
              selectedVersionId={selectedVersionId} 
            />;
          }}
        />
      )}
      <VersionSelector
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        filteredVersions={filteredVersions}
        onAddElement={onAddElement}
        onKeyDown={onKeyDown}
        onCreateVersion={onCreateVersion}
        disabled={!selectedProgram}
      />
      {selectedProgram && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">Linked programs</div>
            {canEdit && (
              <button type="button" onClick={() => setIsProgramPickerOpen(prev => !prev)} disabled={!selectedProgram} className="text-xs px-2 py-0.5">
                {isProgramPickerOpen ? 'Close' : 'Add program'}
              </button>
            )}
          </div>
          {isProgramPickerOpen && canEdit && (
            <div ref={programPickerRef} className="flex flex-col gap-1">
              <input
                value={programSearchTerm}
                onChange={(event) => {
                  setProgramSearchTerm(event.target.value);
                  setProgramSelectedIndex(-1);
                }}
                onKeyDown={handleProgramInputKeyDown}
                placeholder="Search programs"
                className="text-sm px-2 py-1"
                autoFocus
              />
              {filteredPrograms.length > 0 && (
                <div className="flex flex-col border border-gray-300">
                  {filteredPrograms.map((program, index) => (
                    <button
                      type="button"
                      key={program.id}
                      onClick={() => handleSelectProgram(program.id)}
                      className={`text-left text-sm px-2 py-1 hover:bg-black/80 ${index === programSelectedIndex ? 'bg-blue-100' : ''}`}
                    >
                      <span className="font-semibold">{program.title}</span>
                    </button>
                  ))}
                </div>
              )}
              {programSearchTerm && filteredPrograms.length === 0 && (
                <div className="text-xs text-gray-400 px-2 py-1">No matching programs</div>
              )}
            </div>
          )}
          {selectedProgram.programIds.length === 0 && (
            <p className="text-xs text-gray-400">No linked programs.</p>
          )}
          {selectedProgram.programIds.length > 0 && (
            <DragAndDropList
              items={selectedProgram.programIds}
              onReorder={onReorderProgramIds}
              keyExtractor={(id) => id}
              renderItem={(id, index) => (
                <ProgramReferenceItem
                  id={id}
                  index={index}
                  program={programMap[id]}
                  canEdit={canEdit}
                  onRemove={() => onRemoveProgram(id)}
                />
              )}
            />
          )}
          {selectedProgram.programIds.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-sm font-semibold">Nested program elements</div>
              {selectedProgram.programIds.map(programId => (
                <div key={`${programId}-${selectedProgram.id}-nested`}>
                  {renderChildProgramElements(programId, 1, new Set([selectedProgram.id]))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgramElementsSection;


