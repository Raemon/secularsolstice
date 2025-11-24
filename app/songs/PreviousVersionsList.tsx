import type { SongVersion } from './types';

const PreviousVersionsList = ({previousVersions, isExpanded, onToggle, onVersionClick}: {
  previousVersions: SongVersion[];
  isExpanded: boolean;
  onToggle: () => void;
  onVersionClick: (version: SongVersion) => void;
}) => {
  if (previousVersions.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      <button
        onClick={onToggle}
        className="text-xs text-gray-600 mb-2"
      >
        {isExpanded ? '▼' : '▶'} Previous Versions ({previousVersions.length})
      </button>
      {isExpanded && (
        <div className="space-y-1 ml-4">
          {previousVersions.map((prevVersion) => (
            <div
              key={prevVersion.id}
              onClick={() => onVersionClick(prevVersion)}
              className="px-2 py-1 cursor-pointer hover:bg-gray-50 text-xs"
            >
              <div className="font-mono text-gray-800">{prevVersion.label}</div>
              <div className="text-gray-400">
                {new Date(prevVersion.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviousVersionsList;

