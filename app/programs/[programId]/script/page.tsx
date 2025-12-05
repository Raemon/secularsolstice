import ProgramScript from './ProgramScript';

type ProgramScriptPageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const ProgramScriptPage = async ({ params }: ProgramScriptPageProps) => {
  const { programId } = await params;
  return <ProgramScript programId={programId} />;
};

export default ProgramScriptPage;

