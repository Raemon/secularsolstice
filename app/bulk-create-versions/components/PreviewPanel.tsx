import { groupBy } from 'lodash';
import type { PreviewItem } from '../types';
import PreviewPanelItem from './PreviewPanelItem';

type Props = {
  previewItems: PreviewItem[];
  onVersionSelect: (itemKey: string, versionId: string | null) => void;
  onToggleDontImport: (itemKey: string) => void;
  onCompare: (item: PreviewItem, versionId: string, versionLabel: string, versionContent: string) => void;
};

const PreviewPanel = ({ previewItems, onVersionSelect, onToggleDontImport, onCompare }: Props) => {
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
            <div key={sectionTitle} className="border-t border-l border-r rounded-sm border-gray-500 mb-2 bg-black/30">
              <div className="px-2 py-1 text-base font-medium border-b border-gray-500 font-georgia">{sectionTitle}</div>
              {items.map(item => (
                <PreviewPanelItem key={item.itemKey} item={item} onSelectVersion={onVersionSelect} onToggleDontImport={onToggleDontImport} onCompare={onCompare} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PreviewPanel;
