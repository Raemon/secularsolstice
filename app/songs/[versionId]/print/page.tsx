import { getVersionById, getSongWithVersions } from '../../../../lib/songsRepository';
import VersionContent from '../../VersionContent';
import VersionHeader from '../../VersionHeader';
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
      <VersionHeader songTitle={song?.title} version={version} showTitle />
      <VersionContent version={version} print />
    </div>
  );
};

export default PrintPage;

