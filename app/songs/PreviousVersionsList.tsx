import ChevronArrow from '@/app/components/ChevronArrow';
import type { SongVersion } from './types';

const PreviousVersionsList = ({previousVersions, currentLabel, isExpanded, onToggle, onVersionClick}: {
  previousVersions: SongVersion[];
  currentLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  onVersionClick: (version: SongVersion) => void;
}) => {
  if (previousVersions.length === 0) {
    return null;
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) + 
      ' ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="text-xs text-gray-300 mb-2"
      >
        <ChevronArrow isExpanded={isExpanded} className="mr-1" /> Previous Versions ({previousVersions.length})
      </button>
      {isExpanded && (
        <div className="space-y-1 ml-4">
          {previousVersions.map((prevVersion) => (
            <div
              key={prevVersion.id}
              onClick={() => onVersionClick(prevVersion)}
              className="px-2 py-1 cursor-pointer hover:bg-gray-50 text-xs"
            >
              {prevVersion.label !== currentLabel && (
                <div className="font-mono text-gray-300">{prevVersion.label}</div>
              )}
              <div className="text-gray-400">{formatDate(prevVersion.createdAt)}</div>
              <div className="text-gray-400">{prevVersion.createdBy}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviousVersionsList;

