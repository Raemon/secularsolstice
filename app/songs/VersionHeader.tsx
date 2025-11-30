import type { SongVersion } from './types';

const VersionHeader = ({songTitle, version, showTitle = false, className = ''}: {
  songTitle?: string;
  version: SongVersion;
  showTitle?: boolean;
  className?: string;
}) => {
  return (
    <div className={className}>
      {showTitle && songTitle && <h1 className="text-2xl font-georgia">{songTitle}</h1>}
      <div className="text-sm flex items-center gap-4 text-gray-400">
        <span className="font-mono">{version.label}</span> 
        <span>{new Date(version?.createdAt || '').toLocaleDateString()}</span> 
        <span>{version.bpm ? `BPM: ${version.bpm}` : ''}</span> 
        <span>{version.createdBy ? version.createdBy : ''}</span>
      </div>
    </div>
  );
};

export default VersionHeader;

