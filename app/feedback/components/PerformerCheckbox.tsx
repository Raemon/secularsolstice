'use client';

import { useUser } from '@/app/contexts/UserContext';

const PerformerCheckbox = ({programId}:{programId: string}) => {
  const { user, togglePerformedProgram } = useUser();
  
  if (!user) return null;
  
  const isPerformer = user.performed_program_ids?.includes(programId) || false;
  
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
      <input
        type="checkbox"
        checked={isPerformer}
        onChange={() => togglePerformedProgram(programId)}
        className="cursor-pointer"
      />
      I performed at this program
    </label>
  );
};

export default PerformerCheckbox;