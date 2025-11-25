import { useRef, useCallback } from 'react';
import { handlePaste as processPaste } from '../../../src/components/slides/eventHandlers';
import type { StatusType } from '../types';

type Props = {
  onContentChange: (html: string) => void;
  showStatus: (message: string, type: StatusType) => void;
};

const ContentEditor = ({ onContentChange, showStatus }: Props) => {
  const contentEditorRef = useRef<HTMLDivElement | null>(null);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    processPaste(e, showStatus, onContentChange);
  }, [showStatus, onContentChange]);

  const handleInput = useCallback(() => {
    if (contentEditorRef.current) {
      onContentChange(contentEditorRef.current.innerHTML);
    }
  }, [onContentChange]);

  return (
    <div>
      <label className="text-xs text-gray-600">Paste from Google Docs (uses heading elements to split sections)</label>
      <div
        ref={contentEditorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        className="w-full h-96 p-2 text-xs font-mono border border-gray-300 overflow-y-auto"
        onPaste={handlePaste}
        onInput={handleInput}
      />
    </div>
  );
};

export default ContentEditor;

