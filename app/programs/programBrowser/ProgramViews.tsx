const ProgramViews = ({programId, isLocked, isEditing, onEditClick}:{programId: string | null, isLocked?: boolean, isEditing?: boolean, onEditClick?: () => void}) => {
  return (
    <div className="flex items-center gap-4">
      <a href={`/programs/${programId}/program`} className="text-sm hover:opacity-50">
        Program
      </a>
      <a href={`/programs/${programId}/slides`} className="text-sm hover:opacity-50">
        Slides
      </a>
      <a href={`/programs/${programId}/script`} className="text-sm hover:opacity-50">
        Script
      </a>
      <a href={`/feedback?programId=${programId}`} className="text-sm hover:opacity-50">
        Feedback
      </a>
      <button onClick={onEditClick} disabled={isEditing} className={`ml-auto text-sm ${isEditing ? 'opacity-30 cursor-not-allowed' : 'opacity-50 hover:opacity-100'}`} title="Edit">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
      </button>
      {isLocked && (
        <span className="text-sm opacity-50">
          🔒 Locked
        </span>
      )}
    </div>
  );
};

export default ProgramViews;