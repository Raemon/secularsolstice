type Program = {
  id: string;
  title: string;
  elementIds: string[];
  createdAt: string;
};

const ProgramSelector = ({programs, selectedProgramId, onSelect}: {programs: Program[], selectedProgramId: string | null, onSelect: (id: string | null) => void}) => {
  return (
    <select
      value={selectedProgramId ?? ''}
      onChange={(event) => onSelect(event.target.value || null)}
      className="text-sm px-2 py-1"
    >
      <option value="">Select a program</option>
      {programs.map((program) => (
        <option key={program.id} value={program.id}>
          {program.title}
        </option>
      ))}
    </select>
  );
};

export default ProgramSelector;

