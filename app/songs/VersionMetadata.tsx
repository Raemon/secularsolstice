import type { SongVersion } from './types';

const VersionMetadata = ({version}: {
  version: SongVersion;
}) => {
  return (
    <div className="mt-10 space-y-1 text-xs opacity-40 border-t border-gray-200 pt-10">
      <div className="text-gray-600">ID: <span className="font-mono text-gray-800">{version.id}</span></div>
      {version.songId && <div className="text-gray-600">Song ID: <span className="font-mono text-gray-800">{version.songId}</span></div>}
      <div className="text-gray-600">Created: <span className="text-gray-800">{new Date(version.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
      {version.previousVersionId && <div className="text-gray-600">Previous Version ID: <span className="font-mono text-gray-800">{version.previousVersionId}</span></div>}
      {version.nextVersionId && <div className="text-gray-600">Next Version ID: <span className="font-mono text-gray-800">{version.nextVersionId}</span></div>}
      {version.originalVersionId && <div className="text-gray-600">Original Version ID: <span className="font-mono text-gray-800">{version.originalVersionId}</span></div>}
      {version.audioUrl && <div className="text-gray-600">Audio URL: <span className="font-mono text-gray-800 break-all">{version.audioUrl}</span></div>}
      {version.bpm && <div className="text-gray-600">BPM: <span className="text-gray-800">{version.bpm}</span></div>}
    </div>
  );
};

export default VersionMetadata;

