'use client';

import { useState, useEffect } from 'react';
import VersionSuffixInput from './components/VersionSuffixInput';
import ContentEditor from './components/ContentEditor';
import StatusMessage from './components/StatusMessage';
import ResultsList from './components/ResultsList';
import PreviewPanel from './components/PreviewPanel';
import VersionDiffPage from '../changelog/[oldVersionId]/[newVersionId]/VersionDiffPage';
import { useSongs, useSections, useStatus, useProcessSections, usePreviewItems, SelectionState } from './hooks';
import { useUser } from '../contexts/UserContext';
import type { PreviewItem } from './types';

type DiffModalState = {
  open: boolean;
  oldText: string;
  newText: string;
  oldLabel: string;
  newLabel: string;
  title: string;
};

const LOCALSTORAGE_KEY = 'bulk-create-versions-content';

const BulkCreateVersions = () => {
  const { canEdit, userName } = useUser();
  const [versionSuffix, setVersionSuffix] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [initialContent, setInitialContent] = useState<string | undefined>(undefined);
  const [selectionStates, setSelectionStates] = useState<Map<string, SelectionState>>(new Map());
  const [diffModal, setDiffModal] = useState<DiffModalState>({ open: false, oldText: '', newText: '', oldLabel: '', newLabel: '', title: '' });

  useEffect(() => {
    const saved = localStorage.getItem(LOCALSTORAGE_KEY);
    if (saved) {
      setInitialContent(saved);
      setHtmlContent(saved);
    }
  }, []);

  useEffect(() => {
    if (htmlContent) {
      localStorage.setItem(LOCALSTORAGE_KEY, htmlContent);
    }
  }, [htmlContent]);

  const { songs, loadSongs } = useSongs();
  const sections = useSections(htmlContent);
  const { statusMessage, statusType, showStatus } = useStatus();
  const previewItems = usePreviewItems(sections, songs, versionSuffix, selectionStates);
  const { isProcessing, results, processSections } = useProcessSections(songs, loadSongs, sections, versionSuffix, userName, previewItems);

  const handleVersionSelection = (itemKey: string, versionId: string | null) => {
    setSelectionStates(prev => {
      const newMap = new Map(prev);
      const sectionTitle = itemKey.split('::')[0];
      // Deselect all other items in the same section
      previewItems.forEach(item => {
        if (item.sectionTitle === sectionTitle) {
          if (item.itemKey === itemKey) {
            // Select this item
            newMap.set(itemKey, { selectedVersionId: versionId, dontImport: false });
          } else {
            // Deselect other items in the same section
            newMap.set(item.itemKey, { selectedVersionId: item.selectedVersionId, dontImport: true });
          }
        }
      });
      return newMap;
    });
  };

  const handleToggleDontImport = (itemKey: string) => {
    setSelectionStates(prev => {
      const newMap = new Map(prev);
      const item = previewItems.find(i => i.itemKey === itemKey);
      const current = prev.get(itemKey) || { selectedVersionId: item?.selectedVersionId || null, dontImport: item?.dontImport || false };
      newMap.set(itemKey, { ...current, dontImport: !current.dontImport });
      return newMap;
    });
  };

  const handleCompare = (item: PreviewItem, versionId: string, versionLabel: string, versionContent: string) => {
    setDiffModal({
      open: true,
      oldText: versionContent,
      newText: item.content,
      oldLabel: versionLabel,
      newLabel: 'New content',
      title: item.sectionTitle,
    });
  };

  useEffect(() => {
    if (!diffModal.open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDiffModal(prev => ({ ...prev, open: false }));
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [diffModal.open]);

  return (
    <div className="flex gap-4 p-4">
      <div className="flex-1 space-y-4 w-1/2">
        <VersionSuffixInput value={versionSuffix} onChange={setVersionSuffix} />
        <ContentEditor onContentChange={setHtmlContent} showStatus={showStatus} initialContent={initialContent} />
        <StatusMessage message={statusMessage} type={statusType} />
        {canEdit && (
          <button
            onClick={processSections}
            disabled={isProcessing}
            className="text-xs px-2 py-1 bg-blue-600 text-white disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Process Sections'}
          </button>
        )}
        <ResultsList results={results} />
      </div>
      <div className="w-1/2">
        <PreviewPanel previewItems={previewItems} onVersionSelect={handleVersionSelection} onCompare={handleCompare} />
      </div>
      {diffModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setDiffModal(prev => ({ ...prev, open: false }))}>
          <div className="bg-gray-800 max-w-5xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end p-2">
              <button className="text-gray-400 hover:text-white text-sm" onClick={() => setDiffModal(prev => ({ ...prev, open: false }))}>✕ Close</button>
            </div>
            <VersionDiffPage
              oldText={diffModal.oldText}
              newText={diffModal.newText}
              oldLabel={diffModal.oldLabel}
              newLabel={diffModal.newLabel}
              title={diffModal.title}
              showBackLink={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkCreateVersions;
