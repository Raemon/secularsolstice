const ProgramViews = ({programId}:{programId: string | null}) => {
  return (
    <div className="flex items-center gap-2">
      <a href={`/programs/${programId}/program`} className="text-sm hover:opacity-50">
        Program
      </a>
      <a href={`/programs/${programId}/slides`} className="text-sm hover:opacity-50">
        Slides
      </a>
      <a href={`/programs/${programId}/script`} className="text-sm hover:opacity-50">
        Script
      </a>
      <a href={`/programs/${programId}/edit`} className="text-sm hover:opacity-50">
        Edit
      </a>
    </div>
  );
};

export default ProgramViews;
