import { listSongsWithVersionsPaginated } from '@/lib/songsRepository';
import SongsFileList from "./SongsFileList";

export default async function SongsPage() {
  const { songs } = await listSongsWithVersionsPaginated({ limit: 50 });
  return <div className="px-4">
    <h2 className="text-5xl font-georgia mx-auto text-center my-12">Songs & Speeches</h2>
    <SongsFileList initialSongs={songs} />
  </div>;
}
