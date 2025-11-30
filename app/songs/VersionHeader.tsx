import type { SongVersion } from './types';
import Tooltip from '../components/Tooltip';

const VersionHeader = ({songTitle, version, showTitle = false, className = ''}: {
  songTitle?: string;
  version: SongVersion;
  showTitle?: boolean;
  className?: string;
}) => {
  const createdDate = new Date(version?.createdAt || '');
  return (
    <div className={className}>
      {showTitle && songTitle && <h1 className="text-2xl font-georgia">{songTitle}</h1>}
      <div className="text-sm flex items-center gap-4 text-gray-400">
        <span className="font-mono">{version.label}</span> 
        <Tooltip content={createdDate.toLocaleString()}>
          <span>{createdDate.toLocaleDateString()}</span>
        </Tooltip>
        <span>{version.bpm ? `BPM: ${version.bpm}` : ''}</span> 
        <span>{version.createdBy ? version.createdBy : ''}</span>
      </div>
    </div>
  );
};

export default VersionHeader;

