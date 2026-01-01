import { useRef, useCallback, useEffect } from 'react';
import { handlePaste as processPaste } from '../../../src/components/slides/eventHandlers';
import type { StatusType } from '../types';

type Props = {
  onContentChange: (html: string) => void;
  showStatus: (message: string, type: StatusType) => void;
  initialContent?: string;
};

const ContentEditor = ({ onContentChange, showStatus, initialContent }: Props) => {
  const contentEditorRef = useRef<HTMLDivElement | null>(null);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (contentEditorRef.current && initialContent && !hasInitialized.current) {
      contentEditorRef.current.innerHTML = initialContent;
      hasInitialized.current = true;
    }
  }, [initialContent]);

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
      <label className="text-xs text-gray-400">Paste from Google Docs (uses heading elements to split sections)</label>
      <div
        ref={contentEditorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        className="w-full h-[calc(100vh-300px)] max- p-2 text-xs font-mono border border-gray-300 overflow-y-auto"
        onPaste={handlePaste}
        onInput={handleInput}
      />
    </div>
  );
};

export default ContentEditor;
