import type { PreviewItem } from '../types';

type Props = {
  previewItems: PreviewItem[];
};

const PreviewPanel = ({ previewItems }: Props) => (
  <div className="w-80 space-y-2">
    <div className="text-xs font-semibold">Preview ({previewItems.length} sections):</div>
    {previewItems.length === 0 ? (
      <div className="text-xs text-gray-500">No sections found. Paste text with headings to see preview.</div>
    ) : (
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {previewItems.map((item, idx) => (
          <div key={idx} className="text-xs border border-gray-200 p-2">
            <div className={item.song ? 'text-green-600' : 'text-red-600'}>
              {item.song ? '✓' : '✗'} {item.sectionTitle}
            </div>
            {item.song && (
              <div className="mt-1 text-gray-600">Song: {item.song.title}</div>
            )}
            <div className="mt-1 text-gray-600">Version: {item.versionName}</div>
            {item.contentPreview && (
              <div className="mt-1 text-gray-400 truncate">{item.contentPreview}</div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

export default PreviewPanel;











