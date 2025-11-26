import SongsFileList from '../SongsFileList';

type SongVersionPageProps = {
  params: Promise<{
    versionId: string;
  }>;
};

const SongVersionPage = async ({ params }: SongVersionPageProps) => {
  const { versionId } = await params;
  return <SongsFileList initialVersionId={versionId} />;
};

export default SongVersionPage;





