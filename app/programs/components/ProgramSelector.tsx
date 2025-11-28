import ChevronDropdown from '@/app/components/ChevronDropdown';

type Program = {
  id: string;
  title: string;
  elementIds: string[];
  createdAt: string;
  archived: boolean;
};

const ProgramSelector = ({programs, selectedProgramId, onSelect}: {programs: Program[], selectedProgramId: string | null, onSelect: (id: string | null) => void}) => {
  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const options = programs.map(p => ({value: p.id, label: p.title}));
  
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
        onChange={onSelect}
        placeholder="Select a program"
      />
    </div>
  );
};

export default ProgramSelector;

