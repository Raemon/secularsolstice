import SongsFileList from '../SongsFileList';

type SongPageProps = {
  params: Promise<{
    songId: string;
  }>;
};

const SongPage = async ({ params }: SongPageProps) => {
  const { songId } = await params;
  return <SongsFileList initialSongId={songId} />;
};

export default SongPage;