import ProgramManager from '../../ProgramManager';

type ProgramVersionPageProps = {
  params: Promise<{
    programId: string;
    versionId: string;
  }>;
};

const ProgramVersionPage = async ({ params }: ProgramVersionPageProps) => {
  const { programId, versionId } = await params;
  return <ProgramManager initialProgramId={programId} initialVersionId={versionId} />;
};

export default ProgramVersionPage;

