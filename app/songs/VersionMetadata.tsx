import type { SongVersion } from './types';

const VersionMetadata = ({version}: {
  version: SongVersion;
}) => {
  return (
    <div className="mt-10 space-y-1 text-xs opacity-40 border-t border-gray-200 pt-10">
      <div className="text-gray-400">ID: <span className="font-mono text-gray-200">{version.id}</span></div>
      {version.songId && <div className="text-gray-400">Song ID: <span className="font-mono text-gray-200">{version.songId}</span></div>}
      <div className="text-gray-400">Created: <span className="text-gray-200">{new Date(version.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
      {version.previousVersionId && <div className="text-gray-400">Previous Version ID: <span className="font-mono text-gray-200">{version.previousVersionId}</span></div>}
      {version.nextVersionId && <div className="text-gray-400">Next Version ID: <span className="font-mono text-gray-200">{version.nextVersionId}</span></div>}
      {version.originalVersionId && <div className="text-gray-400">Original Version ID: <span className="font-mono text-gray-200">{version.originalVersionId}</span></div>}
      {version.audioUrl && <div className="text-gray-400">Audio URL: <span className="font-mono text-gray-200 break-all">{version.audioUrl}</span></div>}
      {version.slidesMovieUrl && <div className="text-gray-400">Slides Movie URL: <span className="font-mono text-gray-200 break-all">{version.slidesMovieUrl}</span></div>}
      {version.bpm && <div className="text-gray-400">BPM: <span className="text-gray-200">{version.bpm}</span></div>}
      {version.transpose && <div className="text-gray-400">Transpose: <span className="text-gray-200">{version.transpose}</span></div>}
    </div>
  );
};

export default VersionMetadata;

