import ChevronDropdown from '@/app/components/ChevronDropdown';
import type { Program } from '../../types';
import { useUser } from '@/app/contexts/UserContext';

const CREATE_PROGRAM_VALUE = '__create_program__';

const handleCreateProgram = async (createdBy: string, onProgramCreated?: (program: Program) => void, onSelect?: (id: string) => void) => {
  const title = typeof window !== 'undefined' ? window.prompt('Program title') : null;
  const trimmedTitle = (title ?? '').trim();
  if (!trimmedTitle) {
    return;
  }
  try {
    const response = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmedTitle, createdBy }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create program');
    }
    if (data.program?.id) {
      onProgramCreated?.(data.program);
      onSelect?.(data.program.id);
    }
  } catch (err) {
    console.error('Failed to create program:', err);
    if (typeof window !== 'undefined') {
      window.alert(err instanceof Error ? err.message : 'Failed to create program');
    }
  }
};

const ProgramSelector = ({programs, selectedProgramId, onSelect, onProgramCreated}: {programs: Program[], selectedProgramId: string | null, onSelect: (id: string | null) => void, onProgramCreated?: (program: Program) => void}) => {
  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const options = programs.map(p => ({value: p.id, label: p.title}));
  
  const { userName, canEdit } = useUser();
  if (userName && canEdit) {
    options.push({value: CREATE_PROGRAM_VALUE, label: 'Create program...'});
  }
  
  return (
    <div className="flex items-center gap-1">
      {selectedProgram && (
        <div className="text-2xl mb-1" style={{fontFamily: 'Georgia, serif'}}>
          {selectedProgram.title}
        </div>
      )}
      <ChevronDropdown
        value={selectedProgramId}
        options={options}
        onChange={async (id) => {
          if (id === CREATE_PROGRAM_VALUE) {
            await handleCreateProgram(userName, onProgramCreated, onSelect);
            return;
          }
          onSelect(id);
        }}
        placeholder="Select a program"
      />
    </div>
  );
};

export default ProgramSelector;

