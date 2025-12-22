'use client';
import { marked } from 'marked';

const MarkdownRenderer = ({content}: {content: string}) => {
  return (
    <div 
      className="markdown-content text-sm"
      dangerouslySetInnerHTML={{ __html: marked.parse(content, { breaks: true }) as string }}
    />
  );
};

export default MarkdownRenderer;
