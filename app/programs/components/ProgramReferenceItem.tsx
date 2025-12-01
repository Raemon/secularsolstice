import type { Program } from '../types';

const ProgramReferenceItem = ({id, index, program, canEdit, onRemove}: {id: string, index: number, program?: Program, canEdit: boolean, onRemove: () => void}) => {
  const linkSummary = program ? `${program.elementIds.length} elements / ${program.programIds.length} programs` : 'Program unavailable';
  return (
    <div className="text-sm px-2 py-1 flex items-center gap-2">
      <span className="font-semibold w-[20px] text-center text-gray-400">{index + 1}.</span>
      <div className="flex flex-col">
        <span className="font-georgia text-base w-[250px] truncate">{program?.title ?? id}</span>
        <span className="text-xs text-gray-400">{linkSummary}</span>
      </div>
      {canEdit && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-xs px-2 py-0.5 ml-auto text-red-600 hover:text-red-800">
          X
        </button>
      )}
    </div>
  );
};

export default ProgramReferenceItem;

