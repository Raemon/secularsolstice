import { useUser } from "@/app/contexts/UserContext";
import Tooltip from "@/app/components/Tooltip";

type ProgramViewsProps = {
  programId: string | null;
  currentView?: 'overview' | 'script' | 'slides' | 'program' | 'feedback';
  canEdit?: boolean;
  isLocked?: boolean;
  isEditing?: boolean;
  hasPendingChanges?: boolean;
  isSaving?: boolean;
  onEditClick?: () => void;
  onSaveClick?: () => void;
  onCancelClick?: () => void;
};

const ProgramViews = ({programId, currentView, canEdit, isLocked, isEditing, hasPendingChanges, isSaving, onEditClick, onSaveClick, onCancelClick}: ProgramViewsProps) => {
  const { isAdmin } = useUser();
  const showEditControls = canEdit && (!isLocked || isAdmin);
  const linkClass = (view: ProgramViewsProps['currentView']) => `text-sm hover:opacity-50 ${currentView !== view ? 'opacity-65' : 'underline'}`;
  return (
    <div className="flex items-center gap-5">
      <a href={`/programs/${programId}/script`} className={linkClass('script')}>
        Script
      </a>
      <a href={`/programs/${programId}`} className={linkClass('overview')}>
        Editor
      </a>
      <a href={`/programs/${programId}/slides`} className={linkClass('slides')}>
        Slides
      </a>
      <a href={`/programs/${programId}/program`} className={linkClass('program')}>
        Print Program
      </a>
      <a href={`/feedback/${programId}`} className={linkClass('feedback')}>
        Feedback
      </a>
      {showEditControls && (isEditing ? (
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onCancelClick} disabled={isSaving} className="text-sm text-gray-400 hover:text-white disabled:opacity-50">Cancel</button>
          <button onClick={onSaveClick} disabled={isSaving} className={`text-sm px-2 py-0.5 ${hasPendingChanges ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-600 text-gray-300'} disabled:opacity-50`}>{isSaving ? 'Saving...' : 'Save'}</button>
        </div>
      ) : (
        <button onClick={onEditClick} className="ml-auto text-sm opacity-50 hover:opacity-100" title="Edit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
      ))}
      {!canEdit && (
        <Tooltip content="log in to edit">
          <button disabled className="ml-auto text-sm opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        </Tooltip>
      )}
      {isLocked && (
        <span className="text-sm opacity-50">
          🔒 Locked
        </span>
      )}
    </div>
  );
};

export default ProgramViews;