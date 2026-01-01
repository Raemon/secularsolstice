import type { PreviewItem } from '../types';

type Props = {
  item: PreviewItem;
  onSelectVersion: (itemKey: string, versionId: string | null) => void;
  onToggleDontImport: (itemKey: string) => void;
  onCompare: (item: PreviewItem, versionId: string, versionLabel: string, versionContent: string) => void;
};

const PreviewPanelItem = ({item, onSelectVersion, onToggleDontImport, onCompare}: Props) => {
  const {candidateSong} = item;
  const isNewSong = candidateSong === null;
  const songTitle = isNewSong ? 'Create new song' : candidateSong.song.title;
  const similarity = isNewSong ? null : candidateSong.similarity;
  const versions = isNewSong ? [] : candidateSong.song.versions;

  return (
    <div className={`flex ${item.dontImport ? 'opacity-50' : ''}`}>
      <div className="w-1/2 px-2 py-1 text-sm font-medium border-b border-gray-500 font-georgia">
        <span className="text-[11px] text-gray-400 font-mono">
          → {songTitle}{similarity !== null && ` (${similarity}%)`}
        </span>
      </div>
      <div className="border-b py-1 border-gray-500 w-1/2 flex flex-col justify-center">
        <div
          onClick={() => onToggleDontImport(item.itemKey)}
          className={`flex items-center gap-3 px-2 py-[2px] cursor-pointer ${item.dontImport ? 'text-red-400' : 'hover:bg-black/50'}`}
        >
          <span className="font-mono" style={{fontSize: '12px'}}>
            {item.dontImport ? '● ' : '○ '}Don&apos;t import
          </span>
        </div>
        {!isNewSong && versions.map(version => {
          const isSelected = !item.dontImport && version.id === item.selectedVersionId;
          return (
            <div
              key={version.id}
              onClick={() => !item.dontImport && onSelectVersion(item.itemKey, version.id)}
              className={`flex items-center gap-3 px-2 py-[2px] ${item.dontImport ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSelected ? 'text-primary' : item.dontImport ? '' : 'hover:bg-black/50'}`}
            >
              <span className={`flex-1 font-mono min-w-0 ${isSelected ? 'font-medium' : ''}`} style={{fontSize: '12px'}}>
                <span className={isSelected ? 'text-primary' : 'text-gray-300'}>{isSelected ? '● ' : '○ '}{version.label}</span>
              </span>
              <button
                className="text-blue-400 hover:text-blue-300 text-xs"
                onClick={(e) => { e.stopPropagation(); onCompare(item, version.id, version.label, version.content || ''); }}
              >
                diff
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PreviewPanelItem;
