import PrintProgram from './PrintProgram';

type PrintProgramPageProps = {
  params: Promise<{
    programId: string;
  }>;
};

const PrintProgramPage = async ({ params }: PrintProgramPageProps) => {
  const { programId } = await params;
  return <PrintProgram programId={programId} />;
};

export default PrintProgramPage;

