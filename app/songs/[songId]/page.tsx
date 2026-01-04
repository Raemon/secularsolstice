import { listSongsWithVersionsPaginated } from '@/lib/songsRepository';
import SongsFileList from '../SongsFileList';

type SongPageProps = {
  params: Promise<{
    songId: string;
  }>;
};

const SongPage = async ({ params }: SongPageProps) => {
  const { songId } = await params;
  const { songs } = await listSongsWithVersionsPaginated({ limit: 50 });
  return <SongsFileList initialSongs={songs} initialSongId={songId} />;
};

export default SongPage;