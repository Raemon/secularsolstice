import ProgramSelector from './ProgramSelector';
import type { Program } from '../types';

const ProgramHeaderControls = ({programs, selectedProgramId, onSelectProgram, canEdit, onCreateProgram, onArchiveProgram, isDeletingProgram, selectedProgram}: {programs: Program[], selectedProgramId: string | null, onSelectProgram: (programId: string | null) => void, canEdit: boolean, onCreateProgram: () => void, onArchiveProgram: () => void, isDeletingProgram: boolean, selectedProgram: Program | null}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ProgramSelector programs={programs} selectedProgramId={selectedProgramId} onSelect={onSelectProgram} />
      {canEdit && (
        <button type="button" onClick={onCreateProgram} className="text-sm px-3 py-1">
          Create
        </button>
      )}
      {canEdit && (
        <button type="button" onClick={onArchiveProgram} disabled={!selectedProgram || isDeletingProgram} className="text-sm px-3 py-1 text-red-600 disabled:opacity-50">
          {isDeletingProgram ? 'Deleting...' : 'Delete'}
        </button>
      )}
    </div>
  );
};

export default ProgramHeaderControls;


