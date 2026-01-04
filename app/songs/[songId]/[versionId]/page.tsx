import { listSongsWithVersionsPaginated, getVersionById, getPreviousVersionsChain } from '@/lib/songsRepository';
import SongsFileList from '../../SongsFileList';

type VersionPageProps = {
  params: Promise<{
    songId: string;
    versionId: string;
  }>;
};

const VersionPage = async ({ params }: VersionPageProps) => {
  const { songId, versionId } = await params;
  const [{ songs }, version, previousVersions] = await Promise.all([
    listSongsWithVersionsPaginated({ limit: 50 }),
    getVersionById(versionId),
    getPreviousVersionsChain(versionId),
  ]);
  return (
    <SongsFileList
      initialSongs={songs}
      initialSongId={songId}
      initialVersionId={versionId}
      initialVersion={version}
      initialPreviousVersions={previousVersions}
    />
  );
};

export default VersionPage;