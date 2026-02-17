import { promises as fs } from 'fs';
import path from 'path';
import { listSongsWithVersionsPaginated } from '@/lib/songsRepository';
import { listPrograms } from '@/lib/programsRepository';
import HomePage from "./HomePage";

export default async function Home() {
  const [{ songs }, programs, homeContent, aboutContent] = await Promise.all([
    listSongsWithVersionsPaginated({ limit: 6 }),
    listPrograms(),
    fs.readFile(path.join(process.cwd(), 'public', 'home.md'), 'utf-8').catch(() => ''),
    fs.readFile(path.join(process.cwd(), 'public', 'about.md'), 'utf-8').catch(() => ''),
  ]);
  return <HomePage initialSongs={songs} initialPrograms={programs} homeContent={homeContent} aboutContent={aboutContent} />;
}