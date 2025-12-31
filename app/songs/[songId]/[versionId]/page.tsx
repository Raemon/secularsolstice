import SongsFileList from '../../SongsFileList';

type VersionPageProps = {
  params: Promise<{
    songId: string;
    versionId: string;
  }>;
};

const VersionPage = async ({ params }: VersionPageProps) => {
  const { songId, versionId } = await params;
  return <SongsFileList initialSongId={songId} initialVersionId={versionId} />;
};

export default VersionPage;