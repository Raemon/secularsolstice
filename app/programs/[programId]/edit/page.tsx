import EditProgramContent from './EditProgramContent';

type PageProps = {
  params: Promise<{ programId: string }>;
};

const EditProgramPage = async ({ params }: PageProps) => {
  const { programId } = await params;
  return <EditProgramContent programId={programId} />;
};

export default EditProgramPage;


