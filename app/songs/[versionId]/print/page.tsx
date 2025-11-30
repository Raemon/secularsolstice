import { getVersionById, getSongWithVersions } from '../../../../lib/songsRepository';
import VersionContent from '../../VersionContent';
import { notFound } from 'next/navigation';


const PrintPage = async ({ params }: { params: Promise<{ versionId: string }> }) => {
  const { versionId } = await params;
  const version = await getVersionById(versionId);

  if (!version) {
    notFound();
  }
  const song = await getSongWithVersions(version.songId); 


  return (
    <div className="p-8 w-full max-w-4xl mx-auto bg-white text-black [&_*]:!text-black">
      {song?.title && <h1 className="text-2xl font-georgia">{song.title}</h1>}
      <h2 className="text-sm">{version.label} {new Date(version?.createdAt || '').toLocaleDateString()} {version.bpm ? `BPM: ${version.bpm}` : ''} {version.createdBy ? version.createdBy : ''}</h2>
      <VersionContent version={version} print />
    </div>
  );
};

export default PrintPage;

