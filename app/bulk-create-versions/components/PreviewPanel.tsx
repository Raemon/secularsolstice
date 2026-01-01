import { groupBy } from 'lodash';
import type { PreviewItem } from '../types';
import PreviewPanelItem from './PreviewPanelItem';

type Props = {
  previewItems: PreviewItem[];
  onVersionSelect: (itemKey: string, versionId: string | null) => void;
  onCompare: (item: PreviewItem, versionId: string, versionLabel: string, versionContent: string) => void;
};

type PreviewSectionProps = {
  sectionTitle: string;
  items: PreviewItem[];
  onVersionSelect: (itemKey: string, versionId: string | null) => void;
  onCompare: (item: PreviewItem, versionId: string, versionLabel: string, versionContent: string) => void;
};

const PreviewSection = ({ sectionTitle, items, onVersionSelect, onCompare }: PreviewSectionProps) => {
  const newSongItem = items.find(item => item.candidateSong === null);
  const songItems = items.filter(item => item.candidateSong !== null);
  const isNewSongSelected = newSongItem && !newSongItem.dontImport;
  return (
    <div className="border-t border-l border-r rounded-sm border-gray-500 mb-2 bg-black/30">
      <div className="px-2 py-1 text-base font-medium border-b border-gray-500 font-georgia flex items-center justify-between">
        <span>{sectionTitle}</span>
        {newSongItem && (
          <div
            onClick={() => onVersionSelect(newSongItem.itemKey, null)}
            className={`flex items-center gap-1 cursor-pointer ${isNewSongSelected ? 'text-primary' : 'hover:bg-white/20'}`}
          >
            <span className={`font-mono ${isNewSongSelected ? 'font-medium' : ''}`} style={{fontSize: '12px'}}>
              <span className={isNewSongSelected ? 'text-primary' : 'text-gray-300'}>{isNewSongSelected ? '● ' : '○ '}Create new</span>
            </span>
          </div>
        )}
      </div>
      {songItems.map(item => (
        <PreviewPanelItem key={item.itemKey} item={item} onSelectVersion={onVersionSelect} onCompare={onCompare} />
      ))}
    </div>
  );
};

const PreviewPanel = ({ previewItems, onVersionSelect, onCompare }: Props) => {
  const enabledCount = previewItems.filter(i => !i.dontImport).length;
  const sectionCount = new Set(previewItems.map(i => i.sectionTitle)).size;
  const groupedItems = groupBy(previewItems, 'sectionTitle');
  return (
    <div className="w-full">
      <div className="text-sm font-semibold px-2 py-1">
        Preview ({sectionCount} sections, {enabledCount}/{previewItems.length} items enabled)
      </div>
      {previewItems.length === 0 ? (
        <div className="text-xs text-gray-500 px-2 py-2">No sections found. Paste text with headings to see preview.</div>
      ) : (
        <div className="max-h-[calc(100vh-235px)] overflow-y-auto">
          {Object.entries(groupedItems).map(([sectionTitle, items]) => (
            <PreviewSection key={sectionTitle} sectionTitle={sectionTitle} items={items} onVersionSelect={onVersionSelect} onCompare={onCompare} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
