import type { SongVersion } from './types';

const VersionMetadata = ({version}: {
  version: SongVersion & { songId?: string; nextVersionId?: string | null; originalVersionId?: string | null };
}) => {
  return (
    <div className="mb-3 space-y-1 text-xs">
      <div className="text-gray-600">ID: <span className="font-mono text-gray-800">{version.id}</span></div>
      {version.songId && <div className="text-gray-600">Song ID: <span className="font-mono text-gray-800">{version.songId}</span></div>}
      <div className="text-gray-600">Created: <span className="text-gray-800">{new Date(version.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></div>
      {version.previousVersionId && <div className="text-gray-600">Previous Version ID: <span className="font-mono text-gray-800">{version.previousVersionId}</span></div>}
      {version.nextVersionId && <div className="text-gray-600">Next Version ID: <span className="font-mono text-gray-800">{version.nextVersionId}</span></div>}
      {version.originalVersionId && <div className="text-gray-600">Original Version ID: <span className="font-mono text-gray-800">{version.originalVersionId}</span></div>}
      {version.audioUrl && <div className="text-gray-600">Audio URL: <span className="font-mono text-gray-800 break-all">{version.audioUrl}</span></div>}
    </div>
  );
};

export default VersionMetadata;

