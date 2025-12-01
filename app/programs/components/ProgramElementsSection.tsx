import type { KeyboardEvent } from 'react';
import DragAndDropList from './DragAndDropList';
import ProgramElementItem from './ProgramElementItem';
import VersionSelector from './VersionSelector';
import type { Program, VersionOption } from '../types';

const ProgramElementsSection = ({selectedProgram, versions, versionMap, selectedVersionId, filteredVersions, searchTerm, onSearchChange, onAddElement, onRemoveElement, onReorderElements, onChangeVersion, onElementClick, onCreateVersion, onKeyDown, canEdit}: {selectedProgram: Program | null, versions: VersionOption[], versionMap: Record<string, VersionOption>, selectedVersionId: string | undefined, filteredVersions: VersionOption[], searchTerm: string, onSearchChange: (value: string) => void, onAddElement: (versionId: string) => void, onRemoveElement: (versionId: string) => void, onReorderElements: (ids: string[]) => void, onChangeVersion: (oldId: string, newId: string) => void, onElementClick: (versionId: string) => void, onCreateVersion: (songId: string) => void, onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void, canEdit: boolean}) => {
  return (
    <div className="flex flex-col gap-1 w-1/2">
      {!selectedProgram && (
        <p className="text-sm text-gray-400">Create or select a program to begin.</p>
      )}
      {selectedProgram && selectedProgram.elementIds.length === 0 && (
        <p className="text-sm text-gray-400">No elements yet.</p>
      )}
      {selectedProgram && selectedProgram.elementIds.length > 0 && (
        <DragAndDropList
          items={selectedProgram.elementIds}
          onReorder={onReorderElements}
          keyExtractor={(id) => id}
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
    </div>
  );
};

export default ProgramElementsSection;


