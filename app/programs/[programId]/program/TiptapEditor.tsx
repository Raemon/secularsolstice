'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Mark, mergeAttributes } from '@tiptap/core';
import { useEffect } from 'react';

// Custom mark for right-aligned text within a line
const RightAlign = Mark.create({
  name: 'rightAlign',
  
  parseHTML() {
    return [{ tag: 'span[data-right-align]' }];
  },
  
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 
      'data-right-align': '',
      style: 'margin-left: auto; padding-left: 1em;'
    }), 0];
  },
});

type TiptapEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

const TiptapEditor = ({ value, onChange, placeholder = '', className = '' }: TiptapEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
      RightAlign,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: className,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  return (
    <div className="tiptap-wrapper">
      <style dangerouslySetInnerHTML={{__html: `
        .tiptap-wrapper .ProseMirror {
          outline: none;
        }
        .tiptap-wrapper .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap-wrapper .ProseMirror p {
          margin: 0;
        }
        .tiptap-wrapper .ProseMirror p + p {
          margin-top: 0.5em;
        }
        .tiptap-wrapper .ProseMirror strong {
          font-weight: bold;
        }
        .tiptap-wrapper .ProseMirror em {
          font-style: italic;
        }
        .bubble-menu {
          display: flex;
          background-color: #1a1a1a;
          padding: 4px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          gap: 2px;
        }
        .bubble-menu button {
          background: transparent;
          border: none;
          color: white;
          padding: 6px 10px;
          cursor: pointer;
          border-radius: 3px;
          font-size: 14px;
          font-weight: 600;
        }
        .bubble-menu button:hover {
          background-color: #333;
        }
        .bubble-menu button.is-active {
          background-color: #444;
          color: #60a5fa;
        }
        .bubble-menu .separator {
          width: 1px;
          background-color: #555;
          margin: 4px 4px;
        }
        /* For split-text layout using flexbox */
        .tiptap-wrapper .ProseMirror p:has([data-right-align]) {
          display: flex;
          align-items: baseline;
        }
        .tiptap-wrapper .ProseMirror [data-right-align] {
          margin-left: auto;
          padding-left: 1em;
        }
      `}} />
      {editor && (
        <BubbleMenu editor={editor}>
          <div className="bubble-menu">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={editor.isActive('bold') ? 'is-active' : ''}
              type="button"
            >
              B
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={editor.isActive('italic') ? 'is-active' : ''}
              type="button"
              style={{fontStyle: 'italic'}}
            >
              I
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={editor.isActive('strike') ? 'is-active' : ''}
              type="button"
              style={{textDecoration: 'line-through'}}
            >
              S
            </button>
            <div className="separator" />
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
              type="button"
              title="Align left"
            >
              ⬅
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
              type="button"
              title="Align center"
            >
              ↔
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
              type="button"
              title="Align right"
            >
              ➡
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={editor.isActive({ textAlign: 'justify' }) ? 'is-active' : ''}
              type="button"
              title="Justify"
            >
              ⬌
            </button>
            <div className="separator" />
            <button
              onClick={() => {
                // Insert a space, then start marking text as right-aligned
                editor.chain()
                  .focus()
                  .insertContent(' ')
                  .setMark('rightAlign')
                  .run();
              }}
              className={editor.isActive('rightAlign') ? 'is-active' : ''}
              type="button"
              title="Start right-aligned text (text after this pushes to right)"
            >
              ⇥
            </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};

export default TiptapEditor;
