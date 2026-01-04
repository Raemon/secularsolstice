'use client';
import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface BlogPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  htmlHighlight?: string;
  source: 'lesswrong' | 'secularsolstice';
  author?: string;
  karma?: number;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const BlogPostPreview = ({ post }: { post: BlogPost }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group">
      <div className="flex items-baseline gap-2 mb-1">
        <a href={post.link} target="_blank" rel="noopener noreferrer" className=" font-medium text-4xl font-georgia">
          <span className="text-white hover:opacity-80">{post.title}</span>
        </a>
      </div>
      <div className="text-xs text-gray-500 mb-2">
        {post.author && <span className="text-white/80">{post.author}</span>}
        <span className="text-gray-400"> · {formatDate(post.pubDate)}</span>
        {post.karma !== undefined && <span className="text-gray-400"> · {post.karma} karma</span>}
        <span className="ml-2 px-1.5 py-0.5 text-[10px] uppercase" style={{ color: post.source === 'lesswrong' ? '#8fc98f' : '#c98fc9' }}>
          {post.source === 'lesswrong' ? 'LW' : ''}
        </span>
      </div>
      {post.htmlHighlight && (
        <div>
          {expanded ? (
            <div className="text-gray-200/80 font-georgia markdown-content preview" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.htmlHighlight) }} />
          ) : (
            <div className="text-gray-200/80 font-georgia markdown-content preview line-clamp-4 cursor-pointer [&_img]:hidden" onClick={() => setExpanded(true)} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.htmlHighlight) }}>
            </div>
          )}
        </div>
      )}
      {!post.htmlHighlight && post.description && <p className="text-gray-400 text-sm line-clamp-2" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.description) }}></p>}
    
      <div className="opacity-0 group-hover:opacity-70 mt-2 text-gray-200/80 cursor-pointer text-sm" onClick={() => setExpanded(!expanded)}>
        {expanded ? 'Collapse' : 'Expand'}
      </div>
    </div>
  );
};

export default BlogPostPreview;
